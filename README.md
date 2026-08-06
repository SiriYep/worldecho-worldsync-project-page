# WorldEcho & WorldSync private project-page preview

This is a static, build-free project page for the anonymous WorldEcho & WorldSync submission:

- **WorldEcho** evaluates action following with broader action queries, a visual-integrity gate, and SE(3) end-effector trajectory alignment.
- **WorldSync** expands action coverage and adds training-only dynamics grounding and intervention-effect supervision.

## Local preview

Serve this directory with any static HTTP server, then open `index.html`. The page uses only local fonts, figures, posters, and videos.

## Design system

`styles.css` holds the tokens, header, hero, and overview; `sections.css` holds everything from the WorldEcho section down; `responsive.css` holds only breakpoints. Keep new work inside the existing token set:

- **Four semantic accents, no more.** `--echo` (blue) marks the benchmark and in-distribution material, `--sync` (crimson) marks the method and "ours", `--warn` (amber) marks failure, `--ref` (teal) marks simulator ground truth. Every rollout rail, tag, and legend swatch follows this mapping, so a new colour would break the reading. Use the `-deep` variants for anything under ~11px — the base hues do not clear 4.5:1 at that size.
- **One card language.** White surface, 1px `--line` border, `--radius-lg`, `--shadow-1`, lifting to `--shadow-2` on hover. Section backgrounds alternate `--paper` and `--surface` to separate bands; cards stay white throughout.
- **The query ladder is a ramp, not a palette.** `--q1`…`--q5` are a single blue darkening from in-distribution to off-expert, paired with the fill meter on each card. Do not give the five queries unrelated hues.
- **Type.** Space Grotesk for display, Inter for prose, Space Mono for labels and data. Only 400/500/600/700 are bundled, so avoid intermediate weights — they synthesise.

## Review-status guardrails

The synced manuscript explicitly prohibits public distribution during anonymous review. This site therefore:

- includes `noindex` metadata and a `robots.txt` deny rule;
- withholds author identities and all public paper/code/data links;
- labels quantitative results as provisional;
- omits unsupported real-robot and policy-improvement claims;
- remains explicitly labelled as review-only material despite the public preview URL.

Before converting this review preview into a final public release, confirm venue policy, replace draft figures and results, add final authors and affiliations, add verified resource links, remove the private-review notices, and perform a fresh content review against the final paper.

## Source material

The page content and copied media come from the WorldEcho & WorldSync project hub and the synced paper repository. The interaction and layout patterns were informed by the local LaST-HD and LaST-R1 project pages, while the visual identity is specific to WorldEcho and WorldSync.
