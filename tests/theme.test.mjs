import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../theme.js", import.meta.url), "utf8");

// The browser boundary is controlled here; the actual head script and click
// handlers run unchanged, including storage failures and DOM readiness.
function fixture({ saved = null, readyState = "loading", blocked = false } = {}) {
  const label = { textContent: "Light" };
  const attributes = new Map();
  const button = new EventTarget();
  button.hidden = true;
  button.setAttribute = (name, value) => attributes.set(name, value);
  button.querySelector = (selector) => selector === "[data-theme-label]" ? label : null;
  const document = new EventTarget();
  document.readyState = readyState;
  document.documentElement = { dataset: {}, style: {} };
  document.querySelectorAll = () => document.readyState === "loading" ? [] : [button];
  const writes = [];
  const window = { matchMedia: () => ({ matches: true }) };
  Object.defineProperty(window, "localStorage", {
    get() {
      if (blocked) throw new Error("Storage is unavailable");
      return {
        getItem: () => saved,
        setItem: (key, value) => writes.push([key, value]),
      };
    },
  });
  vm.runInNewContext(source, { document, window });
  return {
    document, button, label, attributes, writes,
    ready() {
      document.readyState = "interactive";
      document.dispatchEvent(new Event("DOMContentLoaded"));
    },
    click() { button.dispatchEvent(new Event("click")); },
  };
}

test("first visit uses light even when the operating system prefers dark", () => {
  const f = fixture();
  assert.equal(f.document.documentElement.dataset.theme, "light");
  assert.equal(f.document.documentElement.style.colorScheme, "light");
  f.ready();
  assert.equal(f.label.textContent, "Light");
  assert.equal(f.attributes.get("aria-pressed"), "false");
  assert.equal(f.attributes.get("aria-label"), "Switch to dark theme");
  assert.equal(f.button.hidden, false);
  assert.deepEqual(f.writes, []);
});

test("saved dark is applied before DOM readiness and toggles back to saved light", () => {
  const f = fixture({ saved: "dark" });
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.equal(f.document.documentElement.style.colorScheme, "dark");
  assert.equal(f.button.hidden, true);
  f.ready();
  assert.equal(f.label.textContent, "Dark");
  assert.equal(f.attributes.get("aria-pressed"), "true");
  assert.equal(f.attributes.get("aria-label"), "Switch to light theme");
  f.click();
  assert.equal(f.document.documentElement.dataset.theme, "light");
  assert.equal(f.label.textContent, "Light");
  assert.equal(f.attributes.get("aria-pressed"), "false");
  assert.deepEqual(f.writes, [["worldecho-theme", "light"]]);
});

test("an invalid stored preference cannot enable an unsupported theme", () => {
  for (const saved of ["system", "DARK", "", "null"]) {
    const f = fixture({ saved });
    assert.equal(f.document.documentElement.dataset.theme, "light");
  }
});

test("the switch still works when reading and writing localStorage are blocked", () => {
  const f = fixture({ blocked: true });
  f.ready();
  f.click();
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.equal(f.label.textContent, "Dark");
  assert.equal(f.attributes.get("aria-pressed"), "true");
  f.click();
  assert.equal(f.document.documentElement.dataset.theme, "light");
  assert.equal(f.attributes.get("aria-label"), "Switch to dark theme");
});

test("loading the script after DOM readiness still binds a single usable switch", () => {
  const f = fixture({ readyState: "complete", saved: "light" });
  f.click();
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.deepEqual(f.writes, [["worldecho-theme", "dark"]]);
  assert.equal(f.attributes.get("title"), "Switch to light theme");
});
