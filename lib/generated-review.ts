import { z } from "zod";
import { audit, getDB } from "./db";
import { dataset } from "./store";
import { generatedProblems, type GeneratedQuestion } from "./exam-engine";
export async function reviewGenerated(id: string, input: unknown) {
  const fields = z
    .object({
      state: z.enum(["draft", "documentary_checked", "rejected"]),
      notes: z.string().min(20).max(4000),
      correct: z.number().int().min(0).max(3).optional(),
      reasons: z.array(z.string().min(20).max(3000)).length(4).optional(),
      personallyReviewed: z.boolean().default(false),
      syllabusChecked: z.boolean().default(false),
      temporalChecked: z.boolean().default(false),
      allDistractorsChecked: z.boolean().default(false),
    })
    .parse(input);
  const db = getDB();
  return db.transaction(async (tx) => {
    const rows = await tx.query<{ payload: string }>(
      "SELECT payload FROM generated_questions WHERE id=?",
      [id],
    );
    if (!rows.length) throw Error("Candidato inexistente.");
    const before = JSON.parse(rows[0].payload) as GeneratedQuestion;
    let after: GeneratedQuestion = {
      ...before,
      quality: {
        ...before.quality,
        state: fields.state,
        issues:
          fields.state === "rejected" ? [fields.notes] : before.quality.issues,
        checkedAt: new Date().toISOString().slice(0, 10),
      },
    };
    if (fields.state === "documentary_checked") {
      if (
        !fields.personallyReviewed ||
        !fields.syllabusChecked ||
        !fields.temporalChecked ||
        !fields.allDistractorsChecked ||
        !fields.reasons ||
        fields.correct === undefined
      )
        throw Error(
          "La liberación requiere revisión personal expresa, programa, versión normativa y justificación de las cuatro alternativas.",
        );
      if (!before.quality.sourceFingerprintsChecked)
        throw Error(
          "La evidencia original no ha superado el cotejo de huellas.",
        );
      after = {
        ...after,
        correct: fields.correct,
        optionChecks: fields.reasons.map((reason, index) => ({
          index,
          verdict: index === fields.correct ? "supported" : "contradicted",
          reason,
          quote: before.evidence[0].quote,
          evidenceIndex: 0,
        })),
        quality: {
          ...after.quality,
          humanReviewed: true,
          issues: [],
          method: "owner_documentary_review",
          syllabusChecked: true,
          temporalChecked: true,
          uniqueAnswerChecked: true,
        },
      };
      const problems = generatedProblems(after, await dataset(tx));
      if (problems.length) throw Error(problems.join(" "));
    }
    await tx.run("UPDATE generated_questions SET payload=? WHERE id=?", [
      JSON.stringify(after),
      id,
    ]);
    await audit(
      tx,
      id,
      "review_generated_candidate",
      before,
      { ...after, reviewerNotes: fields.notes },
      "owner",
    );
    return after;
  });
}
