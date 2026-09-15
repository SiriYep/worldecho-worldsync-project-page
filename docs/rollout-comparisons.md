# Recorded rollout comparisons

User clarification, 13 September 2026: this gallery needs existing rollout videos from different models, compared with ground truth. It is not a 50-task checkpoint demo, a required AFE/state-control demonstration, or a live inference integration.

## Original material request (fulfilled September 15)

For each available case:

- A scene/task label and case identifier.
- The ground-truth rollout video.
- Corresponding rollout videos from WorldSync and the available comparison models, with each model named.
- Confirmation that the videos correspond to the same initial scene and action query so the comparison is meaningful.

There is no requirement to cover all 50 tasks. A checkpoint file, inference configuration, raw action file, or new inference run is not a prerequisite for this gallery. Checkpoint/version information and frame timing can be included when available, but the material request should focus on the recorded comparison videos. Select the displayed cases and model list from the actual supplied material.

Do not assign model names to the separate visual-collapse/action-mismatch clips without provenance; those older clips still lack a verified model mapping. The new gallery uses the separately supplied, indexed sample pack.

## Page status

The `#state-control` gallery now shows six recommended tasks and four Expanded baseline choices: Cosmos3, Cosmos-Predict2.5, CtrlWorld and DreamDojo. The interface shows task/model names, GT and WorldSync, each gate's recorded score and minimum requirement, and Play/Pause, Restart and seek. Training details, review labels, per-case cautions, metadata and shortlist controls are removed from this view; existing local shortlist storage is untouched.

The full 34-case, 476-recording catalog is retained for audit. Its selection history remains: all 500 pack samples received score prescreening, 34 cases received seven-frame inspection against GT and every baseline, and the six recommendations received an all-33-frame GT/WorldSync inspection. The current six-task view exposes 36 recordings across its model choices. This does not mean all 500 samples were watched as videos.

All 36 displayed recordings have calibrated AnyPos overlays; the checkbox toggles the layer, and missing or invalid data remains hidden. The source set contains twenty-four reused tracks, including the six restored Cosmos3 v1 artifacts, plus twelve CPU FP32 Cosmos-Predict2.5/CtrlWorld tracks.

The 30 model/GT comparisons appear in a table above the GT video. Its columns show the selected model's full name (Cosmos3, Cosmos-Predict2.5, CtrlWorld or DreamDojo) and WorldSync; its rows are NDTW, Pos. (cm) and Rot. (°). Each model's four visual gates remain above that model's video. NDTW follows the paper's path-normalized pose-DTW definition, using FastDTW's approximate alignment against the common displayed AnyPos GT-reference track; it is not a 0–1 navigation similarity or a comparison with simulator pose truth. The accepted main50 formula averages both component errors along the same pose-DTW alignment paths, without a gate penalty. GT receives no artificial self-error of zero. Missing or mismatched values display a dash, and lower baseline errors are shown unchanged. These are demo-only calculations on existing arrays, separate from historical visual-gate records and paper scores; StateMajor rules are not used.

The 30 model outputs have 120 recorded gate outcomes: 115 pass, 4 fail and 1 skipped; GT stays unscored. The resulting clip gate statuses are 25 pass, 4 fail and 1 incomplete, without implying task success. Cosmos3's cabinet smoothness check is skipped because no dynamic frame pairs were eligible; its playing-card quality score is shown as 0.3997 against the 0.400 minimum to preserve the visible threshold failure. The private `cosmos3-restore` audit records the six additional overlays/comparisons and 24 gate outcomes. When regenerating data, run the original annotation and score exports first, then merge the Cosmos3 supplement using `cosmos3-restore/apply_cosmos3.py --gates cosmos3-restore/gates/clip-bundle.json`; otherwise the original exporters can omit the restored model.

The separate Real-world experiments section has two Video forthcoming placeholders, with no experimental results implied. See [media, gate units and trajectory formulas](rollout-demo.md) and [selection evidence and caveats](rollout-screening.md).

The separate interactive playground and the GitHub/Hugging Face release have their own requirements. The release still concerns a checkpoint trained on 50 tasks and minimal single-task inference; this gallery clarification does not change that scope.
