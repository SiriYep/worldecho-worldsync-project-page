# Recorded rollout comparisons

The local preview at `#state-control` shows **six recommended tasks**, with GT
and WorldSync fixed beside one selectable comparison model. The three choices
are Cosmos-Predict2.5, CtrlWorld and DreamDojo, all from Expanded configurations.
The interface shows task/model names, each gate's recorded score and minimum
requirement, and three trajectory differences relative to GT. Play/Pause,
Restart and seek control the videos. These are existing recordings, separate
from the action-draft playground.

The full **34-case catalog and 476 recordings remain intact for audit**. The
current view exposes 30 recordings: six GT and 24 model outputs across the
three baseline choices plus WorldSync. Review labels, selection notes,
cautions, training details and sample metadata remain in the catalog/docs,
rather than the main interface. Personal shortlist controls have been removed;
previously stored shortlist IDs are neither read nor changed.

## Selection and identity

Source pack: `main50_13models_10per_task_20260915`.
The full index has 6,500 rows: 500 common samples, 50 tasks, 13 configurations.
Index SHA-256: `c1a46ba5e9111cb1b14ac436c09dfd771661a3fda9a8710361a26da6805ec313`.

The first fourteen candidates comprised six cases with recovered original GT
and eight additional policy-rollout cases selected at canonical rank 0 from
different tasks. These initial candidates were chosen without model-score
filtering. A subsequent prescreen of all 500 samples using existing pack scores
selected twenty more candidates from twenty different tasks: three PCA
perturbations, three raw perturbations, seven uniform feasible actions and seven
weighted feasible actions. This prescreen involved no new rollout generation
or metric rescoring.

All 34 cases received a visual review at seven fixed frame positions against
GT, WorldSync and all twelve baseline configurations. The six recommendations
also received an all-33-frame GT/WorldSync review. The resulting labels are
**6 Recommended, 16 Backup, 8 Not selected and 4 Needs review** in the audit.
The twenty additions were deliberately selected using scores; the combined gallery is a
qualitative subset and cannot estimate overall performance. See
[the selection method and six recommendations](rollout-screening.md).

| Query type | Subtype | Cases retained in the catalog |
| --- | --- | ---: |
| Expert demonstration | Clean | 1 |
| Local perturbation | PCA | 4 |
| Local perturbation | Raw | 4 |
| Policy rollout | Exploration policy rollout | 9 |
| Feasible-space sampling | Uniform | 8 |
| Feasible-space sampling | Weighted | 8 |

The audit set spans four query types and six subtypes. The six visible cases
span PCA perturbations and uniform feasible actions. The cross-state replay case
(`place_bread_basket`) remains omitted because its original RGB video is
unavailable. Repeated task names can refer to different chunks and query
subtypes; use the full sample ID to identify a recording.

`assets/rollout-demo/catalog.json` binds every clip to its original chunk ID,
model configuration, training regime, step, action hash, and shared input.
The source pack identifies WorldSync as `WanWorld-mix4-ie-afe-no-robot`, step
60000 (`fresh_wanworld_norobot_50task_core5_20260722`). Baselines use Expert at
20k or Expanded at 40k. The current three visible baseline choices are the
40k Expanded rows; WorldSync is 60k. These unequal training budgets are retained
here and in the catalog even though the main view omits them. LingBotVA remains
in the archive as a video-only model that does not consume the action array;
it is not a current comparison choice.

## GT correction (2026-09-15)

The supplied pack’s seven `gt_video.mp4` files repeat the initial image. The
model adapter deliberately repeats one JPEG in its `_inputs` HDF5 file; the
pack incorrectly used those conditioning files as GT. A decodable 33-frame
MP4 and matching file hashes did not establish a real simulator trajectory.

All 34 archived GT videos come from original simulator sources listed in
the frozen main50 canonical manifest (SHA-256
`3e5ee4c64a546b7473d37ca989541db51047007e37a6885d96a3157c363b5732`).
The original clean adjust-bottle case uses HDF5 frames 40–72 with the
benchmark’s `rgb_no_swap` color rule. The original PCA grab-roller and raw
handover-block cases use video frames 0–32; the policy rotate-QR-code case
uses 174–206; uniform stack-two-blocks uses 176–208; weighted lift-pot uses
249–281. These are inclusive, zero-based ranges, resized with OpenCV
INTER_AREA to 320×256 and encoded at
the canonical display rate of 22 fps. The eight additional policy windows start
at 36 (open laptop), 635 (open microwave), 509 (handover mic), 511 (stack three
blocks), 564 (stack three bowls), 37 (shake bottle), 37 (click bell) and 21
(turn switch); each contains 33 frames. The twenty score-selected additions
also use their exact canonical 33-frame windows from original `video.mp4`
sources. Their start frames and source identities are recorded per case in the
catalog and frozen receipts. No new rollout was simulated.

`gt-source.mp4` filenames distinguish the restored clips from the removed
`gt.mp4` assets. Catalog GT provenance includes the chunk ID, source-file SHA,
manifest SHA, start frame and action hash. The action hash covers the float32
array payload, not the NPY container. Original-source receipts, frame 0/16/32
contact sheets, and output hashes remain in the private audit.

The missing cross-state replay case has trajectory caches but no recoverable
RGB frames in the inspected mounted sources. Cached poses and repaired input
observations are not substituted for GT video.

## Media and playback

- 476 archived videos: 34 recovered GT and 442 recorded model outputs. The
  current six-task interface exposes 30 of these recordings.
- Of the model outputs, 340 H.264 videos are byte-identical copies and 102 were
  MPEG-4 Part 2 converted to H.264 CRF18 with source frames, fps and size
  preserved. The original fourteen cases contributed 140 copies and 42
  transcodes; the twenty additions contributed 200 copies and 60 transcodes.
  The 34 GT clips are H.264 CRF18 exports of original simulator frames.
  Re-encoding is lossy; original files remain in the audit archive. Posters
  come from frame zero of the displayed video.
- Visible GT and Cosmos-Predict2.5 clips use 33 frames at 22 fps; CtrlWorld,
  DreamDojo and WorldSync use 33 frames at 30 fps. Archived LingBotVA clips use
  32 frames at 10 fps. Source sizes across the archive range from 224×168 to
  640×480. Videos retain their full image in an `object-fit: contain` frame.
- The common slider follows normalized clip progress, not physical timestamps.
  Playback changes rates to cover each complete recording. No frame-level
  physical time correspondence is implied.
- The input PNG is the source pack's model input observation, and `action.npy`
  is the original `(32,20)` float32 Rot6D20 delta-EE array. Downloads do not
  execute robot motion.
- Playback pauses out of view or when the page is hidden. Reduced motion starts
  paused. Changing sample or model preserves a deliberate pause.

## Current controls

The task selector contains only the six reviewed recommendations, with the
task name as its label. The comparison selector uses these exact rows:

| Visible model name | Catalog model ID |
| --- | --- |
| Cosmos-Predict2.5 | `cosmos_predict25_coverage` |
| CtrlWorld | `ctrlworld_coverage` |
| DreamDojo | `dreamdojo_coverage` |

GT and WorldSync stay visible as the model changes. Changing task preserves
the selected model and a deliberate pause. An unavailable recording is shown
as unavailable, without substituting a different model's output. Review
filters, Previous/Next, shortlist and metadata panels are no longer visible.
These are short 32-action windows within the named tasks, not full episodes.

## Recorded visual gates

Each model clip accepts `visualGates` records for these four checks:

| Gate ID | Displayed value and requirement | Meaning of the existing record |
| --- | --- | --- |
| `image_quality` | MUSIQ / 100, minimum 0.400 | Recorded perceptual-quality score; not a probability |
| `motion_smoothness` | Native score, minimum 0.600 | VFIMamba consistency on eligible frame pairs; values can exceed 1 |
| `eef_visibility` | Qualifying frames / 33, minimum 16 frames | All promptable end effectors must meet the SAM3 tracking rule in the same frame |
| `arm_integrity` | Binary 0 or 1; no numeric threshold | Automated Qwen3-VL judgment on eight sampled frames, not confidence |

The UI distinguishes pass, fail, skipped and unavailable. Missing, malformed
or duplicate records never default to pass. Restored GT has no evaluated gate
record and is displayed as **GT reference**. A passed check is not a task
success claim or human confirmation that every frame is sound. Genuine zero
scores stay zero; null, missing or skipped scores display a dash. Numeric
minimums retain the recorded units, and rounded values do not recompute the
pass/fail status. EEF counts come from explicit source counts rather than
rounding a ratio. The arm-integrity threshold remains null, and GT has neither
a score nor a fabricated zero error.

The six-case export contains 24 model videos and 96 recorded check outcomes:
95 pass and one fail. Cosmos-Predict2.5 on `put_object_cabinet` fails the stored
EEF visibility rule (15 qualifying frames against a requirement of 16);
its other three checks pass. These are existing report-lineage pack records,
not fresh evaluations of the browser videos or the paper's final rescoring.
The score/threshold audit is `demo-scores/gate-score-audit.md`, backed by
`gate-score-audit.json` and `validate_gate_scores.py`, in the private
`20260915-demo-appendix` directory. It checks all 96 values against the original
records; `demo-annotations/visual-gates.md` retains the source export audit. Its binding uses
recorded sample/path identity and download/transformation receipts; the metric
files do not themselves contain a video-content hash from historical scoring.

## AnyPos trajectory layer

All 30 recordings in the six-task gallery have per-clip `trajectory` data. Valid data
uses `version: 1`, `space: "normalized-image"`, source width/height and a frame
array of left/right image points. Canvas drawing follows each video's native
frame progress and the visible image rectangle, including letterboxing.
The left arm is teal and the right arm orange; short RGB axes show the estimated
orientation. The AnyPos trajectories checkbox toggles the overlay. Missing or
invalid data leaves it hidden, and out-of-view points break the visible trail.

All tracks use AnyPos Mix4 step6000 v1, checkpoint SHA-256
`a6cc52e6ec5b4f10e3db53866e068497b976e4292f3a0ac6c677e86aa9c451ab`.
The six reference-video tracks and twelve WorldSync/DreamDojo tracks reuse
verified direct report artifacts. The matching Cosmos-Predict2.5/CtrlWorld
scoring runs had not saved prediction arrays, so twelve tracks were extracted
separately on CPU in FP32 using the same frozen loader and weights. This is
display annotation, not exact reproduction of CUDA BF16 scoring. The later
24 comparisons below use these displayed annotations and the common GT
reference. The pack's older colorfix arrays were not used.

Each track has 33 native frames, with no temporal warping, motion smoothing,
or manual point adjustment. Projection uses the canonical sample's own camera
intrinsics/extrinsics from the matching enhanced HDF5, with the independently
checked base-to-world transform. The full 640×480 camera image is scaled to
each recording; the renderer also accounts for letterboxing. Source video,
camera, checkpoint and array hashes accompany the export. An AnyPos track on
the reference video is an estimate, not ground-truth simulator pose; small
localization errors remain visible. The alternative immutable GT cache differs
slightly and was not mixed into these selected direct GT tracks.

The private `demo-annotations` audit includes extraction receipts, calibrated
projections, start/middle/end visual checks and `annotation-verification.json`.
These checks establish traceable overlays, not perfect pose accuracy or complete
task success.

## Real-world experiments

The `#real-world-experiments` section contains two empty cards labeled
**Video forthcoming**. They reserve places for verified robot videos; no
synthetic experiment image, video, result or success claim is provided.

## Trajectory differences relative to GT

The gallery now displays **24 model/reference comparisons**: six cases ×
WorldSync and the three Expanded baselines. Each model is compared with that
case's same displayed AnyPos GT-reference track. The GT column says
**Reference trajectory** and does not display an artificial self-error of zero.
These are differences between estimated tracks, not errors against simulator
robot-pose ground truth.

The labels and units are:

- **Pose DTW vs GT ↓:** weighted pose distance, printed to five decimals. For
  each arm, FastDTW uses the per-pair cost
  `sqrt(||p_pred(i) - p_ref(j)||² + (0.05 × geodesic_rad(R_pred(i), R_ref(j)))²)`.
  Positions are in metres; the fixed rotation scale is 0.05 m/rad. Divide each
  arm's accumulated cost by its alignment-path length, then average the arms
  equally. This is not pure position error, a probability, or navigation-style
  nDTW similarity.
- **Position:** centimetres, averaged along each arm's **same pose-DTW path**,
  then averaged equally across arms and printed to two decimals.
- **Rotation:** degrees, using the geodesic rotation error along those same
  paths and the same arm averaging, printed to two decimals.

Lower values indicate closer estimated trajectories. Position and rotation
are not independently optimized DTW paths. There is no GT-extent normalization,
exponentiation or visual-gate penalty; gate results remain separate. DTW allows
timing shifts, whereas the visible video synchronization still uses normalized
clip progress. Gripper open/close values and object motion are not part of this
pose metric.

The computation uses the frozen accepted **main50** pose scorer and FastDTW
implementation. Historical 140-row StateMajor rules are not substituted.
The source tracks remain eighteen reused artifacts plus twelve CPU FP32
Cosmos-Predict2.5/CtrlWorld tracks. The twelve WorldSync/DreamDojo comparisons
reproduce the recorded raw scores exactly. CPU annotation comparisons can
differ from historical CUDA BF16 predictions and model-specific GT caches;
the demo consistently uses one displayed reference per case.

Model/reference video hashes, checkpoint identity and both sides' xyz/rotation
array hashes bind each displayed comparison to its tracks. Missing or
mismatched data displays a dash; null is never treated as zero.
Changing task/model replaces the numbers with the corresponding pair. Values
are shown unchanged when a baseline is closer than WorldSync; for example,
Cosmos-Predict2.5 has lower Pose DTW on the microphone-handover case, and
DreamDojo has lower Pose DTW on the move-stapler case.

The private `demo-scores/trajectory-metrics.md` and `trajectory-metrics.json`
record all 24 pairs, same-path component errors, source/array/checkpoint/video
hashes and differences from historical scores. `compute_trajectory_metrics.py`
uses a debug reproduction before the complete calculation; the frozen scorer
module and FastDTW implementation hashes are recorded. This calculation runs
on existing arrays, without model inference, new video generation or rerunning
visual gates.

## Score boundary

The visual-gate numbers are existing report-lineage pack records. The newly
computed trajectory differences are demo-only comparisons of the displayed
AnyPos annotations. Neither replaces the paper's benchmark values. The
historical CtrlWorld/Cosmos-Predict2.5 colorfix arrays remain excluded.

The existing leaderboard is unchanged. The original 500-sample prescreen and
34-case visual review remain selected qualitative evidence rather than an
estimate of aggregate performance. The corrected media audit checks original
sources and temporal content for all 34 archived cases, but short sampled
frames can miss contact or release events. Gate passes, low trajectory
errors and recommendation labels do not establish task success.

## Local preview

```sh
npm run build
python3 scripts/preview.py --port 4190
```

Open `http://localhost:4190/#state-control`. The preview server supports byte
ranges required for video seeking. A plain `python -m http.server` can fully
load a video while still leaving its seekable range empty in Chromium.

Site tests: `npm test`. GT import gate: `python3 scripts/verify-rollout-media.py`.
The gate binds every video’s bytes, source/action/manifest hashes and frame
offset to the reviewed `scripts/rollout-gt-receipts.json`. It rejects missing
provenance, mismatched samples or actions, and near-static GT for
these known moving queries. It is an import check, not an action-following
metric. Use `--sources /path/to/source-files.json` to rehash private original
source files as well. The media-generation script, original assets, complete
SHA receipts, source index and AFE/metric review are retained in the separate
internal `20260915-demo-appendix` audit directory. The build copies only public
demo media/catalog, not the internal report or source-run metadata.
