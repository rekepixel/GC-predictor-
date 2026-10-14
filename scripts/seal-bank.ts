import fs from "node:fs";
import { createHash } from "node:crypto";
const files = [
  "data/verified/2026-documentary.json",
  "data/verified/2026-classification.json",
  "data/verified/2026-legal-evidence.json",
  "data/research/2026-retrieval.json",
  "data/research/2026-process-page.html",
];
const manifest = {
  schemaVersion: 1,
  bank: "gc-2026-documentary-v2",
  files: files.map((path) => ({
    path,
    sha256: createHash("sha256").update(fs.readFileSync(path)).digest("hex"),
  })),
};
fs.writeFileSync(
  "data/verified/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Manifiesto sellado para cotejo documental 2026.");
