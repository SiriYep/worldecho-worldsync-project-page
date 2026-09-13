const GAP = 4;
const STEP = 12;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function positions(origin, min, max, adjacent) {
  const values = new Set([clamp(origin, min, max), min, max]);
  for (let offset = STEP; offset <= max - min + STEP; offset += STEP) {
    values.add(clamp(origin - offset, min, max));
    values.add(clamp(origin + offset, min, max));
  }
  for (const value of adjacent) values.add(clamp(value, min, max));
  return [...values];
}

function overlapArea(marker, placed) {
  return placed.reduce((sum, other) => {
    const x = (marker.width + other.width) / 2 + GAP - Math.abs(marker.displayX - other.displayX);
    const y = (marker.height + other.height) / 2 + GAP - Math.abs(marker.displayY - other.displayY);
    return sum + Math.max(0, x) * Math.max(0, y);
  }, 0);
}

/**
 * Position logo/label boxes near their data anchors without changing data x/y.
 * Bounds enclose the entire box. Callers can connect displaced boxes to x/y.
 * The deterministic search prefers small moves, then preserving the x value.
 * Overcrowded bounds fall back to the least-overlapping candidate.
 */
export function layoutLogoMarkers(anchors, bounds) {
  const placed = [];
  for (const anchor of anchors) {
    const { x, y, width, height } = anchor;
    const left = bounds.left + width / 2;
    const right = bounds.right - width / 2;
    const top = bounds.top + height / 2;
    const bottom = bounds.bottom - height / 2;
    if (left > right || top > bottom) {
      throw new RangeError('Logo marker must fit inside the plot bounds.');
    }
    const xs = positions(x, left, right, placed.flatMap(other => {
      const separation = (width + other.width) / 2 + GAP;
      return [other.displayX - separation, other.displayX + separation];
    }));
    const ys = positions(y, top, bottom, placed.flatMap(other => {
      const separation = (height + other.height) / 2 + GAP;
      return [other.displayY - separation, other.displayY + separation];
    }));
    const candidates = xs.flatMap(displayX => ys.map(displayY => {
      const marker = { ...anchor, displayX, displayY };
      return {
        marker,
        overlap: overlapArea(marker, placed),
        distance: (displayX - x) ** 2 + (displayY - y) ** 2,
        horizontalMove: Math.abs(displayX - x),
      };
    }));
    candidates.sort((a, b) => a.overlap - b.overlap ||
      a.distance - b.distance || a.horizontalMove - b.horizontalMove ||
      a.marker.displayY - b.marker.displayY || a.marker.displayX - b.marker.displayX);
    placed.push(candidates[0].marker);
  }
  return placed;
}
