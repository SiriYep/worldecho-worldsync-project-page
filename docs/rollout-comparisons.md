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

The section contains 34 reviewed cases with recovered simulator ground truth, twelve selectable baseline configurations, and WorldSync: 476 recordings. Existing scores from all 500 pack samples were used for prescreening; all 34 displayed cases received a seven-frame visual review against GT and all baselines. Six recommended cases also received an all-33-frame GT/WorldSync review. This does not mean all 500 samples were watched as videos.

The gallery initially shows six Recommended cases. Sixteen Backup, eight Not selected, and four Needs review cases remain accessible by clearing Recommended only. Per-case observations and cautions explain the selection. The personal Shortlist is saved in the browser and is independent of the review labels; both filters can be combined. The `#state-control` fragment remains for link compatibility. See [provenance, playback and preview documentation](rollout-demo.md) and [the selection method and recommendations](rollout-screening.md).

The separate interactive playground and the GitHub/Hugging Face release have their own requirements. The release still concerns a checkpoint trained on 50 tasks and minimal single-task inference; this gallery clarification does not change that scope.
