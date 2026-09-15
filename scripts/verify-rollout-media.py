#!/usr/bin/env python3
"""Import gate for audited candidate GT clips in this project-page demo.

This binds each video and its public provenance to a reviewed receipt, checks
source/action checksums when available, decoded media, and obvious still-frame
substitutes. The reviewed receipt registry defines the supported candidates;
it is not a metric of physical accuracy, action following, or performance on
arbitrary samples.
"""
import argparse
import ast
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys


SITE = Path(__file__).resolve().parents[1]
RECEIPT_FILE = Path(__file__).with_name('rollout-gt-receipts.json')
EXPECTED_FRAMES = 33


def is_hash(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-fA-F]{64}', value) is not None


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def load_receipts():
    """Load the reviewed, version-controlled binding from sample to GT bytes."""
    data = json.loads(RECEIPT_FILE.read_text())
    receipts = data.get('receipts')
    if data.get('version') != 1 or not isinstance(receipts, dict) or not receipts:
        raise ValueError('The reviewed GT receipt file is missing or invalid.')
    required = {'type', 'chunkId', 'startFrame', 'frames', 'actionSha256', 'sourceSha256', 'manifestSha256'}
    for sample_id, receipt in receipts.items():
        if not isinstance(sample_id, str) or not sample_id.strip() or not isinstance(receipt, dict):
            raise ValueError(f'The reviewed GT receipt is invalid for {sample_id}.')
        provenance = receipt.get('provenance') if isinstance(receipt, dict) else None
        if not is_hash(receipt.get('outputSha256')) or not isinstance(provenance, dict) or not required.issubset(provenance):
            raise ValueError(f'The reviewed GT receipt is incomplete for {sample_id}.')
        if provenance['type'] != 'canonical-source' or provenance['chunkId'] != sample_id or not integer(provenance['startFrame']) or provenance['startFrame'] < 0 or not integer(provenance['frames']) or provenance['frames'] != EXPECTED_FRAMES:
            raise ValueError(f'The reviewed GT receipt provenance is invalid for {sample_id}.')
        if any(not is_hash(provenance[key]) for key in ('actionSha256', 'sourceSha256', 'manifestSha256')):
            raise ValueError(f'The reviewed GT receipt checksum is invalid for {sample_id}.')
    return receipts


def local_asset(root, value):
    if not isinstance(value, str) or not value.startswith('assets/'):
        raise ValueError('Asset must be a relative path under assets/.')
    path = (root / value).resolve()
    path.relative_to(root.resolve())
    return path


def npy_action_sha256(path):
    """Hash the C-order float32 array bytes, excluding the NPY file header."""
    data = path.read_bytes()
    if len(data) < 10 or data[:6] != b'\x93NUMPY':
        raise ValueError('Action file is not NPY.')
    major, minor = data[6:8]
    if major == 1:
        offset, header_length = 10, struct.unpack('<H', data[8:10])[0]
    elif major in (2, 3) and len(data) >= 12:
        offset, header_length = 12, struct.unpack('<I', data[8:12])[0]
    else:
        raise ValueError(f'Unsupported NPY version {major}.{minor}.')
    if header_length > 1024 * 1024 or offset + header_length > len(data):
        raise ValueError('Action NPY header is invalid or truncated.')
    header = ast.literal_eval(data[offset:offset + header_length].decode('utf-8' if major == 3 else 'latin1').strip())
    if not isinstance(header, dict) or header.get('fortran_order') is not False:
        raise ValueError('Action checksum requires a C-order array.')
    if header.get('descr') not in ('<f4', '=f4') or (header.get('descr') == '=f4' and sys.byteorder != 'little'):
        raise ValueError('Action checksum requires little-endian float32 data.')
    shape = header.get('shape')
    if not isinstance(shape, tuple) or not shape or any(not integer(size) or size <= 0 for size in shape):
        raise ValueError('Action array shape is invalid.')
    payload = data[offset + header_length:]
    if len(payload) != math.prod(shape) * 4:
        raise ValueError('Action NPY payload length does not match its shape.')
    return hashlib.sha256(payload).hexdigest()


def probe(path, executable):
    result = subprocess.run([executable, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate', '-of', 'json', str(path)], capture_output=True, check=True)
    streams = json.loads(result.stdout)['streams']
    if not streams:
        raise ValueError('No video stream found.')
    return streams[0]


def motion_metrics(raw, width, height):
    """Native RGB MAD and changed-pixel fraction, each relative to frame zero."""
    stride = width * height * 3
    if not raw or len(raw) % stride:
        raise ValueError('Decoded RGB data contains an incomplete frame.')
    first = raw[:stride]
    max_mad = max_changed = 0.0
    for offset in range(stride, len(raw), stride):
        differences = [abs(a - b) for a, b in zip(first, raw[offset:offset + stride])]
        mad = sum(differences) / stride
        changed = sum(r > 8 or g > 8 or b > 8 for r, g, b in zip(differences[0::3], differences[1::3], differences[2::3])) / (width * height)
        max_mad = max(max_mad, mad)
        max_changed = max(max_changed, changed)
    if max_mad <= 0.25 and max_changed <= 0.001:
        classification = 'near_static_or_encoding_noise'
    elif max_mad >= 1.0 and max_changed >= 0.02:
        classification = 'substantial_pixel_change'
    else:
        classification = 'manual_review'
    return {'decoded_frames': len(raw) // stride, 'max_rgb_mad_vs_first_0_255': max_mad, 'max_fraction_pixels_any_rgb_channel_gt_8_vs_first': max_changed, 'classification': classification}


def verify_sample(sample, root, ffmpeg, ffprobe, source_file=None, receipts=None):
    result = {'sample_id': sample.get('id'), 'status': 'pass', 'errors': [], 'review_reasons': []}
    errors = result['errors']
    gt = sample.get('gt') if isinstance(sample.get('gt'), dict) else {}
    provenance = gt.get('provenance') if isinstance(gt.get('provenance'), dict) else {}
    receipts = load_receipts() if receipts is None else receipts
    receipt = receipts.get(sample.get('id'))
    if not receipt:
        errors.append('No reviewed GT receipt exists for this sample; an explicit reviewed receipt update is required.')
    else:
        expected_provenance = receipt['provenance']
        if set(provenance) != set(expected_provenance):
            errors.append('GT provenance fields do not match the complete frozen receipt.')
        for key, expected in expected_provenance.items():
            if provenance.get(key) != expected:
                errors.append(f'GT provenance.{key} does not match its reviewed receipt.')
    if not isinstance(gt.get('src'), str) or Path(gt['src']).name != 'gt-source.mp4':
        errors.append('GT must use gt-source.mp4; legacy gt.mp4 still-frame exports are prohibited.')
    if provenance.get('type') != 'canonical-source':
        errors.append('GT provenance.type must be canonical-source.')
    if provenance.get('chunkId') != sample.get('id'):
        errors.append('GT provenance.chunkId does not match sample.id.')
    if not integer(provenance.get('startFrame')) or provenance['startFrame'] < 0:
        errors.append('GT provenance.startFrame must be a non-negative integer.')
    if not integer(gt.get('frames')) or gt['frames'] != EXPECTED_FRAMES:
        errors.append(f'This demo requires {EXPECTED_FRAMES} GT frames.')
    if not integer(provenance.get('frames')) or provenance['frames'] != gt.get('frames'):
        errors.append('GT provenance.frames must match gt.frames.')
    if not is_hash(sample.get('actionSha256')) or not is_hash(provenance.get('actionSha256')) or provenance.get('actionSha256', '').lower() != sample.get('actionSha256', '').lower():
        errors.append('GT provenance.actionSha256 must match the sample action checksum.')
    if not is_hash(provenance.get('sourceSha256')):
        errors.append('GT provenance.sourceSha256 must be a 64-digit hexadecimal checksum.')
    if not is_hash(provenance.get('manifestSha256')):
        errors.append('GT provenance.manifestSha256 must be a 64-digit hexadecimal checksum.')
    try:
        action_sha = npy_action_sha256(local_asset(root, sample.get('action')))
        result['action_payload_sha256'] = action_sha
        if action_sha != str(sample.get('actionSha256', '')).lower():
            errors.append('Local action float32 payload does not match sample.actionSha256.')
    except (OSError, ValueError, SyntaxError, UnicodeError) as error:
        errors.append(f'Action verification failed: {error}')

    result['source_hash_verification'] = 'declaration_format_only'
    if source_file is not None:
        try:
            actual_source_sha = file_sha256(Path(source_file))
            result['source_hash_verification'] = 'local_file_recomputed'
            result['recomputed_source_sha256'] = actual_source_sha
            if actual_source_sha != str(provenance.get('sourceSha256', '')).lower():
                errors.append('Canonical source file does not match provenance.sourceSha256.')
        except OSError as error:
            errors.append(f'Canonical source file could not be read: {error}')

    try:
        path = local_asset(root, gt.get('src'))
        metadata = probe(path, ffprobe)
        width, height = metadata['width'], metadata['height']
        if width != gt.get('width') or height != gt.get('height'):
            errors.append('Decoded GT dimensions do not match catalog dimensions.')
        numerator, denominator = map(int, metadata['avg_frame_rate'].split('/'))
        fps = numerator / denominator
        if not isinstance(gt.get('fps'), (int, float)) or isinstance(gt['fps'], bool) or not math.isclose(fps, gt['fps'], rel_tol=1e-6, abs_tol=1e-6):
            errors.append('Decoded GT frame rate does not match catalog fps.')
        decoded = subprocess.run([ffmpeg, '-v', 'error', '-threads', '1', '-filter_threads', '1', '-i', str(path), '-map', '0:v:0', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
        motion = motion_metrics(decoded.stdout, width, height)
        result['motion'] = motion
        result['gt_file_sha256'] = file_sha256(path)
        if receipt and result['gt_file_sha256'] != receipt['outputSha256']:
            errors.append('GT video bytes do not match the reviewed receipt outputSha256 for this sample.')
        if motion['decoded_frames'] != gt.get('frames'):
            errors.append('Actual decoded GT frame count does not match gt.frames.')
        if motion['classification'] == 'near_static_or_encoding_noise':
            errors.append('Audited-candidate GT is near static or encoding noise; reject the still-frame substitute.')
        elif motion['classification'] == 'manual_review':
            result['review_reasons'].append('GT variation is between the static and substantial-change thresholds; inspect the canonical source before importing.')
    except (OSError, ValueError, KeyError, ZeroDivisionError, subprocess.CalledProcessError) as error:
        errors.append(f'GT media verification failed: {error}')
    result['status'] = 'fail' if errors else 'review' if result['review_reasons'] else 'pass'
    return result


def verify_catalog(catalog, root, ffmpeg, ffprobe, sources=None, receipts=None):
    receipts = load_receipts() if receipts is None else receipts
    cases = catalog.get('cases', [])
    ids = [sample.get('id') for sample in cases]
    errors = []
    if not ids or not set(ids).issubset(receipts) or len(ids) != len(set(ids)):
        errors.append('Catalog must contain a nonempty, duplicate-free subset of the reviewed receipt registry.')
    if sources is not None and any(not isinstance(sources.get(sample_id), str) or not sources[sample_id].strip() for sample_id in ids):
        errors.append('The private source manifest must provide a nonempty source file path for each displayed sample.')
    results = [verify_sample(sample, root, ffmpeg, ffprobe, (sources or {}).get(sample.get('id')), receipts) for sample in cases]
    status = 'fail' if errors or any(row['status'] == 'fail' for row in results) else 'review' if any(row['status'] == 'review' for row in results) else 'pass'
    return {
        'status': status,
        'scope': 'Import gate for audited candidate GT examples in the reviewed receipt registry only; not a general physical accuracy or action-following metric.',
        'source_hash_note': 'sourceSha256 must match the frozen reviewed receipt. It is additionally recomputed when the private --sources manifest supplies a local canonical file.',
        'receipt_binding': 'Each displayed sample must match its frozen output video SHA256 and all public provenance fields, including source, action, manifest, offset and frame count. Adding a recovered sample requires a reviewed receipt update.',
        'motion_gate': {'near_static_reject': {'max_rgb_mad_lte': 0.25, 'max_fraction_pixels_change_gt8_lte': 0.001}, 'substantial_change': {'max_rgb_mad_gte': 1.0, 'max_fraction_pixels_change_gt8_gte': 0.02}, 'between_thresholds': 'manual_review; exit code 2'},
        'errors': errors, 'samples': results,
        'withheld_sample_ids': sorted(set(receipts) - set(ids)),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, default=SITE / 'assets/rollout-demo/catalog.json')
    parser.add_argument('--root', type=Path, default=SITE, help='Website root for assets/... paths')
    parser.add_argument('--sources', type=Path, help='Private JSON mapping sample IDs to local canonical-source file paths')
    parser.add_argument('--report', type=Path, help='Write the JSON report here as well as stdout')
    args = parser.parse_args()
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        parser.error('ffmpeg and ffprobe must be installed and on PATH.')
    catalog_bytes = args.catalog.read_bytes()
    catalog = json.loads(catalog_bytes)
    sources = json.loads(args.sources.read_text()) if args.sources else None
    if sources is not None and not isinstance(sources, dict):
        parser.error('--sources must contain a JSON object mapping sample IDs to local paths.')
    result = verify_catalog(catalog, args.root.resolve(), ffmpeg, ffprobe, sources)
    result['catalog_sha256'] = hashlib.sha256(catalog_bytes).hexdigest()
    result['receipt_file_sha256'] = file_sha256(RECEIPT_FILE)
    serialized = json.dumps(result, indent=2) + '\n'
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(serialized)
    print(serialized, end='')
    return 1 if result['status'] == 'fail' else 2 if result['status'] == 'review' else 0


if __name__ == '__main__':
    sys.exit(main())
