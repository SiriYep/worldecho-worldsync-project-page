import test from "node:test";
import assert from "node:assert/strict";
import { caseOptionLabel, getCaseNavigation, readShortlistIds, selectComparison, trainingLabel, validateCatalog, writeShortlistIds } from "../rollout-demo.js";

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

test("shortlist starts empty and restores only distinct IDs still present in the catalog", () => {
  const ids = catalog.cases.map((sample) => sample.id);
  assert.deepEqual(readShortlistIds({ getItem: () => null }, ids), []);
  assert.deepEqual(readShortlistIds({ getItem: () => '["second","retired","second",42,{"id":"first"},"first"]' }, ids), ["second", "first"]);
  for (const saved of ["broken json", '{"first":true}', "null"]) {
    assert.deepEqual(readShortlistIds({ getItem: () => saved }, ids), []);
  }
});

test("shortlist writes IDs only and blocked browser storage does not prevent in-memory selection", () => {
  let saved;
  const storage = { setItem: (_key, value) => { saved = value; } };
  assert.equal(writeShortlistIds(storage, ["first", "first", "", { score: 1 }, "second"]), true);
  assert.deepEqual(JSON.parse(saved), ["first", "second"]);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.deepEqual(readShortlistIds(blocked, ["first"]), []);
  assert.equal(writeShortlistIds(blocked, ["first"]), false);
  assert.equal(getCaseNavigation(catalog.cases, ["first"], true, "first").currentId, "first");
});

test("sample navigation stops at each boundary and preserves a visible selection when filtering", () => {
  const first = getCaseNavigation(catalog.cases, ["second"], false, "first");
  assert.equal(first.previousId, null);
  assert.equal(first.nextId, "second");
  const second = getCaseNavigation(catalog.cases, ["second"], false, "second");
  assert.equal(second.previousId, "first");
  assert.equal(second.nextId, null);
  const filtered = getCaseNavigation(catalog.cases, ["second"], true, "second");
  assert.equal(filtered.currentId, "second");
  assert.equal(filtered.position, 1);
  assert.equal(filtered.previousId, null);
  assert.equal(filtered.nextId, null);
  assert.equal(getCaseNavigation(catalog.cases, ["second"], true, "first").currentId, "second");
});

test("removing the final shortlisted item shows an empty list and All restores the prior sample", () => {
  const empty = getCaseNavigation(catalog.cases, [], true, "second");
  assert.deepEqual(empty.cases, []);
  assert.equal(empty.currentId, null);
  assert.equal(empty.position, 0);
  assert.equal(empty.previousId, null);
  assert.equal(empty.nextId, null);
  const all = getCaseNavigation(catalog.cases, [], false, "second");
  assert.equal(all.currentId, "second");
  assert.equal(all.position, 2);
  assert.equal(all.cases.length, 2);
});

test("recommendation and personal shortlist filters combine without changing personal choices", () => {
  const cases = [
    { id: "first", review: { status: "recommend" } },
    { id: "second", review: { status: "exclude" } },
    { id: "third", review: { status: "recommend" } },
  ];
  const personal = ["second", "third"];
  const recommended = getCaseNavigation(cases, personal, false, "second", true);
  assert.deepEqual(recommended.cases.map((sample) => sample.id), ["first", "third"]);
  const both = getCaseNavigation(cases, personal, true, "third", true);
  assert.deepEqual(both.cases.map((sample) => sample.id), ["third"]);
  assert.equal(both.currentId, "third");
  assert.deepEqual(personal, ["second", "third"]);
  const empty = getCaseNavigation(cases, ["second"], true, "second", true);
  assert.equal(empty.currentId, null);
  assert.equal(empty.position, 0);
  const all = getCaseNavigation(cases, ["second"], false, "second", false);
  assert.equal(all.currentId, "second");
  assert.equal(all.cases.length, 3);
});

test("duplicate task names remain distinguishable by review status and query family", () => {
  const first = { label: "Shake bottle", reviewBatch: "additional", familyLabel: "Random feasible · weighted", review: { status: "recommend" } };
  const second = { label: "Shake bottle", familyLabel: "Policy rollout", review: { status: "exclude" } };
  assert.equal(caseOptionLabel(first), "Recommended · Shake bottle · Random feasible · weighted");
  assert.equal(caseOptionLabel(second), "Not selected · Shake bottle · Policy rollout");
  assert.equal(caseOptionLabel({ label: "Unreviewed sample" }), "Needs review · Unreviewed sample");
  assert.equal(caseOptionLabel({ ...first, review: { status: "backup" } }).startsWith("Backup ·"), true);
});
