# Recorded rollout comparisons

User clarification, 13 September 2026: this gallery needs existing rollout videos from different models, compared with ground truth. It is not a 50-task checkpoint demo, a required AFE/state-control demonstration, or a live inference integration.

## Materials to request

For each available case:

- A scene/task label and case identifier.
- The ground-truth rollout video.
- Corresponding rollout videos from WorldSync and the available comparison models, with each model named.
- Confirmation that the videos correspond to the same initial scene and action query so the comparison is meaningful.

There is no requirement to cover all 50 tasks. A checkpoint file, inference configuration, raw action file, or new inference run is not a prerequisite for this gallery. Checkpoint/version information and frame timing can be included when available, but the material request should focus on the recorded comparison videos. Select the displayed cases and model list from the actual supplied material.

Do not assign model names to the existing visual-collapse/action-mismatch clips without provenance; those clips currently lack a verified model mapping. Use real paired recordings, and keep the gallery pending until they arrive.

## Page status

The section is titled “Rollout comparisons” and reserves slots for ground truth, other-model rollouts, and WorldSync. These are still placeholders; no new videos have been received or fabricated. The existing `#state-control` fragment remains solely for link compatibility.

The separate interactive playground and the GitHub/Hugging Face release have their own requirements. The release still concerns a checkpoint trained on 50 tasks and minimal single-task inference; this gallery clarification does not change that scope.
