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
import { articleProfiles, validationByYear } from "../lib/history";
async function main() {
  const d = await dataset(),
    s = frequencies(d),
    p = patterns(d);
  const inventoryPath = ".local/backups/historical-2023-2026/files.json",
    backupPath = ".local/backups/historical-2023-2026/before.sqlite";
  let preservation: unknown = null;
  if (fs.existsSync(inventoryPath) && fs.existsSync(backupPath)) {
    const inv = JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as Record<
      string,
      string
    >;
    const oldDB = new Database(backupPath, { readonly: true });
    const oldIds = (
      oldDB.prepare("SELECT id FROM questions").all() as { id: string }[]
    ).map((q) => q.id);
    const ids = new Set(d.questions.map((q) => q.id));
    const entities = [];
    for (const table of [...tables, "audit_events"] as const) {
      const previous = (
        oldDB.prepare(`SELECT id FROM ${table}`).all() as { id: string }[]
      ).map((r) => r.id);
      const current = new Set(
        (await getDB().query<{ id: string }>(`SELECT id FROM ${table}`)).map(
          (r) => r.id,
        ),
      );
      const missingIds = previous.filter((id) => !current.has(id));
      entities.push({
        table,
        previous: previous.length,
        current: current.size,
        missingIds,
      });
      if (missingIds.length) throw Error(`Lost records in ${table}`);
    }
    oldDB.close();
    const missingPaths = Object.keys(inv).filter((p) => !fs.existsSync(p));
    const changedPDFs = Object.entries(inv)
      .filter(
        ([p, h]) =>
          p.toLowerCase().endsWith(".pdf") &&
          createHash("sha256").update(fs.readFileSync(p)).digest("hex") !== h,
      )
      .map(([p]) => p);
    const missingIds = oldIds.filter((id) => !ids.has(id));
    preservation = {
      preexistingPaths: Object.keys(inv).length,
      missingPaths,
      preexistingPDFs: Object.keys(inv).filter((p) =>
        p.toLowerCase().endsWith(".pdf"),
      ).length,
      changedPDFs,
      preexistingQuestionIds: oldIds.length,
      currentQuestionIds: ids.size,
      missingQuestionIds: missingIds,
      entities,
    };
    if (missingPaths.length || changedPDFs.length || missingIds.length)
      throw Error("Preservation checks failed.");
  }
  const report = {
    generatedAt: new Date().toISOString(),
    scope:
      "Cotejo documental con procedencia explícita; respuesta final/anulaciones se acreditan por separado.",
    corpus: {
      ordinary: s.questions,
      primaryDocumentQuestions: s.primaryDocumentQuestions,
      corroboratedCopyQuestions: s.corroboratedCopyQuestions,
      finalAnswerQuestions: s.definitiveQuestions,
      sessions: s.examinations,
      years: s.years,
      classifiedConceptQuestions: s.conceptClassified,
      conceptPending: s.conceptPending,
      legalReferencedQuestions: s.legalVerified,
      articleProfiles: articleProfiles(d).length,
      retainedRecords: d.questions.length,
    },
    questionIndex: d.questions
      .filter((q) => q.year >= 2023 && q.year <= 2026)
      .map((q) => ({
        id: q.id,
        year: q.year,
        session: q.session,
        model: q.model,
        number: q.number,
        reserve: q.reserve,
        sourceId: q.sourceId,
        sourcePage: q.sourcePage,
        keySourceId: q.keySourceId,
        canonicalId: q.canonicalId,
      })),
    byYear: validationByYear(d),
    frequencies: {
      topics: s.topics,
      laws: s.laws,
      articles: s.articles,
      concepts: s.concepts,
      byYear: s.byYear,
    },
    literalRepeats: p.literals,
    conceptRepeats: p.concepts.map(
      ({ id, name, count, years, sessions, consecutiveYears, evidence }) => ({
        id,
        name,
        count,
        years,
        sessions,
        consecutiveYears,
        evidence,
      }),
    ),
    recentComparison: { recentFrom: p.recentFrom, rows: p.recentComparison },
    priority: rank(d),
    strictTemporalEvaluation: backtest(d),
    exploratoryTemporalReconstruction: backtest(
      d,
      {},
      10,
      2027,
      "documentary_reconstruction",
    ),
    preservation,
  };
  fs.writeFileSync(
    "data/research/history/validation-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        corpus: report.corpus,
        literalGroups: p.literals.length,
        conceptGroups: p.concepts.length,
        consecutiveGroups: p.consecutive.length,
        reconstruction: report.exploratoryTemporalReconstruction.rows.map(
          (r) => ({
            year: r.year,
            train: r.trainingQuestions,
            target: r.targetQuestions,
            targetConcepts: r.targetConcepts,
            heuristicHits: r.heuristic?.hits,
            frequencyHits: r.frequency?.hits,
            randomHits: r.random?.hits,
            beatsReferences: r.beatsReferences,
            assumedAvailability: r.assumedAvailabilityQuestions,
          }),
        ),
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
