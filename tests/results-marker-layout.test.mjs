import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutLogoMarkers } from '../results-marker-layout.js';

const bounds = { left: 62, right: 485, top: 38, bottom: 258 };
const marker = (id, x, y, width = 74) => ({ id, x, y, width, height: 48 });

function assertFits(markers) {
  for (const item of markers) {
    assert.ok(item.displayX - item.width / 2 >= bounds.left);
    assert.ok(item.displayX + item.width / 2 <= bounds.right);
    assert.ok(item.displayY - item.height / 2 >= bounds.top);
    assert.ok(item.displayY + item.height / 2 <= bounds.bottom);
  }
  for (let i = 0; i < markers.length; i += 1) {
    for (let j = i + 1; j < markers.length; j += 1) {
      const a = markers[i], b = markers[j];
      assert.ok(
        Math.abs(a.displayX - b.displayX) + 1e-9 >= (a.width + b.width) / 2 + 4 ||
        Math.abs(a.displayY - b.displayY) + 1e-9 >= (a.height + b.height) / 2 + 4,
        `${a.id} overlaps ${b.id}`,
      );
    }
  }
}

test('an isolated marker stays on its true anchor and inputs stay untouched', () => {
  const anchors = [Object.freeze(marker('one', 180, 120))];
  const original = structuredClone(anchors);
  assert.deepEqual(layoutLogoMarkers(anchors, bounds), [
    { ...anchors[0], displayX: 180, displayY: 120 },
  ]);
  assert.deepEqual(anchors, original);
});

test('seven coincident logos remain separated, inside the plot, and deterministic', () => {
  for (const [x, y] of [[260, 150], [62, 38], [485, 258]]) {
    const anchors = Array.from({ length: 7 }, (_, id) => marker(String(id), x, y, 80));
    const arranged = layoutLogoMarkers(anchors, bounds);
    assertFits(arranged);
    assert.deepEqual(arranged, layoutLogoMarkers(anchors, bounds));
    assert.deepEqual(arranged.map(({ displayX, displayY, ...anchor }) => anchor), anchors);
  }
});

test('published scatter and distribution values fit even when metrics tie', () => {
  const models = [
    [.0661, .0223, 84.51], [.0716, .0266, 83.89], [.0805, .0210, 78.97],
    [.0894, .0190, 75.09], [.1116, .0548, 75.09], [.1148, .0473, 71.83],
    [.1432, .0572, 63.94],
  ];
  const ranges = [[0, .2], [0, .08], [60, 90]];
  const scale = (value, range, start, end) => start + (value - range[0]) / (range[1] - range[0]) * (end - start);
  for (let metric = 0; metric < ranges.length; metric += 1) {
    for (const distribution of [false, true]) {
      const anchors = models.map((values, id) => marker(
        String(id), scale(values[metric], ranges[metric], bounds.left, bounds.right),
        distribution ? 173 : scale(values[2], ranges[2], bounds.bottom, bounds.top),
        id % 2 ? 80 : 74,
      ));
      assertFits(layoutLogoMarkers(anchors, bounds));
    }
  }
});

test('empty data returns an empty layout and an oversized box is rejected', () => {
  assert.deepEqual(layoutLogoMarkers([], bounds), []);
  assert.throws(() => layoutLogoMarkers([marker('oversized', 100, 100, 500)], bounds), RangeError);
});
