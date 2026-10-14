import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, question } from "./fixtures";
import {
  backtest,
  frequencies,
  rank,
  seededShuffle,
  validatedCorpus,
} from "../lib/analysis";
import { deduplicate } from "../lib/importer";
import { literalHash, parseQuestions, parseAnswerKey } from "../lib/text";
test("A/B option permutations collapse only within same year/session; different years survive", () => {
  const a = question("a");
  const b = question("b", {
    stem: a.stem,
    options: [...a.options].reverse(),
    correct: 3,
    literalHash: a.literalHash,
    model: "B",
  });
  const merged = deduplicate(b, [a]);
  assert.equal(merged.canonicalId, "a");
  assert.deepEqual(merged.optionMap, [3, 2, 1, 0]);
  const c = deduplicate({ ...b, id: "c", canonicalId: "c", year: 2024 }, [a]);
  assert.equal(c.canonicalId, "c");
  const data = fixture();
  data.questions = [a, merged, c];
  assert.equal(validatedCorpus(data).questions.length, 2);
});
test("literal hashes preserve mathematical signs, accents and negations", () => {
  assert.notEqual(
    literalHash("¿x > 2?", ["a", "b", "c", "d"]),
    literalHash("¿x < 2?", ["a", "b", "c", "d"]),
  );
  assert.notEqual(
    literalHash("sí", ["a", "b", "c", "d"]),
    literalHash("si", ["a", "b", "c", "d"]),
  );
  assert.equal(
    literalHash("hola\n mundo", ["a", "b", "c", "d"]),
    literalHash("hola mundo", ["d", "b", "c", "a"]),
  );
});
test("legitimate repeated questions within one model survive; cross-model equivalences match one to one", () => {
  const a = question("a"),
    a2 = deduplicate({ ...a, id: "a2", canonicalId: "a2", number: 2 }, [a]);
  assert.equal(a2.canonicalId, "a2");
  const b = deduplicate({ ...a, id: "b", canonicalId: "b", model: "B" }, [
    a,
    a2,
  ]);
  const b2 = deduplicate(
    { ...a, id: "b2", canonicalId: "b2", model: "B", number: 2 },
    [a, a2, b],
  );
  assert.equal(b.canonicalId, "a");
  assert.equal(b2.canonicalId, "a2");
});
test("contradictory definitive answers in equivalent models are excluded", () => {
  const data = fixture(),
    a = question("a"),
    b = question("b", {
      canonicalId: "a",
      stem: a.stem,
      options: a.options,
      literalHash: a.literalHash,
      correct: 1,
    });
  data.questions = [a, b];
  assert.equal(validatedCorpus(data).questions.length, 0);
  assert.deepEqual(validatedCorpus(data).conflicts, ["a"]);
});
test("drafts, cancelled, inactive reserves and unofficial sources do not enter observations", () => {
  const d = fixture();
  d.questions = [
    question("a", { validation: "draft" }),
    question("b", { validation: "cancelled" }),
    question("c", { reserve: true, active: false }),
  ];
  assert.equal(frequencies(d).questions, 0);
  d.questions = [question("good")];
  d.sources[1].definitive = false;
  assert.equal(frequencies(d).questions, 0);
});
test("rates normalize by session size rather than summing model records", () => {
  const d = fixture();
  d.questions = [
    question("a", { session: "s1" }),
    question("b", { session: "s2" }),
    question("c", {
      session: "s2",
      conceptId: "beta",
      concept: "SYNTHETIC Beta",
    }),
  ];
  const r = rank(d);
  assert.equal(
    r.priorities.find((p) => p.id === "alpha")?.historicalRate,
    0.75,
  );
  assert.equal(r.priorities.find((p) => p.id === "beta")?.historicalRate, 0.25);
  assert.equal(r.probability, null);
});
test("strict retrospective rejects unavailable/undated training and never uses future concept universe", () => {
  const d = fixture();
  d.exams = [
    {
      id: "test2024",
      year: 2024,
      session: "test",
      model: "A",
      heldAt: "2024-07-01",
      expectedQuestions: 100,
      sourceId: "exam-source",
      keySourceId: "key-source",
      status: "validated",
      notes: "",
    },
  ];
  d.questions = [
    question("train"),
    question("undated", {
      conceptId: "beta",
      concept: "SYNTHETIC Beta",
      availableAt: null,
    }),
    question("future-key", { availableAt: "2024-08-01" }),
    question("target1", {
      year: 2024,
      conceptId: "alpha",
      availableAt: "2024-08-01",
    }),
    question("target2", {
      year: 2024,
      conceptId: "future",
      concept: "SYNTHETIC Future",
      availableAt: "2024-08-01",
    }),
    question("future", {
      year: 2026,
      conceptId: "future",
      concept: "SYNTHETIC Future",
      availableAt: "2026-01-01",
    }),
  ];
  const row = backtest(d, {}, 10).rows[0];
  assert.equal(row.trainingQuestions, 1);
  assert.equal(row.excludedUndated, 1);
  assert.equal(row.unseenConcepts, 1);
  assert.equal(row.k, 1);
  assert.equal(row.heuristic?.conceptCoverage, 0.5);
  assert.equal(row.heuristic?.precision, 1);
  const mutated = {
    ...d,
    questions: d.questions.map((q) =>
      q.year > 2024
        ? { ...q, conceptId: "changed-future", concept: "future changed" }
        : q,
    ),
  };
  assert.deepEqual(backtest(mutated, {}, 10).rows[0], row);
});
test("random reference reproducible; no-data evaluation reports unavailable metrics", () => {
  assert.deepEqual(
    seededShuffle([1, 2, 3, 4, 5], 2027),
    seededShuffle([1, 2, 3, 4, 5], 2027),
  );
  const result = backtest(fixture());
  assert.ok(
    result.rows.every(
      (r) =>
        r.status === "insufficient" &&
        r.heuristic === null &&
        r.random === null,
    ),
  );
});
test("parser cannot silently claim a complete examination or response key", () => {
  const p = parseQuestions(
    "1) SYNTHETIC stem\na) one\nb) two\nc) three\nd) four",
  );
  assert.equal(p.questions.length, 1);
  assert.ok(p.warnings.length);
  assert.deepEqual(parseAnswerKey("1 A 2 ANULADA 3 D"), [
    { number: 1, correct: 0, cancelled: false },
    { number: 2, correct: null, cancelled: true },
    { number: 3, correct: 3, cancelled: false },
  ]);
});
