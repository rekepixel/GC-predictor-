export type Validation = "draft" | "reviewed" | "validated" | "cancelled";
export interface Source {
  id: string;
  title: string;
  url: string;
  year: number | null;
  session: string;
  model: string;
  kind: "exam" | "answer_key" | "syllabus" | "call" | "announcement";
  origin: "official" | "secondary" | "manual";
  access: string;
  consultedAt: string;
  publishedAt: string | null;
  notes: string;
  sha256: string | null;
  storageKey: string | null;
  definitive: boolean;
  verified: boolean;
  answerKeyStatus?:
    "official_corrected_current" | "corroborated_current_copy" | "superseded";
  corroboration?: {
    status: "cross_source_consistent";
    method:
      "byte_identity" | "question_text_identity_except_publisher_watermark";
    checkedAt: string;
    matches: { url: string; sha256: string }[];
    primaryAvailability: string;
    authenticityLimitation: string;
  };
  answerKeyAssessment?: {
    resultsFinalized: boolean;
    resultsDecisionSourceId: string;
    annulmentsByQuestion: "not_established" | "established";
    conclusion: string;
  };
}
export interface DocumentaryVerification {
  status: "verified";
  scope: "official_corrected_documentary" | "corroborated_documentary";
  artifactId: string;
  artifactSha256: string;
  fingerprint: string;
  sourceSha256: string;
  keySha256: string;
  corroborationSha256?: string;
  checkedAt: string;
  canonicalNumber: number;
  pairedNumber: number;
  administrativeFinalityConfirmed: false;
  checks: string[];
  notes: string[];
}
export interface Exam {
  id: string;
  year: number;
  session: string;
  model: string;
  heldAt: string | null;
  expectedQuestions: number;
  sourceId: string;
  keySourceId: string | null;
  status: string;
  notes: string;
}
export interface Question {
  id: string;
  examId: string;
  year: number;
  session: string;
  model: string;
  number: number;
  printedNumber?: number | null;
  stem: string;
  options: string[];
  correct: number | null;
  validation: Validation;
  topicId: string | null;
  conceptId: string | null;
  concept: string | null;
  conceptDetail?: string | null;
  subject?: string | null;
  subconcept?: string | null;
  conceptReview?: {
    method:
      | "assistant_content_review"
      | "assistant_blind_content_review"
      | "preserved_previous_curation"
      | "owner_review";
    artifactId?: string;
    artifactSha256?: string;
    confidence: "high" | "medium" | "unassessed";
    legacyConfidence?: "high" | "medium";
    scope: "focused" | "keyed_statement_focus";
    independentHumanReview: boolean;
    normStatus: string;
    reviewedAt: string;
    inputSha256?: string;
  } | null;
  taxonomy?: {
    version: string;
    matterId: string;
    matter: string;
    ruleId: string;
    rule: string;
    subaspectId: string;
    subaspect: string;
  } | null;
  classificationAudit?: {
    artifactId: string;
    artifactSha256: string;
    inputSha256: string;
    status: "assisted_pending_manual" | "owner_reviewed";
    previousConcept: string;
    previousSubconcept: string;
    legacyConfidence: "high" | "medium";
    flags: string[];
    risk: number;
    priorityOrder: number;
    initialManualCohort: boolean;
    randomSample: boolean;
    polarity: string;
    scope: string;
    reason: string;
  } | null;
  contentRelations?: {
    id: string;
    kind: "same_rule" | "same_method" | "related_subaspects";
    name: string;
    questionIds: string[];
    reason: string;
  }[];
  answerIssue?: {
    id: string;
    status: "unresolved";
    description: string;
    sourceUrl: string;
    lawVersion: string;
  } | null;
  extractionCorrections?: {
    field: string;
    from: string;
    to: string;
    sourcePage: number;
    evidence: string;
    reason: string;
  }[];
  law: string | null;
  article: string | null;
  paragraph: string | null;
  legalUrl: string | null;
  legalVerified: boolean;
  lawVerified?: boolean;
  lawId?: string | null;
  legalEvidenceId?: string | null;
  legalCheckedAsOf?: string | null;
  documentaryVerification?: DocumentaryVerification | null;
  documentaryEligible?: boolean;
  verificationState?:
    | "documentary_checked"
    | "answer_and_annulments_confirmed"
    | "additional_checks_pending";
  form?: string;
  confidence: number | null;
  classificationMethod: string;
  classificationReviewed: boolean;
  validity: string;
  explanation: string;
  distractorType: string | null;
  style: string | null;
  reserve: boolean;
  active: boolean;
  sourceId: string;
  keySourceId: string | null;
  sourcePage: number | null;
  availableAt: string | null;
  literalHash: string;
  optionMap: number[];
  canonicalId: string;
  createdAt: string;
}
export interface Concept {
  id: string;
  name: string;
  topicId: string | null;
  description: string;
}
export interface Topic {
  id: string;
  number: number;
  title: string;
  syllabusId: string;
}
export interface Syllabus {
  id: string;
  year: number;
  effectiveFrom: string | null;
  sourceId: string;
  status: string;
  notes: string;
}
export interface LawChange {
  id: string;
  law: string;
  article: string | null;
  effectiveFrom: string;
  publishedAt: string;
  sourceUrl: string;
  summary: string;
  affectedConceptId: string | null;
  reviewed: boolean;
}
export interface ImportJob {
  id: string;
  sourceId: string;
  examId: string | null;
  kind: string;
  status: string;
  errors: string[];
  warnings: string[];
  createdAt: string;
}
export interface Attempt {
  id: string;
  createdAt: string;
  questionIds: string[];
  answers: Record<string, number>;
  correct: number;
  total: number;
  topicResults: Record<string, { correct: number; total: number }>;
}
export interface Dataset {
  sources: Source[];
  exams: Exam[];
  questions: Question[];
  concepts: Concept[];
  topics: Topic[];
  syllabi: Syllabus[];
  changes: LawChange[];
  jobs: ImportJob[];
  attempts: Attempt[];
}
export interface Weights {
  historical: number;
  recent: number;
  persistence: number;
  syllabus: number;
  legislation: number;
  recentFrom: number;
}
export const DEFAULT_WEIGHTS: Weights = {
  historical: 0.3,
  recent: 0.3,
  persistence: 0.2,
  syllabus: 0.15,
  legislation: 0.05,
  recentFrom: 2023,
};
