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

The section now displays fourteen candidate cases with recovered simulator ground truth, twelve selectable baseline configurations, and WorldSync. The `#state-control` fragment remains for link compatibility. See [the current provenance, selection, playback and preview documentation](rollout-demo.md).

The separate interactive playground and the GitHub/Hugging Face release have their own requirements. The release still concerns a checkpoint trained on 50 tasks and minimal single-task inference; this gallery clarification does not change that scope.
