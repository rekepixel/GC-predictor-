// Real document integration; a new isolated database, no modification of personal records.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-history-test-")),
  "history.sqlite",
);
delete process.env.DATABASE_URL;
delete process.env.GC_SKIP_VERIFIED_BANK;
delete process.env.GC_SKIP_HISTORICAL_BANK;
process.env.GC_SKIP_CONCEPT_BANK = "1";
import { dataset } from "../lib/store";
import { getDB } from "../lib/db";
import { applyHistoricalBank } from "../lib/historical-bank";
import {
  frequencies,
  observedCorpus,
  validatedCorpus,
  patterns,
  rank,
  backtest,
} from "../lib/analysis";
import { isDocumentaryVerified, verificationState } from "../lib/documentary";
import { articleProfiles, validationByYear } from "../lib/history";

test("real historical bank contains 1470 literal model records and exactly 700 ordinary observations", async () => {
  const d = await dataset();
  assert.equal(d.questions.length, 1470);
  assert.equal(observedCorpus(d).questions.length, 700);
  assert.equal(new Set(d.questions.map((q) => q.canonicalId)).size, 735);
  assert.equal(d.questions.filter((q) => q.reserve).length, 70);
  assert.ok(d.questions.filter((q) => q.reserve).every((q) => !q.active));
  assert.ok(d.questions.every((q) => isDocumentaryVerified(q, d)));
  assert.equal(validatedCorpus(d).questions.length, 0);
  const f = frequencies(d);
  assert.equal(f.examinations, 6);
  assert.deepEqual(f.years, [2023, 2024, 2025, 2026]);
  assert.equal(f.primaryDocumentQuestions, 100);
  assert.equal(f.corroboratedCopyQuestions, 600);
  assert.equal(
    f.topics.reduce((a, b) => a + b.count, 0),
    700,
  );
});
test("2024 has two held sessions and three different forms; the suspended 29 September creates no exam", async () => {
  const d = await dataset();
  const e = d.exams.filter((e) => e.year === 2024);
  assert.equal(e.length, 6);
  assert.deepEqual([...new Set(e.map((e) => e.session))].sort(), [
    "2024-09-28",
    "2024-10-13",
  ]);
  const rows = validationByYear(d).find((r) => r.year === 2024)!;
  assert.equal(rows.validSessions, 2);
  assert.equal(rows.forms, 3);
  assert.equal(rows.verifiedOrdinary, 300);
  assert.equal(rows.duplicateModelRecords, 300);
  assert.equal(rows.inactiveReserveQuestions, 15);
  assert.ok(
    e
      .filter((e) => e.model.startsWith("1"))
      .every((e) => e.notes.includes("aula 21")),
  );
});
test("secondary consistency never changes source origin, authenticates a key as official, or confirms finality", async () => {
  const d = await dataset();
  for (const q of d.questions.filter((q) => q.year < 2026)) {
    const s = d.sources.find((s) => s.id === q.sourceId)!,
      k = d.sources.find((s) => s.id === q.keySourceId)!;
    assert.equal(s.origin, "secondary");
    assert.equal(s.verified, false);
    assert.equal(k.origin, "secondary");
    assert.equal(k.definitive, false);
    assert.equal(q.validation, "reviewed");
    assert.equal(verificationState(q, d), "documentary_checked");
    assert.ok(s.corroboration!.matches.length >= 2);
  }
  const key = d.sources.find((s) => s.id === "key-2026-corrected")!;
  assert.equal(key.answerKeyAssessment?.resultsFinalized, true);
  assert.equal(
    key.answerKeyAssessment?.annulmentsByQuestion,
    "not_established",
  );
  assert.equal(key.definitive, false);
});
test("2023 date/model mapping and 2025 literal typo are preserved with their one-to-one pairs", async () => {
  const d = await dataset();
  assert.ok(
    d.exams
      .filter((e) => e.year === 2023 && e.model.startsWith("2"))
      .every((e) => e.heldAt === "2023-10-28"),
  );
  assert.ok(
    d.exams
      .filter((e) => e.year === 2023 && e.model.startsWith("1"))
      .every((e) => e.heldAt === "2023-10-29"),
  );
  const a = d.questions.find(
      (q) => q.year === 2025 && q.model === "A" && q.number === 58,
    )!,
    b = d.questions.find(
      (q) => q.year === 2025 && q.model === "B" && q.number === 25,
    )!;
  assert.equal(a.canonicalId, b.canonicalId);
  assert.ok(a.stem.includes("Administraciones"));
  assert.ok(b.stem.includes("dministraciones"));
  assert.ok(b.documentaryVerification!.notes.length);
  assert.ok(
    d.questions.every((q) =>
      q.options.every((o) => !o.includes("Resolución núm.")),
    ),
  );
});
test("literal repeats survive different years and curated conceptual groups retain inspectable evidence", async () => {
  const d = await dataset(),
    p = patterns(d);
  assert.equal(p.literals.length, 2);
  const extractionFix = d.questions.find(
    (q) => q.year === 2024 && q.model === "3A" && q.number === 78,
  )!;
  assert.ok(extractionFix.stem.includes("ante los órganos"));
  assert.ok(extractionFix.extractionCorrections?.length);
  const s = frequencies(d);
  assert.equal(
    s.concepts.find(
      (c) => c.name === "Tutela frente a intromisiones ilegítimas en el honor",
    )?.count,
    4,
  );
  assert.equal(
    s.concepts.find(
      (c) =>
        c.name === "Presentación y tramitación de quejas en la Guardia Civil",
    )?.count,
    3,
  );
  assert.equal(
    s.concepts.find(
      (c) => c.name === "Paradas del transporte de explosivos por carretera",
    )?.count,
    2,
  );
  const q = d.questions.find(
    (q) => q.year === 2026 && q.model === "A" && q.number === 76,
  )!;
  assert.equal(q.conceptDetail, "Quejas relativas al mando inmediato superior");
  assert.ok(p.concepts.every((c) => c.evidence.length === c.count));
  assert.ok(s.conceptPending > 0);
});
test("legal histories retain BOE versions before each examination and count model pairs once", async () => {
  const d = await dataset();
  const a = articleProfiles(d).find(
    (p) =>
      p.law === "Ley Orgánica 1/1982 · Honor, intimidad y propia imagen" &&
      p.article === "9",
  )!;
  assert.ok(a);
  assert.ok(
    a.years.includes(2023) && a.years.includes(2024) && a.years.includes(2026),
  );
  assert.ok(a.history.every((h) => h.variants.length === 2));
  const refs = JSON.parse(
    fs.readFileSync("data/verified/history/legal-evidence.json", "utf8"),
  ).references;
  assert.equal(refs.length, 60);
  assert.ok(
    refs.every(
      (e: {
        version: { fecha_publicacion: string; fecha_vigencia: string };
        checkedAsOf: string;
      }) =>
        e.version.fecha_publicacion <= e.checkedAsOf.replaceAll("-", "") &&
        e.version.fecha_vigencia <= e.checkedAsOf.replaceAll("-", ""),
    ),
  );
});
test("incomplete conceptual coverage is disclosed and probability remains unavailable", async () => {
  const d = await dataset(),
    s = frequencies(d),
    r = rank(d);
  assert.ok(s.conceptClassified < 700);
  assert.equal(s.conceptClassified + s.conceptPending, 700);
  assert.equal(r.probability, null);
  assert.ok(r.heuristicAvailable);
  assert.ok(r.priorities.every((p) => p.evidence.length === p.count));
  assert.ok(
    backtest(d).rows.every(
      (r) => r.status === "insufficient" && r.heuristic === null,
    ),
  );
});
test("tampering with corroboration invalidates the affected cohort without legitimizing a secondary source", async () => {
  const d = await dataset();
  const broken = {
    ...d,
    sources: d.sources.map((s) =>
      s.year === 2023 ? { ...s, corroboration: undefined } : s,
    ),
  };
  assert.equal(observedCorpus(broken).questions.length, 500);
  const q = d.questions.find((q) => q.year === 2025 && !q.reserve)!;
  assert.equal(isDocumentaryVerified({ ...q, reserve: true }, d), false);
});
test("reapplying the historical bank is idempotent and preserves every row and audit entry", async () => {
  const d = await dataset(),
    before = await getDB().query("SELECT id FROM audit_events");
  await applyHistoricalBank(getDB());
  assert.deepEqual(
    (await dataset()).questions.map((q) => q.id),
    d.questions.map((q) => q.id),
  );
  assert.equal(
    (await getDB().query("SELECT id FROM audit_events")).length,
    before.length,
  );
});
test("documentary chronological reconstruction excludes target/future examinations and unknown publication remains an explicit assumption", async () => {
  const d = await dataset();
  const a = backtest(d, {}, 10, 2027, "documentary_reconstruction"),
    b = backtest(d, {}, 10, 2027, "documentary_reconstruction");
  assert.deepEqual(a, b);
  assert.equal(a.probability, null);
  assert.equal(a.conclusive, false);
  for (const row of a.rows) {
    assert.equal(row.status, "evaluated");
    assert.ok(row.assumedAvailabilityQuestions > 0);
    assert.ok(
      row.trainingIds.every((id) => {
        const q = d.questions.find((q) => q.id === id)!;
        return (
          q.year < row.year &&
          d.exams.find((e) => e.id === q.examId)!.heldAt! < row.cutoff
        );
      }),
    );
    assert.ok(
      row.targetIds.every(
        (id) => d.questions.find((q) => q.id === id)!.year === row.year,
      ),
    );
  }
  const q = d.questions.find((q) => q.year === 2023 && !q.reserve)!;
  const altered = {
    ...d,
    questions: d.questions.map((v) =>
      v.canonicalId === q.canonicalId ? { ...v, availableAt: "2026-12-31" } : v,
    ),
  };
  assert.ok(
    !backtest(altered, {}, 10, 2027, "documentary_reconstruction")
      .rows.find((r) => r.year === 2025)!
      .trainingIds.includes(q.id),
  );
});
test("a longer gap without observations adds no priority points", async () => {
  const d = await dataset(),
    a = rank(d, {}, 2027),
    b = rank(d, {}, 2030);
  assert.deepEqual(
    a.priorities.map((p) => [p.id, p.score]),
    b.priorities.map((p) => [p.id, p.score]),
  );
});
