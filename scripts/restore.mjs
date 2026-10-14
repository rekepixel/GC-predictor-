import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
if (!process.argv[2])
  throw Error(
    "Uso: node scripts/restore.mjs DIRECTORIO_COPIA. Detén el servidor y usa un volumen vacío.",
  );
const source = path.resolve(process.argv[2]),
  target = path.resolve(
    process.env.SQLITE_PATH || ".local/gc-predictor.sqlite",
  );
const manifest = JSON.parse(
  await fs.readFile(path.join(source, "manifest.json"), "utf8"),
);
if (
  manifest.version !== 1 ||
  manifest.database !== "gc-predictor.sqlite" ||
  !Array.isArray(manifest.files)
)
  throw Error("Manifiesto no válido.");
try {
  await fs.access(target);
  throw Error(
    "La base de destino ya existe. No se sobrescribirá ningún registro.",
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const unique = new Set();
for (const f of manifest.files) {
  if (
    !/^(gc-predictor\.sqlite|originals\/[a-f0-9]{64}\.pdf)$/.test(f.path) ||
    unique.has(f.path)
  )
    throw Error("Ruta no válida o repetida en copia.");
  unique.add(f.path);
  const stat = await fs.lstat(path.join(source, f.path));
  if (!stat.isFile() || stat.isSymbolicLink())
    throw Error("Sólo se admiten archivos regulares.");
  const bytes = await fs.readFile(path.join(source, f.path));
  if (
    bytes.length !== f.bytes ||
    crypto.createHash("sha256").update(bytes).digest("hex") !== f.sha256
  )
    throw Error("Huella distinta: " + f.path);
  if (f.path.startsWith("originals/")) {
    const dest = path.resolve(".local", f.path);
    try {
      const existing = await fs.readFile(dest);
      if (!existing.equals(bytes))
        throw Error("Original existente distinto; no se sobrescribirá.");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}
if (!unique.has("gc-predictor.sqlite"))
  throw Error("Falta la base en la copia.");
const db = new Database(path.join(source, "gc-predictor.sqlite"), {
  readonly: true,
});
try {
  if (
    db.pragma("integrity_check", { simple: true }) !== "ok" ||
    db.pragma("foreign_key_check").length
  )
    throw Error("Copia inconsistente.");
} finally {
  db.close();
}
// Validate everything before writing; refuse any existing database, including a racing restore.
for (const f of manifest.files.filter((f) => f.path.startsWith("originals/"))) {
  const dest = path.resolve(".local", f.path);
  await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
  try {
    await fs.copyFile(
      path.join(source, f.path),
      dest,
      fs.constants.COPYFILE_EXCL,
    );
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
}
await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
await fs.copyFile(
  path.join(source, "gc-predictor.sqlite"),
  target,
  fs.constants.COPYFILE_EXCL,
);
console.log(
  JSON.stringify({
    restored: target,
    files: manifest.files.length,
    overwrittenRecords: 0,
  }),
);
