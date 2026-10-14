import { createHash } from "node:crypto";
import type { Dataset, Question, Source } from "./types";
import { literalNormalized } from "./text";
export function documentaryFingerprint(
  q: Pick<
    Question,
    | "stem"
    | "options"
    | "correct"
    | "sourceId"
    | "keySourceId"
    | "canonicalId"
    | "optionMap"
    | "reserve"
    | "number"
    | "year"
    | "session"
    | "model"
    | "examId"
  >,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        literalNormalized(q.stem),
        q.options.map(literalNormalized),
        q.correct,
        q.sourceId,
        q.keySourceId,
        q.canonicalId,
        q.optionMap,
        q.reserve,
        q.number,
        q.year,
        q.session,
        q.model,
        q.examId,
      ]),
    )
    .digest("hex");
}
export function corroborationFingerprint(source: Source, key: Source) {
  return createHash("sha256")
    .update(JSON.stringify([source.corroboration, key.corroboration]))
    .digest("hex");
}
/** A content-verification gate. It never upgrades an answer key to administratively final. */
export function isDocumentaryVerified(
  q: Question,
  data: Pick<Dataset, "sources">,
) {
  const v = q.documentaryVerification;
  if (
    !v ||
    v.status !== "verified" ||
    !["official_corrected_documentary", "corroborated_documentary"].includes(
      v.scope,
    ) ||
    q.validation === "draft" ||
    q.validation === "cancelled" ||
    q.correct === null ||
    q.options.length !== 4
  )
    return false;
  const source = data.sources.find((s) => s.id === q.sourceId),
    key = data.sources.find((s) => s.id === q.keySourceId);
  const consistentCopy = (s: typeof source) => {
    try {
      return !!(
        s?.origin === "secondary" &&
        !s.definitive &&
        s.corroboration?.status === "cross_source_consistent" &&
        s.corroboration.matches.length >= 2 &&
        new Set(s.corroboration.matches.map((m) => new URL(m.url).hostname))
          .size >= 2 &&
        s.corroboration.matches.some((m) => m.sha256 === s.sha256) &&
        (s.corroboration.method !== "byte_identity" ||
          s.corroboration.matches.every((m) => m.sha256 === s.sha256))
      );
    } catch {
      return false;
    }
  };
  const provenance =
    v.scope === "official_corrected_documentary"
      ? source?.verified &&
        source.origin === "official" &&
        key?.verified &&
        key.origin === "official" &&
        key.answerKeyStatus === "official_corrected_current"
      : consistentCopy(source) &&
        consistentCopy(key) &&
        key?.answerKeyStatus === "corroborated_current_copy" &&
        source &&
        key &&
        v.corroborationSha256 === corroborationFingerprint(source, key);
  return !!(
    provenance &&
    source &&
    key &&
    source.sha256 === v.sourceSha256 &&
    key.sha256 === v.keySha256 &&
    documentaryFingerprint(q) === v.fingerprint
  );
}
export function verificationState(
  q: Question,
  data: Pick<Dataset, "sources">,
): NonNullable<Question["verificationState"]> {
  const source = data.sources.find((s) => s.id === q.sourceId),
    key = data.sources.find((s) => s.id === q.keySourceId);
  if (
    q.validation === "validated" &&
    source?.verified &&
    source.origin === "official" &&
    key?.verified &&
    key.origin === "official" &&
    key.definitive &&
    q.correct !== null
  )
    return "answer_and_annulments_confirmed";
  return isDocumentaryVerified(q, data)
    ? "documentary_checked"
    : "additional_checks_pending";
}
