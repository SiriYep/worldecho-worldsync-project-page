# Result table provenance

The website reproduces every row and numeric value of Tables 1 and 2 from the public arXiv v1 paper, https://arxiv.org/html/2608.24885v1 (25 August 2026). Verified 12 September 2026 against the public HTML and local manuscript `overleaf-6a4e16c53ee74fbcfe34c4d1`, revision `12fa131ed7c2a954260e8025b4f60e103f2f8b27`, `sections/04_experiments.tex`.

- Table 1 (`#S4.T1`; source lines 119–156): 13 configurations, three metrics, 50 RoboTwin tasks. All values are task-macro averages. Expert baselines use 20k updates, expanded baselines 40k, and WorldSync 60k.
- Table 2 (`#S4.T2`; source lines 222–242): five variants, three metrics, four RoboTwin tasks, averaged over eight common checkpoints. The public paper does not enumerate the four task names or checkpoint steps. Do not invent them or combine this table with the 50-task results.
- Gated error and raw NDTW are lower-is-better; visual pass is a percentage and higher-is-better. The website preserves four decimals for errors and two decimals for percentages. Bold numbers mark the best in each column; the full method row has a subtle background. Table 1 groups each baseline model’s two configurations under a shared row heading. Expert and Expanded abbreviate the full training regime names defined above the table; all configurations remain visible. Both tables align their metric columns and use a local horizontal scroller on narrow screens.
- Full means expanded coverage with IE and AFE. The ablation does not establish that AFE alone improves trajectory error: IE alone has the lowest raw NDTW, AFE alone the highest visual pass, and Full the lowest gated error.

These are the paper's published experiment results, not a new evaluation performed for the website. No unpublished supplementary runs, new plots, or inferred trial counts are added.
