import { z } from "zod";
import { getDB, type DB } from "./db";
export const studySchema = z.object({
  revision: z.number().int().nonnegative(),
  status: z.enum(["pending", "studied", "review"]),
  answer: z.number().int().min(0).max(3).nullable().default(null),
});
export type StudyProgress = {
  status: "pending" | "studied" | "review";
  answer: number | null;
  revision: number;
  updatedAt: string;
};
export class StudyConflict extends Error {}
export async function studyProgress(
  db: DB = getDB(),
): Promise<Record<string, StudyProgress>> {
  const rows = await db.query<{
    id: string;
    payload: string;
    revision: number;
    updated_at: string;
  }>("SELECT * FROM study_state ORDER BY id");
  return Object.fromEntries(
    rows.map((r) => [
      r.id,
      {
        ...JSON.parse(r.payload),
        revision: r.revision,
        updatedAt: r.updated_at,
      },
    ]),
  );
}
export async function saveStudyProgress(
  questionId: string,
  input: unknown,
  db: DB = getDB(),
) {
  const { revision, ...value } = studySchema.parse(input);
  return db.transaction(async (tx) => {
    if (
      !(await tx.query("SELECT id FROM questions WHERE id=?", [questionId]))
        .length
    )
      throw Error("Pregunta inexistente.");
    const now = new Date().toISOString();
    const result =
      revision === 0
        ? await tx.query<{ revision: number }>(
            "INSERT INTO study_state(id,payload,revision,updated_at) VALUES(?,?,1,?) ON CONFLICT(id) DO NOTHING RETURNING revision",
            [questionId, JSON.stringify(value), now],
          )
        : await tx.query<{ revision: number }>(
            "UPDATE study_state SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING revision",
            [JSON.stringify(value), now, questionId, revision],
          );
    if (!result.length)
      throw new StudyConflict(
        "El progreso cambió en otro dispositivo. Actualiza y vuelve a guardar.",
      );
    return { ...value, revision: result[0].revision, updatedAt: now };
  });
}
