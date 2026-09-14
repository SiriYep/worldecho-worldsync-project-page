#!/usr/bin/env python3
"""Assemble the fourth expert-revised three-panel Figure 5."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib import colors as mcolors
from matplotlib import font_manager
from matplotlib.lines import Line2D
from scipy.stats import gaussian_kde


MODEL_ORDER = [
    "CtrlWorld",
    "Cosmos-Predict2.5",
    "Cosmos3",
    "DreamDojo",
    "Motus",
    "LingBotVA",
]
MODEL_MARKERS = {
    "CtrlWorld": "o",
    "Cosmos-Predict2.5": "s",
    "Cosmos3": "^",
    "DreamDojo": "D",
    "Motus": "P",
    "LingBotVA": "X",
}

BLUE = "#3D6F8E"
ORANGE = "#C9784A"
CONNECTOR = "#C4C2BD"
TEXT = "#292929"
MUTED = "#66645F"
SPINE = "#8E8C87"
GRID = "#D7D6D2"
ROW_BAND = "#F8F8F6"
EXPERT = "Demonstrated Action"
FAMILY_ORDER = (
    "Cross-State Replay",
    "Local Perturbation",
    "Policy Rollout",
    "Feasible-Space Sampling",
)
FAMILY_COLORS = {
    "Cross-State Replay": "#3F8F7D",
    "Local Perturbation": "#6B78A8",
    "Policy Rollout": "#B8758E",
    "Feasible-Space Sampling": "#D49A3A",
}
FAMILY_MARKERS = {
    "Cross-State Replay": "o",
    "Local Perturbation": "^",
    "Policy Rollout": "s",
    "Feasible-Space Sampling": "D",
}
DISPLAY_NAMES = {
    "Cross-State Replay": "Cross-state replay",
    "Local Perturbation": "Local perturbation",
    "Policy Rollout": "Policy rollout",
    "Feasible-Space Sampling": "Feasible-space sampling",
}
HDR_MASS = 0.95
DISPLAY_POINTS_PER_CATEGORY = 20
DISPLAY_SEED = 20260801


def register_times_new_roman() -> None:
    font_dir = Path("/usr/share/fonts/truetype/msttcorefonts")
    font_files = [
        font_dir / "Times_New_Roman.ttf",
        font_dir / "Times_New_Roman_Bold.ttf",
        font_dir / "Times_New_Roman_Italic.ttf",
        font_dir / "Times_New_Roman_Bold_Italic.ttf",
    ]
    missing = [str(path) for path in font_files if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing required Times New Roman files: {missing}")
    for path in font_files:
        font_manager.fontManager.addfont(path)
    font_manager.findfont("Times New Roman", fallback_to_default=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--panel-a-summary", required=True, type=Path)
    parser.add_argument("--panel-b-summary", required=True, type=Path)
    parser.add_argument("--panel-c-coordinates", required=True, type=Path)
    parser.add_argument("--panel-c-metadata", required=True, type=Path)
    parser.add_argument("--output-stem", required=True, type=Path)
    return parser.parse_args()


def configure_style() -> None:
    mpl.rcParams.update(
        {
            "font.family": "serif",
            "font.serif": ["Times New Roman", "Arial", "Helvetica"],
            "mathtext.fontset": "stix",
            "font.size": 7.2,
            "axes.linewidth": 0.75,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "legend.frameon": False,
            "svg.fonttype": "none",
            "pdf.fonttype": 42,
        }
    )


def style_cartesian_axes(ax: plt.Axes) -> None:
    ax.set_facecolor("white")
    for side in ("left", "bottom"):
        ax.spines[side].set_color(SPINE)
        ax.spines[side].set_linewidth(0.75)


def plot_panel_a(ax: plt.Axes, summary: pd.DataFrame) -> None:
    y = np.arange(len(MODEL_ORDER))[::-1]
    for row in range(len(MODEL_ORDER)):
        if row % 2 == 0:
            ax.axhspan(y[row] - 0.45, y[row] + 0.45, color=ROW_BAND, zorder=0)

    for index, model in enumerate(MODEL_ORDER):
        row = summary.loc[summary["model"] == model].iloc[0]
        expert = float(row["demonstrated_mean_m"])
        off_expert = float(row["off_expert_mean_m"])
        ax.plot(
            [expert, off_expert],
            [y[index], y[index]],
            color=CONNECTOR,
            linewidth=1.0,
            solid_capstyle="round",
            zorder=1,
        )
        ax.errorbar(
            expert,
            y[index],
            xerr=np.array(
                [[expert - float(row["demonstrated_ci95_low_m"])],
                 [float(row["demonstrated_ci95_high_m"]) - expert]]
            ),
            fmt=MODEL_MARKERS[model],
            color=BLUE,
            markeredgecolor="white",
            markeredgewidth=0.45,
            markersize=4.6,
            elinewidth=0.72,
            capsize=1.5,
            capthick=0.68,
            zorder=3,
        )
        ax.errorbar(
            off_expert,
            y[index],
            xerr=np.array(
                [[off_expert - float(row["off_expert_ci95_low_m"])],
                 [float(row["off_expert_ci95_high_m"]) - off_expert]]
            ),
            fmt=MODEL_MARKERS[model],
            color=ORANGE,
            markeredgecolor="white",
            markeredgewidth=0.45,
            markersize=4.6,
            elinewidth=0.72,
            capsize=1.5,
            capthick=0.68,
            zorder=3,
        )

    ax.set_xlim(0.0, 0.255)
    ax.set_ylim(-0.55, len(MODEL_ORDER) - 0.45)
    ax.set_yticks(y)
    ax.set_yticklabels(MODEL_ORDER, fontsize=7.0, color=TEXT)
    ax.set_xlabel("Integrity-gated error (m)", fontsize=8.0, color=TEXT, labelpad=3.0)
    ax.tick_params(axis="x", labelsize=7.0, colors=MUTED, length=2.2, width=0.6)
    ax.tick_params(axis="y", length=0, pad=3.0)
    ax.grid(axis="x", color=GRID, linewidth=0.52, alpha=0.38)
    ax.spines["left"].set_visible(False)
    style_cartesian_axes(ax)
    ax.spines["left"].set_visible(False)


def plot_panel_b(ax: plt.Axes, summary: pd.DataFrame) -> None:
    for model in MODEL_ORDER:
        rows = summary.loc[summary["model"] == model].set_index("condition")
        expert = rows.loc["Demonstrated"]
        off_expert = rows.loc["Off-expert average"]
        x0 = float(expert["raw_ndtw_mean_m"])
        y0 = float(expert["visual_failure_mean_pct"])
        x1 = float(off_expert["raw_ndtw_mean_m"])
        y1 = float(off_expert["visual_failure_mean_pct"])
        ax.annotate(
            "",
            xy=(x1, y1),
            xytext=(x0, y0),
            arrowprops={
                "arrowstyle": "-|>",
                "color": "#B9B7B2",
                "linewidth": 0.9,
                "mutation_scale": 5.0,
                "shrinkA": 4.2,
                "shrinkB": 4.2,
            },
            zorder=1,
        )
        marker = MODEL_MARKERS[model]
        ax.scatter(
            x0, y0, s=28, marker=marker, color=BLUE,
            edgecolor="white", linewidth=0.55, zorder=3,
        )
        ax.scatter(
            x1, y1, s=28, marker=marker, color=ORANGE,
            edgecolor="white", linewidth=0.55, zorder=3,
        )

    ax.set_xlim(0.0, 0.070)
    ax.set_ylim(0.0, 80.0)
    ax.set_xlabel("Raw NDTW (m)", fontsize=8.0, color=TEXT, labelpad=3.0)
    ax.set_ylabel("Visual failure rate (%)", fontsize=8.0, color=TEXT, labelpad=3.0)
    ax.tick_params(axis="both", labelsize=7.0, colors=MUTED, length=2.2, width=0.6)
    ax.grid(color=GRID, linewidth=0.52, alpha=0.30)
    style_cartesian_axes(ax)


def density_score(
    points: np.ndarray,
    xx: np.ndarray,
    yy: np.ndarray,
    mass: float,
    bandwidth_scale: float,
) -> np.ndarray:
    kde = gaussian_kde(
        points.T,
        bw_method=lambda estimator: estimator.scotts_factor() * bandwidth_scale,
    )
    density = kde(np.vstack([xx.ravel(), yy.ravel()])).reshape(xx.shape)
    ordered = np.sort(density.ravel())[::-1]
    cumulative = np.cumsum(ordered)
    threshold_index = min(
        int(np.searchsorted(cumulative, mass * cumulative[-1])),
        len(ordered) - 1,
    )
    threshold = max(float(ordered[threshold_index]), np.finfo(float).eps)
    return density / threshold


def stratified_display_mask(labels: np.ndarray) -> np.ndarray:
    """Select a deterministic visual subset while retaining all points for KDEs."""
    mask = np.zeros(labels.shape[0], dtype=bool)
    for category in (EXPERT, *FAMILY_ORDER):
        candidates = np.flatnonzero(labels == category)
        count = min(DISPLAY_POINTS_PER_CATEGORY, candidates.size)
        ranked = sorted(
            candidates,
            key=lambda index: hashlib.sha256(
                f"{DISPLAY_SEED}|{category}|{int(index)}".encode("utf-8")
            ).hexdigest(),
        )
        selected = ranked[:count]
        mask[selected] = True
    return mask


def plot_panel_c(
    ax: plt.Axes,
    coordinates: pd.DataFrame,
    variance_ratio: list[float],
) -> tuple[list[Line2D], list[Line2D]]:
    points = coordinates[["pca_1", "pca_2"]].to_numpy(dtype=float)
    labels = coordinates["category"].to_numpy()
    expert = points[labels == EXPERT]
    display_mask = stratified_display_mask(labels)

    xpad = max(float(np.ptp(points[:, 0])) * 0.30, 0.50)
    ypad = max(float(np.ptp(points[:, 1])) * 0.26, 0.45)
    domain = (
        float(points[:, 0].min() - xpad),
        float(points[:, 0].max() + xpad),
        float(points[:, 1].min() - ypad),
        float(points[:, 1].max() + ypad),
    )
    x = np.linspace(domain[0], domain[1], 320)
    y = np.linspace(domain[2], domain[3], 320)
    xx, yy = np.meshgrid(x, y)

    expert_score = density_score(
        expert, xx, yy, mass=HDR_MASS, bandwidth_scale=0.80
    )
    family_scores = []
    for family in FAMILY_ORDER:
        family_points = points[labels == family]
        family_scores.append(
            density_score(
                family_points, xx, yy, mass=HDR_MASS, bandwidth_scale=0.72
            )
        )
    # The off-expert support is the union of family-wise 95% HDRs. This avoids
    # implying continuous density between genuinely separated action modes.
    off_expert_score = np.maximum.reduce(family_scores)

    ax.set_facecolor("white")
    ax.contourf(
        xx,
        yy,
        off_expert_score,
        levels=[1.0, float(off_expert_score.max()) + 1e-6],
        colors=[mcolors.to_rgba(ORANGE, 0.045)],
        zorder=1,
    )
    ax.contour(
        xx,
        yy,
        off_expert_score,
        levels=[1.0],
        colors=[ORANGE],
        linewidths=1.10,
        linestyles=[(0, (2.2, 1.2))],
        zorder=2,
    )
    ax.contourf(
        xx,
        yy,
        expert_score,
        levels=[1.0, float(expert_score.max()) + 1e-6],
        colors=[mcolors.to_rgba(BLUE, 0.050)],
        zorder=3,
    )
    ax.contour(
        xx,
        yy,
        expert_score,
        levels=[1.0],
        colors=[BLUE],
        linewidths=1.10,
        linestyles=[(0, (2.2, 1.2))],
        zorder=4,
    )

    for family in FAMILY_ORDER:
        family_points = points[(labels == family) & display_mask]
        ax.scatter(
            family_points[:, 0],
            family_points[:, 1],
            s=16.5,
            marker=FAMILY_MARKERS[family],
            color=FAMILY_COLORS[family],
            alpha=0.78,
            edgecolors="white",
            linewidths=0.25,
            rasterized=True,
            zorder=6,
        )
    displayed_expert = points[(labels == EXPERT) & display_mask]
    ax.scatter(
        displayed_expert[:, 0],
        displayed_expert[:, 1],
        s=16.5,
        marker="o",
        color=BLUE,
        alpha=0.78,
        edgecolors="white",
        linewidths=0.25,
        rasterized=True,
        zorder=7,
    )

    ax.set_xlim(domain[0], domain[1])
    ax.set_ylim(domain[2], domain[3])
    ax.set_xlabel(
        f"PC1 ({variance_ratio[0] * 100:.1f}% variance)",
        fontsize=7.7,
        color=MUTED,
        labelpad=3.0,
    )
    ax.set_ylabel(
        f"PC2 ({variance_ratio[1] * 100:.1f}% variance)",
        fontsize=7.7,
        color=MUTED,
        labelpad=3.0,
    )
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    category_handles = [
        Line2D(
            [],
            [],
            linestyle="none",
            linewidth=0,
            marker="o",
            markerfacecolor=mcolors.to_rgba(BLUE, 0.70),
            markeredgecolor=BLUE,
            markeredgewidth=0.3,
            markersize=4.2,
            label="Expert",
        )
    ]
    category_handles.extend(
        Line2D(
            [],
            [],
            linestyle="none",
            linewidth=0,
            marker=FAMILY_MARKERS[family],
            markerfacecolor=mcolors.to_rgba(FAMILY_COLORS[family], 0.70),
            markeredgecolor=FAMILY_COLORS[family],
            markeredgewidth=0.3,
            markersize=4.2,
            label=DISPLAY_NAMES[family],
        )
        for family in FAMILY_ORDER
    )
    support_handles = [
        Line2D([], [], color=BLUE, linewidth=1.10, linestyle=(0, (2.2, 1.2)),
               label="Expert 95% HDR"),
        Line2D([], [], color=ORANGE, linewidth=1.10, linestyle=(0, (2.2, 1.2)),
               label="Off-expert 95% HDR"),
    ]
    return category_handles, support_handles


def main() -> None:
    args = parse_args()
    register_times_new_roman()
    configure_style()
    summary_a = pd.read_csv(args.panel_a_summary)
    summary_b = pd.read_csv(args.panel_b_summary)
    coordinates_c = pd.read_csv(args.panel_c_coordinates)
    metadata_c = json.loads(args.panel_c_metadata.read_text(encoding="utf-8"))
    variance_ratio = metadata_c["explained_variance_ratio"]

    fig = plt.figure(figsize=(7.05, 2.20), facecolor="white")
    grid = fig.add_gridspec(
        1,
        3,
        width_ratios=[1.00, 1.08, 1.44],
        left=0.115,
        right=0.995,
        bottom=0.11,
        top=0.79,
        wspace=0.28,
    )
    ax_a = fig.add_subplot(grid[0, 0])
    ax_b = fig.add_subplot(grid[0, 1])
    ax_c = fig.add_subplot(grid[0, 2])
    for ax in (ax_a, ax_b):
        position = ax.get_position()
        ax.set_position([position.x0, 0.20, position.width, 0.52])
    c_position = ax_c.get_position()
    ax_c.set_position([c_position.x0, 0.11, c_position.width, 0.68])
    plot_panel_a(ax_a, summary_a)
    plot_panel_b(ax_b, summary_b)
    category_handles, support_handles = plot_panel_c(ax_c, coordinates_c, variance_ratio)

    heading_y = 0.982
    heading_artists = []
    for ax, letter, title in (
        (ax_a, "a", "Off-expert gap"),
        (ax_b, "b", "Failure landscape"),
        (ax_c, "c", "Expanded evaluation coverage"),
    ):
        position = ax.get_position()
        letter_artist = fig.text(
            0,
            heading_y,
            letter,
            fontsize=10.8,
            fontweight="bold",
            ha="left",
            va="top",
            color="#1F1F1F",
        )
        title_artist = fig.text(
            0,
            heading_y,
            title,
            fontsize=8.85,
            fontweight="normal",
            ha="left",
            va="top",
            color="#1F1F1F",
        )
        heading_artists.append((position, letter_artist, title_artist))

    # Center each complete heading, including the panel letter, over its axes.
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    figure_width_px = fig.bbox.width
    heading_gap = 0.010
    for position, letter_artist, title_artist in heading_artists:
        letter_width = letter_artist.get_window_extent(renderer).width / figure_width_px
        title_width = title_artist.get_window_extent(renderer).width / figure_width_px
        group_width = letter_width + heading_gap + title_width
        group_left = position.x0 + position.width / 2 - group_width / 2
        letter_artist.set_x(group_left)
        title_artist.set_x(group_left + letter_width + heading_gap)

    shared_handles = [
        Line2D([], [], marker="o", linestyle="none", linewidth=0, markersize=4.5,
               markerfacecolor=BLUE, markeredgecolor="white", label="Expert"),
        Line2D([], [], marker="o", linestyle="none", linewidth=0, markersize=4.5,
               markerfacecolor=ORANGE, markeredgecolor="white", label="Off-expert average"),
    ]
    a_position = ax_a.get_position()
    b_position = ax_b.get_position()
    ab_center = (a_position.x0 + b_position.x1) / 2
    fig.legend(
        handles=shared_handles,
        loc="upper center",
        bbox_to_anchor=(ab_center, 0.855),
        ncol=2,
        fontsize=7.3,
        columnspacing=1.0,
        handletextpad=0.4,
        borderaxespad=0,
    )

    c_position = ax_c.get_position()
    c_center = c_position.x0 + c_position.width / 2
    fig.legend(
        handles=category_handles[:3],
        loc="upper center",
        bbox_to_anchor=(c_center - 0.040, 0.900),
        ncol=3,
        fontsize=6.65,
        columnspacing=0.55,
        handletextpad=0.25,
        borderaxespad=0,
    )
    fig.legend(
        handles=category_handles[3:],
        loc="upper center",
        bbox_to_anchor=(c_center, 0.848),
        ncol=2,
        fontsize=6.65,
        columnspacing=0.65,
        handletextpad=0.25,
        borderaxespad=0,
    )
    ax_c.legend(
        handles=support_handles,
        loc="upper center",
        bbox_to_anchor=(0.31, 0.99),
        ncol=2,
        fontsize=6.15,
        handlelength=2.0,
        handletextpad=0.35,
        columnspacing=0.75,
        borderaxespad=0,
        frameon=False,
    )

    args.output_stem.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output_stem.with_suffix(".svg"), facecolor="white")
    fig.savefig(args.output_stem.with_suffix(".pdf"), facecolor="white")
    fig.savefig(args.output_stem.with_suffix(".png"), dpi=300, facecolor="white")
    fig.savefig(
        args.output_stem.with_suffix(".tiff"),
        dpi=600,
        facecolor="white",
        pil_kwargs={"compression": "tiff_lzw"},
    )
    plt.close(fig)


if __name__ == "__main__":
    main()
