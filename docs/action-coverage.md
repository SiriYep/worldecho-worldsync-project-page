# Interactive action coverage — Figure 5c

The website uses the figure owner's source data from `figure5.zip`, received from Chen Sixiang on 14 September 2026. It replaces the static-only Figure 5c presentation with category highlighting and Action queries / Density coverage views. The earlier model-average scatter/distribution is not part of this module.

## Source and scope

- Archive SHA-256: `7a032baf9fade606cef993b20d9b6734b0904c99c311af11341d35b6681c1c47`.
- Coordinates: `assets/figures/action-coverage/figure5c_expert_offexpert_pca.csv`.
- Metadata: `assets/figures/action-coverage/figure5c_expert_offexpert_pca_metadata.json`.
- Author's plotting script: `assets/figures/action-coverage/figure5_abc_expert_revised_v4.py` (retained for provenance, never imported or executed by the exporter).
- Original PDF: `assets/figures/paper-figure-5.pdf`.
- Browser data: `assets/figures/action-coverage/figure5c.json`.

The population is **250 event-aligned state-conditioned action samples from `adjust_bottle`, one task**. Each of five categories contains 50 samples. This is a PCA feature projection, not robot workspace coordinates or a time trajectory. PC1 explains 22.9% and PC2 18.0% of variance. It must not be described as the distribution over all 50 benchmark tasks.

The paper displays a deterministic subset of 20 samples per category. The exporter reproduces its SHA256 ordering with seed `20260801`, preserving the selected CSV row order and the fitted coordinates. It does not fit PCA, synthesize points, or infer missing raw actions.

| Category | Color | Marker |
| --- | --- | --- |
| Expert | `#3D6F8E` | Circle |
| Cross-state replay | `#3F8F7D` | Circle |
| Local perturbation | `#6B78A8` | Triangle |
| Policy rollout | `#B8758E` | Square |
| Feasible-space sampling | `#D49A3A` | Diamond |

## Density definition

All 50 samples per category contribute to its 95% highest-density region (HDR). The exporter reproduces the author's SciPy Gaussian KDE, Scott bandwidth multipliers, 320 × 320 grid, cumulative-density threshold, and Matplotlib contour extraction. Expert uses bandwidth scale 0.80; each off-expert family uses 0.72. Off-expert support is the union of the four family HDRs; it is not a KDE fitted to the combined 200 off-expert samples.

The plot uses the original domain derived from all 250 points, including the paper's padding. Category and view changes never recalculate coordinates, contours, or bounds. Density coverage shows support regions rather than a heatmap of density values. No one-dimensional action distribution is claimed: the archive does not contain that export or raw action vectors.

## Interaction and failure handling

- Click a category or a displayed point to highlight its complete category. Other point clouds and the aggregate context contours fade.
- Click the same category again or All to restore the paper's complete view.
- Switch between Action queries and Density coverage without losing the selected category.
- All uses the original expert/off-expert outlines. A selected category uses its own exported HDR while retaining dim aggregate outlines as context.
- Native buttons support keyboard activation, pressed state, visible focus, and an accessible live selection summary. Reduced-motion settings disable fades.
- `script.js` loads and validates the JSON before replacing the original static figure. Missing, malformed, or unavailable data leaves the original figure visible.

Use the local HTTP preview (`http://127.0.0.1:4187/#results-explorer`) rather than a `file://` URL, because the page uses JavaScript modules and fetches JSON.

## Reproduction and validation

See [the asset provenance record](../assets/figures/action-coverage/README.md) for input checksums, the export command, and package versions. The default site build requires only Node; Python scientific packages are needed only to regenerate the committed JSON.

`tests/action-coverage.test.mjs` exercises validation, actual category/view button listeners, complete-group highlighting, unchanged coordinates, source-domain positioning, invalid-contour rejection, and preservation of the hidden fallback host on errors. Run `npm test`, `npm run build`, and `git diff --check` before handing off a change.
