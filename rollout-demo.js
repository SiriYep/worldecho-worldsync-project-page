import { VideoGroup } from "./video-playback.js";

const DEFAULT_MODEL = "cosmos_predict25_expert";
const instances = new WeakMap();

function assetPath(value) {
  return typeof value === "string" && value.startsWith("assets/") && !value.split("/").includes("..") ? value : "";
}

/** Keep catalog errors separate from an individual missing recording. */
export function validateCatalog(catalog) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.models) || !Array.isArray(catalog.cases)) {
    throw new TypeError("Unsupported rollout catalog.");
  }
  for (const [items, kind] of [[catalog.models, "model"], [catalog.cases, "sample"]]) {
    if (!items.length || items.some((item) => !item || typeof item.id !== "string" || !item.id)) {
      throw new TypeError(`The catalog needs named ${kind}s.`);
    }
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      throw new TypeError(`The catalog has duplicate ${kind} IDs.`);
    }
  }
  if (!catalog.models.some((model) => model.id === "worldsync") || catalog.models.length < 2) {
    throw new TypeError("The catalog needs WorldSync and a comparison model.");
  }
  return catalog;
}

/** Preserve an explicit model choice across samples, including missing clips. */
export function selectComparison(catalog, caseId, modelId = DEFAULT_MODEL) {
  const sample = catalog.cases.find((item) => item.id === caseId) || catalog.cases[0];
  const baselines = catalog.models.filter((model) => model.id !== "worldsync");
  const baseline = baselines.find((model) => model.id === modelId)
    || baselines.find((model) => model.id === DEFAULT_MODEL) || baselines[0];
  return {
    sample,
    baseline,
    worldsync: catalog.models.find((model) => model.id === "worldsync"),
    clips: { gt: sample.gt, baseline: sample.outputs?.[baseline.id], worldsync: sample.outputs?.worldsync },
  };
}

export function trainingLabel(model) {
  const regime = String(model.regime || "");
  const name = /^expert(?:\b|$)/i.test(regime) ? "Expert"
    : /^expanded(?:\b|$)/i.test(regime) ? "Expanded"
      : regime.toLowerCase() === "worldsync" ? "WorldSync" : regime;
  const step = Number(model.step);
  const count = step > 0 && Number.isFinite(step) ? `${step >= 1000 ? `${step / 1000}k` : step} steps` : String(model.step || "");
  const conditioning = model.actionConditioned === false && !name.includes("video-only") ? "video-only" : "";
  return [name, count, conditioning].filter(Boolean).join(" · ");
}

function clipInfo(clip) {
  if (!clip || !assetPath(clip.src)) return "Recording unavailable";
  return [
    Number.isFinite(clip.frames) ? `${clip.frames} frames` : "",
    Number.isFinite(clip.fps) ? `${Number(clip.fps.toFixed(2))} fps` : "",
    clip.width > 0 && clip.height > 0 ? `${clip.width} × ${clip.height}` : "",
  ].filter(Boolean).join(" · ");
}

/** Owns its VideoGroup; this root deliberately has no data-video-group attribute. */
export function setupRolloutDemo(root) {
  if (!root) return null;
  if (instances.has(root)) return instances.get(root);
  const query = (selector) => root.querySelector(selector);
  const caseSelect = query("[data-rollout-case]");
  const modelSelect = query("[data-rollout-model]");
  const loadPanel = query("[data-rollout-load]");
  const loadMessage = query("[data-rollout-load-message]");
  const retry = query("[data-rollout-retry]");
  const content = query("[data-rollout-content]");
  const input = query("[data-rollout-input]");
  const inputError = query("[data-rollout-input-error]");
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const slots = new Map(Array.from(root.querySelectorAll("[data-rollout-slot]")).map((slot) => [slot.dataset.rolloutSlot, {
    video: slot.querySelector("video"),
    error: slot.querySelector(".rollout-media-error"),
    info: slot.querySelector("[data-rollout-info]"),
  }]));
  let catalog;
  let group;
  let observer;
  let loading = false;
  let selected;

  const setText = (selector, value) => { query(selector).textContent = value || ""; };
  function renderSelection() {
    selected = selectComparison(catalog, caseSelect.value, modelSelect.value);
    const { sample, baseline, worldsync, clips } = selected;
    caseSelect.value = sample.id;
    modelSelect.value = baseline.id;
    setText("[data-rollout-title]", sample.label || sample.task || sample.id);
    setText("[data-rollout-model-name]", baseline.label || baseline.id);
    setText("[data-rollout-model-regime]", trainingLabel(baseline));
    setText("[data-rollout-worldsync-regime]", trainingLabel(worldsync));
    setText("[data-rollout-conditioning]", baseline.actionConditioned === false
      ? `${baseline.label || baseline.id} is a video-only baseline with no action input. WorldSync uses the recorded actions.`
      : "The model rollouts share the same initial observation and recorded actions.");
    root.dataset.videoOnly = String(baseline.actionConditioned === false);
    setText("[data-rollout-task]", sample.task);
    setText("[data-rollout-family]", sample.familyLabel ? `${sample.familyLabel} (${sample.family})` : sample.family);
    setText("[data-rollout-id]", sample.id);
    input.hidden = !assetPath(sample.input);
    inputError.hidden = !!assetPath(sample.input);
    inputError.textContent = "Initial observation is unavailable for this sample.";
    if (assetPath(sample.input)) input.src = sample.input;
    else input.removeAttribute("src");
    input.alt = `Initial observation for ${sample.label || sample.task || sample.id}`;
    const action = query("[data-rollout-action]");
    action.hidden = !assetPath(sample.action);
    if (assetPath(sample.action)) action.href = sample.action;
    else action.removeAttribute("href");

    const updateSources = () => {
      for (const [key, slot] of slots) {
        const clip = clips[key];
        const available = !!assetPath(clip?.src);
        slot.video.hidden = !available;
        slot.error.hidden = available;
        slot.error.textContent = "This recording is unavailable. Choose another sample or model.";
        slot.info.textContent = clipInfo(clip);
        if (available) slot.video.src = clip.src;
        else slot.video.removeAttribute("src");
        if (assetPath(clip?.poster)) slot.video.poster = clip.poster;
        else slot.video.removeAttribute("poster");
        const modelName = key === "gt" ? "Simulator ground truth" : key === "baseline" ? baseline.label || baseline.id : "WorldSync";
        slot.video.setAttribute("aria-label", `${modelName} rollout for ${sample.label || sample.task || sample.id}`);
      }
    };
    if (group) group.replaceSources(updateSources);
    else updateSources();
    if (group && Object.values(clips).some((clip) => !assetPath(clip?.src))) {
      group.fail("A recording is unavailable. Choose another sample or model.");
    }
  }

  function connectPlayback() {
    if (group) return;
    group = new VideoGroup(root, {
      reducedMotion: mediaQuery.matches,
      documentVisible: !document.hidden,
      visible: !("IntersectionObserver" in window),
    });
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) group.setVisible(entry.isIntersecting);
      }, { threshold: 0.01 });
      observer.observe(root);
    }
    document.addEventListener("visibilitychange", () => group.setDocumentVisible(!document.hidden));
    mediaQuery.addEventListener("change", (event) => group.setReducedMotion(event.matches));
    for (const [key, slot] of slots) {
      slot.video.addEventListener("error", () => {
        if (!slot.video.error || group.replacing) return;
        slot.error.textContent = "This clip could not load. Select Play comparison to retry.";
        slot.error.hidden = false;
      });
      slot.video.addEventListener("loadstart", () => {
        if (assetPath(selected?.clips[key]?.src)) slot.error.hidden = true;
      });
    }
  }

  async function loadCatalog() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    loadPanel.hidden = false;
    loadMessage.textContent = "Loading recorded comparisons…";
    root.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(root.dataset.catalog, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Catalog returned ${response.status}.`);
      catalog = validateCatalog(await response.json());
      caseSelect.replaceChildren(...catalog.cases.map((sample) => new Option(sample.label || sample.task || sample.id, sample.id)));
      modelSelect.replaceChildren(...catalog.models.filter((model) => model.id !== "worldsync").map((model) => (
        new Option(`${model.label || model.id} — ${trainingLabel(model)}`, model.id)
      )));
      modelSelect.value = selectComparison(catalog).baseline.id;
      const families = new Set(catalog.cases.map((sample) => sample.family).filter(Boolean));
      const queryTypes = new Set(Array.from(families, (family) => family.replace(/^perturbed_.+$/, "perturbed").replace(/^random_feasible_.+$/, "random_feasible")));
      setText("[data-rollout-coverage]", `${catalog.cases.length} samples · ${queryTypes.size} query types · ${families.size} subtypes`);
      setText("[data-rollout-selection-note]", catalog.selectionNote);
      // Attach listeners before assigning the first sources. Initial empty
      // <video> elements can still report NETWORK_NO_SOURCE after setting src;
      // the same replaceSources transaction used for switches clears that old
      // state, calls load(), and leaves subsequent real media errors visible.
      const firstLoad = !group;
      connectPlayback();
      renderSelection();
      if (firstLoad && !mediaQuery.matches && !group.errorMessage) group.play();
      content.hidden = false;
      loadPanel.hidden = true;
    } catch (error) {
      loadMessage.textContent = "The recorded comparisons could not load. Retry to load the sample catalog.";
      retry.hidden = false;
      console.warn("Rollout demo catalog is unavailable.", error);
    } finally {
      loading = false;
      root.setAttribute("aria-busy", "false");
    }
  }

  caseSelect.addEventListener("change", renderSelection);
  modelSelect.addEventListener("change", renderSelection);
  retry.addEventListener("click", loadCatalog);
  input.addEventListener("error", () => {
    input.hidden = true;
    inputError.textContent = "Initial observation could not load. Choose the sample again to retry.";
    inputError.hidden = false;
  });
  const instance = { load: loadCatalog };
  instances.set(root, instance);
  loadCatalog();
  return instance;
}
