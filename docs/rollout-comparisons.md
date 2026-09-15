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

The `#state-control` gallery now shows six recommended tasks and three Expanded baseline choices: Cosmos-Predict2.5, CtrlWorld and DreamDojo. The interface shows task/model names, GT and WorldSync, four compact recorded gate indicators, and Play/Pause, Restart and seek. Training details, review labels, per-case cautions, metadata and shortlist controls are removed from this view; existing local shortlist storage is untouched.

The full 34-case, 476-recording catalog is retained for audit. Its selection history remains: all 500 pack samples received score prescreening, 34 cases received seven-frame inspection against GT and every baseline, and the six recommendations received an all-33-frame GT/WorldSync inspection. The current six-task view exposes 30 recordings across its model choices. This does not mean all 500 samples were watched as videos.

All 30 displayed recordings have calibrated AnyPos overlays; the checkbox toggles the layer, and missing or invalid data remains hidden. GT gate labels identify an unscored reference. The separate Real-world experiments section has two Video forthcoming placeholders, with no experimental results implied. See [media and annotation provenance](rollout-demo.md) and [selection evidence and caveats](rollout-screening.md).

The separate interactive playground and the GitHub/Hugging Face release have their own requirements. The release still concerns a checkpoint trained on 50 tasks and minimal single-task inference; this gallery clarification does not change that scope.
