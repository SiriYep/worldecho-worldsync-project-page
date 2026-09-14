import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { validateActionCoverage, nextActionCoverageSelection, pickActionCoverageGroup, setupActionCoverage } from "../action-coverage.js";

// Fixed fixtures for validation tests only. They are not scientific data and
// are never imported by the site or copied into its build output.
function fixture() {
  return {
    groups: [
      { id: "a", label: "Test A", color: "#123456", shape: "circle", points: [[-2, 1], [0, 0]] },
      { id: "b", label: "Test B", color: "#abcdef", shape: "triangle", points: [[3, -1]] },
    ],
    projection: { xLabel: "Test PC1", yLabel: "Test PC2", explainedVariance: [.3, .2] },
    source: { label: "Validation fixture only", url: "assets/test-source.json" },
  };
}

test("validation preserves exported coordinates and source without sharing mutable arrays", () => {
  const input = fixture();
  const output = validateActionCoverage(input);
  assert.deepEqual(output, input);
  output.groups[0].points[0][0] = 99;
  output.projection.explainedVariance[0] = .1;
  assert.equal(input.groups[0].points[0][0], -2);
  assert.equal(input.projection.explainedVariance[0], .3);
});

test("malformed coordinates and duplicate group identities are rejected explicitly", () => {
  for (const point of [[NaN, 1], [Infinity, 1], [1, -Infinity], ["1", 2], [1], [1, 2, 3], [null, 2]]) {
    const input = fixture();
    input.groups[0].points = [point];
    assert.throws(() => validateActionCoverage(input), /groups\[0\]\.points\[0\].*two finite numbers/);
  }
  const input = fixture();
  input.groups[1].id = "a";
  assert.throws(() => validateActionCoverage(input), /duplicates/);
  input.groups = [];
  assert.throws(() => validateActionCoverage(input), /groups must be a non-empty array/);
});

test("unverified metadata, unsafe URLs, and unsupported encodings fail validation", () => {
  const cases = [
    (data) => { data.groups[0].color = "url(https://example.com/image)"; },
    (data) => { data.groups[0].shape = "logo"; },
    (data) => { data.groups[0].points = []; },
    (data) => { data.projection.xLabel = ""; },
    (data) => { data.projection.explainedVariance = [22.9, 18]; },
    (data) => { data.projection.explainedVariance = [.7, .6]; },
    (data) => { data.source.label = ""; },
    (data) => { data.source.url = "javascript:alert(1)"; },
    (data) => { data.source.url = "//example.com/data"; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    assert.throws(() => validateActionCoverage(input), /Action coverage:/);
  }
});

test("category selection switches whole groups and same-category or All restores all", () => {
  const ids = ["a", "b"];
  assert.equal(nextActionCoverageSelection(null, "a", ids), "a");
  assert.equal(nextActionCoverageSelection("a", "b", ids), "b");
  assert.equal(nextActionCoverageSelection("a", "a", ids), null);
  assert.equal(nextActionCoverageSelection("b", null, ids), null);
  assert.equal(nextActionCoverageSelection(null, null, ids), null);
  assert.throws(() => nextActionCoverageSelection(null, "missing", ids), /unknown category/);
  assert.throws(() => nextActionCoverageSelection("missing", null, ids), /unknown category/);
});

function rectangle(left, top, right, bottom) {
  return [[left, top], [right, top], [right, bottom], [left, bottom], [left, top]];
}

test("hover picking selects the nearest displayed point within the requested radius", () => {
  const groups = [
    { id: "a", points: [[0, 0]] },
    { id: "b", points: [[100, 0]] },
  ];
  assert.equal(pickActionCoverageGroup(groups, { x: 11, y: 0 }), "a");
  assert.equal(pickActionCoverageGroup(groups, { x: 12, y: 0 }), "a");
  assert.equal(pickActionCoverageGroup(groups, { x: 13, y: 0 }), null);
  assert.equal(pickActionCoverageGroup(groups, { x: 11, y: 11 }), null);
  assert.equal(pickActionCoverageGroup(groups, { x: 7, y: 0 }, { pointRadius: 6 }), null);
  assert.equal(pickActionCoverageGroup(groups, { x: 5, y: 0 }, { pointRadius: 6 }), "a");
  assert.equal(pickActionCoverageGroup(groups, { x: 100, y: 0 }, { includePoints: false }), null);
  assert.equal(pickActionCoverageGroup([
    { id: "a", points: [[0, 0]] },
    { id: "b", points: [[10, 0]] },
  ], { x: 8, y: 0 }), "b");
});

test("HDR picking preserves holes, nested islands, and disconnected components with evenodd parity", () => {
  const groups = [{
    id: "a", points: [[10, 10]],
    hdrPaths: [
      rectangle(0, 0, 100, 100),
      rectangle(30, 30, 70, 70),
      rectangle(40, 40, 60, 60),
      rectangle(200, 200, 240, 240),
    ],
  }];
  const pick = (x, y) => pickActionCoverageGroup(groups, { x, y }, { includePoints: false });
  assert.equal(pick(20, 20), "a");
  assert.equal(pick(35, 35), null, "an inner ring is a hole even with the same winding order");
  assert.equal(pick(50, 50), "a", "a third nested ring restores an island");
  assert.equal(pick(220, 220), "a");
  assert.equal(pick(150, 150), null, "disconnected components do not create a filled bridge");
  assert.equal(pick(-10, 50), null);
});

test("overlapping HDRs use the nearest candidate category and retain source-order ties", () => {
  const groups = [
    { id: "a", points: [[20, 50]], hdrPaths: [rectangle(0, 0, 100, 100)] },
    { id: "b", points: [[80, 50]], hdrPaths: [rectangle(0, 0, 100, 100)] },
    { id: "outside", points: [[30, 50]], hdrPaths: [rectangle(200, 200, 300, 300)] },
  ];
  const density = { includePoints: false };
  assert.equal(pickActionCoverageGroup(groups, { x: 30, y: 50 }, density), "a");
  assert.equal(pickActionCoverageGroup(groups, { x: 70, y: 50 }, density), "b");
  assert.equal(pickActionCoverageGroup(groups, { x: 50, y: 50 }, density), "a");
  assert.equal(pickActionCoverageGroup([groups[1], groups[0], groups[2]], { x: 50, y: 50 }, density), "b");
  assert.equal(pickActionCoverageGroup(groups, { x: 30, y: 50 }), "outside", "near-point picking takes priority only in scatter mode");
  assert.equal(pickActionCoverageGroup(groups, { x: 150, y: 50 }, density), null);
});

// Small controlled DOM boundary, as in theme/video tests: execute the actual
// component and its native click listeners without a browser dependency.
function domFixture() {
  class Element extends EventTarget {
    constructor(name, ownerDocument, fragment = false) {
      super();
      this.tagName = name;
      this.ownerDocument = ownerDocument;
      this.fragment = fragment;
      this.children = [];
      this.attributes = new Map();
      this.dataset = {};
      this.textContentWrites = 0;
      this.classes = new Set();
      this.classList = {
        contains: (name) => this.classes.has(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    set className(value) { this.classes = new Set(value.split(/\s+/)); }
    get className() { return [...this.classes].join(" "); }
    set textContent(value) { this._textContent = value; this.textContentWrites += 1; }
    get textContent() { return this._textContent ?? ""; }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === "class") this.className = value;
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    append(...elements) {
      for (const element of elements) {
        if (element.fragment) { this.append(...element.children); continue; }
        if (element.parent) element.parent.children = element.parent.children.filter((child) => child !== element);
        element.parent = this;
        this.children.push(element);
      }
    }
    replaceChildren(...elements) { this.children.forEach((child) => { child.parent = null; }); this.children = []; this.append(...elements); }
    querySelector(selector) {
      const attribute = selector.slice(1, -1);
      return descendants(this).find((element) => element.attributes.has(attribute)) ?? null;
    }
  }
  const document = {
    createElement: (name) => new Element(name, document),
    createElementNS: (_, name) => new Element(name, document),
    createDocumentFragment: () => new Element("fragment", document, true),
  };
  const root = document.createElement("section");
  root.hidden = true;
  return root;
}

function descendants(element) {
  return element.children.flatMap((child) => [child, ...descendants(child)]);
}

// Only the browser geometry boundary is mocked. Real component listeners use
// this screen matrix and its inverse, including CSS scaling and page offsets.
function mockSvgScreen(chart, { scale = 1, left = 0, top = 0 } = {}) {
  const matrix = {
    a: scale, b: 0, c: 0, d: scale, e: left, f: top,
    inverse: () => ({ a: 1 / scale, b: 0, c: 0, d: 1 / scale, e: -left / scale, f: -top / scale }),
  };
  chart.getScreenCTM = () => matrix;
  chart.createSVGPoint = () => ({
    x: 0, y: 0,
    matrixTransform(transform) {
      return {
        x: transform.a * this.x + transform.c * this.y + transform.e,
        y: transform.b * this.x + transform.d * this.y + transform.f,
      };
    },
  });
  return (x, y) => ({ clientX: x * scale + left, clientY: y * scale + top });
}

function pointerEvent(type, properties = {}) {
  return Object.assign(new Event(type), { pointerType: "mouse", clientX: 0, clientY: 0, ...properties });
}

test("chart pointer moves highlight whole groups idempotently, then blank space or leave restores All", () => {
  const root = domFixture();
  const controller = setupActionCoverage(root, fixture());
  const children = descendants(root);
  const chart = children.find((element) => element.classList.contains("ac-plot"));
  const screen = mockSvgScreen(chart);
  const status = root.querySelector("[data-ac-status]");
  const clouds = children.filter((element) => element.classList.contains("ac-cloud"));
  const buttons = children.filter((element) => element.classList.contains("ac-category"));
  const originalPositions = clouds.map((cloud) => cloud.children.map((point) => [...point.attributes]));
  // Fixture endpoints project to (104, 36) for A and (724, 430) for B.
  chart.dispatchEvent(pointerEvent("pointermove", screen(104, 36)));
  assert.equal(controller.getSelection(), "a");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
  assert.equal(clouds.find((cloud) => cloud.getAttribute("data-ac-group") === "b").getAttribute("opacity"), ".12");
  const writes = status.textContentWrites;
  for (const x of [105, 106, 107, 104]) chart.dispatchEvent(pointerEvent("pointermove", screen(x, 36)));
  assert.equal(controller.getSelection(), "a");
  assert.equal(status.textContentWrites, writes, "staying in one category does not repeatedly announce the same live status");
  chart.dispatchEvent(pointerEvent("pointermove", screen(724, 430)));
  assert.equal(controller.getSelection(), "b", "a dimmed group remains hoverable");
  chart.dispatchEvent(pointerEvent("pointermove", screen(500, 100)));
  assert.equal(controller.getSelection(), null);
  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  chart.dispatchEvent(pointerEvent("pointermove", screen(104, 36)));
  chart.dispatchEvent(pointerEvent("pointerleave"));
  assert.equal(controller.getSelection(), null);
  chart.dispatchEvent(pointerEvent("pointermove", screen(724, 430)));
  chart.dispatchEvent(pointerEvent("pointercancel"));
  assert.equal(controller.getSelection(), null);
  assert.deepEqual(clouds.map((cloud) => cloud.children.map((point) => [...point.attributes])), originalPositions);
});

test("chart picking keeps a 12 CSS-pixel radius through screen scaling and offsets", () => {
  for (const scale of [.5, 2]) {
    const root = domFixture();
    const controller = setupActionCoverage(root, fixture());
    const chart = descendants(root).find((element) => element.classList.contains("ac-plot"));
    const screen = mockSvgScreen(chart, { scale, left: 37, top: 91 });
    const point = screen(104, 36);
    chart.dispatchEvent(pointerEvent("pointermove", { ...point, clientX: point.clientX + 11 }));
    assert.equal(controller.getSelection(), "a", `11 CSS px must hit at scale ${scale}`);
    chart.dispatchEvent(pointerEvent("pointermove", { ...point, clientX: point.clientX + 13 }));
    assert.equal(controller.getSelection(), null, `13 CSS px must miss at scale ${scale}`);
  }
});

test("touch movement does not override selection and hovering before a mouse click remains highlighted", () => {
  const root = domFixture();
  const controller = setupActionCoverage(root, fixture());
  const children = descendants(root);
  const chart = children.find((element) => element.classList.contains("ac-plot"));
  const screen = mockSvgScreen(chart);
  const cloud = children.find((element) => element.classList.contains("ac-cloud") && element.getAttribute("data-ac-group") === "a");
  chart.dispatchEvent(pointerEvent("pointermove", { ...screen(104, 36), pointerType: "touch" }));
  assert.equal(controller.getSelection(), null);
  chart.dispatchEvent(pointerEvent("pointermove", screen(104, 36)));
  assert.equal(controller.getSelection(), "a");
  cloud.dispatchEvent(pointerEvent("click"));
  assert.equal(controller.getSelection(), "a", "the first mouse click after hover must not toggle the category off");
  cloud.dispatchEvent(pointerEvent("click"));
  assert.equal(controller.getSelection(), "a");
  chart.dispatchEvent(pointerEvent("pointermove", { ...screen(724, 430), pointerType: "touch" }));
  chart.dispatchEvent(pointerEvent("pointerleave", { pointerType: "touch" }));
  chart.dispatchEvent(pointerEvent("pointercancel", { pointerType: "touch" }));
  assert.equal(controller.getSelection(), "a");
  cloud.dispatchEvent(pointerEvent("click", { pointerType: "touch" }));
  assert.equal(controller.getSelection(), null);
  cloud.dispatchEvent(pointerEvent("click", { pointerType: "touch" }));
  assert.equal(controller.getSelection(), "a");
  const button = children.find((element) => element.classList.contains("ac-category") && element.dataset.acGroup === "a");
  button.dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), null, "native keyboard/category click retains same-category reset");
});

test("component clicks highlight complete groups without moving points and restore every group", () => {
  const root = domFixture();
  const input = fixture();
  const controller = setupActionCoverage(root, input);
  assert.equal(root.hidden, false);
  const children = descendants(root);
  const clouds = children.filter((element) => element.classList.contains("ac-cloud"))
    .sort((a, b) => a.getAttribute("data-ac-group").localeCompare(b.getAttribute("data-ac-group")));
  const buttons = children.filter((element) => element.classList.contains("ac-category"));
  const chart = children.find((element) => element.classList.contains("ac-plot"));
  const status = root.querySelector("[data-ac-status]");
  const positions = () => clouds.map((cloud) => cloud.children.map((point) => [...point.attributes]));
  const originalPositions = positions();
  assert.deepEqual(clouds.map((cloud) => cloud.children.length), [2, 1]);
  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  assert.equal(children.filter((element) => element.classList.contains("ac-axis-tick")).length, 10);
  assert.deepEqual(children.filter((element) => element.classList.contains("ac-axis-label")).map((element) => element.textContent), ["Test PC1 (30.0% variance)", "Test PC2 (20.0% variance)"]);
  assert.equal(root.querySelector("[data-ac-source-label]").children[0].textContent, input.source.label);

  buttons[1].dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), "a");
  assert.equal(clouds[0].classList.contains("is-selected"), true);
  assert.equal(clouds[0].getAttribute("opacity"), "1");
  assert.equal(clouds[1].classList.contains("is-muted"), true);
  assert.equal(clouds[1].getAttribute("opacity"), ".12");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
  assert.match(status.textContent, /Test A: 2 points highlighted/);
  assert.match(chart.getAttribute("aria-label"), /Test A: 2 points highlighted/);
  assert.deepEqual(positions(), originalPositions);

  buttons[1].dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), null);
  assert.equal(clouds.every((cloud) => !cloud.classList.contains("is-muted")), true);
  buttons[2].dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), "b");
  buttons[0].dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), null);
  assert.equal(clouds.every((cloud) => cloud.getAttribute("opacity") === "1"), true);
  assert.deepEqual(positions(), originalPositions);
  assert.deepEqual(input, fixture());
});

test("invalid input leaves the host hidden and existing content untouched", () => {
  const root = domFixture();
  const fallback = root.ownerDocument.createElement("img");
  root.append(fallback);
  const input = fixture();
  input.groups[0].points[0][0] = NaN;
  assert.throws(() => setupActionCoverage(root, input), /two finite numbers/);
  assert.equal(root.hidden, true);
  assert.deepEqual(root.children, [fallback]);
});

function densityFixture() {
  const input = fixture();
  input.projection.domain = { x: [-10, 10], y: [-8, 8] };
  for (const group of input.groups) {
    group.totalCount = 10;
    group.hdrPaths = [[[-4, -3], [5, -3], [5, 4], [-4, 4], [-4, -3]]];
  }
  input.regions = input.groups.map((group) => ({ id: `${group.id}-support`, label: `${group.label} HDR`,
    color: group.color, groupIds: [group.id], paths: group.hdrPaths }));
  return input;
}

test("chart hover reaches sparse HDR interiors and density mode never selects an out-of-region point", () => {
  const root = domFixture();
  const input = densityFixture();
  input.groups[0].hdrPaths = [rectangle(-6, -6, -4, -4)];
  input.groups[1].hdrPaths = [rectangle(2, -2, 4, 0)];
  input.regions.forEach((region, index) => { region.paths = input.groups[index].hdrPaths; });
  const controller = setupActionCoverage(root, input);
  const chart = descendants(root).find((element) => element.classList.contains("ac-plot"));
  const screen = mockSvgScreen(chart);
  const move = (x, y) => chart.dispatchEvent(pointerEvent("pointermove", screen(x, y)));
  // Fixed [-10, 10] x [-8, 8] source domain projects A's (-5, -5) HDR
  // interior to (259, 356.125), far from either of A's displayed samples.
  move(259, 356.125);
  assert.equal(controller.getSelection(), "a", "scatter mode can select the region between sparse points");
  controller.setView("density");
  move(259, 356.125);
  assert.equal(controller.getSelection(), "a");
  move(414, 233); // A's displayed (0, 0) sample, outside both HDRs.
  assert.equal(controller.getSelection(), null, "density mode requires actual HDR containment");
  move(507, 257.625); // B's (3, -1) point lies in B's HDR.
  assert.equal(controller.getSelection(), "b");
  controller.setView("points");
  move(414, 233);
  assert.equal(controller.getSelection(), "a", "scatter mode still admits displayed points outside the 95% region");
});

test("density selection uses exported category regions and keeps coordinates fixed across views", () => {
  const root = domFixture();
  const controller = setupActionCoverage(root, densityFixture());
  const children = descendants(root);
  const points = children.filter((element) => element.classList.contains("ac-point"));
  const regions = children.filter((element) => element.classList.contains("ac-region"));
  const families = children.filter((element) => element.classList.contains("ac-family-region"));
  const clouds = children.filter((element) => element.classList.contains("ac-cloud"));
  const buttons = children.filter((element) => element.classList.contains("ac-view-button"));
  const originalPositions = points.map((point) => [...point.attributes]);
  // The source domain, rather than a refit to the displayed subset, fixes the position.
  assert.equal(points.find((point) => point.tagName === "circle").getAttribute("cx"), "352");
  assert.equal(regions.every((region) => region.getAttribute("opacity") === "1"), true);
  assert.equal(families.every((region) => region.getAttribute("visibility") === "hidden"), true);
  buttons[1].dispatchEvent(new Event("click"));
  assert.equal(controller.getView(), "density");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
  assert.equal(clouds.every((cloud) => cloud.getAttribute("visibility") === "hidden"), true);
  controller.select("b");
  assert.deepEqual(families.map((region) => region.getAttribute("visibility")), ["hidden", "visible"]);
  assert.match(root.querySelector("[data-ac-status]").textContent, /Test B: 95% density region highlighted.*10 samples/);
  buttons[0].dispatchEvent(new Event("click"));
  assert.equal(controller.getSelection(), "b");
  assert.equal(clouds.every((cloud) => cloud.getAttribute("visibility") === "visible"), true);
  assert.deepEqual(points.map((point) => [...point.attributes]), originalPositions);
  controller.select("b");
  assert.equal(controller.getSelection(), null);
  assert.equal(regions.every((region) => region.getAttribute("opacity") === "1"), true);
});

test("invalid density geometry and source domains cannot replace the fallback", () => {
  for (const mutate of [
    (data) => { data.groups[0].totalCount = 1; },
    (data) => { data.groups[0].hdrPaths[0][0][0] = NaN; },
    (data) => { data.groups[0].hdrPaths[0].pop(); },
    (data) => { data.regions[0].groupIds = ["unknown"]; },
    (data) => { data.projection.domain.x = [3, 1]; },
  ]) {
    const root = domFixture();
    const input = densityFixture();
    mutate(input);
    assert.throws(() => setupActionCoverage(root, input), /Action coverage:/);
    assert.equal(root.hidden, true);
    assert.equal(root.children.length, 0);
  }
});

test("the shipped Figure 5c matches source hashes, category counts, coordinates, and the paper subset", () => {
  const asset = (name) => readFileSync(new URL(`../assets/figures/action-coverage/${name}`, import.meta.url), "utf8");
  const original = JSON.parse(asset("figure5c.json"));
  const data = validateActionCoverage(original);
  const [header, ...lines] = asset("figure5c_expert_offexpert_pca.csv").trim().split(/\r?\n/);
  const columns = header.split(",");
  const rows = lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [columns[index], value])));
  assert.equal(rows.length, 250);
  assert.equal(original.provenance.task, "adjust_bottle");
  for (const [name, expected] of Object.entries(original.provenance.sourceSha256)) {
    assert.equal(createHash("sha256").update(asset(name)).digest("hex"), expected, name);
  }
  for (const [i, group] of data.groups.entries()) {
    assert.equal(group.totalCount, 50);
    assert.equal(group.points.length, 20);
    const plottedRows = original.groups[i].pointRows;
    const category = rows[plottedRows[0]].category;
    const candidates = rows.flatMap((row, index) => row.category === category ? [index] : []);
    assert.equal(candidates.length, 50);
    const hash = (row) => createHash("sha256").update(`20260801|${category}|${row}`).digest("hex");
    const expectedRows = candidates.sort((a, b) => hash(a).localeCompare(hash(b))).slice(0, 20).sort((a, b) => a - b);
    assert.deepEqual(plottedRows, expectedRows);
    for (const [pointIndex, row] of plottedRows.entries()) {
      // pandas (the paper's parser) and JS can differ at the last double bit.
      for (const [axis, column] of ["pca_1", "pca_2"].entries()) {
        assert.ok(Math.abs(group.points[pointIndex][axis] - Number(rows[row][column])) < 1e-14);
      }
    }
  }
  assert.deepEqual(data.regions.map((region) => region.paths.length), [2, 3]);
  const root = domFixture();
  const controller = setupActionCoverage(root, original);
  for (const group of data.groups) {
    controller.select(group.id);
    controller.setView("density");
    assert.match(root.querySelector("[data-ac-status]").textContent, /all 50 samples/);
    controller.setView("points");
    assert.match(root.querySelector("[data-ac-status]").textContent, /20 points highlighted from 50 samples/);
  }
  controller.select(null);
  assert.equal(root.hidden, false);
});
