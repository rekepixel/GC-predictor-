import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.GC_SKIP_VERIFIED_BANK = "1";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-exam-")),
  "test.sqlite",
);
delete process.env.DATABASE_URL;
import { fixture, question } from "./fixtures";
import {
  allocate,
  profile,
  blueprint,
  examRetrospective,
} from "../lib/exam-profile";
import {
  gradeExam,
  generatedProblems,
  assembleGenerated,
  publicRun,
  updateRun,
  readRun,
  ExamConflict,
  SCORING,
  type ExamItem,
  type ExamRun,
  type GeneratedQuestion,
} from "../lib/exam-engine";
import { documentaryFingerprint } from "../lib/documentary";
import { migrate, getDB } from "../lib/db";

const item = (id: string, overrides: Partial<ExamItem> = {}): ExamItem => ({
  id,
  number: 1,
  reserve: false,
  origin: "official",
  stem: "SYNTHETIC FIXTURE",
  options: ["a", "b", "c", "d"],
  correct: 0,
  topicId: "test-topic",
  conceptId: "alpha",
  concept: "SYNTHETIC concept",
  law: null,
  article: null,
  explanation: "Fixture only",
  legalUrl: null,
  sourceId: "test",
  keySourceId: "test-key",
  issue: null,
  definitive: true,
  cancelled: false,
  cancellationAccredited: false,
  ...overrides,
});

test("official scoring penalizes exactly one third, blanks and unused reserves do not score", () => {
  const qs = Array.from({ length: 100 }, (_, i) =>
    item("q" + i, { number: i + 1 }),
  );
  qs.push(
    ...Array.from({ length: 5 }, (_, i) =>
      item("r" + i, { number: 101 + i, reserve: true }),
    ),
  );
  const answers: Record<string, number> = {};
  for (let i = 0; i < 60; i++) answers["q" + i] = 0;
  for (let i = 60; i < 90; i++) answers["q" + i] = 1;
  for (let i = 0; i < 5; i++) answers["r" + i] = 0;
  const s = gradeExam(qs, answers);
  assert.equal(s.score, 50);
  assert.equal(s.correct, 60);
  assert.equal(s.wrong, 30);
  assert.equal(s.blank, 10);
  assert.equal(s.apt, true);
  assert.equal(s.unusedReserves, 5);
  assert.equal(
    gradeExam(qs, Object.fromEntries(qs.map((q) => [q.id, 1]))).score,
    0,
  );
});
test("reserves replace accredited cancellations only, in reserve order", () => {
  const q = [
    item("x", { cancelled: true, cancellationAccredited: true }),
    item("y", { number: 2, cancelled: true, cancellationAccredited: false }),
    item("r1", { number: 101, reserve: true }),
    item("r2", { number: 102, reserve: true }),
  ];
  const s = gradeExam(q, { x: 1, y: 0, r1: 0, r2: 1 });
  assert.equal(s.correct, 2);
  assert.deepEqual(s.substitutions, [{ cancelledId: "x", reserveId: "r1" }]);
  assert.equal(s.unusedReserves, 1);
});
test("unresolved legal keys retain literal grading and an explicit uncertainty interval", () => {
  const s = gradeExam(
    [
      item("x", { issue: "SYNTHETIC legal conflict", definitive: false }),
      item("y"),
    ],
    { x: 1, y: 0 },
  );
  assert.equal(s.provisional, true);
  assert.equal(s.uncertainAnswered, 1);
  assert.ok(s.scoreRange.lower < s.scoreRange.upper);
  assert.equal(s.errorsByConcept["SYNTHETIC concept"], undefined);
});
test("session normalization averages different forms and does not double count A/B", () => {
  const d = fixture();
  d.questions = [
    ...Array.from({ length: 10 }, (_, i) =>
      question("s1-" + i, { session: "s1", topicId: i < 8 ? "a" : "b" }),
    ),
    question("s2", { session: "s2", topicId: "b" }),
  ];
  d.questions.push({ ...d.questions[0], id: "alternate-model", model: "B" });
  const p = profile(d);
  assert.equal(p.questions, 11);
  assert.equal(p.sessions.length, 2);
  assert.ok(Math.abs(p.topics.a - 0.4) < 1e-9);
  assert.ok(Math.abs(p.topics.b - 0.6) < 1e-9);
  const plan = blueprint(d, "stable");
  assert.equal(
    Object.values(plan.topics).reduce((a, b) => a + b, 0),
    100,
  );
  assert.equal(
    Object.values(plan.reserveTopics).reduce((a, b) => a + b, 0),
    5,
  );
  assert.equal(plan.slots.length, 105);
  assert.deepEqual(allocate({ a: 1, b: 2, c: 3 }, 100), {
    a: 17,
    b: 33,
    c: 50,
  });
});
test("temporal diagnostics train on no target or future questions and keep random baselines reproducible", () => {
  const d = fixture();
  d.questions = [
    question("2023", { year: 2023, session: "2023" }),
    question("2024", { year: 2024, session: "2024" }),
    question("2025", { year: 2025, session: "2025" }),
    question("2026", { year: 2026, session: "2026" }),
  ];
  const r = examRetrospective(d);
  for (const fold of r) {
    if ("trainingIds" in fold)
      assert.ok(fold.trainingIds!.every((id) => Number(id) < fold.year));
  }
  assert.deepEqual(r, examRetrospective(d));
  assert.ok(r.every((x) => x.predictionProbability === null));
});
test("generated bank rejects missing sources, duplicate alternatives, wrong key and future law versions", () => {
  const d = fixture();
  d.sources[0].sha256 = "a".repeat(64);
  d.sources[1].sha256 = "b".repeat(64);
  d.sources[1].answerKeyStatus = "official_corrected_current";
  const q = question("style", {
    stem: "SYNTHETIC TEST historical example reference style",
  });
  q.documentaryVerification = {
    status: "verified",
    scope: "official_corrected_documentary",
    artifactId: "SYNTHETIC",
    artifactSha256: "c".repeat(64),
    fingerprint: documentaryFingerprint(q),
    sourceSha256: d.sources[0].sha256!,
    keySha256: d.sources[1].sha256!,
    checkedAt: "2026-01-01",
    canonicalNumber: 1,
    pairedNumber: 1,
    administrativeFinalityConfirmed: false,
    checks: [],
    notes: ["SYNTHETIC ONLY"],
  };
  d.questions = [q];
  const candidate = (i: number): GeneratedQuestion => ({
    id: "g" + i,
    stem: `SYNTHETIC-${i} custom${i} wording${i} clause${i} topic${i}`,
    options: ["a", "b", "c", "d"],
    correct: 0,
    topicId: "test-topic",
    concept: "SYNTHETIC",
    conceptId: "SYNTHETIC-" + i,
    subaspect: "aspect" + i,
    law: null,
    article: null,
    paragraph: null,
    explanation: "SYNTHETIC ONLY",
    referenceDate: "2026-01-01",
    historicalReferences: [q.id],
    format: "statement",
    difficulty: "low",
    evidence: [
      {
        url: "https://www.boe.es/synthetic",
        sha256: "a".repeat(64),
        storageKey: "SYNTHETIC",
        quote: "SYNTHETIC supporting text for fixtures only",
        publishedAt: "2023-01-01",
        effectiveFrom: "2023-01-01",
        checkedAsOf: "2026-01-01",
        syllabusQuote: "Synthetic syllabus only",
        syllabusPage: 1,
      },
    ],
    optionChecks: [0, 1, 2, 3].map((index) => ({
      index,
      verdict: index === 0 ? "supported" : "contradicted",
      reason: "SYNTHETIC test comparison only",
      quote: "SYNTHETIC supporting text",
      evidenceIndex: 0,
    })),
    quality: {
      state: "documentary_checked",
      method: "SYNTHETIC TEST ONLY",
      humanReviewed: false,
      issues: [],
      checkedAt: "2026-01-01",
      sourceFingerprintsChecked: true,
      syllabusChecked: true,
      temporalChecked: true,
      uniqueAnswerChecked: true,
    },
  });
  const valid = candidate(1);
  assert.deepEqual(generatedProblems(valid, d), []);
  assert.ok(generatedProblems({ ...valid, evidence: [] }, d).length);
  assert.ok(
    generatedProblems({ ...valid, options: ["a", "a", "b", "c"] }, d).length,
  );
  assert.ok(generatedProblems({ ...valid, correct: 2 }, d).length);
  assert.ok(
    generatedProblems(
      {
        ...valid,
        evidence: [{ ...valid.evidence[0], effectiveFrom: "2027-01-01" }],
      },
      d,
    ).length,
  );
  const plan = blueprint(d, "repeatable");
  const bank = Array.from({ length: 110 }, (_, i) => candidate(i));
  const full = assembleGenerated(plan, bank, d);
  assert.equal(full.status, "ready");
  assert.equal(full.items.length, 105);
  assert.equal(new Set(full.items.map((q) => q.id)).size, 105);
  assert.equal(full.items.filter((q) => q.reserve).length, 5);
  assert.deepEqual(full.items, assembleGenerated(plan, bank, d).items);
  for (const selected of full.items)
    assert.equal(selected.options[selected.correct!], "a");
  assert.equal(assembleGenerated(plan, bank.slice(0, 50), d).status, "blocked");
});
test("saved exams hide corrections, detect stale writes and preserve finished results", async () => {
  await migrate();
  const db = getDB();
  const now = new Date().toISOString();
  const s: ExamRun = {
    id: "SYNTHETIC-run",
    mode: "historical",
    title: "SYNTHETIC ONLY",
    createdAt: now,
    updatedAt: now,
    status: "in_progress",
    revision: 1,
    blueprintId: null,
    officialExamId: null,
    items: [item("q")],
    answers: {},
    flagged: [],
    currentIndex: 0,
    elapsedSeconds: 0,
    scoring: SCORING,
    result: null,
  };
  await db.run(
    "INSERT INTO exam_sessions(id,payload,revision,status,created_at) VALUES(?,?,1,?,?)",
    [s.id, JSON.stringify(s), s.status, now],
  );
  const publicValue = publicRun(s);
  assert.ok(!("correct" in publicValue.items[0]));
  assert.ok(!("explanation" in publicValue.items[0]));
  const saved = await updateRun(s.id, {
    revision: 1,
    answers: { q: 0 },
    flagged: ["q"],
    currentIndex: 0,
    elapsedSeconds: 90,
  });
  assert.equal(saved.revision, 2);
  await assert.rejects(
    () =>
      updateRun(s.id, {
        revision: 1,
        answers: { q: 1 },
        flagged: [],
        currentIndex: 0,
        elapsedSeconds: 91,
      }),
    ExamConflict,
  );
  await assert.rejects(
    () =>
      updateRun(s.id, {
        revision: 2,
        answers: { foreign: 1 },
        flagged: [],
        currentIndex: 0,
        elapsedSeconds: 91,
      }),
    /no pertenece/,
  );
  const result = await updateRun(
    s.id,
    {
      revision: 2,
      answers: { q: 0 },
      flagged: ["q"],
      currentIndex: 0,
      elapsedSeconds: 100,
    },
    true,
  );
  assert.equal(result.result?.correct, 1);
  assert.equal((await readRun(s.id)).status, "finished");
  assert.equal((result.items[0] as ExamItem).correct, 0);
});
