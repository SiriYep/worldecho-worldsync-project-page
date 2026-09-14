# Figure 5c: verified action-query coverage data

Source: the `figure5.zip` supplied by the figure author on 14 September 2026.
The archive's `assets/figure5/README.md` identifies
`scripts/figures/figure5_abc_expert_revised_v4.py` as the current Figure 5.
The supplied v4 PDF is byte-identical to the site's existing
`assets/figures/paper-figure-5.pdf` (SHA-256
`645f8b8868b1fdf2094d09e57c636d0c281f28378b31342be5eb8431ef0231da`).

## Population and display

This plot concerns **one task, `adjust_bottle`**, with 250 event-aligned action
chunks: 50 in each of the five action categories. It is not a distribution over
50 tasks, over model scores, or over 50 trained checkpoints. The source metadata
describes a shared PCA fitted to standardized action/state descriptors, with
variance ratios `0.22912324965000153` and `0.180138498544693`. The exporter uses
the supplied PCA coordinates directly and does not fit or transform PCA again.

The paper displays exactly 20 of the 50 rows in each category, 100 points total.
For each category, it sorts global zero-based CSV data-row indices by
`SHA256("20260801|{original category label}|{row index}").hexdigest()`, takes
the first 20, and renders those selected rows in original CSV order. The header
is not a data row. `group.pointRows` records these exact source indices;
`group.totalCount` remains 50. The complete unchanged 250-row CSV is retained.

| Source category | Website ID | Label | Color | Shape |
| --- | --- | --- | --- | --- |
| Demonstrated Action | `expert` | Expert | `#3D6F8E` | circle |
| Cross-State Replay | `cross-state-replay` | Cross-state replay | `#3F8F7D` | circle |
| Local Perturbation | `local-perturbation` | Local perturbation | `#6B78A8` | triangle |
| Policy Rollout | `policy-rollout` | Policy rollout | `#B8758E` | square |
| Feasible-Space Sampling | `feasible-space-sampling` | Feasible-space sampling | `#D49A3A` | diamond |

## Density coverage

Density estimation uses **all 50 rows of each category**, including rows not
shown as scatter markers. The algorithm reproduces the supplied v4 script:

1. Expand the full 250-point x range on both sides by
   `max(0.30 * x_range, 0.50)` and the y range by
   `max(0.26 * y_range, 0.45)`. Use a 320 by 320 regular grid over this domain.
2. Estimate each category's density with `scipy.stats.gaussian_kde`; bandwidth
   is Scott's factor times `0.80` for Expert or `0.72` for each off-expert family.
3. Sort grid density values descending. The first value reaching 95% of their
   cumulative sum is the HDR threshold. Normalize the density by that threshold.
4. Export the level-1 contour with Matplotlib's contour backend. Coordinates in
   `hdrPaths` and `regions.paths` remain in the original PCA coordinate system.
5. Expert support is Expert's HDR. Off-expert support is the **union of the four
   independently estimated family HDRs**, obtained as the level-1 contour of
   their pointwise maximum normalized score. It is not a KDE fitted to a mixed
   200-point population, a convex hull, or an ellipse.

`group.hdrPaths` exposes each verified family HDR for category selection.
The paper's All view uses only the two top-level `regions`: Expert (blue) and
the four-family union (orange). Multiple paths preserve disconnected regions.
If paths are filled together, preserve their subpaths/holes (for example, use
SVG `fill-rule="evenodd"`). No one-dimensional density is introduced.

Original display settings are recorded in `provenance.paperDisplay`: automatic
aspect ratio, no ticks/spines, marker area 16.5 pt squared, opacity 0.78, white
0.25 pt marker edges, and the original HDR fill/line/dash settings. Browser
layout may resize the panel while preserving the exported coordinate domain.

## Reproduce

The exporter only needs the files in this directory. It does not run or import
the supplied figure script, register its server fonts, access training paths,
or invoke remote inference. The copied figure script is provenance only.

```sh
python scripts/export-action-coverage.py
```

Dependencies are NumPy, pandas, SciPy and Matplotlib. The committed export was
generated and reproduced with Matplotlib 3.11.1, SciPy 1.18.1, NumPy 2.5.3,
pandas 3.0.5 and contourpy 1.3.3; the source PDF was created with Matplotlib
3.10.8. These versions and the contour algorithm are recorded in
`provenance.versions` and `provenance.hdr`. The exported aggregate regions retain
the paper's two Expert and three Off-expert contour paths. To stage a fresh verified
copy from the original extracted archive:

```sh
python scripts/export-action-coverage.py --source-dir /path/to/extracted/figure5
```

The exporter checks the three input hashes below and refuses unreviewed source
revisions. JSON includes the same hashes, all display row indices, density
thresholds and dependency versions. Repeated exports in the same environment
produce identical bytes; no timestamp or machine-specific path is embedded.

| Input | SHA-256 |
| --- | --- |
| `figure5c_expert_offexpert_pca.csv` | `69892cc0425af80e1631d37767118dea62ce09cf3d711d4b762bef26e5b63194` |
| `figure5c_expert_offexpert_pca_metadata.json` | `79237e859f2c87a7282c3f6d979641a6e8ac611d10202ac421f9fc59c3e69509` |
| `figure5_abc_expert_revised_v4.py` | `312f15a9b50450dce8785fa28caca96e0bc4801cfc2f652ddccbdd56779228ab` |

## JSON interface

- `groups`: `id`, `label`, `color`, `shape`, `points` (20 coordinate pairs),
  `pointRows`, `totalCount` (50), and `hdrPaths` (closed PCA-coordinate paths).
- `projection`: `xLabel`, `yLabel`, `explainedVariance`, `domain: {x, y}`.
- `regions`: `id`, `label`, `color`, `groupIds`, and closed `paths`.
- `source`: visible `label` and the original figure `url`.
- `provenance`: task, population, descriptor, PCA description, sample counts,
  deterministic sampling rule, HDR recipe/thresholds, display settings, hashes,
  and dependency versions.
