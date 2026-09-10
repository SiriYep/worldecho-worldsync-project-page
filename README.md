# WorldEcho & WorldSync project page

This is a static project page for the WorldEcho & WorldSync preprint:

- **WorldEcho** evaluates action following with broader action queries, a visual-integrity gate, and SE(3) end-effector trajectory alignment.
- **WorldSync** expands action coverage and adds training-only dynamics grounding and intervention-effect supervision.

## Local preview

Serve this directory with any static HTTP server, then open `index.html`. The page uses only local fonts, figures, posters, and videos.

For example, run `python3 -m http.server 4186 --bind 127.0.0.1` and open `http://127.0.0.1:4186/`.
Run `npm run build` to produce the deployable static page in `dist/client`.
Run `npm test` for the grouped-playback behavior tests; no dependency installation is needed.

## Rollout comparisons

The nine-clip hero montage and three-clip failure lab each have shared play/pause, restart, and timeline controls. Each group waits for its clips and aligns their normalized playback progress over the complete duration. This is a viewing aid, not an assertion that the source timestamps are aligned. Switching tasks preserves the viewer's playback choice. Videos pause outside the viewport or while the tab is hidden, and reduced-motion viewers start with still frames and can choose to play. Without JavaScript, the evidence clips retain native video controls and the decorative hero remains a still montage. Hero tiles crop the footage for composition; the evidence section shows the complete source frames without color treatment.

The five MPEG-4 Part 2 clips have been converted to H.264 for browser compatibility. Their frame counts, frame rates, dimensions, and durations are unchanged. The original encodings remain in Git history. `grab-mismatch.mp4` retains its original 22 fps / 1.5-second duration, while the other clips are 30 fps / 1.1 seconds.

## Design system

The page uses a cinematic hero followed by an editorial research narrative: paper links, research team, overview, visual evidence, benchmark, method, results, and abstract. The user requested inspiration from [Code as Worlds](https://mirros-lab.github.io/code-as-world/) and [Track4World](https://jiah-cloud.github.io/Track4World.github.io/). No media or source code from those sites is used.

- `styles.css`: shared tokens, typography, navigation, hero, overview, and playback controls.
- `sections.css`: research sections, figures, evidence stage, tables, dialog, and their responsive rules.
- `responsive.css`: shared layout, hero, navigation, and reduced-motion rules.
- `publication.css`: author and affiliation layout, wide scientific media, and original-size figure links.
- **Palette:** deep forest backgrounds and ivory reading surfaces, with muted jade for WorldEcho and warm copper for WorldSync. Use fine rules instead of shadows or nested cards.
- **Type:** Georgia for large editorial headings, locally bundled Inter for body copy, and Space Mono for restrained metadata. Use supported weights 400/500/600/700.
- **Identity:** the header and footer share a typography-only WorldEcho & WorldSync wordmark. Jade and copper distinguish Echo and Sync; a subdued Georgia ampersand connects the names. The generic orbit symbol has been removed.
- **Media:** the hero uses nine existing clips as an atmospheric montage. The scientific comparison stage retains three equal, uncropped video viewports with task selection and accessible controls. Keep the published results and training-budget context intact.
- **Rhythm:** a 1180px reading width with figures and demos up to 1600px, 110px desktop section spacing, and short section introductions. Figure numbers match the paper.

## Publication and attribution

The paper was publicly released on arXiv on 25 August 2026:

- [arXiv:2608.24885](https://arxiv.org/abs/2608.24885)
- [Complete paper PDF](https://arxiv.org/pdf/2608.24885)

The ten authors, their order, six affiliations, core-contributor markers, and corresponding-author markers match the public PDF and the current manuscript. The page exposes these verified resources and removes the obsolete anonymous-review notices. It does not invent code, dataset, or personal-profile links.

The displayed Table 1 values match the public preprint. Preserve the different training budgets: expert baselines use 20k updates, expanded baselines 40k, and WorldSync 60k. The website shows selected rows; the complete comparison is in the paper.

Site changes remain local until an explicit publishing request. No deployment is implied by updating the local preview.

## Source material

All scientific figures must come directly from the paper. The page now displays paper Figures 1, 2, 3, and 4, rendered from the original PDFs at the paper's CropBox without redrawing, relabeling, or rearranging their contents. Each caption links to the byte-identical source PDF. Figure dialogs also offer a full-size PNG link, preserving the entire image at its exported resolution. See [figure provenance and rendering recipe](docs/paper-figures.md) for the verified paper revision and checksums.

The previous website schematics were not identical to the current paper, and the separate trajectory plot had no corresponding figure in the active manuscript. Those four legacy image assets have been removed. Rollout videos and their posters remain experiment media inherited from the project-page repository; they are not labeled as manuscript figures. Interface icons are decorative UI elements.
