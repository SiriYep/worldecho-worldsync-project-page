# Paper figure provenance

All paper figure images displayed by the website are direct raster renders of the corresponding paper assets. The accompanying PDFs are copied byte-for-byte; no content is redrawn, rearranged, or removed. Rendering respects each original PDF CropBox, which is the figure boundary used by the paper.

- Source: the WorldEcho / WorldSync Overleaf paper checkout (`overleaf-6a4e16c53ee74fbcfe34c4d1`).
- Verified paper revision: `12fa131ed7c2a954260e8025b4f60e103f2f8b27` (2026-09-06); remote checked 2026-09-10.
- Figure numbering and labels follow the paper. Figures 1, 3, and 4 are displayed; the static Figure 2 is retained as an original asset but its on-page panel is replaced by the vertical experiment-video comparison. See `evidence-media.md` for that separate media provenance.

| Paper figure | Source asset | LaTeX label | Website PDF / PNG stem | PNG dimensions |
| --- | --- | --- | --- | --- |
| 1 | `assets/figure1.pdf` | `fig:teaser` | `assets/figures/paper-figure-1` | 3200 x 1673 |
| 2 | `assets/figure2.pdf` | `fig:motivation` | `assets/figures/paper-figure-2` | 3200 x 868 |
| 3 | `assets/figure3.pdf` | `fig:benchmark` | `assets/figures/paper-figure-3` | 3200 x 695 |
| 4 | `assets/figure4.pdf` | `fig:method-overview` | `assets/figures/paper-figure-4` | 3200 x 1706 |

After the abstract, Part I introduces the action-following problem and WorldEcho with Figure 3, followed by diagnostic videos. Part II introduces WorldSync training with Figure 4. Both figures are displayed once; their paper numbering, captions, and source assets are unchanged.

## Reproduce the PNGs

From the website repository root, after copying each source PDF to its matching destination:

```sh
for number in 1 2 3 4; do
  pdftoppm -f 1 -singlefile -cropbox -scale-to-x 3200 -scale-to-y -1 -png \
    "assets/figures/paper-figure-${number}.pdf" \
    "assets/figures/paper-figure-${number}"
done
```

## SHA-256

| Website asset | SHA-256 |
| --- | --- |
| `assets/figures/paper-figure-1.pdf` | `3911c10a877de19282735a74d86dff1d3686178e017e9b37d718ca6b0d1e4cd9` |
| `assets/figures/paper-figure-1.png` | `9bd6ee942a0d646be88d7c5d74ea87a3778e3b8317d8cea1e08b0215657658b3` |
| `assets/figures/paper-figure-2.pdf` | `0e04f8b9c85ef83858ae886a9fa1a0706fa3a879ee4b4096bdba37eebc833606` |
| `assets/figures/paper-figure-2.png` | `8e9583099364582e953d5b26d8cd3152f4efecdaf6e40814ca6aaecf91537348` |
| `assets/figures/paper-figure-3.pdf` | `a3987be78ed1198d698a12838d713664046613708b189efbca4cb3de6573fa16` |
| `assets/figures/paper-figure-3.png` | `855cfa956917fcd02ccaaf2e32796cab16184f958a4e7c59815d977e4123c05f` |
| `assets/figures/paper-figure-4.pdf` | `c3fa135ac11e7652cdcadda169bee2d9d00fc8cc84a0424dc37edb2880ea8f5f` |
| `assets/figures/paper-figure-4.png` | `aa884c79476d69289445bcb56371f7e6cb0f32472932cdb345fa7c3d1b8bd3c5` |

## Replaced assets

The previous WorldEcho and WorldSync schematics were not identical to the current paper figures. The previous diagnosis strip also differed from the paper figure. They were replaced by the original paper renders above. The separate `trajectory-comparison.png` had no matching figure in the active paper source and was removed. Previous versions remain available in Git history.
