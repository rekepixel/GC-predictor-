import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
const MAX = 25 * 1024 * 1024;
export async function storePDF(file: File) {
  if (file.size > MAX || file.size < 5)
    throw Error("El PDF debe ocupar entre 5 bytes y 25 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-")
    throw Error("El archivo no tiene cabecera PDF.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const key = `originals/${sha256}.pdf`;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.SUPABASE_STORAGE_BUCKET || "gc-originals"}/${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!r.ok && r.status !== 409 && r.status !== 400)
      throw Error(`No se pudo almacenar el original (${r.status}).`);
    if (r.status === 400) {
      const text = await r.text();
      if (!text.includes("Duplicate"))
        throw Error("Error del bucket privado de Supabase.");
    }
  } else {
    const full = path.resolve(".local", key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes, { flag: "w", mode: 0o600 });
  }
  return { key, sha256, bytes };
}
export async function readPDF(key: string) {
  if (
    !/^(originals\/[a-f0-9]{64}\.pdf|data\/raw\/[a-zA-Z0-9_.-]+\.pdf)$/i.test(
      key,
    )
  )
    throw Error("Ruta de documento no válida.");
  if (
    key.startsWith("originals/") &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/authenticated/${process.env.SUPABASE_STORAGE_BUCKET || "gc-originals"}/${key}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    );
    if (!r.ok) throw Error("Original no disponible.");
    return Buffer.from(await r.arrayBuffer());
  }
  return fs.readFile(
    path.resolve(key.startsWith("data/") ? key : ".local/" + key),
  );
}
