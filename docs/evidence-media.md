# Evidence media provenance

Audit date: 2026-09-11.

## Reference input images

No standalone conditioning observation or per-clip input/action manifest was found in the website assets, its existing provenance documents, or the inspected manuscript assets. The three new images below are lossless RGB exports of frame 0 from the existing simulator recordings. They are **first recorded simulator frames**, not verified model-conditioning observations. They preserve the complete 320 x 240 frame: no crop, scaling, retouching, or redrawing was applied.

Recommended visible label: **Reference input - First recorded simulator frame**. Do not claim that these are authenticated initial observations supplied to the recorded world-model runs. The `assets/inputs/` directory is a presentation location, not a stronger provenance claim.

| Scene | New image | Source recording | Zero-based frame | Dimensions |
| --- | --- | --- | --- | --- |
| grab | `assets/inputs/grab-start.png` | `assets/videos/grab-gt.mp4` | 0 | 320 x 240 |
| handover | `assets/inputs/handover-start.png` | `assets/videos/handover-gt.mp4` | 0 | 320 x 240 |
| bread | `assets/inputs/bread-start.png` | `assets/videos/bread-gt.mp4` | 0 | 320 x 240 |

The older `assets/posters/*-gt.png` files are not initial frames: `grab-gt.png` exactly matches frame 22, while `handover-gt.png` and `bread-gt.png` match frame 20 of their corresponding 30 fps recordings. They are retained for existing uses and were not modified.

### Reproduce extraction

From the website root:

```sh
for scene in grab handover bread; do
  ffmpeg -v error -i "assets/videos/${scene}-gt.mp4" -map 0:v:0 \
    -frames:v 1 -c:v png -pix_fmt rgb24 -update 1 \
    "assets/inputs/${scene}-start.png"
done
```

Each output image's decoded RGB bytes were compared with a fresh raw RGB decode of the source video's first frame and matched exactly. All three GT clips are 320 x 240, 33 frames, 30 fps, and 1.1 seconds.

### SHA-256

| Asset | SHA-256 |
| --- | --- |
| `assets/videos/grab-gt.mp4` | `fb526f6708f372acbd8e8d17a201331e31cc4a2b0b0af1681848349baa0742a5` |
| `assets/inputs/grab-start.png` | `9ac4937fade0076589925b476958ed6240fae0b470d191ff3024552e3203dce0` |
| `assets/videos/handover-gt.mp4` | `13e7353336b4efa0e949555037228f5bfc1215cef2688d3c763b778aaa514609` |
| `assets/inputs/handover-start.png` | `dc00aedfdfef52f61fbf6b52082330878391b8f89354b914ec840e0e769a36a9` |
| `assets/videos/bread-gt.mp4` | `ab80ba0bd5e949eaef675b7794c768a28f05f0895ffc9cf77d68ded91e4b82d1` |
| `assets/inputs/bread-start.png` | `50b409141e12b8ae07f4c384e0924b7dc0ebf4b29328bfc6e7bf970ba7e90806` |

## Model-output identities

The repository pairs each scene with `*-collapse.mp4` and `*-mismatch.mp4`, respectively labeled visual collapse and action mismatch. Their container and stream tags identify video encoders, not the world model, training regime, checkpoint, or conditioning actions. No per-file model mapping was found.

The inspected manuscript's motivation section describes fine-tuning Cosmos-Predict2.5 on expert demonstrations and observing both failure modes (`sections/03_method.tex`, lines 42-57, revision `12fa131ed7c2a954260e8025b4f60e103f2f8b27`). This paragraph alone does not establish the identity of each repository video. Do not assign the clips to different named models or imply that two model outputs necessarily come from two different models.

Recommended labels: **Simulator ground truth**, **Model output 1 - Visual collapse**, and **Model output 2 - Action mismatch**. The source clips are prerecorded examples, not outputs generated from the interactive action draft.

## Paper Figure 3 integrity

`assets/figures/paper-figure-3.pdf` exists and is byte-identical to the manuscript's `assets/figure3.pdf`. The PNG remains the previously verified direct CropBox render, 3200 x 695 pixels. Both hashes still match `docs/paper-figures.md`:

- PDF: `a3987be78ed1198d698a12838d713664046613708b189efbca4cb3de6573fa16`
- PNG: `855cfa956917fcd02ccaaf2e32796cab16184f958a4e7c59815d977e4123c05f`

The source HTML references Figure 3 inside `#worldecho`, with a direct `#figure-3` anchor and eager loading. Paper figures no longer depend on the generic reveal animation. Browser inspection confirmed the reported broken image while the local preview server on port 4186 was stopped; after restarting it, the PNG returned HTTP 200 with the verified hash above.
