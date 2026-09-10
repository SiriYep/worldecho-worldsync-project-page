import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMMANDS, createDraft, appendCommand, undoCommand,
  deriveArmState, serializeDraft,
} from "../wm-preview-state.js";

test("a fresh preview starts empty for a supported scene, with no shared command list", () => {
  const first = createDraft();
  assert.deepEqual(first, { scene: "grab", commands: [] });
  assert.notEqual(first.commands, createDraft().commands);
  for (const scene of ["handover", "bread"]) {
    assert.deepEqual(createDraft(scene), { scene, commands: [] });
  }
  for (const scene of ["unknown", "", null, "toString"]) {
    assert.throws(() => createDraft(scene), TypeError);
  }
});

test("append copies the input command and preserves earlier drafts", () => {
  const empty = Object.freeze({ scene: "grab", commands: Object.freeze([]) });
  const input = { arm: "left", kind: "translate", axis: "x", value: 0.02 };
  const first = appendCommand(empty, input);
  input.value = 0.04;
  assert.deepEqual(empty.commands, []);
  assert.equal(first.commands[0].value, 0.02);

  const second = appendCommand(first, { arm: "right", kind: "gripper", value: "open" });
  assert.notEqual(second, first);
  assert.notEqual(second.commands, first.commands);
  second.commands[0].value = -0.03;
  assert.equal(first.commands.length, 1);
  assert.equal(first.commands[0].value, 0.02);
});

test("translation accepts both 5 cm boundaries and rejects zero, nonnumbers, and excess", () => {
  for (const value of [0.05, -0.05, 0.0001]) {
    const draft = appendCommand(createDraft(), { arm: "left", kind: "translate", axis: "z", value });
    assert.equal(draft.commands[0].value, value);
  }
  for (const value of [0, -0, 0.05000001, -0.05000001, NaN, Infinity, -Infinity, "0.01", null, undefined]) {
    assert.throws(() => appendCommand(createDraft(), { arm: "left", kind: "translate", axis: "z", value }));
  }
});

test("rotation uses radians with a 15-degree per-command limit and numerical tolerance", () => {
  for (const value of [Math.PI / 12, -Math.PI / 12, Math.PI / 12 + 0.5e-9]) {
    const draft = appendCommand(createDraft(), { arm: "right", kind: "rotate", axis: "y", value });
    assert.equal(draft.commands[0].value, value);
  }
  for (const value of [0, -0, Math.PI / 12 + 2e-9, -Math.PI / 12 - 2e-9, 15, NaN, Infinity, "0.1"]) {
    assert.throws(() => appendCommand(createDraft(), { arm: "right", kind: "rotate", axis: "y", value }));
  }
});

test("unknown arms, kinds, and axes cannot enter a command draft", () => {
  const valid = { arm: "left", kind: "translate", axis: "x", value: 0.01 };
  for (const patch of [
    { arm: "both" }, { arm: null }, { kind: "move" }, { kind: "toString" },
    { axis: "w" }, { axis: "__proto__" }, { axis: undefined },
    { kind: "rotate", axis: null },
  ]) {
    assert.throws(() => appendCommand(createDraft(), { ...valid, ...patch }), TypeError);
  }
  assert.throws(() => deriveArmState(createDraft(), "both"), TypeError);
  assert.throws(() => appendCommand(createDraft(), null), TypeError);
});

test("gripper commands accept only open or close, and reject unknown axes if supplied", () => {
  for (const value of ["open", "close"]) {
    const draft = appendCommand(createDraft(), { arm: "right", kind: "gripper", value });
    assert.equal(deriveArmState(draft, "right").gripper, value);
  }
  for (const value of ["unchanged", "OPEN", 0, 1, null, undefined]) {
    assert.throws(() => appendCommand(createDraft(), { arm: "left", kind: "gripper", value }), TypeError);
  }
  assert.throws(() => appendCommand(createDraft(), { arm: "left", kind: "gripper", axis: "w", value: "open" }), TypeError);
});

test("UI deltas accumulate only on the selected arm without claiming an absolute pose", () => {
  const draft = {
    scene: "handover",
    commands: [
      { arm: "left", kind: "translate", axis: "x", value: 0.02 },
      { arm: "right", kind: "translate", axis: "z", value: -0.04 },
      { arm: "left", kind: "translate", axis: "x", value: -0.005 },
      { arm: "left", kind: "translate", axis: "y", value: -0.01 },
      { arm: "right", kind: "rotate", axis: "x", value: 0.1 },
      { arm: "left", kind: "rotate", axis: "z", value: -0.2 },
      { arm: "left", kind: "gripper", value: "close" },
    ],
  };
  assert.deepEqual(deriveArmState(draft, "left"), {
    translation: { x: 0.015, y: -0.01, z: 0 },
    rotation: { x: 0, y: 0, z: -0.2 }, gripper: "close",
  });
  assert.deepEqual(deriveArmState(draft, "right"), {
    translation: { x: 0, y: 0, z: -0.04 },
    rotation: { x: 0.1, y: 0, z: 0 }, gripper: "unchanged",
  });
  assert.deepEqual(deriveArmState(createDraft(), "left"), {
    translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, gripper: "unchanged",
  });
});

test("undo restores the preceding gripper state while leaving the other arm untouched", () => {
  const original = {
    scene: "grab",
    commands: [
      { arm: "left", kind: "gripper", value: "close" },
      { arm: "right", kind: "gripper", value: "open" },
      { arm: "left", kind: "gripper", value: "open" },
    ],
  };
  const undone = undoCommand(original);
  assert.equal(deriveArmState(undone, "left").gripper, "close");
  assert.equal(deriveArmState(undone, "right").gripper, "open");
  assert.equal(deriveArmState(original, "left").gripper, "open");
  assert.equal(original.commands.length, 3);
  undone.commands[0].value = "open";
  assert.equal(original.commands[0].value, "close");

  const cleared = undoCommand(undoCommand(undoCommand(original)));
  assert.equal(deriveArmState(cleared, "left").gripper, "unchanged");
  assert.deepEqual(undoCommand(cleared), { scene: "grab", commands: [] });
});

test("the 49th command is rejected and undo makes one slot available", () => {
  let draft = createDraft();
  const command = { arm: "left", kind: "translate", axis: "x", value: 0.01 };
  for (let count = 0; count < 48; count += 1) draft = appendCommand(draft, command);
  assert.equal(draft.commands.length, MAX_COMMANDS);
  assert.throws(() => appendCommand(draft, command), RangeError);
  assert.equal(draft.commands.length, 48);
  assert.equal(appendCommand(undoCommand(draft), command).commands.length, 48);
});

test("export labels the unexecuted UI draft and recorded reference with explicit units", () => {
  const draft = appendCommand(createDraft("grab"), { arm: "left", kind: "translate", axis: "x", value: 0.02 });
  const serialized = serializeDraft(draft);
  assert.match(serialized, /^\{\n  "schema":/);
  const exported = JSON.parse(serialized);
  assert.deepEqual(exported, {
    schema: "worldsync-ui-preview/v1", mode: "interface-preview", executed: false,
    scene: "grab", actionSpace: "ui-end-effector-delta",
    units: { translation: "m", rotation: "rad" },
    reference: { kind: "recorded-simulator-frame", asset: "assets/posters/grab-gt.png", frameIndex: 22, fps: 30 },
    commands: [{ arm: "left", kind: "translate", axis: "x", value: 0.02 }],
  });
  exported.commands[0].value = 0.05;
  assert.equal(draft.commands[0].value, 0.02);
  for (const scene of ["handover", "bread"]) {
    assert.deepEqual(JSON.parse(serializeDraft(createDraft(scene))).reference, {
      kind: "recorded-simulator-frame", asset: `assets/posters/${scene}-gt.png`, frameIndex: 20, fps: 30,
    });
  }
});

test("malformed external drafts cannot bypass validation through derive, undo, or export", () => {
  const invalidDrafts = [
    { scene: "unknown", commands: [] },
    { scene: "grab", commands: null },
    { scene: "grab", commands: [{ arm: "left", kind: "translate", axis: "x", value: Infinity }] },
    { scene: "grab", commands: Array(49).fill({ arm: "left", kind: "gripper", value: "open" }) },
  ];
  for (const draft of invalidDrafts) {
    assert.throws(() => deriveArmState(draft, "left"));
    assert.throws(() => undoCommand(draft));
    assert.throws(() => serializeDraft(draft));
  }
});
