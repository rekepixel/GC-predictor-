import { z } from "zod";
import { audit, getDB, put } from "./db";
import { dataset, initialize } from "./store";
import { deduplicate, officialURL } from "./importer";
import { literalHash, normalized } from "./text";
import { conceptContentFingerprint } from "./concept-bank";
import { createHash } from "node:crypto";
import type { Question } from "./types";
export const reviewSchema = z.object({
  stem: z.string().min(5).max(15000),
  options: z.array(z.string().min(1).max(10000)).length(4),
  correct: z.number().int().min(0).max(3).nullable(),
  validation: z.enum(["draft", "reviewed", "validated", "cancelled"]),
  topicId: z.string().nullable(),
  concept: z.string().max(300).nullable(),
  subject: z.string().max(300).nullable().optional(),
  subconcept: z.string().max(500).nullable().optional(),
  confirmConceptReview: z.boolean().optional().default(false),
  law: z.string().max(500).nullable(),
  lawVerified: z.boolean().optional().default(false),
  article: z.string().max(100).nullable(),
  paragraph: z.string().max(100).nullable(),
  legalUrl: z.string().url().or(z.literal("")).nullable(),
  legalVerified: z.boolean(),
  classificationReviewed: z.boolean(),
  validity: z.enum([
    "unreviewed",
    "current",
    "affected",
    "repealed",
    "unknown",
  ]),
  explanation: z.string().max(8000),
  distractorType: z.string().max(150).nullable(),
  style: z.string().max(150).nullable(),
  reserve: z.boolean(),
  active: z.boolean(),
});
export async function reviewQuestion(
  id: string,
  input: unknown,
  actor = "owner",
) {
  const { confirmConceptReview, ...changes } = reviewSchema.parse(input);
  await initialize();
  return getDB().transaction(async (tx) => {
    const data = await dataset(tx);
    const previous = data.questions.find((q) => q.id === id);
    if (!previous) throw Error("Pregunta no encontrada.");
    if (changes.topicId && !data.topics.some((t) => t.id === changes.topicId))
      throw Error("Tema inexistente.");
    if (new Set(changes.options.map(normalized)).size !== 4)
      throw Error("Las opciones deben ser distintas.");
    if (
      changes.legalVerified &&
      (!changes.law ||
        !changes.article ||
        !changes.legalUrl ||
        !officialURL(changes.legalUrl))
    )
      throw Error(
        "Verificar una referencia requiere norma, artículo y enlace oficial.",
      );
    if (changes.validation === "validated") {
      if (previous.answerIssue)
        throw Error(
          "Hay una discrepancia entre pregunta, clave y norma pendiente de resolución documental.",
        );
      const src = data.sources.find((s) => s.id === previous.sourceId);
      const key = data.sources.find((s) => s.id === previous.keySourceId);
      if (
        !src?.verified ||
        src.origin !== "official" ||
        !key?.verified ||
        !key.definitive ||
        key.origin !== "official"
      )
        throw Error(
          "Se necesita examen oficial verificado y plantilla oficial definitiva verificada.",
        );
      const entry = (
        await tx.query(
          "SELECT correct,cancelled FROM answer_entries WHERE exam_id=? AND question_number=? AND source_id=?",
          [previous.examId, previous.number, key.id],
        )
      )[0];
      if (
        !entry ||
        entry.cancelled ||
        entry.correct !== changes.correct ||
        changes.correct === null
      )
        throw Error("La respuesta debe coincidir con la plantilla definitiva.");
    }
    let conceptId: string | null = null;
    if (changes.concept?.trim()) {
      const name = changes.concept.trim();
      const matchingConcepts = data.concepts.filter(
        (c) => normalized(c.name) === normalized(name),
      );
      // Historical labels remain stored. Confirming a current label must not
      // silently switch to an older ID with the same name and split its counts.
      const concept =
        matchingConcepts.find((c) => c.id === previous.conceptId) ||
        matchingConcepts.find((c) =>
          data.questions.some(
            (q) => q.active && !q.reserve && q.taxonomy?.ruleId === c.id,
          ),
        ) ||
        matchingConcepts[0];
      conceptId = concept?.id || crypto.randomUUID();
      if (!concept)
        await put(tx, "concepts", {
          id: conceptId,
          name,
          topicId: changes.topicId,
          description: "",
        });
    }
    let updated: Question = {
      ...previous,
      ...changes,
      conceptId,
      concept: changes.concept?.trim() || null,
      legalUrl: changes.legalUrl || null,
      literalHash: literalHash(changes.stem, changes.options),
      confidence: changes.classificationReviewed ? null : previous.confidence,
      classificationMethod: changes.classificationReviewed
        ? "manual-reviewed"
        : previous.classificationMethod,
      canonicalId: previous.canonicalId,
      optionMap: previous.optionMap,
    };
    if (
      changes.law !== previous.law ||
      changes.article !== previous.article ||
      changes.paragraph !== previous.paragraph ||
      (changes.legalUrl || null) !== previous.legalUrl
    ) {
      // A new manual reference must not inherit evidence or dates from another BOE block.
      updated.legalEvidenceId = null;
      updated.legalCheckedAsOf = null;
      updated.lawId = null;
    }
    if (updated.validation === "cancelled") updated.active = false;
    if (updated.validation === "cancelled")
      for (const other of data.questions.filter(
        (q) => q.id !== id && q.canonicalId === previous.canonicalId,
      )) {
        const cancelled = {
          ...other,
          validation: "cancelled" as const,
          active: false,
        };
        await put(
          tx,
          "questions",
          cancelled as unknown as Record<string, unknown>,
        );
        await audit(
          tx,
          other.id,
          "cancel_equivalent_question",
          other,
          cancelled,
          actor,
        );
      }
    const contentChanged =
      changes.stem !== previous.stem ||
      JSON.stringify(changes.options) !== JSON.stringify(previous.options) ||
      changes.correct !== previous.correct;
    const conceptChanged =
      changes.concept !== previous.concept ||
      changes.topicId !== previous.topicId ||
      (changes.subject !== undefined && changes.subject !== previous.subject) ||
      (changes.subconcept !== undefined &&
        changes.subconcept !== previous.subconcept);
    if (contentChanged || conceptChanged) {
      updated.conceptReview = null;
      // An annotation bound to another literal or rule cannot survive an edit.
      updated.taxonomy = null;
      updated.classificationAudit = null;
    }
    if (
      confirmConceptReview &&
      changes.classificationReviewed &&
      changes.concept?.trim()
    )
      updated.conceptReview = {
        method: "owner_review",
        confidence: "unassessed",
        scope: previous.conceptReview?.scope || "focused",
        independentHumanReview: true,
        normStatus: changes.legalVerified
          ? "article_checked_by_owner"
          : "normative_scope_requires_separate_verification",
        reviewedAt: new Date().toISOString(),
      };
    if (
      confirmConceptReview &&
      updated.conceptReview?.independentHumanReview &&
      previous.classificationAudit
    ) {
      updated.classificationAudit = {
        ...previous.classificationAudit,
        status: "owner_reviewed",
        inputSha256: conceptContentFingerprint(updated),
        reason:
          "El usuario ha confirmado la revisión del concepto y subaspecto; el historial conserva la propuesta asistida anterior.",
      };
      if (previous.taxonomy && updated.conceptId && updated.concept) {
        const matter =
          changes.subject !== previous.subject
            ? changes.subject || previous.taxonomy.matter
            : previous.taxonomy.matter;
        const subaspect = updated.subconcept || updated.concept;
        const key = (prefix: string, text: string) =>
          prefix + createHash("sha256").update(text).digest("hex").slice(0, 20);
        updated.taxonomy = {
          version: "owner-reviewed",
          matter,
          matterId: key("matter-", matter),
          rule: updated.concept,
          ruleId: updated.conceptId,
          subaspect,
          subaspectId: key("sub-", updated.conceptId + "|" + subaspect),
        };
      }
    }
    if (!contentChanged) {
      await put(tx, "questions", updated as unknown as Record<string, unknown>);
      await audit(tx, id, "review_question", previous, updated, actor);
      return updated;
    }
    updated.documentaryVerification = null;
    updated = deduplicate(
      { ...updated, canonicalId: updated.id, optionMap: [0, 1, 2, 3] },
      data.questions.filter((q) => q.id !== id),
    );
    await put(tx, "questions", updated as unknown as Record<string, unknown>);
    await audit(
      tx,
      id,
      "review_question_content_changed",
      previous,
      updated,
      actor,
    );
    // Editing content invalidates its documented counterpart's correspondence proof.
    for (const other of data.questions.filter(
      (q) =>
        q.id !== id &&
        q.canonicalId === previous.canonicalId &&
        q.documentaryVerification,
    )) {
      const invalidated = { ...other, documentaryVerification: null };
      await put(
        tx,
        "questions",
        invalidated as unknown as Record<string, unknown>,
      );
      await audit(
        tx,
        other.id,
        "invalidate_documentary_pair",
        other,
        invalidated,
        actor,
      );
    }
    return updated;
  });
}
