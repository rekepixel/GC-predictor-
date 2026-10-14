import { observedCorpus, validatedCorpus } from "./analysis";
import { isDocumentaryVerified } from "./documentary";
import { normalized } from "./text";
import type { Dataset } from "./types";
export function articleProfiles(data: Dataset) {
  const questions = observedCorpus(data).questions.filter(
    (q) => q.legalVerified && q.law && q.article && /^\d/.test(q.article),
  );
  const keys = [
    ...new Set(questions.map((q) => `${normalized(q.law!)}|${q.article}`)),
  ];
  return keys
    .map((id) => {
      const rows = questions.filter(
        (q) => `${normalized(q.law!)}|${q.article}` === id,
      );
      const sample = rows[0];
      return {
        id,
        law: sample.law!,
        lawId: sample.lawId || null,
        article: sample.article!,
        url: sample.legalUrl,
        checkedAsOf: sample.legalCheckedAsOf || null,
        count: rows.length,
        years: [...new Set(rows.map((q) => q.year))].sort(),
        concepts: [...new Set(rows.map((q) => q.concept).filter(Boolean))],
        history: rows.map((q) => ({
          questionId: q.id,
          canonicalId: q.canonicalId,
          year: q.year,
          session: q.session,
          number: q.number,
          model: q.model,
          paragraph: q.paragraph,
          concept: q.concept,
          sourceId: q.sourceId,
          keySourceId: q.keySourceId,
          legalUrl: q.legalUrl,
          checkedAsOf: q.legalCheckedAsOf || null,
          answerIssue: q.answerIssue || null,
          finality:
            q.validation === "validated"
              ? "final_confirmed"
              : q.documentaryVerification?.scope ||
                "official_corrected_documentary",
          variants: data.questions
            .filter(
              (other) =>
                other.canonicalId === q.canonicalId &&
                (other.validation === "validated" ||
                  isDocumentaryVerified(other, data)),
            )
            .map((other) => ({
              id: other.id,
              model: other.model,
              number: other.number,
              sourcePage: other.sourcePage,
              sourceId: other.sourceId,
            })),
        })),
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.law.localeCompare(b.law) ||
        a.article.localeCompare(b.article, undefined, { numeric: true }),
    );
}
export function validationByYear(data: Dataset) {
  const observed = observedCorpus(data).questions,
    final = validatedCorpus(data).questions;
  const years = [
    ...new Set([
      ...Array.from({ length: 10 }, (_, i) => 2017 + i),
      ...data.exams.map((e) => e.year),
    ]),
  ].sort((a, b) => b - a);
  return years.map((year) => {
    const rows = data.questions.filter((q) => q.year === year),
      exams = data.exams.filter((e) => e.year === year),
      verified = rows.filter(
        (q) => isDocumentaryVerified(q, data) || q.validation === "validated",
      );
    const verifiedOrdinary = observed.filter((q) => q.year === year),
      canonicalReserves = new Set(
        verified.filter((q) => q.reserve).map((q) => q.canonicalId),
      );
    return {
      year,
      models: exams.length,
      sessions: new Set(exams.map((e) => e.session)).size,
      importedRecords: rows.length,
      documentaryVerifiedRecords: verified.length,
      verifiedOrdinary: verifiedOrdinary.length,
      definitiveOrdinary: final.filter((q) => q.year === year).length,
      primaryOrdinary: verifiedOrdinary.filter(
        (q) =>
          q.documentaryVerification?.scope === "official_corrected_documentary",
      ).length,
      corroboratedOrdinary: verifiedOrdinary.filter(
        (q) => q.documentaryVerification?.scope === "corroborated_documentary",
      ).length,
      validSessions: new Set(verifiedOrdinary.map((q) => q.session)).size,
      forms: new Set(
        verifiedOrdinary.map((q) => q.form ?? q.model.replace(/[AB]$/, "")),
      ).size,
      conceptsPending: verifiedOrdinary.filter((q) => !q.conceptId).length,
      referencesPending: verifiedOrdinary.filter((q) => !q.legalVerified)
        .length,
      pendingImportedRecords: rows.filter(
        (q) =>
          q.validation !== "validated" &&
          q.validation !== "cancelled" &&
          !isDocumentaryVerified(q, data),
      ).length,
      discardedCancelledRecords: rows.filter(
        (q) => q.validation === "cancelled",
      ).length,
      duplicateModelRecords:
        verified.filter((q) => !q.reserve).length - verifiedOrdinary.length,
      inactiveReserveQuestions: canonicalReserves.size,
      finalityPending: verifiedOrdinary.filter(
        (q) => q.validation !== "validated",
      ).length,
      missingExamDocuments: !exams.length,
      secondaryDocumentsPending: data.sources.filter(
        (s) => s.year === year && s.origin === "secondary" && s.storageKey,
      ).length,
      expectedQuestionsWhenMissing: null,
      notes: !exams.length
        ? "No hay cuadernillo importado; se desconoce el número de preguntas pendientes."
        : verifiedOrdinary.length
          ? "Cotejo documental admitido para descripción; procedencia, respuestas definitivas y anulaciones por pregunta se informan aparte."
          : "Cuadernillos registrados sin cotejo documental completo.",
    };
  });
}
