import { createHash } from "node:crypto";
import { requireCloudStorage } from "./cloud";

export function storageConfigured() {
  requireCloudStorage();
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function config() {
  if (!storageConfigured())
    throw Error("Almacenamiento privado sin configurar.");
  const base = new URL(process.env.SUPABASE_URL!);
  if (
    base.protocol !== "https:" &&
    !["127.0.0.1", "localhost"].includes(base.hostname)
  )
    throw Error("Supabase requiere HTTPS.");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return {
    base: base.origin + "/storage/v1",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "gc-originals",
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  };
}
function objectPath(key: string) {
  if (
    !/^[a-zA-Z0-9_./-]+$/.test(key) ||
    key.split("/").some((s) => s === ".." || s === "." || !s)
  )
    throw Error("Ruta de almacenamiento no válida.");
  const c = config();
  return {
    ...c,
    object: `${encodeURIComponent(c.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`,
  };
}
export async function getPrivateObject(key: string) {
  const c = objectPath(key);
  const r = await fetch(`${c.base}/object/authenticated/${c.object}`, {
    headers: c.headers,
    cache: "no-store",
  });
  if (!r.ok) throw Error(`Documento privado no disponible (${r.status}).`);
  return Buffer.from(await r.arrayBuffer());
}
export async function putPrivateObject(
  key: string,
  bytes: Buffer,
  contentType = "application/octet-stream",
) {
  const c = objectPath(key);
  const r = await fetch(`${c.base}/object/${c.object}`, {
    method: "POST",
    headers: { ...c.headers, "Content-Type": contentType, "x-upsert": "false" },
    body: new Uint8Array(bytes),
  });
  if (r.ok) return;
  // Existing immutable objects must have the same bytes, not merely a duplicate name.
  const error = await r.json().catch(() => ({}));
  if (
    r.status !== 409 &&
    error?.error !== "Duplicate" &&
    error?.statusCode !== "409"
  )
    throw Error(`No se pudo guardar el documento privado (${r.status}).`);
  const existing = await getPrivateObject(key);
  if (
    createHash("sha256").update(existing).digest("hex") !==
    createHash("sha256").update(bytes).digest("hex")
  )
    throw Error(
      "Ya existe una versión distinta: se ha impedido sobrescribir la evidencia.",
    );
}
function signedURL(base: string, value: string) {
  const url = new URL(value.startsWith("/") ? base + value : value, base + "/");
  if (
    url.origin !== new URL(base).origin ||
    !url.pathname.startsWith("/storage/v1/object/")
  )
    throw Error("URL de almacenamiento no válida.");
  return url.href;
}
export async function signPrivateDownload(key: string) {
  const c = objectPath(key);
  const r = await fetch(`${c.base}/object/sign/${c.object}`, {
    method: "POST",
    headers: { ...c.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (!r.ok) throw Error("No se pudo autorizar la consulta del documento.");
  return signedURL(c.base, (await r.json()).signedURL);
}
export async function signPrivateUpload(key: string) {
  const c = objectPath(key);
  const r = await fetch(`${c.base}/object/upload/sign/${c.object}`, {
    method: "POST",
    headers: {
      ...c.headers,
      "Content-Type": "application/json",
      "x-upsert": "false",
    },
    body: "{}",
  });
  if (!r.ok) throw Error("No se pudo autorizar la subida privada.");
  return signedURL(c.base, (await r.json()).url);
}
export async function ensurePrivateBucket() {
  const c = config();
  const r = await fetch(`${c.base}/bucket/${encodeURIComponent(c.bucket)}`, {
    headers: c.headers,
  });
  if (r.status === 404) {
    const created = await fetch(`${c.base}/bucket`, {
      method: "POST",
      headers: { ...c.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: c.bucket,
        name: c.bucket,
        public: false,
        file_size_limit: 25 * 1024 * 1024,
      }),
    });
    if (!created.ok) throw Error("No se pudo crear el bucket privado.");
  } else if (!r.ok || (await r.json()).public !== false) {
    throw Error(
      "El bucket debe existir como PRIVADO. No se importará en un bucket público.",
    );
  }
}
