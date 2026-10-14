import fs from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { audit, put, readAll, type DB } from "./db";
import { conceptContentFingerprint } from "./concept-bank";
import { isDocumentaryVerified } from "./documentary";
import type { Concept, Dataset, Question, Source } from "./types";
const base = "data/verified/quality-audit-700/";
const sha = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
const rowSchema = z.object({
  identity: z.string(),
  contentSha256: z.string().length(64),
  previousConcept: z.string(),
  previousSubconcept: z.string(),
  legacyConfidence: z.enum(["high", "medium"]),
  proposedTopicNumber: z.number().int().min(1).max(23),
  matter: z.string(),
  matterId: z.string(),
  rule: z.string(),
  ruleId: z.string(),
  subaspect: z.string(),
  subaspectId: z.string(),
  status: z.literal("assisted_pending_manual"),
  independentHumanReview: z.literal(false),
  flags: z.array(z.string()),
  risk: z.number(),
  priorityOrder: z.number(),
  initialManualCohort: z.boolean(),
  randomSample: z.boolean(),
  polarity: z.string(),
  scope: z.string(),
  reason: z.string(),
});
export async function applyQualityAudit(db: DB) {
  if (!fs.existsSync(base + "manifest.json")) return;
  const seal = JSON.parse(fs.readFileSync(base + "manifest.json", "utf8")) as {
    files: { path: string; sha256: string }[];
    dependencies: Record<string, string>;
  };
  for (const file of seal.files) {
    if (
      !/^data\/(?:verified\/quality-audit-700|curation)\/[a-zA-Z0-9_.-]+\.(?:json|csv|gz)$/.test(
        file.path,
      ) ||
      sha(fs.readFileSync(file.path)) !== file.sha256
    )
      throw Error("Evidencia de auditoría alterada: " + file.path);
  }
  for (const required of [
    "audit.json",
    "blind-input.json",
    "legal-evidence.json",
    "taxonomy-comparison.json",
    "manual-review.csv",
  ])
    if (!seal.files.some((f) => f.path === base + required))
      throw Error("Falta evidencia de auditoría: " + required);
  for (const [path, hash] of Object.entries(seal.dependencies)) {
    if (
      !/^data\/verified\/(?:concepts-2023-2026\/|history\/)?manifest.json$/.test(
        path,
      ) ||
      sha(fs.readFileSync(path)) !== hash
    )
      throw Error(
        "La auditoría necesita reconciliar cambios de evidencia: " + path,
      );
  }
  const version = "quality-audit-v2-" + sha(JSON.stringify(seal));
  if (
    (
      await db.query("SELECT version FROM schema_migrations WHERE version=?", [
        version,
      ])
    ).length
  )
    return;
  const bytes = fs.readFileSync(base + "audit.json");
  const bank = z
    .object({
      schemaVersion: z.literal(1),
      id: z.string(),
      questions: z.array(rowSchema).length(700),
    })
    .parse(JSON.parse(bytes.toString()));
  if (new Set(bank.questions.map((r) => r.identity)).size !== 700)
    throw Error("Identidades de auditoría duplicadas.");
  const references = JSON.parse(
    fs.readFileSync(base + "legal-evidence.json", "utf8"),
  ).references as {
    identity: string;
    lawId: string;
    article: string;
    paragraph: string;
    checkedAsOf: string;
    sourceUrl: string;
    version: { fecha_publicacion: string; fecha_vigencia: string };
    reason: string;
  }[];
  await db.transaction(async (tx) => {
    const qs = await readAll<Question>(tx, "questions"),
      sources = await readAll<Source>(tx, "sources"),
      concepts = await readAll<Concept>(tx, "concepts");
    for (const row of bank.questions) {
      const head = qs.find(
        (q) =>
          `${q.year}-${q.model}-${q.number}` === row.identity &&
          q.model.endsWith("A") &&
          !q.reserve,
      );
      if (!head)
        throw Error("Pregunta de auditoría no encontrada: " + row.identity);
      if (
        head.classificationMethod === "manual-reviewed" ||
        head.conceptReview?.independentHumanReview
      )
        continue;
      if (!isDocumentaryVerified(head, { sources })) continue;
      if (conceptContentFingerprint(head) !== row.contentSha256)
        throw Error("La auditoría corresponde a otro literal: " + row.identity);
      const concept: Concept = {
        id: row.ruleId,
        name: row.rule,
        topicId: head.topicId,
        description:
          "Foco conceptual de segunda pasada asistida; no certifica identidad de artículo, regla o subaspecto ni revisión humana.",
      };
      if (!concepts.some((c) => c.id === concept.id)) {
        await put(
          tx,
          "concepts",
          concept as unknown as Record<string, unknown>,
        );
        concepts.push(concept);
      }
      const ref = references.find((r) => r.identity === row.identity);
      if (
        ref &&
        (ref.version.fecha_publicacion > head.session.replaceAll("-", "") ||
          ref.version.fecha_vigencia > head.session.replaceAll("-", ""))
      )
        throw Error("Referencia normativa posterior al examen.");
      for (const before of qs.filter(
        (q) => q.canonicalId === head.canonicalId,
      )) {
        if (
          before.classificationMethod === "manual-reviewed" ||
          before.conceptReview?.independentHumanReview ||
          !isDocumentaryVerified(before, { sources })
        )
          continue;
        const updated: Question = {
          ...before,
          concept: row.rule,
          conceptId: row.ruleId,
          subconcept: row.subaspect,
          confidence: null,
          taxonomy: {
            version: bank.id,
            matterId: row.matterId,
            matter: row.matter,
            ruleId: row.ruleId,
            rule: row.rule,
            subaspectId: row.subaspectId,
            subaspect: row.subaspect,
          },
          classificationAudit: {
            artifactId: bank.id,
            artifactSha256: sha(bytes),
            inputSha256: conceptContentFingerprint(before),
            status: row.status,
            previousConcept: row.previousConcept,
            previousSubconcept: row.previousSubconcept,
            legacyConfidence: row.legacyConfidence,
            flags: row.flags,
            risk: row.risk,
            priorityOrder: row.priorityOrder,
            initialManualCohort: row.initialManualCohort,
            randomSample: row.randomSample,
            polarity: row.polarity,
            scope: row.scope,
            reason: row.reason,
          },
          conceptReview: {
            ...before.conceptReview!,
            method: "assistant_blind_content_review",
            artifactId: bank.id,
            artifactSha256: sha(bytes),
            inputSha256: conceptContentFingerprint(before),
            confidence: "unassessed",
            independentHumanReview: false,
            reviewedAt: new Date().toISOString(),
          },
        };
        if (ref) {
          updated.lawId = ref.lawId;
          updated.article = ref.article;
          updated.paragraph = ref.paragraph;
          updated.legalUrl = ref.sourceUrl;
          updated.legalVerified = true;
          updated.legalCheckedAsOf = ref.checkedAsOf;
          updated.legalEvidenceId = bank.id + ":" + row.identity;
          updated.conceptReview!.normStatus = before.answerIssue
            ? "article_checked_with_answer_conflict"
            : "article_checked_as_of_exam";
        }
        await put(
          tx,
          "questions",
          updated as unknown as Record<string, unknown>,
        );
        await audit(
          tx,
          before.id,
          "assisted_classification_audit",
          before,
          updated,
          "pipeline:quality-audit",
        );
      }
    }
    await tx.run(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
      [version, new Date().toISOString()],
    );
  });
}
/** Canonical review worklist: A/B never multiplies the review burden. */
export function classificationWorklist(data: Dataset) {
  const seen = new Set<string>();
  const rows = [...data.questions]
    .sort(
      (a, b) =>
        Number(!!b.conceptReview?.independentHumanReview) -
        Number(!!a.conceptReview?.independentHumanReview),
    )
    .filter((q) => {
      if (
        !q.classificationAudit ||
        q.reserve ||
        !q.active ||
        !isDocumentaryVerified(q, data) ||
        seen.has(q.canonicalId)
      )
        return false;
      seen.add(q.canonicalId);
      return true;
    })
    .sort(
      (a, b) =>
        a.classificationAudit!.priorityOrder -
        b.classificationAudit!.priorityOrder,
    );
  return {
    rows,
    reviewed: rows.length,
    humanReviewed: rows.filter(
      (q) => q.classificationAudit?.status === "owner_reviewed",
    ).length,
    pending: rows.filter(
      (q) => q.classificationAudit?.status !== "owner_reviewed",
    ).length,
    initialCohort: rows.filter(
      (q) => q.classificationAudit?.initialManualCohort,
    ).length,
    randomSample: rows.filter((q) => q.classificationAudit?.randomSample)
      .length,
    matters: new Set(rows.map((q) => q.taxonomy?.matterId)).size,
    rules: new Set(rows.map((q) => q.taxonomy?.ruleId)).size,
  };
}
