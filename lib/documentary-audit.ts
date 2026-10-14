import fs from "node:fs";
import { createHash } from "node:crypto";
import { audit, readAll, put, type DB } from "./db";
import type { Source } from "./types";
const base = "data/verified/documentary-audit-2023/";
const sha = (b: Buffer | string) =>
  createHash("sha256").update(b).digest("hex");
export async function applyDocumentaryAudit(db: DB) {
  if (!fs.existsSync(base + "manifest.json")) return;
  const bytes = fs.readFileSync(base + "manifest.json");
  const seal = JSON.parse(bytes.toString()) as {
    files: { path: string; sha256: string }[];
  };
  for (const file of seal.files)
    if (
      !/^data\/(verified\/documentary-audit-2023\/[a-zA-Z0-9_.-]+\.json|raw\/2023-key-(28|29)-institutional-wayback\.pdf)$/.test(
        file.path,
      ) ||
      sha(fs.readFileSync(file.path)) !== file.sha256
    )
      throw Error("Evidencia archivística alterada: " + file.path);
  const version = "documentary-audit-2023-" + sha(bytes);
  if (
    (
      await db.query("SELECT version FROM schema_migrations WHERE version=?", [
        version,
      ])
    ).length
  )
    return;
  await db.transaction(async (tx) => {
    const sources = await readAll<Source>(tx, "sources");
    const additions = JSON.parse(
      fs.readFileSync(base + "sources.json", "utf8"),
    ) as Source[];
    for (const source of additions)
      if (!sources.some((s) => s.id === source.id)) {
        await put(tx, "sources", source as unknown as Record<string, unknown>);
        await audit(
          tx,
          source.id,
          "add_archived_source",
          null,
          source,
          "pipeline:documentary-audit",
        );
      }
    for (const day of ["28", "29"]) {
      const evidence = JSON.parse(
        fs.readFileSync(
          base + (day === "28" ? "comparison.json" : "comparison-29.json"),
          "utf8",
        ),
      );
      if (
        evidence.differences.length ||
        !evidence.archiveDigestMatchesDownloadedSHA1
      )
        throw Error("Discrepancia en clave archivada 2023.");
      const before = sources.find((s) => s.id === "copy-key-2023-" + day);
      if (!before) continue;
      const marker = `Captura institucional archivada ${evidence.retrieval.archiveTimestamp}`;
      if (before.notes.includes(marker)) continue;
      const updated = {
        ...before,
        notes:
          before.notes +
          `\n${marker}: ${evidence.retrieval.url}. Cotejo de 210 vinculaciones de conocimientos, incluidas reservas de ambos modelos: cero diferencias. La copia y sus huellas se conservan. No acredita rectificaciones posteriores ni respuesta final por pregunta.`,
      };
      await put(tx, "sources", updated as unknown as Record<string, unknown>);
      await audit(
        tx,
        before.id,
        "add_archived_institutional_key_evidence",
        before,
        updated,
        "pipeline:documentary-audit",
      );
    }
    await tx.run(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
      [version, new Date().toISOString()],
    );
  });
}
