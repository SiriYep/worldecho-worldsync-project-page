import test from "node:test";
import assert from "node:assert/strict";
import { rankModels } from "../leaderboard.js";

test("lower errors rank first without mutating the source data", () => {
  const models = [{ id: "a", gated: .1, raw: .01 }, { id: "b", gated: .05, raw: .02 }];
  assert.deepEqual(rankModels(models, "gated").map(({ model }) => model.id), ["b", "a"]);
  assert.deepEqual(rankModels(models, "raw").map(({ model }) => model.id), ["a", "b"]);
  assert.deepEqual(models.map((model) => model.id), ["a", "b"]);
});

test("visual pass sorts descending and shared scores receive competition ranks", () => {
  const models = [{ visual: 75.09 }, { visual: 84.51 }, { visual: 75.09 }, { visual: 63.94 }];
  assert.deepEqual(rankModels(models, "visual").map(({ model, rank }) => [model.visual, rank]), [
    [84.51, 1], [75.09, 2], [75.09, 2], [63.94, 4],
  ]);
});
