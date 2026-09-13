# Results and interactive chart provenance

The website uses the published Table 1 task-macro means from arXiv v1, https://arxiv.org/html/2608.24885v1 (25 August 2026). Rechecked on 13 September 2026 against the local `Paper-AF/sections/04_experiments.tex`, lines 136–156, and the existing website values. The original public-paper check used `overleaf-6a4e16c53ee74fbcfe34c4d1` revision `12fa131ed7c2a954260e8025b4f60e103f2f8b27`.

## Displayed comparison

Per the authors’ 13 September website TODO, the leaderboard removes the six Expanded/MIX4 baseline rows. It retains the six Expert baselines and WorldSync Expanded. Table 2 (component ablation) is omitted from the page. All original configurations remain in the linked paper; their omission does not change the published results.

| Model | Training | Updates | Gated error ↓ | Raw NDTW ↓ | Visual pass (%) ↑ |
| --- | --- | ---: | ---: | ---: | ---: |
| WorldSync | Expanded | 60k | 0.0661 | 0.0223 | 84.51 |
| CtrlWorld | Expert | 20k | 0.0716 | 0.0266 | 83.89 |
| DreamDojo | Expert | 20k | 0.0805 | 0.0210 | 78.97 |
| Cosmos-Predict2.5 | Expert | 20k | 0.0894 | 0.0190 | 75.09 |
| Motus | Expert | 20k | 0.1116 | 0.0548 | 75.09 |
| LingBotVA | Expert | 20k | 0.1148 | 0.0473 | 71.83 |
| Cosmos3 | Expert | 20k | 0.1432 | 0.0572 | 63.94 |

Each value is a macro average over 50 RoboTwin tasks. Training data and budgets differ: Expert baselines use 20k updates, WorldSync uses expanded action coverage and 60k updates. This is not an equal-budget comparison.

The default rank uses gated error ascending. Raw NDTW also sorts ascending; visual pass sorts descending. Ties use competition ranks (1, 2, 2, 4); medals track the selected metric. Bold marks the best value among these seven displayed models, preserving four decimal places for errors and two for percentages. The static HTML remains readable without JavaScript.

## Interactive plots

The explorer reads the same seven HTML leaderboard rows. It does not keep an independent score copy. Each scatter point represents one model mean: x is selectable gated error or raw NDTW (lower is better), y is visual pass in percent (higher is better). Selection exposes all three scores and the training budget.

The metric-distribution view shows only the seven displayed model means. Its median is a descriptive statistic across those models, not an aggregate task score or an uncertainty estimate. No per-task distribution, confidence interval, synthetic density, generated samples, or implied experiment time series is shown. Metric-switch motion is a UI transition, not a training trajectory.

The paper’s Figure 5c contains an action-space PCA visualization, but no underlying point coordinates were found locally. An interactive action-space distribution must wait for the actual coordinates. The available four-task AFE supplementary CSVs do not match the 50-task Table 1 population and must not be substituted.

These are published experiment results, not a new evaluation run for the website.
