#!/usr/bin/env python3
"""Export the audited Figure 5c coordinates and original KDE/HDR geometry.

The figure owner's script is copied as provenance, never imported or run.
No PCA is fitted here. All coordinates come from the supplied 250-row CSV.
Requires NumPy, pandas, SciPy, and Matplotlib (validated with 3.11.1).
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil

import matplotlib
matplotlib.use("Agg")
from matplotlib.figure import Figure
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ASSETS = ROOT / "assets/figures/action-coverage"
FILES = {
    "figure5c_expert_offexpert_pca.csv": (
        "assets/figure5/source_data/figure5c_expert_offexpert_pca.csv",
        "69892cc0425af80e1631d37767118dea62ce09cf3d711d4b762bef26e5b63194",
    ),
    "figure5c_expert_offexpert_pca_metadata.json": (
        "assets/figure5/source_data/figure5c_expert_offexpert_pca_metadata.json",
        "79237e859f2c87a7282c3f6d979641a6e8ac611d10202ac421f9fc59c3e69509",
    ),
    "figure5_abc_expert_revised_v4.py": (
        "scripts/figures/figure5_abc_expert_revised_v4.py",
        "312f15a9b50450dce8785fa28caca96e0bc4801cfc2f652ddccbdd56779228ab",
    ),
}
CATEGORIES = (
    ("Demonstrated Action", "expert", "Expert", "#3D6F8E", "circle"),
    ("Cross-State Replay", "cross-state-replay", "Cross-state replay", "#3F8F7D", "circle"),
    ("Local Perturbation", "local-perturbation", "Local perturbation", "#6B78A8", "triangle"),
    ("Policy Rollout", "policy-rollout", "Policy rollout", "#B8758E", "square"),
    ("Feasible-Space Sampling", "feasible-space-sampling", "Feasible-space sampling", "#D49A3A", "diamond"),
)
MASS = .95
GRID_SIZE = 320


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stage_sources(source_dir: Path | None, assets: Path) -> dict[str, str]:
    """Fail closed for changed material instead of silently mixing revisions."""
    checked = []
    for name, (source_name, expected) in FILES.items():
        path = source_dir / source_name if source_dir else assets / name
        if not path.is_file():
            raise ValueError(f"Missing Figure 5c source: {path}")
        actual = sha256(path)
        if actual != expected:
            raise ValueError(f"Source revision changed for {name}: {actual}; review before re-exporting")
        checked.append((name, path, actual))
    assets.mkdir(parents=True, exist_ok=True)
    if source_dir:
        for name, path, _ in checked:
            shutil.copyfile(path, assets / name)
    return {name: digest for name, _, digest in checked}


def display_rows(labels: np.ndarray, category: str) -> list[int]:
    # Show every source sample so disconnected HDR regions retain their points.
    return [int(index) for index in np.flatnonzero(labels == category)]


def density_score(points: np.ndarray, xx: np.ndarray, yy: np.ndarray, bandwidth: float):
    estimator = gaussian_kde(
        points.T,
        bw_method=lambda kde: kde.scotts_factor() * bandwidth,
    )
    density = estimator(np.vstack([xx.ravel(), yy.ravel()])).reshape(xx.shape)
    ordered = np.sort(density.ravel())[::-1]
    cumulative = np.cumsum(ordered)
    threshold_index = min(
        int(np.searchsorted(cumulative, MASS * cumulative[-1])), len(ordered) - 1
    )
    threshold = max(float(ordered[threshold_index]), np.finfo(float).eps)
    return density / threshold, threshold, float(estimator.factor)


def contour_paths(xx: np.ndarray, yy: np.ndarray, score: np.ndarray) -> list:
    # Same Matplotlib contour backend as the original, without drawing a page,
    # registering fonts, accessing remote paths, or running the supplied script.
    figure = Figure()
    axes = figure.add_subplot()
    contours = axes.contour(xx, yy, score, levels=[1.0])
    paths = [segment.tolist() for segment in contours.allsegs[0] if len(segment) >= 3]
    figure.clear()
    if not paths:
        raise ValueError("A 95% HDR unexpectedly produced no contour paths")
    for path in paths:
        if not np.isfinite(np.asarray(path)).all():
            raise ValueError("Non-finite contour coordinates")
        if not np.allclose(path[0], path[-1], rtol=0, atol=1e-12):
            raise ValueError("HDR contour reaches the grid boundary; review the source domain")
    return paths


def export(assets: Path, source_hashes: dict[str, str]) -> dict:
    coordinates = pd.read_csv(assets / "figure5c_expert_offexpert_pca.csv")
    metadata = json.loads((assets / "figure5c_expert_offexpert_pca_metadata.json").read_text())
    required = {"pca_1", "pca_2", "category", "split", "sample_id", "window_start"}
    if not required.issubset(coordinates.columns):
        raise ValueError("Figure 5c CSV is missing required columns")
    points = coordinates[["pca_1", "pca_2"]].to_numpy(dtype=float)
    labels = coordinates["category"].to_numpy()
    expected_counts = {category[0]: 50 for category in CATEGORIES}
    if coordinates["category"].value_counts().to_dict() != expected_counts:
        raise ValueError("Expected the original five categories with 50 rows each")
    if metadata["category_counts"] != expected_counts or metadata["task"] != "adjust_bottle":
        raise ValueError("Metadata does not match the audited Figure 5c population")
    if not np.isfinite(points).all():
        raise ValueError("Non-finite PCA coordinates")
    variance = metadata["explained_variance_ratio"]
    if len(variance) != 2 or not all(0 <= value <= 1 for value in variance) or sum(variance) > 1:
        raise ValueError("Invalid explained-variance ratios")

    xpad = max(float(np.ptp(points[:, 0])) * .30, .50)
    ypad = max(float(np.ptp(points[:, 1])) * .26, .45)
    xdomain = [float(points[:, 0].min() - xpad), float(points[:, 0].max() + xpad)]
    ydomain = [float(points[:, 1].min() - ypad), float(points[:, 1].max() + ypad)]
    xx, yy = np.meshgrid(
        np.linspace(*xdomain, GRID_SIZE), np.linspace(*ydomain, GRID_SIZE)
    )

    groups = []
    scores = []
    hdr_details = {}
    for index, (category, identity, name, color, shape) in enumerate(CATEGORIES):
        chosen_rows = display_rows(labels, category)
        category_points = points[labels == category]
        bandwidth = .80 if index == 0 else .72
        score, threshold, factor = density_score(category_points, xx, yy, bandwidth)
        scores.append(score)
        paths = contour_paths(xx, yy, score)
        groups.append({
            "id": identity,
            "label": name,
            "color": color,
            "shape": shape,
            "points": points[chosen_rows].tolist(),
            "pointRows": chosen_rows,
            "totalCount": int(len(category_points)),
            "hdrPaths": paths,
        })
        hdr_details[identity] = {
            "bandwidthScale": bandwidth,
            "bandwidthFactor": factor,
            "densityThreshold": threshold,
            "pathCount": len(paths),
        }
    # Union of the independently normalized family HDRs, exactly as in v4.
    union_score = np.maximum.reduce(scores[1:])
    regions = [
        {
            "id": "expert-support", "label": "Expert 95% HDR", "color": "#3D6F8E",
            "groupIds": [groups[0]["id"]], "paths": groups[0]["hdrPaths"],
        },
        {
            "id": "off-expert-support", "label": "Off-expert 95% HDR", "color": "#C9784A",
            "groupIds": [group["id"] for group in groups[1:]],
            "paths": contour_paths(xx, yy, union_score),
        },
    ]
    return {
        "groups": groups,
        "projection": {
            "xLabel": "PC1", "yLabel": "PC2", "explainedVariance": variance,
            "domain": {"x": xdomain, "y": ydomain},
        },
        "regions": regions,
        "source": {
            "label": "Figure 5c · adjust_bottle · original PCA coordinates",
            "url": "assets/figures/paper-figure-5.pdf",
        },
        "provenance": {
            "task": metadata["task"],
            "population": "Event-aligned action chunks from one task; not 50-task model averages.",
            "descriptor": metadata["descriptor"],
            "embedding": metadata["embedding"],
            "totalCount": len(points),
            "displayedCount": sum(len(group["points"]) for group in groups),
            "sampling": {
                "method": "All source rows per category, rendered in original CSV order; no subsampling",
                "displayedPerCategory": 50,
                "totalPerCategory": 50,
                "pointRows": "Zero-based CSV data rows, excluding its header",
            },
            "hdr": {
                "mass": MASS,
                "grid": [GRID_SIZE, GRID_SIZE],
                "estimator": "scipy.stats.gaussian_kde, Scott bandwidth multiplied by the per-category scale",
                "threshold": "Density at first descending-grid cumulative sum reaching 95% of total grid density",
                "offExpertUnion": "Pointwise maximum of the four family density/threshold scores; contour level 1",
                "contourAlgorithm": matplotlib.rcParams["contour.algorithm"],
                "categories": hdr_details,
            },
            "paperDisplay": {
                "scatterOpacity": .78,
                "scatterAreaPtSquared": 16.5,
                "scatterEdgeColor": "#FFFFFF",
                "scatterEdgeWidthPt": .25,
                "ticks": False,
                "spines": False,
                "axesAspect": "auto",
                "expertFillOpacity": .05,
                "offExpertFillOpacity": .045,
                "regionLineWidthPt": 1.10,
                "regionDashPt": [2.2, 1.2],
            },
            "sourceSha256": source_hashes,
            "versions": {name: importlib.metadata.version(name) for name in ("numpy", "pandas", "scipy", "matplotlib", "contourpy")},
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Extracted figure5 folder; omit to use the staged source files")
    parser.add_argument("--assets-dir", type=Path, default=DEFAULT_ASSETS)
    parser.add_argument("--output", type=Path, help="Default: <assets-dir>/figure5c.json")
    args = parser.parse_args()
    hashes = stage_sources(args.source_dir, args.assets_dir)
    payload = export(args.assets_dir, hashes)
    target = args.output or args.assets_dir / "figure5c.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")
    print(f"Exported {payload['provenance']['displayedCount']} display points from {payload['provenance']['totalCount']} source rows to {target}")
    print("Group HDR paths:", {group["id"]: len(group["hdrPaths"]) for group in payload["groups"]})
    print("Paper HDR paths:", {region["id"]: len(region["paths"]) for region in payload["regions"]})
    print("Output SHA-256:", sha256(target))


if __name__ == "__main__":
    main()
