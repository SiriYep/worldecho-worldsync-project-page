# Rollout screening and recommendations

Review date: 15 September 2026.

The gallery retains **34 cases and 476 recordings**, including six recommended
comparisons. It combines fourteen initial candidates with twenty additions
selected after screening the existing scores for all 500 samples in the source
pack. Every displayed case includes restored simulator GT, WorldSync and all
twelve baseline configurations. This is a deliberately selected qualitative
review set; its averages would not estimate population performance.

## Selection procedure and evidence

1. **Freeze identities.** Use the 6,500-row pack index (500 common queries ×
   13 configurations) and canonical main50 manifest identified in
   [media provenance](rollout-demo.md). Match chunk, task, family, action hash
   and shared input across all thirteen configurations before comparing scores.
2. **Prescreen existing records.** Use `ee_trajectory_accuracy` from index and
   metrics records. It is dual-arm pose NDTW combining position and rotation,
   with lower values preferred. The historical field `raw_m` is not pure
   position error. Compute best, median and raw win counts separately for the
   six Expert and six Expanded configurations. Define advantage as
   `baseline − WorldSync`; positive values favor WorldSync. Do not discard
   baselines from the raw comparison when their visual gate fails. Preserve
   source gate values and flag missing or skipped checks.
3. **Construct a review queue.** The frozen screening script ranks by diagnostic
   category, then descending Expert raw wins, best advantage and median
   advantage, then ascending WorldSync raw value and chunk ID. Its raw ceiling
   of 0.03, stored maximum-arm GT position extent floor of 0.05 m, best-advantage
   threshold of 0.002 and median-advantage threshold of 0.005 are review
   heuristics. They are not benchmark thresholds or claims of physical
   position accuracy. The position extent comes from existing records and can
   miss rotation-dominated actions.
4. **Freeze twenty additional IDs.** Prefer available original video sources and
   different tasks: three PCA perturbations, three raw perturbations, seven
   uniform feasible actions and seven weighted feasible actions. All twenty
   have source WorldSync gate pass, raw ≤ 0.03 and stored GT extent ≥ 0.05 m;
   WorldSync has lower raw error than at least five of six Expert baselines and
   three to six Expanded baselines. These are source-available candidates from
   the queue, not simply the first twenty ranked rows. Clean HDF5 and
   counterfactual replay were omitted from this additional batch. The exact
   frozen ID list is necessary to reproduce the subset.
5. **Restore and verify GT.** Extract the canonical 33-frame window from each
   original simulator source, bind source/action/manifest/offset and exported
   file hashes, and verify the imported media against reviewed receipts.
   Repeated conditioning-image MP4s from the source pack are rejected. See
   [GT correction and import checks](rollout-demo.md#gt-correction-2026-09-15).
6. **Inspect all 34 displayed cases.** Compare GT, WorldSync and every baseline
   at seven fixed normalized-progress positions. For 33-frame clips the frame
   indices are `0, 5, 11, 16, 21, 27, 32`; for 32-frame clips they are
   `0, 5, 10, 16, 21, 26, 31`. Inspect motion direction, endpoint, gripper and
   object geometry, contact or release, and scene stability. Record competing
   baselines and defects in WorldSync as well as visible advantages.
7. **Review the six recommendations more closely.** Inspect all 33 GT and
   WorldSync frames in image sequences before assigning the final labels and
   per-case observation/caution text. This adds coverage of intermediate
   poses but is not a complete playback review of every baseline.

The reproducible internal record is in
`20260915-demo-appendix/case-screening/`: `build_score_screening.py`,
`score-screening.json`, the full 500-row `candidate-ranking.csv`,
`selected-ranked-ids.json`, `selected-ranked-candidates.json`,
`ranked-import-audit.md`, `visual-screening-34.csv`, individual visual-review
reports and `finalist-sequences/`. The frozen twenty-ID list has SHA-256
`e5c37d60922f3b814a8b700db44761982d8a50c126ecc1a604837217618e11f9`.
These audit inputs are retained separately from the public website; rerunning
that screening requires the audit files. The public
[`catalog.json`](../assets/rollout-demo/catalog.json) records the actual 34
sample IDs and reviews, and
[`rollout-gt-receipts.json`](../scripts/rollout-gt-receipts.json) binds their GT
exports. The selection record, rather than a future changing score rank, fixes
this review batch.

## Review labels and browser filters

| Label | Count | Meaning for this gallery |
| --- | ---: | --- |
| Recommended | 6 | A useful short comparison, with the stated caveats |
| Backup | 16 | Usable secondary comparison; often small motion, limited separation or visible defects |
| Not selected | 8 | Visible mismatch or deformation makes it unsuitable as a positive main example |
| Needs review | 4 | Fine motion, contact, release or geometry needs closer playback inspection |

All 34 remain available. Recommended only is enabled initially and can be
combined with Shortlisted only. The personal shortlist starts empty and saves
only sample IDs in that browser. It never changes automatically with review
labels. All samples clears both filters. Each option includes the task and
query subtype because the same task can have several distinct chunks.

## Six recommended comparisons

These observations refer to short 32-action windows, not completion of the task
named in the source dataset. In particular, a wrist adjustment within a
stacking or object-transfer task does not demonstrate successful stacking or
transfer.

| Task / query subtype | What to inspect | Main limitation and comparison |
| --- | --- | --- |
| `move_playingcard_away` / Uniform feasible action | Watch the left wrist move upward and inward while the right arm stays fixed. WorldSync follows the direction and keeps the hand and card recognizable. | WorldSync stops slightly below the GT endpoint. Compare the full motion, not a single final frame; several Expanded models also move in the right direction. |
| `handover_mic` / PCA perturbation | Follows the GT wrist rotation and downward shift in the second half. | The mic-tip color differs; Cosmos-Predict2.5 Expanded also tracks the motion well. |
| `blocks_ranking_size` / Uniform feasible action | Watch the left wrist lift beside the purple blocks while the right arm holds its position. WorldSync follows this change and preserves the objects. | Cosmos-Predict2.5 and CtrlWorld Expanded are also competitive. The clip shows a wrist adjustment, not completion of the ranking task. |
| `put_object_cabinet` / Uniform feasible action | Preserves both arms and the held green object during the left-arm adjustment. | The final forearm rotation is slightly conservative; compare CtrlWorld and DreamDojo Expanded. |
| `move_stapler_pad` / Uniform feasible action | Watch the left wrist rotate and lower above the pad. WorldSync follows the change while the other arm and tabletop remain stable. | This is a short wrist-motion example, not a completed object transfer. Some Expanded baselines also follow the motion. |
| `shake_bottle_horizontally` / PCA perturbation | Tracks the right forearm entering view and the accompanying wrist adjustment. | The bottle barely moves; Cosmos-Predict2.5 and DreamDojo Expanded are similarly close. |

Exact recommended sample IDs, in initial gallery order:

- `random_feasible_uniform_move_playingcard_away_ep0001_start0041_seed0009_s0109_cw32`
- `perturbed_pca_handover_mic_ep0028_start0059_seed0003_s0000_cw32`
- `random_feasible_uniform_blocks_ranking_size_ep0001_start0071_seed0008_s0036_cw32`
- `random_feasible_uniform_put_object_cabinet_ep0001_start0082_seed0012_s0249_cw32`
- `random_feasible_uniform_move_stapler_pad_ep0000_start0081_seed0013_s0027_cw32`
- `perturbed_pca_shake_bottle_horizontally_ep0048_start0023_seed0003_s0000_cw32`

## Limits of the evidence

- **Review coverage:** all 500 samples received score prescreening; 34 received
  seven-frame visual inspection across GT and all models; six received an
  all-33-frame GT/WorldSync image-sequence inspection. This is not a claim of
  watching all 500 samples as videos. Successful full decoding establishes
  readable media, not a human judgment of the complete motion. Brief contact,
  release and gripper events can still require enlarged playback.
- **Score lineage:** the pack's gated/pass records precede later paper
  rescoring. CtrlWorld and Cosmos-Predict2.5 include legacy AnyPos result/NPY
  files alongside newer index/metrics scores; the prescreen does not use those
  old arrays or recompute metrics. Detailed records were checked for the
  audited subsets and all 500 WorldSync records, without certifying every
  baseline metric JSON in the 6,500-row pack. The subset does not independently
  reproduce the paper's full-protocol means.
- **Comparison conditions:** Expert, Expanded and WorldSync use 20k, 40k and
  60k training steps respectively. LingBotVA is video-only, and inspected
  historical scoring uses its 32-frame window while other configurations use
  33. Its interface is not the same action-conditioned interface as the other
  models. The gallery presents both baseline regimes and names competitive
  Expanded models in the recommendations.
- **Timing and encoding:** the gallery and contact sheets align normalized
  clip progress. Different frame rates and lengths do not establish matching
  physical times or support speed/latency conclusions. GT exports and some
  model clips are lossy H.264 transcodes; frames are neither cropped nor
  silently added to equalize the videos.
- **Coverage and outcome:** the 34 cases span four query types and six subtypes;
  the twenty additions span only two query types and four subtypes. The
  cross-state replay bread-in-basket case still lacks recoverable original
  RGB and remains omitted. The recommendations themselves cover PCA
  perturbation and uniform feasible actions. They do not represent every
  task/query family, prove task success, or establish that WorldSync beats
  every baseline.

No new model inference or scoring was performed for this screening. Existing
paper figures and leaderboard results are unchanged.
