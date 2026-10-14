import fs from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { audit, put, readAll, type DB } from "./db";
import {
  documentaryFingerprint,
  corroborationFingerprint,
} from "./documentary";
import { literalHash, normalized } from "./text";
import type { Source, Question, Exam, Concept } from "./types";
const sha = (x: Buffer | string) =>
  createHash("sha256").update(x).digest("hex");
const classification = z.object({
  topicNumber: z.number().int().min(1).max(23),
  law: z.string().nullable(),
  lawId: z.string().nullable(),
  lawVerified: z.boolean(),
  concept: z.string().nullable(),
  conceptId: z.string().nullable(),
  article: z.string().nullable(),
  paragraph: z.string().nullable(),
  legalUrl: z.string().nullable(),
  legalVerified: z.boolean(),
  legalEvidenceId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  classificationMethod: z.string(),
  classificationReviewed: z.literal(true),
  classificationEvidence: z.string(),
  conceptEvidence: z.string().optional(),
});
const record = z.object({
  number: z.number().int().min(1).max(105),
  printedNumber: z.number().int(),
  stem: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  reserve: z.boolean(),
  sourcePage: z.number().int().min(3).max(17),
  keyPage: z.number().int().positive(),
  checks: z.array(z.string()).min(4),
  extractionCorrections: z
    .array(
      z.object({
        field: z.string(),
        from: z.string(),
        to: z.string(),
        sourcePage: z.number(),
        evidence: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  classification,
});
const artifactSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  scope: z.literal("corroborated_documentary"),
  computedAt: z.string(),
  sources: z.array(
    z
      .object({
        id: z.string(),
        origin: z.literal("secondary"),
        localPath: z.string(),
        sha256: z.string(),
        corroboration: z.object({
          status: z.literal("cross_source_consistent"),
          matches: z
            .array(z.object({ url: z.string().url(), sha256: z.string() }))
            .min(2),
        }),
      })
      .passthrough(),
  ),
  forms: z
    .array(
      z.object({
        year: z.number().int().min(2023).max(2025),
        form: z.string(),
        session: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string(),
        availableAt: z.string().nullable(),
        keySourceId: z.string(),
        keySha256: z.string(),
        models: z
          .array(
            z.object({
              model: z.string(),
              sourceId: z.string(),
              path: z.string(),
              sha256: z.string(),
              corroboratingPath: z.string(),
              questions: z.array(record).length(105),
            }),
          )
          .length(2),
        pairs: z
          .array(
            z.object({
              a: z.number().int(),
              b: z.number().int(),
              bOptionToCanonical: z
                .array(z.number().int().min(0).max(3))
                .length(4),
              reserve: z.boolean(),
              notes: z.array(z.string()),
            }),
          )
          .length(105),
      }),
    )
    .length(6),
});
export async function applyHistoricalBank(db: DB) {
  const path = "data/verified/history/manifest.json";
  if (!fs.existsSync(path)) return;
  const manifest = JSON.parse(fs.readFileSync(path, "utf8")) as {
    files: { path: string; sha256: string }[];
  };
  for (const file of manifest.files)
    if (
      !/^data\/verified\/history\/[a-zA-Z0-9_.-]+\.json$/.test(file.path) ||
      sha(fs.readFileSync(file.path)) !== file.sha256
    )
      throw Error("Evidencia histórica alterada: " + file.path);
  const version = "historical-v3-" + sha(JSON.stringify(manifest));
  if (
    (
      await db.query("SELECT version FROM schema_migrations WHERE version=?", [
        version,
      ])
    ).length
  )
    return;
  const bytes = fs.readFileSync("data/verified/history/bank.json");
  const bank = artifactSchema.parse(JSON.parse(bytes.toString()));
  const docs = bank.sources.map(
    (s) => s as unknown as Source & { localPath: string },
  );
  for (const s of docs) {
    if (
      !/^data\/pending\/[a-zA-Z0-9_.-]+\.pdf$/.test(s.localPath) ||
      sha(fs.readFileSync(s.localPath)) !== s.sha256
    )
      throw Error("Copia histórica alterada: " + s.id);
    if (
      new Set(s.corroboration!.matches.map((m) => new URL(m.url).hostname))
        .size < 2
    )
      throw Error("Corroboración sin dos proveedores.");
  }
  const sessionSet = new Set(bank.forms.map((f) => f.session));
  if (
    sessionSet.has("2024-09-29") ||
    bank.forms
      .filter((f) => f.year === 2024)
      .some((f) => !["2024-09-28", "2024-10-13"].includes(f.session))
  )
    throw Error("Sesión 2024 suspendida o desconocida.");
  await db.transaction(async (tx) => {
    const previousSources = await readAll<Source>(tx, "sources");
    const previousQuestions = await readAll<Question>(tx, "questions");
    const concepts = await readAll<Concept>(tx, "concepts");
    const legalEvidence = [
      ...JSON.parse(
        fs.readFileSync("data/verified/history/legal-evidence.json", "utf8"),
      ).references,
      ...JSON.parse(
        fs.readFileSync("data/verified/2026-legal-evidence.json", "utf8"),
      ).references,
    ] as {
      id: string;
      lawId: string;
      article: string;
      version: { fecha_publicacion: string; fecha_vigencia: string };
    }[];
    for (const raw of docs) {
      const before = previousSources.find((s) => s.id === raw.id);
      const source: Source = {
        ...raw,
        storageKey: raw.localPath,
        verified: false,
        definitive: false,
        publishedAt: before?.publishedAt || raw.publishedAt || null,
        notes: [before?.notes, raw.notes]
          .filter((v, i, a) => v && a.indexOf(v) === i)
          .join("\n"),
      };
      await put(tx, "sources", source as unknown as Record<string, unknown>);
      await audit(
        tx,
        source.id,
        "corroborate_historical_copy",
        before || null,
        source,
        "pipeline:historical",
      );
    }
    for (const form of bank.forms) {
      if (
        new Set(form.pairs.map((p) => p.a)).size !== 105 ||
        new Set(form.pairs.map((p) => p.b)).size !== 105
      )
        throw Error("Equivalencia histórica no biyectiva.");
      for (const model of form.models) {
        const source = docs.find((s) => s.id === model.sourceId)!,
          key = docs.find((s) => s.id === form.keySourceId)!;
        if (
          !source ||
          !key ||
          source.sha256 !== model.sha256 ||
          key.sha256 !== form.keySha256
        )
          throw Error("Documento/clave incompatible con el cotejo.");
        if (
          form.year === 2025 &&
          sha(fs.readFileSync(model.corroboratingPath)) !==
            source.corroboration!.matches[1].sha256
        )
          throw Error("Copia de contraste 2025 modificada.");
        const exam: Exam = {
          id: `history-exam-${form.year}-${model.model}`,
          year: form.year,
          session: form.session,
          model: model.model,
          heldAt: form.session,
          expectedQuestions: 100,
          sourceId: source.id,
          keySourceId: key.id,
          status: "corroborated_documentary",
          notes:
            form.notes ||
            "Copia secundaria corroborada; situación final por pregunta pendiente.",
        };
        await put(tx, "exams", exam as unknown as Record<string, unknown>);
        for (const row of model.questions) {
          const isA = model.model.endsWith("A"),
            pair = form.pairs.find((p) => (isA ? p.a : p.b) === row.number)!;
          const a = form.models[0].questions.find((q) => q.number === pair.a)!,
            b = form.models[1].questions.find((q) => q.number === pair.b)!;
          if (
            !pair ||
            row.reserve !== row.number > 100 ||
            pair.reserve !== row.reserve ||
            new Set(pair.bOptionToCanonical).size !== 4 ||
            pair.bOptionToCanonical[b.correct] !== a.correct
          )
            throw Error("Reserva, opciones o respuesta discordantes.");
          const compact = (s: string) => s.replace(/\s+/g, "");
          if (
            compact(a.stem) !== compact(b.stem) &&
            !(form.year === 2025 && pair.a === 58 && pair.b === 25)
          )
            throw Error("Enunciados no equivalentes.");
          if (
            pair.bOptionToCanonical.some(
              (i, j) => compact(b.options[j]) !== compact(a.options[i]),
            )
          )
            throw Error("Alternativas no equivalentes.");
          const id = `history-question-${form.year}-${model.model}-${row.number}`;
          const before = previousQuestions.find((q) => q.id === id);
          if (
            before &&
            (before.validation === "validated" ||
              before.classificationMethod === "manual-reviewed")
          )
            continue;
          const c = row.classification;
          if (c.legalVerified) {
            const ref = legalEvidence.find(
              (e) =>
                e.id === c.legalEvidenceId &&
                e.lawId === c.lawId &&
                e.article === c.article,
            );
            if (
              !ref ||
              ref.version.fecha_publicacion >
                form.session.replaceAll("-", "") ||
              ref.version.fecha_vigencia > form.session.replaceAll("-", "")
            )
              throw Error(
                "Referencia normativa histórica sin evidencia o con información futura.",
              );
          }
          const existingConcept = c.concept
            ? concepts.find(
                (v) => normalized(v.name) === normalized(c.concept!),
              )
            : null;
          const conceptId = c.concept
            ? existingConcept?.id ||
              c.conceptId ||
              "concept-" + sha(normalized(c.concept)).slice(0, 20)
            : null;
          if (conceptId && !concepts.some((v) => v.id === conceptId)) {
            const concept: Concept = {
              id: conceptId,
              name: c.concept!,
              topicId: `tema-${String(c.topicNumber).padStart(2, "0")}`,
              description:
                c.conceptEvidence ||
                "Clasificación específica revisada sobre el enunciado histórico.",
            };
            concepts.push(concept);
            await put(
              tx,
              "concepts",
              concept as unknown as Record<string, unknown>,
            );
          }
          const q: Question = {
            id,
            examId: exam.id,
            year: form.year,
            session: form.session,
            form: form.form,
            model: model.model,
            number: row.number,
            printedNumber: row.printedNumber,
            stem: row.stem,
            extractionCorrections: row.extractionCorrections,
            options: row.options,
            correct: row.correct,
            validation: "reviewed",
            topicId: `tema-${String(c.topicNumber).padStart(2, "0")}`,
            conceptId,
            concept: c.concept,
            law: c.law,
            lawId: c.lawId,
            lawVerified: c.lawVerified,
            article: c.article,
            paragraph: c.paragraph,
            legalUrl: c.legalUrl,
            legalVerified: c.legalVerified,
            legalEvidenceId: c.legalEvidenceId,
            legalCheckedAsOf: c.legalVerified ? form.session : null,
            confidence: c.confidence,
            classificationMethod: c.classificationMethod,
            classificationReviewed: c.classificationReviewed,
            validity: "unknown",
            explanation: `Texto y clave cotejados; procedencia secundaria corroborada, sin afirmar autenticidad institucional plena ni ausencia de anulaciones posteriores. Tema: ${c.classificationEvidence}. ${c.conceptEvidence || "Concepto específico pendiente de revisión."}`,
            distractorType: null,
            style: /incorrect|no es|no pertenece/i.test(row.stem)
              ? "negativa"
              : null,
            reserve: row.reserve,
            active: !row.reserve,
            sourceId: source.id,
            keySourceId: key.id,
            sourcePage: row.sourcePage,
            availableAt: form.availableAt,
            literalHash: literalHash(row.stem, row.options),
            optionMap: isA ? [0, 1, 2, 3] : pair.bOptionToCanonical,
            canonicalId: `history-question-${form.year}-${form.form}A-${pair.a}`,
            createdAt: before?.createdAt || bank.computedAt,
          };
          q.documentaryVerification = {
            status: "verified",
            scope: "corroborated_documentary",
            artifactId: bank.id,
            artifactSha256: sha(bytes),
            fingerprint: documentaryFingerprint(q),
            sourceSha256: source.sha256!,
            keySha256: key.sha256!,
            corroborationSha256: corroborationFingerprint(source, key),
            checkedAt: bank.computedAt,
            canonicalNumber: pair.a,
            pairedNumber: isA ? pair.b : pair.a,
            administrativeFinalityConfirmed: false,
            checks: row.checks,
            notes: pair.notes,
          };
          await put(tx, "questions", q as unknown as Record<string, unknown>);
          await tx.run(
            "INSERT INTO answer_entries(exam_id,question_number,correct,cancelled,source_id) VALUES(?,?,?,?,?) ON CONFLICT(exam_id,question_number) DO UPDATE SET correct=excluded.correct,cancelled=excluded.cancelled,source_id=excluded.source_id",
            [exam.id, row.number, row.correct, 0, key.id],
          );
          await audit(
            tx,
            id,
            "historical_documentary_verification",
            before || null,
            q,
            "pipeline:historical",
          );
        }
        await put(tx, "import_jobs", {
          id: "job-" + exam.id,
          sourceId: source.id,
          examId: exam.id,
          kind: "historical_documentary_verification",
          status: "corroborated_documentary",
          errors: [],
          warnings: [
            "105 ocurrencias; 100 ordinarias y 5 reservas inactivas.",
            "Procedencia secundaria explícita; la corroboración entre copias no acredita por sí sola autenticidad institucional ni ausencia de anulaciones posteriores.",
          ],
          createdAt: bank.computedAt,
        });
      }
    }
    const manual = JSON.parse(
      fs.readFileSync("data/verified/history/manual-concepts.json", "utf8"),
    ) as Record<string, { concept: string }>;
    for (const [identity, annotation] of Object.entries(manual)) {
      if (!identity.startsWith("2026-A-")) continue;
      const number = Number(identity.split("-").at(-1));
      const head = previousQuestions.find(
        (q) => q.year === 2026 && q.model === "A" && q.number === number,
      );
      const concept = concepts.find((c) => c.name === annotation.concept);
      if (!head || !concept) continue;
      for (const old of previousQuestions.filter(
        (q) => q.canonicalId === head.canonicalId,
      )) {
        if (
          old.classificationMethod === "manual-reviewed" ||
          old.concept === annotation.concept
        )
          continue;
        const updated: Question = {
          ...old,
          concept: annotation.concept,
          conceptId: concept.id,
          conceptDetail: old.conceptDetail || old.concept,
          classificationMethod: "curated-cross-year",
        };
        await put(
          tx,
          "questions",
          updated as unknown as Record<string, unknown>,
        );
        await audit(
          tx,
          old.id,
          "review_cross_year_concept",
          old,
          updated,
          "pipeline:historical",
        );
      }
    }
    const assessment = JSON.parse(
      fs.readFileSync("data/verified/history/2026-assessment.json", "utf8"),
    );
    const resultSource = previousSources.find(
      (s) => s.id === assessment.sourceId,
    );
    if (resultSource)
      await put(tx, "sources", {
        ...resultSource,
        verified: true,
        sha256: assessment.sha256,
      });
    const originalKey = previousSources.find(
      (s) => s.id === "key-2026-corrected",
    );
    if (originalKey) {
      const updated: Source = {
        ...originalKey,
        answerKeyAssessment: {
          resultsFinalized: true,
          resultsDecisionSourceId: assessment.sourceId,
          annulmentsByQuestion: "not_established",
          conclusion: assessment.conclusion,
        },
      };
      await put(tx, "sources", updated as unknown as Record<string, unknown>);
      await audit(
        tx,
        originalKey.id,
        "assess_final_results_2026",
        originalKey,
        updated,
        "pipeline:historical",
      );
    }
    await tx.run(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
      [version, new Date().toISOString()],
    );
  });
}
