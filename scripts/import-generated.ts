import "./env";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { dataset, initialize } from "../lib/store";
import { audit, getDB } from "../lib/db";
import { generatedProblems, type GeneratedQuestion } from "../lib/exam-engine";
import { normalized } from "../lib/text";

async function main() {
  const files = process.argv.slice(2);
  if (!files.length)
    throw Error(
      "Indica los archivos privados de candidatos. No se usa una semilla pública de demostración.",
    );
  await initialize();
  const data = await dataset();
  if (data.questions.length !== 2100)
    throw Error(
      "La importación requiere la base privada completa de 2100 registros.",
    );
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const schema = z.object({
    id: z.string().min(1).max(200),
    stem: z.string().min(12),
    options: z.array(z.string().min(1)).length(4),
    correct: z.number().int().min(0).max(3),
    topicId: z.string(),
    concept: z.string(),
    conceptId: z.string(),
    subaspect: z.string(),
    law: z.string().nullable(),
    article: z.string().nullable(),
    paragraph: z.string().nullable(),
    explanation: z.string().min(10),
    referenceDate: date,
    historicalReferences: z.array(z.string()).min(1),
    format: z.string(),
    difficulty: z.enum(["low", "medium", "high"]),
    evidence: z
      .array(
        z.object({
          url: z.string().url(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          storageKey: z.string().regex(/^data\/generated\/[a-zA-Z0-9_./-]+$/),
          quote: z.string().min(20),
          publishedAt: date,
          effectiveFrom: date,
          checkedAsOf: date,
          syllabusQuote: z.string().min(5),
          syllabusPage: z.number().int().positive(),
        }),
      )
      .min(1),
    optionChecks: z.array(
      z.object({
        index: z.number().int().min(0).max(3),
        verdict: z.enum(["supported", "contradicted"]),
        reason: z.string().min(12),
        quote: z.string().min(10),
        evidenceIndex: z.number().int().nonnegative(),
      }),
    ),
    quality: z.object({
      state: z.enum(["draft", "documentary_checked", "rejected"]),
      method: z.string(),
      humanReviewed: z.literal(false),
      issues: z.array(z.string()),
      checkedAt: date,
      sourceFingerprintsChecked: z.boolean(),
      syllabusChecked: z.boolean(),
      temporalChecked: z.boolean(),
      uniqueAnswerChecked: z.boolean(),
    }),
  });
  let added = 0,
    kept = 0,
    eligible = 0;
  const db = getDB();
  const seen = new Set<string>();
  for (const file of files) {
    const rows = z
      .array(schema)
      .parse(
        JSON.parse(await fs.readFile(file, "utf8")),
      ) as GeneratedQuestion[];
    for (const q of rows) {
      if (seen.has(q.id))
        throw Error("ID repetido entre los archivos de candidatos.");
      seen.add(q.id);
      for (const evidence of q.evidence) {
        if (evidence.storageKey.split("/").includes(".."))
          throw Error("Ruta de evidencia no válida.");
        const encoded = await fs.readFile(evidence.storageKey),
          bytes = evidence.storageKey.endsWith(".gz")
            ? gunzipSync(encoded)
            : encoded;
        if (
          createHash("sha256").update(bytes).digest("hex") !== evidence.sha256
        )
          throw Error("Huella normativa incompatible.");
        const text = bytes
          .toString("utf8")
          .replace(/<[^>]+>/g, " ")
          .replaceAll("&nbsp;", " ")
          .replaceAll("&amp;", "&");
        if (!normalized(text).includes(normalized(evidence.quote)))
          throw Error("El fragmento citado no está en el original retenido.");
      }
      if (
        q.quality.state === "documentary_checked" &&
        generatedProblems(q, data).length
      )
        throw Error(
          "El candidato marcado para uso tiene controles pendientes: " +
            generatedProblems(q, data).join(" "),
        );
      const rows = await db.query<{ payload: string }>(
        "SELECT payload FROM generated_questions WHERE id=?",
        [q.id],
      );
      if (rows.length) {
        if (JSON.stringify(JSON.parse(rows[0].payload)) !== JSON.stringify(q))
          throw Error(
            "Un candidato ya tiene otra versión o una revisión del propietario. Se conserva sin sobrescribir.",
          );
        kept++;
      } else {
        await db.transaction(async (tx) => {
          await tx.run(
            "INSERT INTO generated_questions(id,payload) VALUES(?,?)",
            [q.id, JSON.stringify(q)],
          );
          await audit(
            tx,
            q.id,
            "import_generated_draft",
            null,
            {
              file,
              sourceHashes: q.evidence.map((e) => e.sha256),
              quality: q.quality,
            },
            "assisted_curation",
          );
        });
        added++;
      }
      if (q.quality.state === "documentary_checked") eligible++;
    }
  }
  console.log(
    JSON.stringify({
      added,
      kept,
      documentaryChecked: eligible,
      humanReviewsImported: 0,
      historicalQuestionsUnchanged: true,
    }),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
