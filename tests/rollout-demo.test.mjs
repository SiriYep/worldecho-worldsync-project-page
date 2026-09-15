import test from "node:test";
import assert from "node:assert/strict";
import { selectComparison, trainingLabel, validateCatalog } from "../rollout-demo.js";

// Deliberately incomplete synthetic paths exercise selection only, never the site.
const clip = (name) => ({ src: `assets/test-only/${name}.mp4`, frames: 33, fps: 30, width: 320, height: 256 });
const catalog = {
  version: 1,
  models: [
    { id: "lingbotva", label: "LingBotVA", regime: "video-only", actionConditioned: false },
    { id: "cosmos_predict25_expert", label: "Cosmos Predict 2.5", regime: "expert", step: 20000, actionConditioned: true },
    { id: "worldsync", label: "WorldSync", regime: "worldsync", step: 60000, actionConditioned: true },
  ],
  cases: [
    { id: "first", gt: clip("first-gt"), outputs: { cosmos_predict25_expert: clip("first-cosmos"), lingbotva: clip("first-lingbot"), worldsync: clip("first-worldsync") } },
    { id: "second", gt: clip("second-gt"), outputs: { cosmos_predict25_expert: clip("second-cosmos"), worldsync: clip("second-worldsync") } },
  ],
};

test("default comparison is the requested Expert configuration regardless of model ordering", () => {
  const chosen = selectComparison(validateCatalog(catalog));
  assert.equal(chosen.baseline.id, "cosmos_predict25_expert");
  assert.equal(chosen.sample.id, "first");
  assert.equal(chosen.clips.baseline.src, "assets/test-only/first-cosmos.mp4");
});

test("switching samples keeps the selected model and never substitutes another recording", () => {
  const chosen = selectComparison(catalog, "second", "lingbotva");
  assert.equal(chosen.baseline.id, "lingbotva");
  assert.equal(chosen.baseline.actionConditioned, false);
  assert.equal(chosen.clips.baseline, undefined);
  assert.equal(chosen.clips.gt.src, "assets/test-only/second-gt.mp4");
  assert.equal(chosen.clips.worldsync.src, "assets/test-only/second-worldsync.mp4");
});

test("unknown choices recover predictably and WorldSync is never its own baseline", () => {
  for (const id of ["missing", "worldsync"]) {
    const chosen = selectComparison(catalog, "missing", id);
    assert.equal(chosen.sample.id, "first");
    assert.equal(chosen.baseline.id, "cosmos_predict25_expert");
  }
});

test("catalog errors are detected before attaching media or controls", () => {
  assert.throws(() => validateCatalog({ ...catalog, version: 2 }), /Unsupported/);
  assert.throws(() => validateCatalog({ ...catalog, cases: [] }), /named samples/);
  assert.throws(() => validateCatalog({ ...catalog, cases: [catalog.cases[0], catalog.cases[0]] }), /duplicate sample/);
  assert.throws(() => validateCatalog({ ...catalog, models: catalog.models.slice(0, 2) }), /WorldSync/);
});

test("training context keeps different regimes and the video-only baseline explicit", () => {
  assert.equal(trainingLabel(catalog.models[1]), "Expert · 20k steps");
  assert.equal(trainingLabel({ regime: "expanded", step: 40000 }), "Expanded · 40k steps");
  assert.equal(trainingLabel(catalog.models[2]), "WorldSync · 60k steps");
  assert.equal(trainingLabel(catalog.models[0]), "video-only");
  assert.equal(trainingLabel({ regime: "Expert Demonstrations (video-only)", step: 20000, actionConditioned: false }), "Expert · 20k steps · video-only");
  assert.equal(trainingLabel({ regime: "Expanded Action Coverage", step: 60000 }), "Expanded · 60k steps");
});
