import test from 'node:test';
import assert from 'node:assert/strict';
import { niceAxis, summarizeDistribution } from '../results-explorer.js';

test('published model averages produce an exact median without mutating observations', () => {
  const values = [.0661, .0716, .0805, .0894, .1116, .1148, .1432];
  const observations = [...values].reverse();
  assert.deepEqual(summarizeDistribution(observations), { count: 7, min: .0661, max: .1432, median: .0894 });
  assert.deepEqual(observations, [...values].reverse());
});

test('ties remain separate observations and even-sized sets average their middle pair', () => {
  assert.deepEqual(summarizeDistribution([84.51, 75.09, 75.09, 63.94]), {
    count: 4, min: 63.94, max: 84.51, median: 75.09,
  });
  assert.equal(summarizeDistribution([1, 4]).median, 2.5);
});

test('missing or non-finite data cannot silently enter the displayed summary', () => {
  for (const values of [[], [NaN], [1, undefined], [Infinity], [-Infinity]]) {
    assert.throws(() => summarizeDistribution(values), TypeError);
  }
  assert.deepEqual(summarizeDistribution([0]), { count: 1, min: 0, max: 0, median: 0 });
});

test('published metric ranges use readable ticks and contain every observation', () => {
  assert.deepEqual(niceAxis([.0661, .1432], { includeZero: true }), {
    domain: [0, .2], ticks: [0, .05, .1, .15, .2], step: .05,
  });
  assert.deepEqual(niceAxis([.019, .0572], { includeZero: true }), {
    domain: [0, .08], ticks: [0, .02, .04, .06, .08], step: .02,
  });
  assert.deepEqual(niceAxis([63.94, 84.51]), {
    domain: [60, 90], ticks: [60, 70, 80, 90], step: 10,
  });
});

test('constant, zero, and negative observations still have finite usable axes', () => {
  for (const observations of [[0], [5, 5], [-8, -3], [-1, 1]]) {
    const axis = niceAxis(observations);
    assert.ok(axis.domain[0] < axis.domain[1]);
    assert.ok(axis.ticks.every(Number.isFinite));
    assert.ok(observations.every(value => value >= axis.domain[0] && value <= axis.domain[1]));
    assert.equal(new Set(axis.ticks).size, axis.ticks.length);
  }
  assert.throws(() => niceAxis([NaN]), TypeError);
});
