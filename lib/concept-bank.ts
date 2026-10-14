import fs from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { audit, put, readAll, type DB } from "./db";
import { isDocumentaryVerified } from "./documentary";
import { literalNormalized, normalized } from "./text";
import type { Concept, Question, Source } from "./types";
const base = "data/verified/concepts-2023-2026/";
const sha = (x: Buffer | string) =>
  createHash("sha256").update(x).digest("hex");
export function conceptContentFingerprint(
  q: Pick<
    Question,
    "year" | "session" | "model" | "number" | "stem" | "options" | "correct"
  >,
) {
  return sha(
    JSON.stringify([
      q.year,
      q.session,
      q.model,
      q.number,
      literalNormalized(q.stem),
      q.options.map(literalNormalized),
      q.correct,
    ]),
  );
}
const reviewSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  reviewedAt: z.string(),
  coverage: z.object({
    ordinary: z.literal(700),
    newAssignments: z.literal(524),
    previousAssignmentsPreserved: z.literal(176),
  }),
  questions: z
    .array(
      z.object({
        identity: z.string(),
        year: z.number().int(),
        session: z.string(),
        model: z.string(),
        number: z.number().int().min(1).max(100),
        contentSha256: z.string().length(64),
        topicNumber: z.number().int().min(1).max(23),
        subject: z.string().min(5).max(300),
        concept: z.string().min(5).max(300),
        subconcept: z.string().min(5).max(500),
        previousConcept: z.string().nullable(),
        newConceptAssignment: z.boolean(),
        method: z.enum([
          "assistant_content_review",
          "preserved_previous_curation",
        ]),
        confidence: z.enum(["high", "medium"]),
        scope: z.enum(["focused", "keyed_statement_focus"]),
        independentHumanReview: z.literal(false),
        normStatus: z.string(),
      }),
    )
    .length(700),
});
export async function applyConceptBank(db: DB) {
  if (!fs.existsSync(base + "manifest.json")) return;
  const manifest = JSON.parse(
    fs.readFileSync(base + "manifest.json", "utf8"),
  ) as { files: { path: string; sha256: string }[] };
  for (const required of [
    base + "review.json",
    base + "issues.json",
    "data/curation/concepts-700.psv",
    "data/curation/concept-relations.json",
  ]) {
    if (!manifest.files.some((f) => f.path === required))
      throw Error("Falta evidencia conceptual sellada: " + required);
  }
  for (const file of manifest.files) {
    if (
      !/^data\/(?:verified\/concepts-2023-2026|curation)\/[a-zA-Z0-9_.-]+\.(?:json|png|psv)$/.test(
        file.path,
      ) ||
      sha(fs.readFileSync(file.path)) !== file.sha256
    )
      throw Error("Evidencia conceptual alterada: " + file.path);
  }
  const dependencies = [
    sha(fs.readFileSync("data/verified/manifest.json")),
    sha(fs.readFileSync("data/verified/history/manifest.json")),
  ];
  const version =
    "concepts-v3-withdraw-wording-confidence-" +
    sha(JSON.stringify([manifest, dependencies]));
  if (
    (
      await db.query("SELECT version FROM schema_migrations WHERE version=?", [
        version,
      ])
    ).length
  )
    return;
  const bytes = fs.readFileSync(base + "review.json"),
    bank = reviewSchema.parse(JSON.parse(bytes.toString()));
  if (
    new Set(bank.questions.map((r) => r.identity)).size !== 700 ||
    bank.questions.filter((r) => r.newConceptAssignment).length !== 524
  )
    throw Error("Cobertura conceptual incoherente.");
  const relations = JSON.parse(
    fs.readFileSync("data/curation/concept-relations.json", "utf8"),
  ).relations as {
    id: string;
    kind: "same_rule" | "same_method" | "related_subaspects";
    name: string;
    identities: string[];
    reason: string;
  }[];
  const issues = JSON.parse(fs.readFileSync(base + "issues.json", "utf8"))
    .issues as {
    id: string;
    questionIdentity: string;
    status: "unresolved";
    examDate: string;
    conclusion: string;
    evidence: {
      law: string;
      lawId: string;
      article: string;
      paragraph: string;
      url: string;
      version: { fecha_publicacion: string; fecha_vigencia: string };
    };
  }[];
  await db.transaction(async (tx) => {
    const questions = await readAll<Question>(tx, "questions"),
      sources = await readAll<Source>(tx, "sources"),
      concepts = await readAll<Concept>(tx, "concepts");
    const identity = (q: Question) => `${q.year}-${q.model}-${q.number}`;
    const heads = new Map(
      questions
        .filter(
          (q) =>
            q.model.endsWith("A") &&
            !q.reserve &&
            q.year >= 2023 &&
            q.year <= 2026,
        )
        .map((q) => [identity(q), q]),
    );
    for (const r of relations) {
      if (
        r.identities.some(
          (id) => !bank.questions.some((q) => q.identity === id),
        )
      )
        throw Error("Relación conceptual fuera del corpus.");
    }
    for (const row of bank.questions) {
      const head = heads.get(row.identity);
      if (!head)
        throw Error("Pregunta conceptual no encontrada: " + row.identity);
      if (head.classificationMethod === "manual-reviewed") continue;
      if (!isDocumentaryVerified(head, { sources })) continue;
      if (conceptContentFingerprint(head) !== row.contentSha256)
        throw Error("Clasificación vinculada a otro texto: " + row.identity);
      const beforeConcept = concepts.find(
        (c) => normalized(c.name) === normalized(row.concept),
      );
      const concept: Concept = beforeConcept || {
        id: "concept-" + sha(normalized(row.concept)).slice(0, 20),
        name: row.concept,
        topicId: head.topicId,
        description:
          "Familia de estudio asignada por revisión asistida del contenido; consultar subconceptos. No equivale a revisión humana independiente.",
      };
      if (!beforeConcept) {
        await put(
          tx,
          "concepts",
          concept as unknown as Record<string, unknown>,
        );
        concepts.push(concept);
      }
      const contentRelations = relations
        .filter((r) => r.identities.includes(row.identity))
        .map((r) => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          reason: r.reason,
          questionIds: r.identities.map((id) => heads.get(id)!.id),
        }));
      const issue = issues.find((i) => i.questionIdentity === row.identity);
      if (
        issue &&
        (issue.evidence.version.fecha_publicacion >
          issue.examDate.replaceAll("-", "") ||
          issue.evidence.version.fecha_vigencia >
            issue.examDate.replaceAll("-", ""))
      )
        throw Error("Evidencia normativa posterior al examen.");
      for (const before of questions.filter(
        (q) => q.canonicalId === head.canonicalId,
      )) {
        if (
          before.classificationMethod === "manual-reviewed" ||
          !isDocumentaryVerified(before, { sources })
        )
          continue;
        const updated: Question = {
          ...before,
          subject: row.subject,
          concept: concept.name,
          conceptId: concept.id,
          subconcept: row.subconcept,
          confidence: null,
          contentRelations,
          conceptReview: {
            method: row.method,
            artifactId: bank.id,
            artifactSha256: sha(bytes),
            confidence: "unassessed",
            legacyConfidence: row.confidence,
            scope: row.scope,
            independentHumanReview: false,
            normStatus: row.normStatus,
            reviewedAt: bank.reviewedAt,
            inputSha256: conceptContentFingerprint(before),
          },
        };
        if (row.newConceptAssignment) {
          updated.classificationMethod = "assistant-concept-review";
          updated.classificationReviewed = true;
        }
        if (issue) {
          updated.answerIssue = {
            id: issue.id,
            status: "unresolved",
            description: issue.conclusion,
            sourceUrl: issue.evidence.url,
            lawVersion: issue.evidence.version.fecha_publicacion,
          };
          updated.legalVerified = true;
          updated.lawId = issue.evidence.lawId;
          updated.article = issue.evidence.article;
          updated.paragraph = issue.evidence.paragraph;
          updated.legalUrl = issue.evidence.url;
          updated.legalEvidenceId = issue.id;
          updated.legalCheckedAsOf = issue.examDate;
          updated.conceptReview!.normStatus =
            "article_checked_with_answer_conflict";
        }
        await put(
          tx,
          "questions",
          updated as unknown as Record<string, unknown>,
        );
        await audit(
          tx,
          before.id,
          "review_concept_hierarchy",
          before,
          updated,
          "pipeline:concepts",
        );
      }
    }
    await tx.run(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
      [version, new Date().toISOString()],
    );
  });
}
