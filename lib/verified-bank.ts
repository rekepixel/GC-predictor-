import fs from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { audit, put, readAll, type DB } from "./db";
import type { Question, Exam, Source, ImportJob } from "./types";
import { literalHash } from "./text";
import { documentaryFingerprint } from "./documentary";
const sha = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
const questionSchema = z.object({
  number: z.number().int().min(1).max(105),
  printedNumber: z.number().int(),
  stem: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  reserve: z.boolean(),
  sourcePage: z.number().int().min(3).max(17),
  checks: z.object({
    twoExtractorsAgreeIgnoringWhitespace: z.literal(true),
    fourOptions: z.literal(true),
    numberAndSectionChecked: z.literal(true),
    keyExtractorsAgree: z.literal(true),
  }),
});
const artifactSchema = z.object({
  id: z.string(),
  computedAt: z.string(),
  scope: z.literal("official_corrected_documentary"),
  administrativeFinalityConfirmed: z.literal(false),
  models: z
    .array(
      z.object({
        model: z.enum(["A", "B"]),
        sourceId: z.string(),
        questions: z.array(questionSchema).length(105),
      }),
    )
    .length(2),
  pairs: z
    .array(
      z.object({
        a: z.number().int(),
        b: z.number().int(),
        canonicalNumber: z.number().int(),
        bOptionToCanonical: z.array(z.number().int().min(0).max(3)).length(4),
        reserve: z.boolean(),
        method: z.string(),
        notes: z.array(z.string()),
      }),
    )
    .length(105),
  documents: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      url: z.string().url(),
      sha256: z.string(),
    }),
  ),
  officialPage: z.object({ sha256: z.string() }),
  corrections: z.array(
    z.object({
      a: z.number(),
      b: z.number(),
      previous: z.string(),
      current: z.string(),
    }),
  ),
});
export async function applyVerifiedBank(db: DB) {
  const manifestPath = "data/verified/manifest.json";
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const file of manifest.files as { path: string; sha256: string }[]) {
    if (
      !/^data\/(verified|research)\/[a-zA-Z0-9_.-]+\.(json|html)$/.test(
        file.path,
      ) ||
      sha(fs.readFileSync(file.path)) !== file.sha256
    )
      throw Error(
        "El banco verificado no coincide con su manifiesto: " + file.path,
      );
  }
  const bankVersion = "bank-" + sha(JSON.stringify(manifest));
  if (
    (
      await db.query("SELECT version FROM schema_migrations WHERE version=?", [
        bankVersion,
      ])
    ).length
  )
    return;
  const bytes = fs.readFileSync("data/verified/2026-documentary.json");
  const artifact = artifactSchema.parse(JSON.parse(bytes.toString()));
  for (const doc of artifact.documents) {
    if (
      !/^data\/raw\/[a-zA-Z0-9_.-]+\.pdf$/i.test(doc.path) ||
      sha(fs.readFileSync(doc.path)) !== doc.sha256
    )
      throw Error("Original distinto del cotejado: " + doc.id);
  }
  if (
    sha(fs.readFileSync("data/research/2026-process-page.html")) !==
    artifact.officialPage.sha256
  )
    throw Error("Evidencia web de corrección alterada.");
  const classifications = JSON.parse(
    fs.readFileSync("data/verified/2026-classification.json", "utf8"),
  ).questions as {
    number: number;
    topicNumber: number;
    concept: string;
    law: string | null;
    lawId: string | null;
    lawVerified: boolean;
    article: string | null;
    paragraph: string | null;
    legalUrl: string | null;
    legalVerified: boolean;
    legalEvidenceId: string | null;
  }[];
  const legalEvidence = JSON.parse(
    fs.readFileSync("data/verified/2026-legal-evidence.json", "utf8"),
  ).references as {
    id: string;
    questionNumberA: number;
    article: string;
    paragraph: string | null;
    checkedAsOf: string;
  }[];
  if (
    classifications.length !== 105 ||
    new Set(classifications.map((c) => c.number)).size !== 105
  )
    throw Error("Clasificación incompleta o duplicada.");
  const aModel = artifact.models.find((m) => m.model === "A")!,
    bModel = artifact.models.find((m) => m.model === "B")!;
  if (
    new Set(artifact.pairs.map((p) => p.a)).size !== 105 ||
    new Set(artifact.pairs.map((p) => p.b)).size !== 105
  )
    throw Error("La correspondencia A/B no es biyectiva.");
  const compact = (s: string) => s.replace(/\s+/g, "");
  for (const pair of artifact.pairs) {
    const a = aModel.questions.find((q) => q.number === pair.a),
      b = bModel.questions.find((q) => q.number === pair.b);
    if (
      !a ||
      !b ||
      a.reserve !== pair.a > 100 ||
      b.reserve !== a.reserve ||
      pair.reserve !== a.reserve ||
      pair.canonicalNumber !== pair.a ||
      compact(a.stem) !== compact(b.stem)
    )
      throw Error("Enunciado o reserva incompatible en pareja A/B.");
    if (
      new Set(pair.bOptionToCanonical).size !== 4 ||
      pair.bOptionToCanonical[b.correct] !== a.correct
    )
      throw Error("Correspondencia de respuestas incompatible.");
    for (let i = 0; i < 4; i++) {
      const original = a.options[pair.bOptionToCanonical[i]],
        alternative = b.options[i];
      const knownException =
        pair.a === 28 &&
        pair.b === 62 &&
        i === 2 &&
        original === "Noveno" &&
        alternative === "Noveno." &&
        pair.notes.length > 0;
      if (compact(original) !== compact(alternative) && !knownException)
        throw Error("Alternativas distintas sin evidencia.");
    }
  }
  if (
    aModel.questions.find((q) => q.number === 7)?.correct !== 0 ||
    bModel.questions.find((q) => q.number === 88)?.correct !== 0
  )
    throw Error("Falta corrección oficial A7/B88.");
  await db.transaction(async (tx) => {
    const sources = await readAll<Source>(tx, "sources"),
      exams = await readAll<Exam>(tx, "exams"),
      existing = await readAll<Question>(tx, "questions");
    for (const doc of artifact.documents) {
      const src = sources.find((s) => s.id === doc.id);
      if (!src && doc.id !== "key-2026-original")
        throw Error("Falta una fuente del banco: " + doc.id);
      if (
        src &&
        (src.url !== doc.url ||
          src.sha256 !== doc.sha256 ||
          src.origin !== "official" ||
          !src.verified)
      )
        throw Error("Fuente local no coincide con evidencia: " + doc.id);
    }
    const key = sources.find((s) => s.id === "key-2026-corrected")!;
    const updatedKey = {
      ...key,
      answerKeyStatus: "official_corrected_current" as const,
    };
    await put(tx, "sources", updatedKey as unknown as Record<string, unknown>);
    await audit(
      tx,
      key.id,
      "documentary_key_status",
      key,
      updatedKey,
      "pipeline:2026",
    );
    const oldKey = artifact.documents.find(
      (d) => d.id === "key-2026-original",
    )!;
    if (!sources.some((s) => s.id === oldKey.id)) {
      const src: Source = {
        id: oldKey.id,
        title: "Plantilla 2026 nº 1 · sustituida oficialmente por nº 2",
        url: oldKey.url,
        year: 2026,
        session: "2026-07-11",
        model: "A/B",
        kind: "answer_key",
        origin: "official",
        access: "downloaded",
        consultedAt: artifact.computedAt,
        publishedAt: null,
        notes:
          "Sustituida. A7/B88: C en esta clave, A en PDF nº 2. Nunca se utiliza para corregir.",
        sha256: oldKey.sha256,
        storageKey: oldKey.path,
        definitive: false,
        verified: true,
        answerKeyStatus: "superseded",
      };
      await put(tx, "sources", src as unknown as Record<string, unknown>);
    } else {
      const existing = sources.find((s) => s.id === oldKey.id)!;
      await put(tx, "sources", {
        ...existing,
        definitive: false,
        answerKeyStatus: "superseded",
      });
    }
    const modelExams = new Map<string, Exam>();
    for (const model of artifact.models) {
      const found = exams.find((e) => e.sourceId === model.sourceId);
      const e: Exam = found || {
        id: `verified-exam-2026-${model.model}`,
        year: 2026,
        session: "2026-07-11",
        model: model.model,
        heldAt: "2026-07-11",
        expectedQuestions: 100,
        sourceId: model.sourceId,
        keySourceId: key.id,
        status: "documentary_verified",
        notes:
          "Contenido y clave oficial corregida cotejados; firmeza administrativa final pendiente.",
      };
      await put(tx, "exams", {
        ...e,
        status: "documentary_verified",
        notes: e.notes || "Cotejo documental; no equivale a clave definitiva.",
      });
      modelExams.set(model.model, e);
    }
    const ids = new Map<string, string>();
    for (const model of artifact.models)
      for (const q of model.questions) {
        const old = existing.find(
          (r) =>
            r.examId === modelExams.get(model.model)!.id &&
            r.number === q.number,
        );
        ids.set(
          `${model.model}-${q.number}`,
          old?.id || `verified-2026-${model.model}-${q.number}`,
        );
      }
    for (const model of artifact.models) {
      const exam = modelExams.get(model.model)!,
        source = sources.find((s) => s.id === model.sourceId)!;
      for (const record of model.questions) {
        const id = ids.get(`${model.model}-${record.number}`)!,
          previous = existing.find((q) => q.id === id);
        const pair = artifact.pairs.find((p) =>
          model.model === "A" ? p.a === record.number : p.b === record.number,
        )!;
        const c = classifications.find((c) => c.number === pair.a)!;
        if (
          c.legalVerified &&
          !legalEvidence.some(
            (e) =>
              e.id === c.legalEvidenceId &&
              e.questionNumberA === pair.a &&
              e.article === c.article &&
              e.paragraph === c.paragraph,
          )
        )
          throw Error("Referencia jurídica sin evidencia concordante.");
        // Preserve owner-reviewed records; the pipeline cannot silently replace personal annotations.
        if (
          previous &&
          (previous.validation === "validated" ||
            previous.classificationMethod === "manual-reviewed")
        )
          continue;
        const canonicalId = ids.get(`A-${pair.a}`)!;
        const q: Question = {
          ...(previous || {}),
          id,
          examId: exam.id,
          year: 2026,
          session: exam.session,
          model: model.model,
          number: record.number,
          printedNumber: record.printedNumber,
          stem: record.stem,
          options: record.options,
          correct: record.correct,
          validation: "reviewed",
          topicId: `tema-${String(c.topicNumber).padStart(2, "0")}`,
          conceptId: `concept-2026-${pair.a}`,
          concept: c.concept,
          law: c.law,
          lawId: c.lawId,
          lawVerified: c.lawVerified,
          article: c.article,
          paragraph: c.paragraph,
          legalUrl: c.legalUrl,
          legalVerified: c.legalVerified,
          legalEvidenceId: c.legalEvidenceId,
          legalCheckedAsOf: c.legalVerified ? "2026-07-11" : null,
          confidence: 1,
          classificationMethod: "curated_from_official_question_and_syllabus",
          classificationReviewed: true,
          validity: "unknown",
          explanation: c.legalVerified
            ? `Concepto: ${c.concept}. Referencia cotejada para la fecha del examen; consulta la versión normativa enlazada. La letra de respuesta procede de la plantilla oficial corregida, cuya firmeza final no se afirma.`
            : `Concepto: ${c.concept}. Se ha cotejado la transcripción y la clave oficial corregida; la referencia jurídica concreta permanece pendiente o no resulta aplicable.`,
          distractorType: previous?.distractorType || null,
          style: previous?.style || null,
          reserve: record.reserve,
          active: !record.reserve,
          sourceId: source.id,
          keySourceId: key.id,
          sourcePage: record.sourcePage,
          availableAt: previous?.availableAt || null,
          literalHash: literalHash(record.stem, record.options),
          optionMap:
            model.model === "A" ? [0, 1, 2, 3] : pair.bOptionToCanonical,
          canonicalId,
          createdAt: previous?.createdAt || artifact.computedAt,
        };
        q.documentaryVerification = {
          status: "verified",
          scope: "official_corrected_documentary",
          artifactId: artifact.id,
          artifactSha256: sha(bytes),
          fingerprint: documentaryFingerprint(q),
          sourceSha256: source.sha256!,
          keySha256: key.sha256!,
          checkedAt: artifact.computedAt,
          canonicalNumber: pair.a,
          pairedNumber: model.model === "A" ? pair.b : pair.a,
          administrativeFinalityConfirmed: false,
          checks: Object.keys(record.checks),
          notes: pair.notes,
        };
        await put(tx, "concepts", {
          id: q.conceptId,
          name: c.concept,
          topicId: q.topicId,
          description:
            "Identificado mediante cotejo del enunciado oficial de 2026 y el tema correspondiente.",
        });
        await put(tx, "questions", q as unknown as Record<string, unknown>);
        await tx.run(
          "INSERT INTO answer_entries(exam_id,question_number,correct,cancelled,source_id) VALUES(?,?,?,?,?) ON CONFLICT(exam_id,question_number) DO UPDATE SET correct=excluded.correct,cancelled=excluded.cancelled,source_id=excluded.source_id",
          [exam.id, record.number, record.correct, 0, key.id],
        );
        await audit(
          tx,
          id,
          "documentary_verification",
          previous,
          q,
          "pipeline:dual-extraction-and-source-curation",
        );
      }
      const job: ImportJob = {
        id: `documentary-job-2026-${model.model}`,
        sourceId: source.id,
        examId: exam.id,
        kind: "documentary_verification",
        status: "documentary_verified_finality_pending",
        errors: [],
        warnings: [
          "105 registros cotejados: 100 ordinarios y 5 reservas inactivas.",
          "La clave corregida oficial vigente no se declara administrativamente definitiva.",
          "Las frecuencias describen contenido publicado; la corrección definitiva y retrospectiva estricta siguen separadas.",
        ],
        createdAt: artifact.computedAt,
      };
      await put(tx, "import_jobs", job as unknown as Record<string, unknown>);
    }
    await tx.run(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
      [bankVersion, new Date().toISOString()],
    );
  });
}
