import "./env";
import fs from "node:fs";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { dataset } from "../lib/store";
import { getDB, tables } from "../lib/db";
import {
  frequencies,
  patterns,
  rank,
  backtest,
  observedCorpus,
} from "../lib/analysis";
import { classificationWorklist } from "../lib/quality-audit";
import { articleProfiles, validationByYear } from "../lib/history";
import type { Dataset } from "../lib/types";
async function main() {
  if (!fs.existsSync("data/verified/quality-audit-700/manifest.json"))
    throw Error(
      "Carga el paquete privado de auditoría antes de calcular este informe.",
    );
  const d = await dataset();
  const old = JSON.parse(
    fs.readFileSync("data/verified/concepts-2023-2026/review.json", "utf8"),
  );
  const baseline: Dataset = {
    ...d,
    questions: d.questions.map((q) => {
      const head = d.questions.find(
        (h) => h.model.endsWith("A") && h.canonicalId === q.canonicalId,
      );
      const r =
        head &&
        old.questions.find(
          (r: { identity: string }) =>
            r.identity === `${head.year}-${head.model}-${head.number}`,
        );
      if (!r) return q;
      const concept = d.concepts.find((c) => c.name === r.concept)!;
      return {
        ...q,
        concept: r.concept,
        conceptId: concept.id,
        subconcept: r.subconcept,
        taxonomy: null,
        classificationAudit: null,
      };
    }),
  };
  const evaluate = (data: Dataset) => ({
    stats: frequencies(data),
    patterns: patterns(data),
    ranking: rank(data),
    strict: backtest(data),
    sensitivity: [10, 25, 50].map((k) => ({
      k,
      result: backtest(data, {}, k, 2027, "documentary_reconstruction"),
    })),
  });
  const previous = evaluate(baseline),
    current = evaluate(d);
  let preservation: unknown = null;
  const backup = ".local/backups/quality-audit-700/before.sqlite";
  if (fs.existsSync(backup)) {
    const before = new Database(backup, { readonly: true }),
      entities = [];
    for (const table of [...tables, "audit_events"]) {
      const a = before.prepare(`SELECT id FROM ${table}`).all() as {
          id: string;
        }[],
        b = await getDB().query<{ id: string }>(`SELECT id FROM ${table}`);
      const ids = new Set(b.map((x) => x.id));
      const missing = a.filter((x) => !ids.has(x.id));
      if (missing.length) throw Error("Registros perdidos: " + table);
      entities.push({
        table,
        before: a.length,
        after: b.length,
        missing: missing.length,
      });
    }
    const qs = before.prepare("SELECT payload FROM questions").all() as {
      payload: string;
    }[];
    const changedLiteralFields = qs.flatMap((row) => {
      const q = JSON.parse(row.payload),
        n = d.questions.find((x) => x.id === q.id)!;
      return [
        "stem",
        "options",
        "correct",
        "canonicalId",
        "reserve",
        "sourceId",
        "keySourceId",
      ]
        .filter(
          (k) =>
            JSON.stringify(q[k]) !==
            JSON.stringify((n as unknown as Record<string, unknown>)[k]),
        )
        .map((field) => ({ id: q.id, field }));
    });
    if (changedLiteralFields.length)
      throw Error("Cambios inesperados de literal o clave.");
    const files = JSON.parse(
      fs.readFileSync(".local/backups/quality-audit-700/files.json", "utf8"),
    ) as { path: string; sha256: string }[];
    const missingFiles = files.filter((f) => !fs.existsSync(f.path));
    if (missingFiles.length) throw Error("Archivos perdidos.");
    const changedOriginalPDFs = files.filter(
      (f) =>
        f.path.toLowerCase().endsWith(".pdf") &&
        createHash("sha256").update(fs.readFileSync(f.path)).digest("hex") !==
          f.sha256,
    );
    if (changedOriginalPDFs.length) throw Error("PDF previo alterado.");
    preservation = {
      entities,
      changedLiteralFields,
      originalTrackedFiles: files.length,
      originalPDFs: files.filter((f) => f.path.toLowerCase().endsWith(".pdf"))
        .length,
      missingFiles,
      changedOriginalPDFs,
    };
    before.close();
  }
  const work = classificationWorklist(d);
  const report = {
    generatedAt: new Date().toISOString(),
    corpus: {
      ordinary: observedCorpus(d).questions.length,
      retainedRecords: d.questions.length,
      sessions: frequencies(d).examinations,
      forms: 7,
      definitive: frequencies(d).definitiveQuestions,
    },
    audit: {
      reviewed: work.reviewed,
      pendingManual: work.pending,
      humanReviewed: work.humanReviewed,
      initialCohort: work.initialCohort,
      randomSample: work.randomSample,
    },
    before: previous,
    after: current,
    byYear: validationByYear(d),
    articleProfiles: articleProfiles(d).length,
    preservation,
    conclusion:
      "Las etiquetas son una segunda pasada asistida, no validación humana. Cambiar granularidad cambia los aciertos retrospectivos; no se demuestra predicción calibrada.",
    comparison: {
      previousConcepts: previous.stats.concepts.length,
      currentConcepts: current.stats.concepts.length,
      previousMultiYear: previous.patterns.concepts.length,
      currentMultiYear: current.patterns.concepts.length,
      previousConsecutive: previous.patterns.consecutive.length,
      currentConsecutive: current.patterns.consecutive.length,
    },
  };
  const out = "data/research/quality-audit-700/analysis-report.json";
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        corpus: report.corpus,
        audit: report.audit,
        comparison: report.comparison,
        levels: current.patterns.levels.map((l) => ({
          level: l.level,
          distinct: l.distinct,
          multiYear: l.repeatedAcrossYears.length,
        })),
        articles: report.articleProfiles,
        legalReferenced: current.stats.legalVerified,
        oldBacktest: previous.sensitivity.map((x) => ({
          k: x.k,
          rows: x.result.rows.map((r) => ({
            year: r.year,
            hits: r.heuristic?.hits,
            frequency: r.frequency?.hits,
            covered: r.heuristic?.questionCoverage,
          })),
        })),
        newBacktest: current.sensitivity.map((x) => ({
          k: x.k,
          rows: x.result.rows.map((r) => ({
            year: r.year,
            hits: r.heuristic?.hits,
            frequency: r.frequency?.hits,
            covered: r.heuristic?.questionCoverage,
          })),
        })),
        preservation,
      },
      null,
      2,
    ),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
