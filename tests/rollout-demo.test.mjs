import test from "node:test";
import assert from "node:assert/strict";
import { caseOptionLabel, formatGateScore, getComparisonModels, getDemoCases, getTrajectoryComparison, getVisualGates, selectComparison, validateCatalog } from "../rollout-demo.js";

// Synthetic paths exercise selection only and are never served by the site.
const clip = (name) => ({ src: `assets/test-only/${name}.mp4`, frames: 33, fps: 30, width: 320, height: 256 });
const catalog = {
  version: 1,
  models: [
    { id: "dreamdojo_coverage", label: "DreamDojo", regime: "expanded", step: 40000 },
    { id: "lingbotva_expert", label: "LingBotVA", actionConditioned: false },
    { id: "ctrlworld_coverage", label: "CtrlWorld", regime: "expanded", step: 40000 },
    { id: "cosmos_predict25_expert", label: "Cosmos-Predict2.5", regime: "expert", step: 20000 },
    { id: "worldsync", label: "WorldSync", regime: "worldsync", step: 60000 },
    { id: "cosmos_predict25_coverage", label: "Cosmos-Predict2.5", regime: "expanded", step: 40000 },
    { id: "cosmos3_coverage", label: "Cosmos3", regime: "expanded", step: 40000 },
  ],
  cases: [
    { id: "excluded", label: "Other task", review: { status: "exclude" }, gt: clip("excluded-gt") },
    { id: "first", label: "Move card", review: { status: "recommend" }, gt: clip("first-gt"), outputs: { cosmos3_coverage: clip("first-cosmos3"), cosmos_predict25_coverage: clip("first-cosmos"), ctrlworld_coverage: clip("first-ctrl"), worldsync: clip("first-worldsync") } },
    { id: "second", label: "Rotate wrist", review: { status: "recommend" }, gt: clip("second-gt"), outputs: { cosmos_predict25_coverage: clip("second-cosmos"), worldsync: clip("second-worldsync") } },
    { id: "backup", review: { status: "backup" }, gt: clip("backup-gt") },
    { id: "unreviewed", gt: clip("unreviewed-gt") },
  ],
};

test("all four requested Expanded configurations are exposed without changing the default", () => {
  const before = structuredClone(catalog);
  assert.deepEqual(getComparisonModels(validateCatalog(catalog)).map((model) => model.id), [
    "cosmos3_coverage", "cosmos_predict25_coverage", "ctrlworld_coverage", "dreamdojo_coverage",
  ]);
  const chosen = selectComparison(catalog);
  assert.equal(chosen.baseline.id, "cosmos_predict25_coverage");
  assert.equal(chosen.sample.id, "first");
  assert.equal(chosen.clips.baseline.src, "assets/test-only/first-cosmos.mp4");
  assert.equal(selectComparison(catalog, "first", "cosmos3_coverage").clips.baseline.src, "assets/test-only/first-cosmos3.mp4");
  assert.deepEqual(catalog, before);
});

test("the gallery excludes nonrecommended cases without deleting them from the catalog", () => {
  assert.deepEqual(getDemoCases(catalog).map((sample) => sample.id), ["first", "second"]);
  assert.equal(selectComparison(catalog, "excluded").sample.id, "first");
  assert.equal(catalog.cases.length, 5);
  const noRecommendations = { ...catalog, cases: catalog.cases.filter((sample) => sample.review?.status !== "recommend") };
  assert.equal(selectComparison(noRecommendations), null);
});

test("switching tasks retains the baseline even if that exact clip is missing", () => {
  const chosen = selectComparison(catalog, "second", "ctrlworld_coverage");
  assert.equal(chosen.baseline.id, "ctrlworld_coverage");
  assert.equal(chosen.clips.baseline, undefined);
  assert.equal(chosen.clips.gt.src, "assets/test-only/second-gt.mp4");
  assert.equal(chosen.clips.worldsync.src, "assets/test-only/second-worldsync.mp4");
});

test("unsupported and stale model choices return to the requested default", () => {
  for (const id of ["missing", "worldsync", "cosmos_predict25_expert", "lingbotva_expert"]) {
    assert.equal(selectComparison(catalog, "first", id).baseline.id, "cosmos_predict25_coverage");
  }
});

test("catalog errors are reported before attaching media", () => {
  assert.throws(() => validateCatalog({ ...catalog, version: 2 }), /Unsupported/);
  assert.throws(() => validateCatalog({ ...catalog, cases: [] }), /named samples/);
  assert.throws(() => validateCatalog({ ...catalog, cases: [catalog.cases[0], catalog.cases[0]] }), /duplicate sample/);
  assert.throws(() => validateCatalog({ ...catalog, models: catalog.models.filter((m) => m.id !== "worldsync") }), /WorldSync/);
  assert.throws(() => validateCatalog({ ...catalog, models: catalog.models.filter((m) => !m.id.endsWith("_coverage")) }), /supported comparison/);
});

test("task labels contain only the task name", () => {
  assert.equal(caseOptionLabel({ label: "Move card", familyLabel: "Uniform", review: { status: "recommend" }, id: "long-chunk-id" }), "Move card");
  assert.equal(caseOptionLabel({ task: "move_card", id: "long-chunk-id" }), "move card");
});

test("missing gate data never becomes a pass", () => {
  for (const value of [undefined, {}, { visualGates: null }, { visualGates: { passed: true } }, { visualGates: [] }]) {
    const gates = getVisualGates(value);
    assert.equal(gates.length, 4);
    assert.ok(gates.every((gate) => gate.status === "unavailable" && gate.icon === "?"));
  }
});

test("each gate keeps its own explicit result irrespective of record order", () => {
  const gates = getVisualGates({ visualGates: [
    { id: "arm_integrity", status: "skipped" },
    { id: "motion_smoothness", status: "fail" },
    { id: "image_quality", status: "pass" },
    { id: "eef_visibility", status: "unavailable" },
  ] });
  assert.deepEqual(gates.map(({ id, status, icon }) => ({ id, status, icon })), [
    { id: "image_quality", status: "pass", icon: "✓" },
    { id: "motion_smoothness", status: "fail", icon: "×" },
    { id: "eef_visibility", status: "unavailable", icon: "?" },
    { id: "arm_integrity", status: "skipped", icon: "−" },
  ]);
});

test("duplicate, invalid and legacy passed fields require explicit usable gate data", () => {
  const gates = getVisualGates({ visualGates: [
    { id: "image_quality", status: "pass" }, { id: "image_quality", status: "fail" },
    { id: "motion_smoothness", status: "success" },
    { id: "eef_visibility", passed: true },
    { id: "arm_integrity", status: "__proto__" },
    { id: "unknown_check", status: "pass" }, null,
  ] });
  assert.ok(gates.every((gate) => gate.status === "unavailable"));
});

test("gate numbers retain their own scales, genuine zero, and absent binary thresholds", () => {
  assert.equal(formatGateScore({ id: "image_quality", status: "pass", score: 0.5607575758, threshold: 0.4 }).valueText, "0.561");
  assert.equal(formatGateScore({ id: "motion_smoothness", status: "pass", score: 1.7517638547, threshold: 0.6 }).valueText, "1.752");
  assert.equal(formatGateScore({ id: "motion_smoothness", status: "fail", score: 0, threshold: 0.6 }).valueText, "0.000");
  assert.equal(formatGateScore({ id: "image_quality", status: "fail", score: 0.3996969697, threshold: 0.4 }).valueText, "0.3997");
  const binary = formatGateScore({ id: "arm_integrity", status: "pass", score: 1, threshold: null });
  assert.equal(binary.valueText, "1");
  assert.equal(binary.thresholdText, "");
  assert.match(binary.detail, /Not a confidence/);
  for (const score of [null, undefined, NaN, Infinity]) {
    assert.equal(formatGateScore({ id: "image_quality", status: "pass", score }).valueText, "—");
  }
});

test("visibility counts come from explicit consistent records, never guessed from a ratio", () => {
  const record = { id: "eef_visibility", status: "fail", score: 15 / 33, threshold: 16 / 33, numerator: 15, denominator: 33, thresholdCount: 16 };
  const formatted = formatGateScore(record);
  assert.equal(formatted.valueText, "15/33");
  assert.equal(formatted.thresholdText, "≥16f");
  assert.equal(formatGateScore({ ...record, numerator: 16 }).valueText, "0.455");
  assert.equal(formatGateScore({ ...record, numerator: undefined }).valueText, "0.455");
  assert.equal(formatGateScore({ ...record, status: "skipped" }).valueText, "—");
});

test("trajectory scores must bind to both displayed clips and retain separate units", () => {
  const metric = { version: 1, metricId: "pose_dtw_rot005_path_mean", poseDtw: 0.01, positionCm: 0.8, rotationDeg: 9.5, videoSha256: "pred", referenceVideoSha256: "gt", checkpointSha256: "v1", trajectoryHashes: { prediction: { xyz: "px", rotmat: "pr" }, reference: { xyz: "gx", rotmat: "gr" } } };
  const prediction = { trajectory: { videoSha256: "pred", checkpointSha256: "v1", projection: { xyzSha256: "px", rotmatSha256: "pr" } }, trajectoryComparison: metric };
  const gt = { trajectory: { videoSha256: "gt", checkpointSha256: "v1", projection: { xyzSha256: "gx", rotmatSha256: "gr" } } };
  assert.equal(getTrajectoryComparison(prediction, gt), metric);
  assert.equal(getTrajectoryComparison(prediction, { trajectory: { videoSha256: "another-gt" } }), null);
  assert.equal(getTrajectoryComparison({ ...prediction, trajectory: { videoSha256: "another-prediction" } }, gt), null);
  for (const invalid of [null, NaN, Infinity, -1]) {
    assert.equal(getTrajectoryComparison({ ...prediction, trajectoryComparison: { ...metric, poseDtw: invalid } }, gt), null);
  }
  assert.equal(getTrajectoryComparison({ ...prediction, trajectoryComparison: { ...metric, metricId: "navigation-ndtw" } }, gt), null);
  assert.equal(getTrajectoryComparison({ ...prediction, trajectory: { ...prediction.trajectory, projection: { xyzSha256: "new-extraction", rotmatSha256: "pr" } } }, gt), null);
});
