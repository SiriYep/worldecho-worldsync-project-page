import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "dist", "client");
const serverDir = path.join(root, "dist", "server");
const publicEntries = [
  ".nojekyll",
  "assets",
  "index.html",
  "responsive.css",
  "publication.css",
  "robots.txt",
  "script.js",
  "leaderboard.js",
  "action-coverage.js",
  "action-coverage.css",
  "rollout-demo.js",
  "rollout-demo.css",
  "theme.js",
  "theme.css",
  "video-playback.js",
  "wm-preview.js",
  "wm-preview-state.js",
  "wm-preview.css",
  "sections.css",
  "styles.css"
];

await rm(path.join(root, "dist"), { recursive: true, force: true });
await mkdir(clientDir, { recursive: true });
await mkdir(serverDir, { recursive: true });

for (const entry of publicEntries) {
  await cp(path.join(root, entry), path.join(clientDir, entry), {
    recursive: true
  });
}

await cp(path.join(root, "worker", "index.js"), path.join(serverDir, "index.js"));
