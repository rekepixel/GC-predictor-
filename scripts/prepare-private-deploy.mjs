import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
const stamp = new Date().toISOString().replaceAll(":", "-");
const source = path.resolve(
  process.argv[2] || ".local/backups/private-deploy-" + stamp,
);
const target = path.resolve("deployment/seed");
try {
  await fs.access(path.join(target, "manifest.json"));
  throw Error(
    "Ya existe una entrega preparada en deployment/seed. Se conserva; prepara la siguiente en otra copia del proyecto.",
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (!process.argv[2]) {
  const r = spawnSync(process.execPath, ["scripts/backup.mjs", source], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
const manifest = JSON.parse(
  await fs.readFile(path.join(source, "manifest.json"), "utf8"),
);
if (
  manifest.version !== 1 ||
  !manifest.files.some((f) => f.path === "gc-predictor.sqlite")
)
  throw Error("Copia no válida.");
for (const f of manifest.files) {
  if (!/^(gc-predictor\.sqlite|originals\/[a-f0-9]{64}\.pdf)$/.test(f.path))
    throw Error("Archivo no admitido en entrega privada.");
  const data = await fs.readFile(path.join(source, f.path));
  if (crypto.createHash("sha256").update(data).digest("hex") !== f.sha256)
    throw Error("Copia alterada.");
}
await fs.mkdir(target, { recursive: true, mode: 0o700 });
for (const file of ["manifest.json", ...manifest.files.map((f) => f.path)]) {
  const dest = path.join(target, file);
  await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
  await fs.copyFile(path.join(source, file), dest, fs.constants.COPYFILE_EXCL);
}
console.log(
  JSON.stringify({
    privateSeed: target,
    files: manifest.files.length,
    uploaded: false,
    note: "Preparado localmente. No lo subas a un repositorio o registro público.",
  }),
);
