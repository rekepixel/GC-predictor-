process.env.GC_SKIP_VERIFIED_BANK = "1";
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-test-")),
  "test.sqlite",
);
import { importBundle, attachAnswerKey } from "../lib/importer";
import { dataset } from "../lib/store";
import { reviewQuestion } from "../lib/review";
import { getDB } from "../lib/db";
const src = (id: string, kind = "exam", definitive = false) => ({
  id,
  title: "SYNTHETIC TEST " + id,
  url: "https://www.boe.es/synthetic-" + id,
  year: 2023,
  session: "SYNTHETIC-SESSION",
  model: "A",
  kind,
  origin: "official",
  publishedAt: "2023-08-01",
  verified: true,
  definitive,
  notes: "SYNTHETIC FIXTURE: explicitly final for test only.",
});
const draft = {
  number: 1,
  stem: "SYNTHETIC question used for automated tests only.",
  options: ["test a", "test b", "test c", "test d"],
  reserve: false,
  sourcePage: 1,
};
const exam = {
  year: 2023,
  session: "SYNTHETIC-SESSION",
  model: "A",
  heldAt: "2023-08-01",
  expectedQuestions: 1,
};
test("import is atomic, never self-validates and refuses duplicate question numbers", async () => {
  const r = await importBundle({
    source: src("test-atomic"),
    exam,
    questions: [draft],
    answerKey: {
      source: src("test-atomic-key", "answer_key", true),
      entries: [{ number: 1, correct: 0, cancelled: false }],
    },
  });
  assert.equal(r.questions[0].validation, "draft");
  const before = (await dataset()).exams.length;
  await assert.rejects(
    () =>
      importBundle({
        source: src("test-invalid"),
        exam,
        questions: [draft, draft],
      }),
    /duplicada/,
  );
  assert.equal((await dataset()).exams.length, before);
  assert.equal(
    (await getDB().query("SELECT id FROM sources WHERE id=?", ["test-invalid"]))
      .length,
    0,
  );
});
test("validation enforces definitive answer and revalidates after key changes", async () => {
  const r = await importBundle({
    source: src("test-review"),
    exam,
    questions: [draft],
    answerKey: {
      source: src("test-review-key", "answer_key", false),
      entries: [{ number: 1, correct: 0, cancelled: false }],
    },
  });
  const q = r.questions[0];
  const changes = {
    ...q,
    validation: "validated",
    classificationReviewed: true,
  };
  await assert.rejects(() => reviewQuestion(q.id, changes), /definitiva/);
  await attachAnswerKey(
    r.exam.id,
    src("test-review-final", "answer_key", true),
    [{ number: 1, correct: 1, cancelled: false }],
  );
  await assert.rejects(() => reviewQuestion(q.id, changes), /coincidir/);
  const valid = await reviewQuestion(q.id, { ...changes, correct: 1 });
  assert.equal(valid.validation, "validated");
  await attachAnswerKey(
    r.exam.id,
    src("test-review-cancelled", "answer_key", true),
    [{ number: 1, correct: null, cancelled: true }],
  );
  const after = (await dataset()).questions.find((p) => p.id === q.id)!;
  assert.equal(after.validation, "cancelled");
  assert.equal(after.active, false);
  assert.ok(
    (
      await getDB().query("SELECT id FROM audit_events WHERE entity_id=?", [
        q.id,
      ])
    ).length >= 3,
  );
});
test("foreign-key integrity and SQLite transactions rollback", async () => {
  await assert.rejects(
    () =>
      getDB().transaction(async (db) => {
        await db.run("INSERT INTO concepts(id,payload) VALUES(?,?)", [
          "rollback",
          "{}",
        ]);
        throw Error("intentional rollback");
      }),
    /intentional/,
  );
  assert.equal(
    (await getDB().query("SELECT id FROM concepts WHERE id=?", ["rollback"]))
      .length,
    0,
  );
  await assert.rejects(() =>
    getDB().run("INSERT INTO exams(id,source_id,payload) VALUES(?,?,?)", [
      "invalid-exam",
      "missing-source",
      "{}",
    ]),
  );
});
