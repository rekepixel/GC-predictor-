import { z } from "zod";
import { audit, getDB, put } from "./db";
import { dataset, initialize } from "./store";
import { deduplicate, officialURL } from "./importer";
import { literalHash, normalized } from "./text";
import type { Question } from "./types";
export const reviewSchema = z.object({
  stem: z.string().min(5).max(15000),
  options: z.array(z.string().min(1).max(10000)).length(4),
  correct: z.number().int().min(0).max(3).nullable(),
  validation: z.enum(["draft", "reviewed", "validated", "cancelled"]),
  topicId: z.string().nullable(),
  concept: z.string().max(300).nullable(),
  law: z.string().max(500).nullable(),
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
  const changes = reviewSchema.parse(input);
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
      const concept = data.concepts.find(
        (c) => normalized(c.name) === normalized(name),
      );
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
      confidence: changes.classificationReviewed ? 1 : previous.confidence,
      classificationMethod: changes.classificationReviewed
        ? "manual-reviewed"
        : previous.classificationMethod,
      canonicalId: previous.id,
      optionMap: [0, 1, 2, 3],
    };
    if (updated.validation === "cancelled") updated.active = false;
    updated = deduplicate(
      updated,
      data.questions.filter((q) => q.id !== id),
    );
    await put(tx, "questions", updated as unknown as Record<string, unknown>);
    await audit(tx, id, "review_question", previous, updated, actor);
    // Recompute all aliases in this examination family after literal edits to avoid stale equivalences.
    const family = [
      updated,
      ...data.questions.filter(
        (q) =>
          q.id !== id &&
          q.year === updated.year &&
          q.session === updated.session,
      ),
    ].sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    const rebuilt: Question[] = [];
    for (const q of family) {
      const fresh = deduplicate(
        { ...q, canonicalId: q.id, optionMap: [0, 1, 2, 3] },
        rebuilt,
      );
      rebuilt.push(fresh);
      await put(tx, "questions", fresh as unknown as Record<string, unknown>);
    }
    return rebuilt.find((q) => q.id === id)!;
  });
}
