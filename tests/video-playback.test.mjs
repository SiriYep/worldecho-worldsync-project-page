import test from "node:test";
import assert from "node:assert/strict";
import { VideoGroup } from "../video-playback.js";

class Element extends EventTarget {
  dataset = {};
  textContent = "";
  attributes = {};
  hidden = true;
  disabled = false;
  value = "0";
  setAttribute(name, value) { this.attributes[name] = value; }
}

class Video extends Element {
  duration = 1.1;
  currentTime = 0;
  readyState = 4;
  seeking = false;
  error = null;
  paused = true;
  ended = false;
  networkState = 1;
  playCalls = 0;
  loadCalls = 0;
  nextPlay = null;
  sources = [new Element()];
  querySelectorAll() { return this.sources; }
  play() {
    this.playCalls += 1;
    this.paused = false;
    return this.nextPlay || Promise.resolve();
  }
  pause() { this.paused = true; }
  load() {
    this.loadCalls += 1;
    this.readyState = 0;
    this.currentTime = 0;
    this.ended = false;
    this.error = null;
  }
  ready() {
    this.readyState = 4;
    this.dispatchEvent(new Event("canplay"));
  }
}

function fixture(options = {}, prepareVideos) {
  const videos = [new Video(), new Video(), new Video()];
  prepareVideos?.(videos);
  const root = new Element();
  const controls = new Map([
    "[data-playback-toggle]", "[data-playback-restart]", "[data-playback-status]",
    "[data-playback-seek]", "[data-playback-time]", ".playback-controls",
  ].map((selector) => [selector, new Element()]));
  root.querySelector = (selector) => controls.get(selector);
  root.querySelectorAll = () => videos;
  let nextFrame = 0;
  const frames = new Map();
  const group = new VideoGroup(root, {
    requestFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelFrame: (id) => frames.delete(id),
    ...options,
  });
  return { group, videos, root, controls, frames };
}

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test("initially empty media enters the source transaction without retaining a stale no-source error", async () => {
  for (const reducedMotion of [false, true]) {
    const f = fixture({ visible: false, reducedMotion }, (videos) => {
      videos.forEach((video) => { video.networkState = 3; video.readyState = 0; });
    });
    assert.equal(f.root.dataset.playbackState, "error");
    f.group.replaceSources(() => {});
    if (!reducedMotion && !f.group.errorMessage) f.group.play();
    f.videos.forEach((video) => video.ready());
    f.group.setVisible(true);
    await settle();
    assert.equal(f.group.errorMessage, "");
    assert.equal(f.group.playing, !reducedMotion);
    assert.ok(f.videos.every((video) => video.loadCalls === 1));
    // A later media error must still fail visibly after initialization.
    f.videos[1].error = { code: 4 };
    f.videos[1].dispatchEvent(new Event("error"));
    assert.equal(f.root.dataset.playbackState, "error");
  }
});

test("waits for every clip, then mounts shared controls and starts as a group", async () => {
  const f = fixture({ visible: false });
  f.videos[2].readyState = 1;
  f.group.setVisible(true);
  assert.deepEqual(f.videos.map((v) => v.playCalls), [0, 0, 0]);
  assert.equal(f.controls.get(".playback-controls").hidden, false);
  assert.ok(f.videos.every((v) => v.controls === false));
  f.videos[2].ready();
  await settle();
  assert.ok(f.videos.every((v) => v.playCalls === 1));
  assert.equal(f.root.dataset.playbackState, "playing");
});

test("manual pause survives hidden documents, scrolling, case changes, and restart", async () => {
  const f = fixture();
  await settle();
  f.group.pause();
  f.group.setDocumentVisible(false);
  f.group.setVisible(false);
  f.group.setDocumentVisible(true);
  f.group.setVisible(true);
  f.group.replaceSources(() => {});
  f.videos.forEach((video) => video.ready());
  f.group.restart();
  await settle();
  assert.equal(f.group.wanted, false);
  assert.ok(f.videos.every((v) => v.paused && v.playCalls === 1));
});

test("visibility pauses automatically and resumes only the prior playing intent", async () => {
  const f = fixture();
  await settle();
  f.group.setVisible(false);
  assert.ok(f.videos.every((v) => v.paused));
  f.group.setVisible(true);
  await settle();
  assert.ok(f.videos.every((v) => !v.paused && v.playCalls === 2));
});

test("reduced motion prevents initial autoplay and reacts to preference changes", async () => {
  const f = fixture({ reducedMotion: true });
  await settle();
  assert.ok(f.videos.every((v) => v.playCalls === 0));
  f.group.play();
  await settle();
  assert.equal(f.group.playing, true);
  f.group.setReducedMotion(true);
  assert.equal(f.group.playing, false);
  f.group.setReducedMotion(false);
  f.group.setVisible(false);
  f.group.setVisible(true);
  assert.ok(f.videos.every((v) => v.paused && v.playCalls === 1));
});

test("case switch is one load transaction and ignores obsolete play rejection", async () => {
  const f = fixture({ visible: false });
  const oldPlay = deferred();
  f.videos[0].nextPlay = oldPlay.promise;
  f.group.setVisible(true);
  f.group.replaceSources(() => {});
  f.group.replaceSources(() => {});
  f.videos[0].nextPlay = null;
  f.videos.forEach((video) => video.ready());
  await settle();
  assert.equal(f.group.playing, true);
  oldPlay.reject(new Error("source replaced"));
  await settle();
  assert.equal(f.group.playing, true);
  assert.equal(f.group.errorMessage, "");
  assert.ok(f.videos.every((v) => v.loadCalls === 2));
});

test("a pending play completion cannot resume an explicit pause", async () => {
  const f = fixture({ visible: false });
  const pending = deferred();
  f.videos[0].nextPlay = pending.promise;
  f.group.setVisible(true);
  f.group.pause();
  pending.resolve();
  await settle();
  assert.equal(f.group.playing, false);
  assert.ok(f.videos.every((v) => v.paused));
});

test("play failure pauses the entire group and reports a retry without false playing state", async () => {
  const f = fixture({ visible: false });
  f.videos[1].nextPlay = Promise.reject(new Error("blocked"));
  f.group.setVisible(true);
  await settle();
  assert.ok(f.videos.every((v) => v.paused));
  assert.equal(f.root.dataset.playbackState, "error");
  assert.equal(f.controls.get("[data-playback-toggle]").textContent, "Play comparison");
  assert.match(f.controls.get("[data-playback-status]").textContent, /retry/);
});

test("different source durations use the full clip through normalized rates, seek, and loop", async () => {
  const f = fixture({ visible: false });
  f.videos[2].duration = 1.5;
  f.group.setVisible(true);
  await settle();
  assert.equal(f.group.duration, 1.5);
  assert.deepEqual(f.videos.map((v) => v.playbackRate), [1.1 / 1.5, 1.1 / 1.5, 1]);
  f.group.pause();
  f.group.seek(50);
  assert.deepEqual(f.videos.map((v) => v.currentTime), [0.55, 0.55, 0.75]);
  f.group.seek(100);
  assert.ok(f.videos[2].currentTime > 1.49, "long clip must retain its final 0.4 seconds");
  f.group.play();
  await settle();
  f.videos[2].ended = true;
  f.videos[2].dispatchEvent(new Event("ended"));
  f.videos[2].ended = false;
  await settle();
  assert.deepEqual(f.videos.map((v) => v.currentTime), [0, 0, 0]);
});

test("buffering pauses all clips until every stream is ready again", async () => {
  const f = fixture();
  await settle();
  f.videos[2].readyState = 2;
  f.videos[2].dispatchEvent(new Event("waiting"));
  assert.ok(f.videos.every((v) => v.paused));
  assert.equal(f.group.wanted, true);
  f.videos[2].ready();
  await settle();
  assert.equal(f.group.playing, true);
});

test("media load error has a deliberate retry and clears on replacement", async () => {
  const f = fixture();
  await settle();
  f.videos[0].error = { code: 4 };
  f.videos[0].dispatchEvent(new Event("error"));
  assert.equal(f.root.dataset.playbackState, "error");
  f.group.play();
  f.videos.forEach((video) => video.ready());
  await settle();
  assert.equal(f.group.playing, true);
  assert.equal(f.group.errorMessage, "");
});


test("source-level decode error is visible even when video.error is unset", async () => {
  const f = fixture({ visible: false });
  f.videos[0].readyState = 0;
  f.videos[0].sources[0].dispatchEvent(new Event("error"));
  await settle();
  assert.equal(f.videos[0].error, null);
  assert.equal(f.root.dataset.playbackState, "error");
  assert.match(f.controls.get("[data-playback-status]").textContent, /could not load/);
});
