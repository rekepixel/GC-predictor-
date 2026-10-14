import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-concepts-")),
  "test.sqlite",
);
delete process.env.DATABASE_URL;
process.env.GC_SKIP_QUALITY_AUDIT = "1";
for (const key of [
  "GC_SKIP_VERIFIED_BANK",
  "GC_SKIP_HISTORICAL_BANK",
  "GC_SKIP_CONCEPT_BANK",
])
  delete process.env[key];
import { dataset } from "../lib/store";
import { getDB } from "../lib/db";
import { applyConceptBank } from "../lib/concept-bank";
import {
  frequencies,
  observedCorpus,
  validatedCorpus,
  patterns,
  backtest,
} from "../lib/analysis";
import { reviewQuestion } from "../lib/review";
import { isDocumentaryVerified } from "../lib/documentary";
import { articleProfiles } from "../lib/history";
const identity = (q: { year: number; model: string; number: number }) =>
  `${q.year}-${q.model}-${q.number}`;
test("all 524 formerly unlabelled observations are assigned without changing the existing 176 concepts or counting model duplicates", async () => {
  const d = await dataset(),
    qs = observedCorpus(d).questions,
    s = frequencies(d);
  assert.equal(d.questions.length, 1470);
  assert.equal(qs.length, 700);
  assert.equal(s.conceptClassified, 700);
  assert.equal(s.conceptPending, 0);
  const bank = JSON.parse(
    fs.readFileSync("data/verified/concepts-2023-2026/review.json", "utf8"),
  );
  assert.equal(
    bank.questions.filter(
      (r: { newConceptAssignment: boolean }) => r.newConceptAssignment,
    ).length,
    524,
  );
  for (const row of bank.questions) {
    const q = qs.find((q) => identity(q) === row.identity)!;
    assert.ok(q.subject && q.subconcept && q.conceptId);
    if (!row.newConceptAssignment) assert.equal(q.concept, row.previousConcept);
  }
  assert.ok(qs.every((q) => !q.reserve && isDocumentaryVerified(q, d)));
  assert.ok(
    d.questions
      .filter((q) => q.reserve)
      .every((q) => !q.active && !q.conceptReview),
  );
  assert.equal(s.conceptReviews.assisted, 700);
  assert.equal(s.conceptReviews.independentHuman, 0);
  assert.equal(s.definitiveQuestions, 0);
});
test("families retain distinct legal mechanisms and a detailed subconcept for every new classification", async () => {
  const d = await dataset(),
    qs = observedCorpus(d).questions;
  const general = qs.find((q) => identity(q) === "2024-2A-45")!,
    delivery = qs.find((q) => identity(q) === "2024-3A-47")!;
  assert.notEqual(general.conceptId, delivery.conceptId);
  const mnp = qs.filter(
    (q) =>
      q.concept ===
      "Consejo Asesor del Mecanismo Nacional de Prevención de la Tortura",
  );
  assert.equal(mnp.length, 8);
  assert.ok(new Set(mnp.map((q) => q.subconcept)).size >= 6);
  const topo = qs.find((q) => identity(q) === "2024-2A-87")!;
  assert.equal(topo.law, null);
  assert.equal(topo.legalVerified, false);
  assert.equal(topo.conceptReview?.normStatus, "no_specific_norm_established");
  const historic = qs.find((q) => identity(q) === "2023-1A-75")!;
  assert.equal(
    historic.conceptReview?.normStatus,
    "historical_version_pending",
  );
  assert.equal(historic.lawId, null);
});
test("the overbroad header filter no longer deletes the direction clause from either inverse-bearing model", async () => {
  const d = await dataset();
  for (const id of ["2024-1A-87", "2024-1B-73"]) {
    const q = d.questions.find((q) => identity(q) === id)!;
    assert.ok(q.stem.includes("dirección opuesta BA, contando desde"));
    assert.ok(
      q.extractionCorrections?.some(
        (c) =>
          c.from.includes("con la del reloj") &&
          c.to.includes("dirección opuesta BA"),
      ),
    );
    assert.ok(isDocumentaryVerified(q, d));
  }
});
test("the statutory inconsistency is visible without overriding the published letter or inventing annulment", async () => {
  const d = await dataset();
  for (const id of ["2024-2A-81", "2024-2B-75"]) {
    const q = d.questions.find((q) => identity(q) === id)!;
    assert.equal(q.correct, 0);
    assert.equal(q.validation, "reviewed");
    assert.equal(q.answerIssue?.status, "unresolved");
    assert.equal(q.article, "50");
    assert.equal(q.legalCheckedAsOf, "2024-09-28");
  }
  assert.equal(frequencies(d).answerIssues, 1);
  assert.ok(
    articleProfiles(d).some((p) =>
      p.history.some((h) => h.answerIssue?.id === "2024-form2-81-key-vs-law"),
    ),
  );
  const q = d.questions.find((q) => identity(q) === "2024-2A-81")!;
  const final = {
    ...d,
    questions: [{ ...q, validation: "validated" as const }],
    sources: d.sources.map((s) => ({
      ...s,
      origin: "official" as const,
      verified: true,
      definitive: true,
    })),
  };
  assert.equal(validatedCorpus(final).questions.length, 0);
  await assert.rejects(
    () => reviewQuestion(q.id, { ...q, validation: "validated" }),
    /discrepancia/,
  );
});
test("reviewed relations distinguish same rule, calculation method and related subaspects, with real inspectable sources", async () => {
  const d = await dataset(),
    p = patterns(d);
  assert.equal(p.reviewedRelations.length, 14);
  assert.equal(
    p.reviewedRelations.filter((r) => r.kind === "same_rule").length,
    10,
  );
  for (const r of p.reviewedRelations) {
    assert.ok(r.questionIds.length >= 2);
    for (const id of r.questionIds) {
      const q = d.questions.find((q) => q.id === id)!;
      assert.ok(q.sourceId && q.sourcePage);
      assert.ok(!q.reserve);
    }
  }
  assert.equal(p.literals.length, 2);
  assert.ok(p.concepts.length > 12);
});
test("complete concept coverage still does not establish predictive reliability or use future examination records", async () => {
  const d = await dataset();
  assert.ok(backtest(d).rows.every((r) => r.status === "insufficient"));
  const b = backtest(d, {}, 10, 2027, "documentary_reconstruction");
  assert.equal(b.conclusive, false);
  assert.equal(b.probability, null);
  assert.deepEqual(b, backtest(d, {}, 10, 2027, "documentary_reconstruction"));
  for (const row of b.rows) {
    assert.equal(row.classifiedTargetQuestions, row.targetQuestions);
    for (const id of row.trainingIds)
      assert.ok(d.questions.find((q) => q.id === id)!.year < row.year);
  }
});
test("reapplying the same sealed classification leaves all records and audit events intact", async () => {
  const before = await dataset(),
    auditBefore = await getDB().query("SELECT id FROM audit_events");
  await applyConceptBank(getDB());
  const after = await dataset();
  assert.deepEqual(after.questions, before.questions);
  assert.equal(
    (await getDB().query("SELECT id FROM audit_events")).length,
    auditBefore.length,
  );
});
test("manual concept and subconcept review is preserved when the pipeline is reapplied", async () => {
  const d = await dataset(),
    q = observedCorpus(d).questions.find((q) => identity(q) === "2023-2A-1")!;
  await reviewQuestion(q.id, {
    ...q,
    concept: "Propiedad en la Declaración Universal revisada personalmente",
    subconcept: "Límites a la privación de la propiedad",
    confirmConceptReview: true,
  });
  await getDB().run("DELETE FROM schema_migrations WHERE version LIKE ?", [
    "concepts-v2-%",
  ]);
  await applyConceptBank(getDB());
  const after = (await dataset()).questions.find((p) => p.id === q.id)!;
  assert.equal(
    after.concept,
    "Propiedad en la Declaración Universal revisada personalmente",
  );
  assert.equal(after.subconcept, "Límites a la privación de la propiedad");
  assert.equal(after.conceptReview?.method, "owner_review");
  assert.equal(after.conceptReview?.independentHumanReview, true);
  const changed = await reviewQuestion(q.id, {
    ...after,
    subconcept: "Otra clasificación pendiente de confirmación",
  });
  assert.equal(changed.conceptReview, null);
});
