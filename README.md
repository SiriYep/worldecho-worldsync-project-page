# WorldEcho & WorldSync project page

This is a static project page for the WorldEcho & WorldSync preprint:

- **WorldEcho** evaluates action following with broader action queries, a visual-integrity gate, and SE(3) end-effector trajectory alignment.
- **WorldSync** expands action coverage and adds training-only dynamics grounding and intervention-effect supervision.

## Local preview

Build the static page and use the preview server with video byte-range support:

```sh
npm run build
python3 scripts/preview.py --port 4190
```

Open `http://127.0.0.1:4190/#state-control`. The build is in `dist/client`; the page uses local fonts, figures, logos, posters and videos. `npm test` covers the browser logic, grouped playback and trajectory overlay calculations. No dependency installation is needed.

## Interactive interface preview

The Playground section supports three experiment scenes, independent left/right arm drafts, translation and rotation step sizes, gripper commands, scoped keyboard shortcuts, undo/reset, and a JSON download. It runs entirely in the browser. Generate rollout remains disabled until an inference service is connected.

Reference images are recorded simulator frames, not initial observations. The optional recorded simulator example is independent of the drafted actions and is explicitly labeled. Neither editing commands nor playing an example invokes a model or moves a robot. The exported deltas describe UI axes only; they are not an agreed robot or inference API. See [preview behavior and integration notes](docs/wm-interface-preview.md).

## Rollout comparisons

The evidence section places a compact input reference above a horizontal row of three videos: simulator ground truth, Model output 1 (visual collapse), and Model output 2 (action mismatch). On phones the outputs stay in one row inside a labeled, keyboard-focusable horizontal scroller with a visible scroll hint. The input is the first recorded simulator frame, not a verified model-conditioning observation; the files do not include the numerical action query or a reliable per-clip model identity. See [evidence media provenance](docs/evidence-media.md). The duplicate static paper Figure 2 has been removed from the page.

The three output videos share play/pause, restart, and a timeline that stays available while scrolling the comparison. The group waits for all clips and aligns their normalized playback progress over the complete duration. This is a viewing aid, not an assertion that source timestamps are aligned. Switching tasks updates the input frame and all three clips while preserving the viewer's playback choice. Videos pause when the comparison is outside the viewport or the tab is hidden. Reduced-motion viewers start with still frames and can choose to play. Without JavaScript, each output retains native video controls. All evidence media shows complete source frames without color treatment.

The five MPEG-4 Part 2 clips have been converted to H.264 for browser compatibility. Their frame counts, frame rates, dimensions, and durations are unchanged. The original encodings remain in Git history. `grab-mismatch.mp4` retains its original 22 fps / 1.5-second duration, while the other clips are 30 fps / 1.1 seconds.

## Design system

The page opens with a centered white paper masthead: project title, paper subtitle, authors, complete numbered affiliations, contributor notes, and resource links. The earlier decorative video background is removed. This follows the information density of [Hi-WM](https://hi-wm.github.io/) and [WorldSimProbe](https://evophys.com/WorldSimProbe/). A compact institutional logo band leads directly into the full abstract. Observed action-following failures appear immediately after the abstract: the existing videos contrast simulator ground truth with visual collapse and action mismatch. Part I then introduces WorldEcho to quantify these failures; Part II introduces WorldSync training, followed by results and the interactive preview. The dense paper Figure 1 overview is retained as an asset but is no longer displayed. Earlier visual references include [Code as Worlds](https://mirros-lab.github.io/code-as-world/) and [Track4World](https://jiah-cloud.github.io/Track4World.github.io/). No media, scientific content, or source code from these reference sites is used.

- `styles.css`: shared tokens, typography, navigation, hero, introductory spacing, and playback controls.
- `sections.css`: research sections, figures, evidence stage, tables, dialog, and their responsive rules.
- `leaderboard.js`: metric sorting and competition ranks for the seven displayed models.
- `action-coverage.js` / `action-coverage.css`: interactive Figure 5c action queries and density coverage, using the figure owner's exported PCA coordinates and original HDR method.
- `responsive.css`: shared layout, hero, navigation, and reduced-motion rules.
- `publication.css`: author and affiliation layout with official institution logos, wide scientific media, and original-size figure links.
- `wm-preview.css`, `wm-preview.js`, and `wm-preview-state.js`: responsive Playground, browser interactions, and validated immutable action drafts.
- **Appearance:** white page backgrounds are the default regardless of system preference. A header toggle switches between light and neutral dark mode and remembers the choice when local storage is available. `theme.js` restores the preference early; `theme.css` is loaded last. Scientific figures, videos, and institution logos retain their original pixels and colors in either mode. Use fine rules instead of shadows or nested cards.
- **Type:** Georgia for large editorial headings, locally bundled Inter for body copy, and Space Mono for restrained metadata. Use supported weights 400/500/600/700.
- **Identity:** the header and footer share a typography-only WorldEcho & WorldSync wordmark. Neutral text tones and a subdued Georgia ampersand adapt to the selected theme. The generic orbit symbol has been removed.
- **Media:** the evidence section uses one compact reference frame and three side-by-side, uncropped output videos with task selection and shared playback. Paper Figure 3 has an explicit anchor and eager loading; paper figures do not depend on reveal animations. Keep published results and training-budget context intact.
- **Research order:** After the abstract, Part I first shows action-following failures through the diagnostic videos, then introduces WorldEcho to quantify them with paper Figure 3 and evaluation metrics. The five query types are summarized in the benchmark introduction, without a separate row of large cards. Part II introduces WorldSync training with paper Figure 4, its three training components, evaluation results, and the interactive preview. Each original figure is displayed once with zoom and PDF links. The former `research-scope` anchor points to the WorldEcho introduction, and `overview` remains a compatible entry into the abstract. Navigation follows the same order: Abstract, Failure cases, Benchmark, Method, Leaderboard, Playground, and Demos, with Team first.
- **Abstract:** placed directly after the institution band and before the failure examples and WorldEcho benchmark, it uses a centered Abstract heading and an 880px reading column, followed by paper links. Preserve the complete public arXiv v1 wording and its original single-paragraph format. The primary presentation references remain Hi-WM and WorldSimProbe.
- **Rhythm:** a 1180px reading width with paper figures centered at the same maximum width; video demos can extend to 1600px. Compact paper metadata and institution logos lead into short section introductions. The abstract has 64px desktop spacing above and below; later desktop sections keep their 110px spacing. Figure numbers match the paper.

## Publication and attribution

The paper was publicly released on arXiv on 25 August 2026:

- [arXiv:2608.24885](https://arxiv.org/abs/2608.24885)
- [Complete paper PDF](https://arxiv.org/pdf/2608.24885)

The ten authors, their order, six affiliations, core-contributor markers, and corresponding-author markers match the public PDF and the current manuscript. The page exposes these verified resources and removes the obsolete anonymous-review notices. It does not invent code, dataset, or personal-profile links.

All six affiliation marks are sourced from the institutions themselves and stored locally in `assets/institutions/`. Their original colors and proportions are preserved on a compact white band (six columns on wide screens, three on tablets, and two on phones). Full affiliation names remain visible beside the authors and provide accessible names for each institutional link. See [institution logo provenance](docs/institution-logos.md).

The leaderboard presents seven entries from public Table 1: six Expert baselines (20k updates) and WorldSync with expanded coverage (60k updates). Expanded/MIX4 baseline rows and component-ablation Table 2 are omitted at the authors’ request. All 13 configurations remain in the linked paper. Visitors can rank by gated error, raw NDTW, or visual pass; equal scores share competition ranks, the first three ranks receive medal icons, and bold values indicate the best **among displayed models**. Numeric precision and unequal training budgets remain visible. One small transparent official mark per model identifies its primary research institution or developer, with model names linking to the full project credits; see [model logo provenance](docs/model-logos.md). Without JavaScript, the complete seven-model default ranking remains readable.

The action-coverage section renders Figure 5c with automatic hover highlighting and Action queries / Density coverage views. Moving over a point cloud or density region highlights the complete category; moving into empty space or leaving the plot restores all. Category buttons also support keyboard and touch selection. Both views preserve the source PCA coordinates and display bounds. The figure covers the single `adjust_bottle` task: all 50 samples per category are displayed (250 points total), and 95% HDR is estimated from the same full population. The off-expert outline is the union of four independently estimated family regions. The original paper image remains visible if the data cannot load. See [source, reproduction, and interaction details](docs/action-coverage.md).

The fourth-part rollout gallery shows six selected tasks, with GT and WorldSync beside one of four comparison models: Cosmos3, Cosmos-Predict2.5, CtrlWorld or DreamDojo. The four baselines use Expanded configurations; the selectors show task and model names only. Play/Pause, Restart and a common seek slider control the three videos. Each model's four gates show recorded scores and minimum requirements above its video, with a binary arm-integrity exception; the 30 model outputs have 120 gate records (115 pass, 4 fail and 1 skipped). Above the GT video, a table compares the selected model and WorldSync in three rows: NDTW, Pos. (cm) and Rot. (°). Its comparison column directly shows the selected model's full name. GT remains an unscored reference. NDTW is path-normalized pose DTW, approximated with FastDTW, against the same estimated AnyPos reference; it is not a 0–1 navigation similarity. These 30 demo-only comparisons use the main50 pose-DTW path without a gate penalty; lower baseline values remain visible. All 36 displayed recordings have calibrated AnyPos trajectory overlays, with an on/off control. A separate Real-world experiments section contains two cards labeled Video forthcoming.

The complete 34-case catalog and 476 recordings remain as audit material; the six-task interface exposes 36 recordings across its model choices. Review labels, cautions, sample details and shortlist controls are removed from the main view, while previously stored shortlist IDs remain untouched. The supplied pack’s repeated-image GT was replaced with canonical simulator sources; one cross-state replay case remains omitted because its original RGB is unavailable. The six tasks cover PCA perturbations and uniform feasible actions. Playback aligns normalized clip progress. These selected short recordings do not estimate aggregate performance or establish task completion. See [media, gate and trajectory provenance](docs/rollout-demo.md) and [selection method and recommendations](docs/rollout-screening.md).

The separate GitHub/Hugging Face release retains its previously agreed 50-task-trained checkpoint and minimal single-task inference scope.

Site changes remain local until an explicit publishing request. No deployment is implied by updating the local preview.

## Source material

Published paper figures must come directly from the paper. The results section uses Table 1 for its leaderboard and Figure 5c for action-query coverage. The page also displays paper Figures 3 and 4, rendered from the original PDFs at the paper's CropBox without redrawing, relabeling, or rearranging their contents. Each caption links to the byte-identical source PDF. Figure dialogs also offer a full-size PNG link, preserving the entire image at its exported resolution. Figures 1 and 2 remain as original assets; Figure 1 is omitted from the page to avoid front-loading the full paper overview, and Figure 2 is not displayed alongside the video replacement. See [figure provenance and rendering recipe](docs/paper-figures.md) for the verified paper revision and checksums.

The previous website schematics were not identical to the current paper, and the separate trajectory plot had no corresponding figure in the active manuscript. Those four legacy image assets have been removed. Rollout videos and their posters remain experiment media inherited from the project-page repository; they are not labeled as manuscript figures. Interface icons are decorative UI elements.
