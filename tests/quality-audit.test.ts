import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-quality-")),
  "test.sqlite",
);
delete process.env.DATABASE_URL;
for (const k of [
  "GC_SKIP_VERIFIED_BANK",
  "GC_SKIP_HISTORICAL_BANK",
  "GC_SKIP_CONCEPT_BANK",
  "GC_SKIP_QUALITY_AUDIT",
])
  delete process.env[k];
import { dataset } from "../lib/store";
import { getDB } from "../lib/db";
import {
  applyQualityAudit,
  classificationWorklist,
} from "../lib/quality-audit";
import { conceptContentFingerprint } from "../lib/concept-bank";
import {
  observedCorpus,
  validatedCorpus,
  backtest,
  frequencies,
  patterns,
} from "../lib/analysis";
import { reviewQuestion } from "../lib/review";
const hasPrivateAudit = fs.existsSync(
  "data/verified/quality-audit-700/manifest.json",
);
const auditTest = (name: string, fn: () => void | Promise<void>) =>
  test(name, { skip: !hasPrivateAudit }, fn);
const identity = (q: { year: number; model: string; number: number }) =>
  `${q.year}-${q.model}-${q.number}`;
auditTest(
  "700 audited inputs retain every literal, option and key, without manufacturing human validation or wording confidence",
  async () => {
    const d = await dataset(),
      w = classificationWorklist(d);
    assert.equal(d.questions.length, 1470);
    assert.equal(w.rows.length, 700);
    assert.equal(w.pending, 700);
    assert.equal(w.humanReviewed, 0);
    assert.equal(w.initialCohort, 211);
    assert.equal(w.randomSample, 80);
    const blind = JSON.parse(
      fs.readFileSync(
        "data/verified/quality-audit-700/blind-input.json",
        "utf8",
      ),
    );
    for (const q of w.rows) {
      const original = blind.questions.find(
        (r: { identity: string }) => r.identity === identity(q),
      );
      assert.deepEqual(q.options, original.options);
      assert.equal(q.stem, original.stem);
      assert.equal(q.correct, original.correct);
      assert.equal(q.conceptReview?.confidence, "unassessed");
      assert.equal(q.confidence, null);
      assert.equal(
        conceptContentFingerprint(q),
        q.classificationAudit?.inputSha256,
      );
    }
    assert.equal(validatedCorpus(d).questions.length, 0);
  },
);
auditTest(
  "same norm and same article never silently become the same rule or subaspect",
  async () => {
    const d = await dataset(),
      qs = observedCorpus(d).questions;
    const get = (id: string) => qs.find((q) => identity(q) === id)!;
    const nature = get("2025-A-13"),
      remuneration = get("2024-3A-12"),
      mandate = get("2026-A-12");
    assert.equal(remuneration.article, mandate.article);
    assert.notEqual(remuneration.conceptId, mandate.conceptId);
    assert.equal(remuneration.taxonomy?.matterId, mandate.taxonomy?.matterId);
    assert.notEqual(nature.conceptId, mandate.conceptId);
    assert.equal(get("2023-1A-40").conceptId, get("2025-A-38").conceptId);
    assert.equal(get("2024-2A-45").conceptId, get("2026-A-46").conceptId);
    assert.notEqual(get("2024-2A-45").conceptId, get("2024-3A-47").conceptId);
    assert.equal(get("2024-1A-86").law, null);
    assert.equal(frequencies(d).concepts.length, 652);
    assert.ok(patterns(d).concepts.length < 89);
  },
);
auditTest(
  "negative options are not asserted as law and the contradictory question remains unresolved",
  async () => {
    const d = await dataset();
    const negative = d.questions.find((q) => identity(q) === "2024-3A-12")!;
    assert.equal(
      negative.classificationAudit?.polarity,
      "negative_or_exception",
    );
    assert.match(
      negative.classificationAudit!.reason,
      /no se afirma como verdad/,
    );
    const disputed = d.questions.find((q) => identity(q) === "2024-2A-81")!;
    assert.equal(disputed.correct, 0);
    assert.equal(disputed.answerIssue?.status, "unresolved");
    assert.equal(disputed.article, "50");
    assert.equal(disputed.paragraph, "1.b, c, f y g");
    const refs = JSON.parse(
      fs.readFileSync(
        "data/verified/quality-audit-700/legal-evidence.json",
        "utf8",
      ),
    ).references;
    for (const r of refs) {
      assert.ok(
        r.version.fecha_publicacion <= r.checkedAsOf.replaceAll("-", ""),
      );
      assert.ok(r.version.fecha_vigencia <= r.checkedAsOf.replaceAll("-", ""));
    }
  },
);
auditTest(
  "archived institutional key is exhaustively compared and the snapshot digest matches its actual bytes",
  () => {
    const r = JSON.parse(
      fs.readFileSync(
        "data/verified/documentary-audit-2023/comparison.json",
        "utf8",
      ),
    );
    assert.equal(r.rows.length, 210);
    assert.deepEqual(r.differences, []);
    assert.equal(r.answerFinalityEstablished, false);
    const b = fs.readFileSync(r.retrieval.path);
    assert.equal(
      createHash("sha256").update(b).digest("hex"),
      r.retrieval.sha256,
    );
    assert.ok(r.rows.some((x: { reserve: boolean }) => x.reserve));
  },
);
auditTest(
  "sampling includes old high labels and revised retrospective evaluation uses no future exam questions",
  async () => {
    const d = await dataset(),
      w = classificationWorklist(d);
    assert.ok(
      w.rows
        .filter((q) => q.classificationAudit?.randomSample)
        .every((q) => q.classificationAudit?.legacyConfidence === "high"),
    );
    const b = backtest(d, {}, 10, 2027, "documentary_reconstruction");
    for (const row of b.rows)
      for (const id of row.trainingIds)
        assert.ok(d.questions.find((q) => q.id === id)!.year < row.year);
    assert.equal(b.probability, null);
    assert.equal(b.conclusive, false);
  },
);
auditTest(
  "audit migrations are idempotent and a confirmed owner correction survives reapplication",
  async () => {
    const d = await dataset();
    const before = await getDB().query("SELECT id FROM audit_events");
    await applyQualityAudit(getDB());
    assert.equal(
      (await getDB().query("SELECT id FROM audit_events")).length,
      before.length,
    );
    const unchanged = d.questions.find((q) => identity(q) === "2026-A-41")!;
    assert.ok(
      d.concepts.filter((c) => c.name === unchanged.concept).length >= 2,
    );
    await reviewQuestion(unchanged.id, {
      ...unchanged,
      confirmConceptReview: true,
    });
    const confirmed = (await dataset()).questions.find(
      (q) => q.id === unchanged.id,
    )!;
    assert.equal(confirmed.conceptId, unchanged.conceptId);
    assert.equal(confirmed.taxonomy?.ruleId, unchanged.conceptId);
    const q = d.questions.find((q) => identity(q) === "2025-A-38")!;
    await reviewQuestion(q.id, {
      ...q,
      concept: "Audiencia del menor revisada por propietario",
      confirmConceptReview: true,
    });
    await applyQualityAudit(getDB());
    const updated = (await dataset()).questions.find((x) => x.id === q.id)!;
    assert.equal(
      updated.concept,
      "Audiencia del menor revisada por propietario",
    );
    assert.equal(updated.conceptReview?.method, "owner_review");
    assert.equal(updated.classificationAudit?.status, "owner_reviewed");
    assert.equal(updated.taxonomy?.rule, updated.concept);
    assert.equal(classificationWorklist(await dataset()).humanReviewed, 2);
    assert.equal((await dataset()).questions.length, 1470);
  },
);
