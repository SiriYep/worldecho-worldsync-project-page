/**
 * Pure state for the WorldSync interface preview. No inference is performed.
 * Commands use uncalibrated UI axes: this is not a robot/backend protocol.
 */
export const MAX_COMMANDS = 48;

const SCENES = ["grab", "handover", "bread"];
const ARMS = ["left", "right"];
const KINDS = ["translate", "rotate", "gripper"];
const AXES = ["x", "y", "z"];
const REFERENCE_FRAMES = { grab: 22, handover: 20, bread: 20 };

function validateScene(scene) {
  if (!SCENES.includes(scene)) throw new TypeError("Unknown preview scene.");
}

function validateArm(arm) {
  if (!ARMS.includes(arm)) throw new TypeError("Unknown arm.");
}

function copyCommand(command) {
  if (!command || typeof command !== "object") throw new TypeError("A command is required.");
  const { arm, kind, axis, value } = command;
  validateArm(arm);
  if (!KINDS.includes(kind)) throw new TypeError("Unknown command kind.");
  if (axis !== undefined && !AXES.includes(axis)) throw new TypeError("Unknown UI axis.");

  if (kind === "gripper") {
    if (value !== "open" && value !== "close") throw new TypeError("Gripper must be open or close.");
    return { arm, kind, value };
  }

  if (!AXES.includes(axis)) throw new TypeError("Translation and rotation need a UI axis.");
  if (!Number.isFinite(value)) throw new TypeError("A finite numeric delta is required.");
  const limit = kind === "translate" ? 0.05 : Math.PI / 12 + 1e-9;
  if (value === 0 || Math.abs(value) > limit) throw new RangeError("Delta is zero or exceeds the per-command limit.");
  return { arm, kind, axis, value };
}

function copyDraft(draft) {
  if (!draft || typeof draft !== "object") throw new TypeError("A preview draft is required.");
  validateScene(draft.scene);
  if (!Array.isArray(draft.commands)) throw new TypeError("Draft commands must be an array.");
  if (draft.commands.length > MAX_COMMANDS) throw new RangeError("The preview supports at most 48 commands.");
  return { scene: draft.scene, commands: Array.from(draft.commands, copyCommand) };
}

export function createDraft(scene = "grab") {
  validateScene(scene);
  return { scene, commands: [] };
}

export function appendCommand(draft, command) {
  const next = copyDraft(draft);
  if (next.commands.length >= MAX_COMMANDS) throw new RangeError("The preview supports at most 48 commands.");
  next.commands.push(copyCommand(command));
  return next;
}

export function undoCommand(draft) {
  const next = copyDraft(draft);
  next.commands.pop();
  return next;
}

/** Sum UI deltas only; the result is not an estimated or measured end-effector pose. */
export function deriveArmState(draft, arm) {
  validateArm(arm);
  const { commands } = copyDraft(draft);
  const state = {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    gripper: "unchanged",
  };
  for (const command of commands) {
    if (command.arm !== arm) continue;
    if (command.kind === "gripper") state.gripper = command.value;
    else state[command.kind === "translate" ? "translation" : "rotation"][command.axis] += command.value;
  }
  return state;
}

/** Export an unexecuted UI draft, not an inference request or robot action protocol. */
export function serializeDraft(draft) {
  const { scene, commands } = copyDraft(draft);
  return JSON.stringify({
    schema: "worldsync-ui-preview/v1",
    mode: "interface-preview",
    executed: false,
    scene,
    actionSpace: "ui-end-effector-delta",
    units: { translation: "m", rotation: "rad" },
    reference: {
      kind: "recorded-simulator-frame",
      asset: `assets/posters/${scene}-gt.png`,
      frameIndex: REFERENCE_FRAMES[scene],
      fps: 30,
    },
    commands,
  }, null, 2);
}
