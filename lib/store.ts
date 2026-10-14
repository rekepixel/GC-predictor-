import fs from "node:fs";
import path from "node:path";
import { getDB, migrate, put, readAll, type DB } from "./db";
import type { Dataset, Source, Topic, Syllabus } from "./types";
import { applyVerifiedBank } from "./verified-bank";
import { applyHistoricalBank } from "./historical-bank";
import { applyConceptBank } from "./concept-bank";
let initialization: Promise<void> | undefined;
export function initialize() {
  return (initialization ??= (async () => {
    await migrate();
    const db = getDB();
    const catalogPath = path.resolve("data/source-catalog.json");
    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
      const sources: Array<Record<string, unknown>> = Array.isArray(catalog)
        ? catalog
        : catalog.sources || [];
      for (const s of sources) {
        if (
          (await db.query("SELECT id FROM sources WHERE id=?", [s.id])).length
        )
          continue;
        const source: Source = {
          id: String(s.id),
          title: String(s.title),
          url: String(s.url || ""),
          year: s.year ? Number(s.year) : null,
          session: String(s.session || ""),
          model: String(s.model || ""),
          kind: s.kind as Source["kind"],
          origin: s.origin as Source["origin"],
          access: String(s.access || "available"),
          consultedAt: String(s.consultedAt || catalog.consultedAt),
          publishedAt:
            s.publishedAt || s.publicationAt
              ? String(s.publishedAt || s.publicationAt)
              : null,
          notes: String(s.notes || ""),
          sha256: s.sha256 ? String(s.sha256) : null,
          storageKey: s.localPath ? String(s.localPath) : null,
          definitive: s.definitive === true,
          verified: s.access === "downloaded" && s.origin === "official",
        };
        await put(db, "sources", source as unknown as Record<string, unknown>);
      }
    }
    const syllabusPath = path.resolve("data/syllabus-2026.json");
    if (fs.existsSync(syllabusPath)) {
      const data = JSON.parse(fs.readFileSync(syllabusPath, "utf8"));
      const sourceId = data.sourceId || data.source?.id;
      if (
        sourceId &&
        (await db.query("SELECT id FROM sources WHERE id=?", [sourceId])).length
      ) {
        const syllabus: Syllabus = {
          id: data.id || "syllabus-2026",
          year: 2026,
          effectiveFrom:
            data.effectiveFrom || data.validity?.effectiveFrom || null,
          sourceId,
          status:
            data.status === "official_topic_titles_verified"
              ? "verified"
              : data.status || "pending",
          notes: Array.isArray(data.notes)
            ? data.notes.join("\n")
            : data.notes ||
              "Temario corporativo consultado; actualización 2027 pendiente.",
        };
        if (
          !(await db.query("SELECT id FROM syllabi WHERE id=?", [syllabus.id]))
            .length
        ) {
          await put(
            db,
            "syllabi",
            syllabus as unknown as Record<string, unknown>,
          );
          for (const t of data.topics || []) {
            const topic: Topic = {
              id: t.id,
              number: t.number,
              title: t.title,
              syllabusId: syllabus.id,
            };
            await put(
              db,
              "topics",
              topic as unknown as Record<string, unknown>,
            );
          }
        }
      }
    }
    if (process.env.GC_SKIP_VERIFIED_BANK !== "1") {
      await applyVerifiedBank(db);
      if (process.env.GC_SKIP_HISTORICAL_BANK !== "1") {
        await applyHistoricalBank(db);
        if (process.env.GC_SKIP_CONCEPT_BANK !== "1")
          await applyConceptBank(db);
      }
    }
  })());
}
export async function dataset(db?: DB): Promise<Dataset> {
  if (!db) {
    await initialize();
    db = getDB();
  }
  const [
    sources,
    exams,
    questions,
    concepts,
    topics,
    syllabi,
    changes,
    jobs,
    attempts,
  ] = await Promise.all([
    readAll<Dataset["sources"][number]>(db, "sources"),
    readAll<Dataset["exams"][number]>(db, "exams"),
    readAll<Dataset["questions"][number]>(db, "questions"),
    readAll<Dataset["concepts"][number]>(db, "concepts"),
    readAll<Dataset["topics"][number]>(db, "topics"),
    readAll<Dataset["syllabi"][number]>(db, "syllabi"),
    readAll<Dataset["changes"][number]>(db, "law_changes"),
    readAll<Dataset["jobs"][number]>(db, "import_jobs"),
    readAll<Dataset["attempts"][number]>(db, "attempts"),
  ]);
  return {
    sources,
    exams,
    questions,
    concepts,
    topics,
    syllabi,
    changes,
    jobs,
    attempts,
  };
}
