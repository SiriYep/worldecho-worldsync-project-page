import test from 'node:test';
import assert from 'node:assert/strict';
import { containRect, trajectoryFrameIndex, validateTrajectory, isVisiblePoint } from '../rollout-trajectory.js';

test('overlay follows the contained video including letterboxing', () => {
  assert.deepEqual(containRect(320, 240, 320, 256), { x: 10, y: 0, width: 300, height: 240 });
  assert.deepEqual(containRect(200, 200, 640, 480), { x: 0, y: 25, width: 200, height: 150 });
  assert.equal(containRect(0, 240, 320, 256), null);
});

test('current trajectory point follows the video frame through seek and endpoint', () => {
  assert.equal(trajectoryFrameIndex(0, 1.5, 33), 0);
  assert.equal(trajectoryFrameIndex(0.75, 1.5, 33), 16);
  assert.equal(trajectoryFrameIndex(32 / 22, 1.5, 33), 32);
  assert.equal(trajectoryFrameIndex(1.5, 1.5, 33), 32);
  assert.equal(trajectoryFrameIndex(-1, 1.5, 33), 0);
  for (const fps of [22, 30]) {
    for (let frame = 0; frame < 33; frame += 1) {
      assert.equal(trajectoryFrameIndex(frame / fps, 33 / fps, 33), frame);
      if (frame > 0) assert.equal(trajectoryFrameIndex((frame - 0.01) / fps, 33 / fps, 33), frame - 1);
    }
  }
});

test('malformed or unprojected coordinates cannot become an overlay', () => {
  const valid = { version: 1, space: 'normalized-image', width: 320, height: 256, frames: [{ left: [0.2, 0.3], right: null }] };
  assert.equal(validateTrajectory(valid), valid);
  assert.equal(validateTrajectory({ ...valid, space: 'robot-base-meters' }), null);
  assert.equal(validateTrajectory({ ...valid, frames: [{ left: [NaN, 0], right: null }] }), null);
  assert.equal(isVisiblePoint([-0.1, 0.5]), false);
  assert.equal(isVisiblePoint([0.5, 0.5]), true);
});
