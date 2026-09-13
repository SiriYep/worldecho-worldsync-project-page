# Model organization marks

Verified 13 September 2026. One transparent mark per leaderboard model identifies its primary research institution or developer, not an exhaustive author list or endorsement. Each model name links to its official project or paper for full credits. The WorldSync author masthead remains unchanged.

| Model | Displayed marks | Attribution source |
| --- | --- | --- |
| WorldSync | Peking University | [Paper and full author affiliations](https://arxiv.org/abs/2608.24885) |
| CtrlWorld | Stanford | [Official project](https://ctrl-world.github.io/) |
| DreamDojo | NVIDIA | [Official repository](https://github.com/NVIDIA/DreamDojo) |
| Cosmos-Predict2.5 | NVIDIA | [Official repository](https://github.com/nvidia-cosmos/cosmos-predict2.5) |
| Motus | Tsinghua | [Official project](https://motus-robotics.github.io/motus) and [CVPR paper](https://openaccess.thecvf.com/content/CVPR2026/papers/Bi_Motus_A_Unified_Latent_Action_World_Model_CVPR_2026_paper.pdf) |
| LingBotVA | Robbyant (Ant Group) | [Official repository](https://github.com/Robbyant/lingbot-va); [organization introduction](https://github.com/Robbyant) identifies Robbyant as an Ant Group company |
| Cosmos3 | NVIDIA | [Official Cosmos repository](https://github.com/NVIDIA/Cosmos) |

Motus lists Tsinghua, ShengShu, Peking University, and Horizon Robotics in its paper; the row uses Tsinghua, the primary affiliation shared by the first and corresponding authors. CtrlWorld uses Stanford, shared by its equal first authors and corresponding author Chelsea Finn; Tsinghua is also credited by the project. The later Motubrain brand is not substituted for the original paper affiliations. WorldSync displays the first author's university; its complete six-institution collaboration is already credited above the abstract.

## Original assets

All files live in `assets/model-organizations/` and preserve their official source artwork. PNG/ICO files are byte-identical downloads. Robbyant is the full transparent inline SVG from its official website header, extracted without changing its paths; the same SVG is inlined in the leaderboard with accessible labeling so its official `currentColor` fill follows the page theme. No cropping, tracing, color filters, redrawing, or format conversion. CSS preserves proportions without a backing, border, clipping, or color filter. Descriptive image alternatives and hover titles identify the organizations. All three university files have transparent alpha (including transparent corners); the Stanford white tree and outline are original artwork, not a backing. The opaque Robbyant organization avatar was discarded.

| Local asset | Official download | Format | SHA-256 |
| --- | --- | --- | --- |
| `stanford-mark.png` | [Stanford homepage icon](https://www.stanford.edu/icon1.png) | PNG, 192×192 | `d21f50b715ff8829645529aeceabf2b4168c200db9b068078bd9a0f7084ce3e8` |
| `pku-mark.png` | [PKU homepage icon](https://www.pku.edu.cn/pku_logo_red.png) | PNG, 360×360 | `b328ed3c9e579ec8c2031ad8a5b6c244994fba5d1e93cc98901d1fcc3c306bdb` |
| `tsinghua-mark.ico` | [Tsinghua homepage icon](https://www.tsinghua.edu.cn/favicon.ico) | ICO, original 24/16px frames | `44983bc3ed23e86996e1fcabce6a70426cdc6e2c73627fb2e818afca55d38479` |
| `nvidia.png` | [NVIDIA official GitHub organization avatar](https://avatars.githubusercontent.com/u/1728152?s=200&v=4) | PNG, 200×200 | `327be5a14d4b30db63f3bf74db2314ebdf051acd9163cddf5a2d24db7f5ef112` |
| `robbyant-wordmark.svg` | [Official Robbyant site header](https://technology.robbyant.com/) | SVG, 110×30.6 | `a746ecdfede589d28bd5bbd0a6bf3a3b5d0bd436da2040c565fbf0762690801e` |

Model names are read from explicit `data-lb-name` elements. Logo alternative text and affiliation names never enter the model IDs, rankings, or chart values. Both result plots and their legend reuse the same transparent marks. Models sharing the NVIDIA mark also show a short model name. The full model name remains in the legend and detail panel. Close logos may move to avoid overlap; connecting line endpoints preserve the measured coordinates. Repeated inline SVG clip-path IDs are made unique while retaining the original artwork.
