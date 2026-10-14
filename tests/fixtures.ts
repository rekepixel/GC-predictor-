// SYNTHETIC TEST FIXTURES ONLY. Never imported by application/production scripts.
import type { Dataset, Question, Source } from "../lib/types";
import { literalHash } from "../lib/text";
export function fixture(): Dataset {
  const sources: Source[] = [
    {
      id: "exam-source",
      title: "SYNTHETIC TEST EXAM",
      url: "https://www.boe.es/test-fixture",
      year: 2023,
      session: "test",
      model: "A",
      kind: "exam",
      origin: "official",
      access: "downloaded",
      consultedAt: "2026-01-01",
      publishedAt: "2023-01-01",
      notes: "SYNTHETIC",
      sha256: null,
      storageKey: null,
      definitive: false,
      verified: true,
    },
    {
      id: "key-source",
      title: "SYNTHETIC TEST KEY",
      url: "https://www.boe.es/test-key",
      year: 2023,
      session: "test",
      model: "A",
      kind: "answer_key",
      origin: "official",
      access: "downloaded",
      consultedAt: "2026-01-01",
      publishedAt: "2023-01-01",
      notes: "SYNTHETIC",
      sha256: null,
      storageKey: null,
      definitive: true,
      verified: true,
    },
  ];
  return {
    sources,
    exams: [],
    questions: [],
    concepts: [
      {
        id: "alpha",
        name: "SYNTHETIC Alpha",
        topicId: "test-topic",
        description: "",
      },
      {
        id: "beta",
        name: "SYNTHETIC Beta",
        topicId: "test-topic",
        description: "",
      },
    ],
    topics: [
      {
        id: "test-topic",
        number: 1,
        title: "SYNTHETIC topic",
        syllabusId: "test-syllabus",
      },
    ],
    syllabi: [],
    changes: [],
    jobs: [],
    attempts: [],
  };
}
export function question(
  id: string,
  overrides: Partial<Question> = {},
): Question {
  const stem = "SYNTHETIC TEST question " + id;
  const options = ["one", "two", "three", "four"];
  return {
    id,
    examId: "exam-" + id,
    year: 2023,
    session: "test",
    model: "A",
    number: 1,
    stem,
    options,
    correct: 0,
    validation: "validated",
    topicId: "test-topic",
    conceptId: "alpha",
    concept: "SYNTHETIC Alpha",
    law: null,
    article: null,
    paragraph: null,
    legalUrl: null,
    legalVerified: false,
    confidence: 1,
    classificationMethod: "manual-reviewed",
    classificationReviewed: true,
    validity: "current",
    explanation: "",
    distractorType: null,
    style: "conceptual",
    reserve: false,
    active: true,
    sourceId: "exam-source",
    keySourceId: "key-source",
    sourcePage: 1,
    availableAt: "2023-01-01",
    literalHash: literalHash(stem, options),
    optionMap: [0, 1, 2, 3],
    canonicalId: id,
    createdAt: "2023-01-01T00:00:00Z",
    ...overrides,
  };
}
