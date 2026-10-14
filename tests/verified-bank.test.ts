// Integration checks against authentic retained PDFs and documentary evidence.
// Uses a separate temporary SQLite database; never changes the personal database.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-real-bank-test-")),
  "bank.sqlite",
);
delete process.env.DATABASE_URL;
delete process.env.GC_SKIP_VERIFIED_BANK;
import { dataset } from "../lib/store";
import { applyVerifiedBank } from "../lib/verified-bank";
import { getDB } from "../lib/db";
import { isDocumentaryVerified } from "../lib/documentary";
import {
  observedCorpus,
  validatedCorpus,
  frequencies,
  rank,
  backtest,
} from "../lib/analysis";
import { articleProfiles, validationByYear } from "../lib/history";
import { reviewQuestion } from "../lib/review";
import { attachAnswerKey, importBundle } from "../lib/importer";
test("authentic bank preserves 210 occurrences, one-to-one A/B equivalence, 100 ordinary questions and 5 inactive reserves", async () => {
  const d = await dataset();
  assert.equal(d.questions.length, 210);
  assert.equal(
    d.questions.filter((q) => isDocumentaryVerified(q, d)).length,
    210,
  );
  assert.equal(new Set(d.questions.map((q) => q.canonicalId)).size, 105);
  assert.equal(observedCorpus(d).questions.length, 100);
  assert.equal(d.questions.filter((q) => q.reserve).length, 10);
  assert.ok(d.questions.filter((q) => q.reserve).every((q) => !q.active));
  assert.deepEqual(observedCorpus(d).conflicts, []);
  const pairs = new Map<string, typeof d.questions>();
  for (const q of d.questions) {
    const group = pairs.get(q.canonicalId) || [];
    group.push(q);
    pairs.set(q.canonicalId, group);
  }
  assert.ok(
    [...pairs.values()].every(
      (g) => g.length === 2 && new Set(g.map((q) => q.model)).size === 2,
    ),
  );
  const a28 = d.questions.find((q) => q.model === "A" && q.number === 28)!,
    b62 = d.questions.find((q) => q.model === "B" && q.number === 62)!;
  assert.equal(a28.canonicalId, b62.canonicalId);
  assert.equal(a28.options[2], "Noveno");
  assert.equal(b62.options[2], "Noveno.");
  assert.ok(b62.documentaryVerification?.notes.length);
});
test("official correction C to A is applied to A7/B88 while finality remains unclaimed", async () => {
  const d = await dataset();
  const a = d.questions.find((q) => q.model === "A" && q.number === 7)!,
    b = d.questions.find((q) => q.model === "B" && q.number === 88)!;
  assert.equal(a.correct, 0);
  assert.equal(b.correct, 0);
  assert.equal(a.canonicalId, b.canonicalId);
  assert.equal(
    d.sources.find((s) => s.id === "key-2026-corrected")!.definitive,
    false,
  );
  assert.equal(validatedCorpus(d).questions.length, 0);
  assert.ok(d.questions.every((q) => q.validation === "reviewed"));
  assert.ok(
    backtest(d).rows.every(
      (r) => r.status === "insufficient" && r.heuristic === null,
    ),
  );
});
test("real descriptive statistics use one denominator of 100; no temporal score or probability from one year", async () => {
  const d = await dataset(),
    s = frequencies(d);
  assert.equal(s.questions, 100);
  assert.equal(s.definitiveQuestions, 0);
  assert.equal(s.examinations, 1);
  assert.equal(s.topics.length, 23);
  assert.equal(
    s.topics.reduce((a, t) => a + t.count, 0),
    100,
  );
  assert.equal(s.topics.find((t) => t.name === "DERECHOS HUMANOS")?.count, 12);
  assert.equal(s.concepts.length, 100);
  assert.equal(s.articles.length, 68);
  const r = rank(d);
  assert.equal(r.heuristicAvailable, false);
  assert.ok(r.priorities.every((p) => p.score === null && p.count === 1));
  assert.equal(r.probability, null);
});
test("article history counts one ordinary occurrence and retains both exact model references", async () => {
  const d = await dataset();
  const profiles = articleProfiles(d);
  const civil = profiles.find(
    (p) => p.law === "Código Civil" && p.article === "6",
  )!;
  assert.equal(civil.count, 1);
  assert.deepEqual(civil.years, [2026]);
  assert.equal(civil.history.length, 1);
  assert.equal(civil.history[0].variants.length, 2);
  assert.ok(civil.url?.includes("BOE-A-1889-4763"));
  assert.ok(
    civil.history.every((h) => h.finality === "official_corrected_documentary"),
  );
  const year = validationByYear(d).find((y) => y.year === 2026)!;
  assert.equal(year.duplicateModelRecords, 100);
  assert.equal(year.inactiveReserveQuestions, 5);
  assert.equal(year.finalityPending, 100);
});
test("the officially superseded PDF nº 1 cannot be reattached under a different identifier", async () => {
  const d = await dataset();
  const previous = d.sources.find((s) => s.id === "key-2026-original")!;
  assert.equal(previous.answerKeyStatus, "superseded");
  const exam = d.exams.find((e) => e.model === "A")!;
  const renamed = {
    ...previous,
    id: "renamed-obsolete-key",
    definitive: false,
  };
  await assert.rejects(
    () => attachAnswerKey(exam.id, renamed, [{ number: 7, correct: 2 }]),
    /sustituida/,
  );
  const source = d.sources.find((s) => s.id === exam.sourceId)!;
  await assert.rejects(
    () =>
      importBundle({
        source: { ...source, id: "duplicate-for-obsolete-key-check" },
        exam,
        questions: [],
        answerKey: { source: renamed, entries: [{ number: 7, correct: 2 }] },
      }),
    /sustituida/,
  );
  assert.equal((await dataset()).questions.length, 210);
  assert.equal((await dataset()).exams.length, d.exams.length);
});
test("editing source identity, literal text, key, or option mapping invalidates documentary evidence", async () => {
  const d = await dataset(),
    q = d.questions[0];
  assert.equal(
    isDocumentaryVerified({ ...q, stem: q.stem + " ALTERADO" }, d),
    false,
  );
  assert.equal(
    isDocumentaryVerified({ ...q, correct: (q.correct! + 1) % 4 }, d),
    false,
  );
  assert.equal(
    isDocumentaryVerified({ ...q, optionMap: [3, 2, 1, 0] }, d),
    false,
  );
  const reserve = d.questions.find((p) => p.reserve)!;
  assert.equal(isDocumentaryVerified({ ...reserve, reserve: false }, d), false);
  assert.equal(isDocumentaryVerified({ ...q, year: 2025 }, d), false);
  const changed = {
    ...d,
    sources: d.sources.map((s) =>
      s.id === "key-2026-corrected" ? { ...s, sha256: "changed" } : s,
    ),
  };
  assert.equal(observedCorpus(changed).questions.length, 0);
  const activeReserves = {
    ...d,
    questions: d.questions.map((q) => (q.reserve ? { ...q, active: true } : q)),
  };
  assert.equal(observedCorpus(activeReserves).questions.length, 100);
});
test("reapplying the sealed bank is idempotent and source originals remain intact", async () => {
  const before = await dataset(),
    events = await getDB().query("SELECT id FROM audit_events");
  await applyVerifiedBank(getDB());
  const after = await dataset();
  assert.equal(after.questions.length, before.questions.length);
  assert.deepEqual(
    after.questions.map((q) => q.id),
    before.questions.map((q) => q.id),
  );
  assert.equal(
    (await getDB().query("SELECT id FROM audit_events")).length,
    events.length,
  );
});
test("manual reference changes preserve literal verification but remove the previous BOE evidence and date", async () => {
  const d = await dataset();
  const q = d.questions.find((q) => q.reserve && q.legalEvidenceId)!;
  assert.ok(q.legalCheckedAsOf);
  await reviewQuestion(q.id, {
    ...q,
    article: null,
    paragraph: null,
    legalVerified: false,
  });
  const after = await dataset();
  const changed = after.questions.find((p) => p.id === q.id)!;
  assert.equal(changed.legalEvidenceId, null);
  assert.equal(changed.legalCheckedAsOf, null);
  assert.equal(changed.lawId, null);
  assert.equal(isDocumentaryVerified(changed, after), true);
  assert.equal(frequencies(after).questions, 100);
});
test("cancelling one model occurrence excludes its equivalent without deleting either record", async () => {
  const d = await dataset(),
    q = d.questions.find((q) => q.model === "A" && q.number === 1)!;
  await reviewQuestion(q.id, { ...q, validation: "cancelled", active: false });
  const after = await dataset();
  assert.equal(after.questions.length, 210);
  assert.ok(
    after.questions
      .filter((p) => p.canonicalId === q.canonicalId)
      .every((p) => p.validation === "cancelled" && !p.active),
  );
  assert.equal(frequencies(after).questions, 99);
});
