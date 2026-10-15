import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  storageConfigured,
  putPrivateObject,
  getPrivateObject,
} from "./private-storage";
const MAX = 25 * 1024 * 1024;
export async function storePDF(file: File) {
  if (file.size > MAX || file.size < 5)
    throw Error("El PDF debe ocupar entre 5 bytes y 25 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-")
    throw Error("El archivo no tiene cabecera PDF.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const key = `originals/${sha256}.pdf`;
  if (storageConfigured()) {
    await putPrivateObject(key, bytes, "application/pdf");
  } else {
    const full = path.resolve(".local", key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes, { flag: "w", mode: 0o600 });
  }
  return { key, sha256, bytes };
}
export async function readPDF(key: string) {
  if (
    !/^(originals\/[a-f0-9]{64}\.pdf|data\/(raw|pending)\/[a-zA-Z0-9_.-]+\.pdf)$/i.test(
      key,
    )
  )
    throw Error("Ruta de documento no válida.");
  if (storageConfigured()) return getPrivateObject(key);
  return fs.readFile(
    path.resolve(key.startsWith("data/") ? key : ".local/" + key),
  );
}
