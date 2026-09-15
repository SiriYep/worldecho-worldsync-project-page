"""GT import regressions using real tiny decoded videos and NPY action payloads."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location('verify_rollout_media', Path(__file__).resolve().parents[1] / 'scripts' / 'verify-rollout-media.py')
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg and ffprobe required')
class ImportGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.assets = self.root / 'assets/demo'
        self.assets.mkdir(parents=True)
        header = b"{'descr': '<f4', 'fortran_order': False, 'shape': (32, 14), }"
        header += b' ' * ((64 - (10 + len(header) + 1) % 64) % 64) + b'\n'
        payload = struct.pack('<448f', *([0.25] * 448))
        action = b'\x93NUMPY\x01\x00' + struct.pack('<H', len(header)) + header + payload
        (self.assets / 'action.npy').write_bytes(action)
        self.action_sha = hashlib.sha256(payload).hexdigest()
        self.encode('gt-source.mp4', moving=True)
        self.source = self.root / 'canonical.mp4'
        shutil.copyfile(self.assets / 'gt-source.mp4', self.source)
        self.sample = {
            'id': 'synthetic_new_audited_candidate_cw32', 'action': 'assets/demo/action.npy', 'actionSha256': self.action_sha,
            'gt': {'src': 'assets/demo/gt-source.mp4', 'frames': 33, 'fps': 22, 'width': 4, 'height': 4,
                   'provenance': {'type': 'canonical-source', 'chunkId': 'synthetic_new_audited_candidate_cw32', 'startFrame': 0, 'frames': 33, 'actionSha256': self.action_sha, 'sourceSha256': hashlib.sha256(self.source.read_bytes()).hexdigest(), 'manifestSha256': '1' * 64}},
        }
        self.receipts = {self.sample['id']: {'outputSha256': hashlib.sha256((self.assets / 'gt-source.mp4').read_bytes()).hexdigest(), 'provenance': copy.deepcopy(self.sample['gt']['provenance'])}}

    def encode(self, filename, moving):
        frames = b''.join(bytes([200 if moving and index > 15 else 0]) * (4 * 4 * 3) for index in range(33))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '4x4', '-r', '22', '-i', 'pipe:0', '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv444p', str(self.assets / filename)], input=frames, check=True)

    def verify(self, sample=None):
        return verify.verify_sample(sample or self.sample, self.root, shutil.which('ffmpeg'), shutil.which('ffprobe'), self.source, self.receipts)

    def test_canonical_moving_clip_and_raw_npy_payload_checksum_pass(self):
        self.assertNotEqual(self.action_sha, hashlib.sha256((self.assets / 'action.npy').read_bytes()).hexdigest())
        result = self.verify()
        self.assertEqual(result['status'], 'pass', result)
        self.assertEqual(result['source_hash_verification'], 'local_file_recomputed')
        self.assertEqual(result['motion']['decoded_frames'], 33)

    def test_static_clip_is_rejected_even_with_a_canonical_filename_and_provenance(self):
        self.encode('gt-source.mp4', moving=False)
        result = self.verify()
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('near static' in error for error in result['errors']))

    def test_wrong_chunk_action_source_and_frame_count_are_independently_rejected(self):
        changed = copy.deepcopy(self.sample)
        changed['gt']['provenance'].update(chunkId='unrelated-chunk', sourceSha256='0' * 64, frames=32)
        action = bytearray((self.assets / 'action.npy').read_bytes())
        action[-1] ^= 1
        (self.assets / 'action.npy').write_bytes(action)
        result = self.verify(changed)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('chunkId' in error for error in result['errors']))
        self.assertTrue(any('sourceSha256' in error for error in result['errors']))
        self.assertTrue(any('provenance.frames' in error for error in result['errors']))
        self.assertTrue(any('float32 payload' in error for error in result['errors']))

    def test_legacy_gt_path_is_rejected_even_if_it_contains_motion(self):
        changed = copy.deepcopy(self.sample)
        shutil.copyfile(self.assets / 'gt-source.mp4', self.assets / 'gt.mp4')
        changed['gt']['src'] = 'assets/demo/gt.mp4'
        result = self.verify(changed)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('legacy gt.mp4' in error for error in result['errors']))

    def test_withholding_unverified_samples_is_allowed_but_duplicate_samples_are_rejected(self):
        withheld_id = 'synthetic_reviewed_but_not_displayed_cw32'
        self.receipts[withheld_id] = copy.deepcopy(self.receipts[self.sample['id']])
        self.receipts[withheld_id]['provenance']['chunkId'] = withheld_id
        args = (self.root, shutil.which('ffmpeg'), shutil.which('ffprobe'), {self.sample['id']: str(self.source)}, self.receipts)
        result = verify.verify_catalog({'cases': [self.sample]}, *args)
        self.assertEqual(result['status'], 'pass', result)
        self.assertEqual(result['withheld_sample_ids'], [withheld_id])
        result = verify.verify_catalog({'cases': [self.sample, self.sample]}, *args)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('duplicate-free' in error for error in result['errors']))

    def test_an_unreviewed_recovery_cannot_pass_without_its_receipt(self):
        result = verify.verify_sample(self.sample, self.root, shutil.which('ffmpeg'), shutil.which('ffprobe'), self.source, {})
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('No reviewed GT receipt' in error for error in result['errors']))

    def test_registry_update_authorizes_a_new_candidate_without_a_code_whitelist(self):
        receipt_file = self.root / 'reviewed-receipts.json'
        receipt_file.write_text(json.dumps({'version': 1, 'receipts': self.receipts}))
        with patch.object(verify, 'RECEIPT_FILE', receipt_file):
            result = verify.verify_catalog({'cases': [self.sample]}, self.root, shutil.which('ffmpeg'), shutil.which('ffprobe'))
        self.assertEqual(result['status'], 'pass', result)
        self.assertEqual(result['withheld_sample_ids'], [])

    def test_unreviewed_candidate_is_rejected_by_the_catalog_registry(self):
        result = verify.verify_catalog({'cases': [self.sample]}, self.root, shutil.which('ffmpeg'), shutil.which('ffprobe'), receipts={})
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('reviewed' in error for error in result['errors']))
        self.assertTrue(any('No reviewed GT receipt' in error for error in result['samples'][0]['errors']))


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg and ffprobe required')
class ShippedReceiptTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((verify.SITE / 'assets/rollout-demo/catalog.json').read_text())
        self.cases = {sample['task']: sample for sample in self.catalog['cases']}

    def test_shipped_public_provenance_and_video_bytes_match_frozen_receipts(self):
        receipts = verify.load_receipts()
        for sample in self.catalog['cases']:
            with self.subTest(sample=sample['id']):
                receipt = receipts[sample['id']]
                self.assertEqual(sample['gt']['provenance'], receipt['provenance'])
                self.assertEqual(verify.file_sha256(verify.SITE / sample['gt']['src']), receipt['outputSha256'])

    def test_another_real_moving_gt_cannot_be_used_for_adjust_bottle(self):
        changed = copy.deepcopy(self.cases['adjust_bottle'])
        changed['gt']['src'] = self.cases['grab_roller']['gt']['src']
        result = verify.verify_sample(changed, verify.SITE, shutil.which('ffmpeg'), shutil.which('ffprobe'))
        self.assertEqual(result['motion']['classification'], 'substantial_pixel_change')
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('receipt outputSha256' in error for error in result['errors']))

    def test_real_video_cannot_pass_with_a_forged_offset_or_manifest(self):
        changed = copy.deepcopy(self.cases['adjust_bottle'])
        changed['gt']['provenance'].update(startFrame=999999, manifestSha256='invalid')
        result = verify.verify_sample(changed, verify.SITE, shutil.which('ffmpeg'), shutil.which('ffprobe'))
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('startFrame does not match its reviewed receipt' in error for error in result['errors']))
        self.assertTrue(any('manifestSha256 does not match its reviewed receipt' in error for error in result['errors']))


class NoiseThresholdTests(unittest.TestCase):
    def test_exactly_distinct_noise_frames_are_not_motion_and_intermediate_change_requires_review(self):
        first = bytes(10 * 10 * 3)
        noise = bytearray(first)
        noise[0] = 1
        result = verify.motion_metrics(first + noise, 10, 10)
        self.assertNotEqual(first, noise)
        self.assertEqual(result['classification'], 'near_static_or_encoding_noise')
        small_change = bytearray(first)
        small_change[:15] = bytes([9]) * 15
        result = verify.motion_metrics(first + small_change, 10, 10)
        self.assertEqual(result['classification'], 'manual_review')


if __name__ == '__main__':
    unittest.main()
