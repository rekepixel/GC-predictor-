import { createHash } from "node:crypto";
import type { Dataset, Question } from "./types";
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
/** A content-verification gate. It never upgrades an answer key to administratively final. */
export function isDocumentaryVerified(
  q: Question,
  data: Pick<Dataset, "sources">,
) {
  const v = q.documentaryVerification;
  if (
    !v ||
    v.status !== "verified" ||
    v.scope !== "official_corrected_documentary" ||
    q.validation === "draft" ||
    q.validation === "cancelled" ||
    q.correct === null ||
    q.options.length !== 4
  )
    return false;
  const source = data.sources.find((s) => s.id === q.sourceId),
    key = data.sources.find((s) => s.id === q.keySourceId);
  return !!(
    source?.verified &&
    source.origin === "official" &&
    key?.verified &&
    key.origin === "official" &&
    key.answerKeyStatus === "official_corrected_current" &&
    source.sha256 === v.sourceSha256 &&
    key.sha256 === v.keySha256 &&
    documentaryFingerprint(q) === v.fingerprint
  );
}
