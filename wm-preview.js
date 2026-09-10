import { MAX_COMMANDS, createDraft, appendCommand, undoCommand, deriveArmState, serializeDraft } from "./wm-preview-state.js";

const SCENES = {
  grab: { label: "Grab roller", frame: "assets/posters/grab-gt.png", video: "assets/videos/grab-gt.mp4" },
  handover: { label: "Handover block", frame: "assets/posters/handover-gt.png", video: "assets/videos/handover-gt.mp4" },
  bread: { label: "Place bread in basket", frame: "assets/posters/bread-gt.png", video: "assets/videos/bread-gt.mp4" },
};

const armLabel = (arm) => arm === "left" ? "Left arm" : "Right arm";
const signed = (value, digits = 1) => {
  const rounded = Math.abs(value) < 10 ** -digits / 2 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
};
const describe = (command) => {
  if (command.kind === "gripper") return `${command.value === "open" ? "Open" : "Close"} gripper`;
  if (command.kind === "translate") return `Move ${command.axis.toUpperCase()} ${signed(command.value * 100)} cm`;
  return `${{ x: "Roll", y: "Pitch", z: "Yaw" }[command.axis]} ${signed(command.value * 180 / Math.PI, 0)}°`;
};

/** A local interface draft, intentionally without a model transport or inference. */
export function setupWorldModelPreview() {
  const root = document.querySelector("[data-wm-preview]");
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = "true";
  const find = (name) => root.querySelector(`[data-wm-${name}]`);
  const scene = find("scene");
  const controls = find("controls");
  const reference = find("reference");
  const video = find("example");
  const history = find("history");
  const keys = Array.from(root.querySelectorAll("[data-wm-key]"));
  const arms = Array.from(root.querySelectorAll("[data-wm-arm]"));
  let draft = createDraft(scene.value);
  let activeArm = "left";
  let exampleVisible = false;
  let exampleEpoch = 0;
  const status = (message) => { find("status").textContent = message; };

  function render() {
    const state = deriveArmState(draft, activeArm);
    find("active-arm").textContent = armLabel(activeArm);
    arms.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.wmArm === activeArm)));
    find("position").textContent = ["x", "y", "z"].map((axis) => signed(state.translation[axis] * 100)).join(" / ");
    find("rotation").textContent = ["x", "y", "z"].map((axis) => signed(state.rotation[axis] * 180 / Math.PI, 0)).join(" / ");
    find("gripper").textContent = { unchanged: "Unchanged", open: "Open", close: "Closed" }[state.gripper];
    find("count").textContent = `${draft.commands.length} / ${MAX_COMMANDS}`;
    find("undo").disabled = find("download").disabled = draft.commands.length === 0;
    keys.forEach((button) => { button.disabled = draft.commands.length >= MAX_COMMANDS; });
    find("history-empty").hidden = draft.commands.length > 0;
    history.hidden = draft.commands.length === 0;
    const rows = document.createDocumentFragment();
    draft.commands.forEach((command, index) => {
      const row = document.createElement("li");
      for (const text of [String(index + 1).padStart(2, "0"), armLabel(command.arm), describe(command)]) {
        const span = document.createElement("span");
        span.textContent = text;
        row.append(span);
      }
      rows.append(row);
    });
    history.replaceChildren(rows);
    history.scrollTop = history.scrollHeight;
  }

  function add(button) {
    if (draft.commands.length >= MAX_COMMANDS) {
      status("The draft has 48 commands. Undo a command or reset to continue.");
      return;
    }
    const { kind, axis, sign, value } = button.dataset;
    const command = kind === "gripper"
      ? { arm: activeArm, kind, value }
      : { arm: activeArm, kind, axis, value: Number(sign) * (kind === "translate" ? Number(find("move-step").value) : Number(find("rotate-step").value) * Math.PI / 180) };
    draft = appendCommand(draft, command);
    render();
    button.classList.add("is-active");
    window.setTimeout(() => button.classList.remove("is-active"), 150);
    status(`${armLabel(activeArm)}: ${describe(command)} added. ${draft.commands.length} of ${MAX_COMMANDS} commands drafted; none executed.`);
  }

  keys.forEach((button) => button.addEventListener("click", () => add(button)));
  controls.addEventListener("keydown", (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.target.closest("select, input, textarea, [contenteditable='true']")) return;
    const button = keys.find((key) => key.dataset.wmKey === event.key.toLowerCase());
    if (!button) return;
    event.preventDefault();
    add(button);
  });
  arms.forEach((button) => button.addEventListener("click", () => {
    activeArm = button.dataset.wmArm;
    render();
    status(`${armLabel(activeArm)} selected. Controls add commands to its draft.`);
  }));
  find("undo").addEventListener("click", () => {
    draft = undoCommand(draft);
    render();
    status(`Last command removed. ${draft.commands.length} commands remain.`);
  });

  function hideExample() {
    exampleEpoch += 1;
    exampleVisible = false;
    video.pause();
    video.hidden = true;
    video.removeAttribute("src");
    video.load();
    find("empty").hidden = false;
    find("output-title").textContent = "Model rollout";
    find("output-badge").textContent = "Not connected";
    find("output-note").textContent = "No inference is running in this preview.";
    find("show-example").textContent = "Play recorded example";
  }
  function resetDraft(message) {
    draft = createDraft(scene.value);
    activeArm = "left";
    hideExample();
    render();
    status(message);
  }
  find("reset").addEventListener("click", () => resetDraft("Draft reset. No commands were executed."));
  function syncSceneMedia() {
    const selected = SCENES[scene.value];
    reference.src = selected.frame;
    reference.alt = `Recorded simulator reference frame for ${selected.label}`;
    video.setAttribute("aria-label", `Recorded simulator example for ${selected.label}`);
  }
  scene.addEventListener("change", () => {
    syncSceneMedia();
    resetDraft(`${SCENES[scene.value].label} selected. The previous draft and example were cleared.`);
  });

  find("show-example").addEventListener("click", async () => {
    if (exampleVisible) {
      hideExample();
      status("Recorded example hidden. Your action draft is unchanged.");
      return;
    }
    const epoch = ++exampleEpoch;
    exampleVisible = true;
    video.src = SCENES[scene.value].video;
    video.hidden = false;
    find("empty").hidden = true;
    find("output-title").textContent = "Recorded simulator rollout";
    find("output-badge").textContent = "Example recording";
    find("output-note").textContent = "Existing simulator recording. Not generated from your current actions.";
    find("show-example").textContent = "Hide recorded example";
    status("Showing a recorded simulator example. Your draft has not been executed.");
    try { await video.play(); }
    catch {
      if (exampleEpoch === epoch && exampleVisible) status("Use the video play button to view this recorded example. No inference is running.");
    }
  });
  video.addEventListener("error", () => {
    if (exampleVisible) status("The recorded example could not load. Hide it and try again.");
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause(); }).observe(video);
  }
  find("download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([serializeDraft(draft)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.scene}-action-draft.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("Action draft downloaded. No commands were executed.");
  });
  syncSceneMedia();
  render();
}
