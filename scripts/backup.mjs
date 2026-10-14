import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
const dbPath = path.resolve(
  process.env.SQLITE_PATH || ".local/gc-predictor.sqlite",
);
const destination = path.resolve(
  process.argv[2] ||
    ".local/backups/export-" + new Date().toISOString().replaceAll(":", "-"),
);
await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
await fs.mkdir(destination, { recursive: false, mode: 0o700 });
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  await db.backup(path.join(destination, "gc-predictor.sqlite"));
} finally {
  db.close();
}
const originals = path.resolve(".local/originals");
try {
  await fs.cp(originals, path.join(destination, "originals"), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const files = [];
async function walk(folder) {
  for (const e of await fs.readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, e.name);
    if (e.isDirectory()) await walk(full);
    else if (e.isFile()) {
      const data = await fs.readFile(full);
      files.push({
        path: path.relative(destination, full).split(path.sep).join("/"),
        bytes: data.length,
        sha256: crypto.createHash("sha256").update(data).digest("hex"),
      });
    } else throw Error("Enlace no admitido en copia.");
  }
}
await walk(destination);
const check = new Database(path.join(destination, "gc-predictor.sqlite"), {
  readonly: true,
});
try {
  if (check.pragma("integrity_check", { simple: true }) !== "ok")
    throw Error("Copia SQLite inconsistente.");
  if (check.pragma("foreign_key_check").length)
    throw Error("Referencias rotas en copia.");
} finally {
  check.close();
}
await fs.writeFile(
  path.join(destination, "manifest.json"),
  JSON.stringify(
    {
      version: 1,
      createdAt: new Date().toISOString(),
      database: "gc-predictor.sqlite",
      files,
      scope:
        "SQLite online backup + uploaded originals. Keep a copy outside the hosting provider; retained data/raw and data/pending are included in the project package.",
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    backup: destination,
    files: files.length,
    sqliteIntegrity: "ok",
  }),
);
