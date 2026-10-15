import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { audit, getDB, type DB } from "./db";
import { dataset, initialize } from "./store";
import { blueprint, questionFeatures, overlap, tokens } from "./exam-profile";
import { isDocumentaryVerified } from "./documentary";
import type { Dataset, Question } from "./types";
import { normalized } from "./text";

export const SCORING = {
  id: "call-2026-knowledge-v1",
  year: 2026,
  ordinary: 100,
  reserves: 5,
  alternatives: 4,
  wrongPenalty: 1 / 3,
  minimum: 50,
  maximum: 100,
  sourceUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-9982",
  clauses: ["6.1.1.c", "7.3", "7.6"],
  checkedAt: "2026-10-15",
  sourceSha256:
    "9f6b802314ac857a984621f57bdf452f88aed1da0ec81050de2838b9632428cd",
  formulaImageSha256:
    "e891003343d03cb2527a49bc2f3e6de1aa33c1cbb658b877e331a707cdfc5961",
  formula: "P = (100 / T) × (A − E / (4 − 1)); T = 100",
  timingNote:
    "Los 140 minutos de la convocatoria abarcan todas las pruebas teórico-prácticas. No se atribuye ese límite solo a conocimientos.",
};
export interface GeneratedQuestion {
  id: string;
  stem: string;
  options: string[];
  correct: number;
  topicId: string;
  concept: string;
  conceptId: string;
  subaspect: string;
  law: string | null;
  article: string | null;
  paragraph: string | null;
  explanation: string;
  referenceDate: string;
  historicalReferences: string[];
  format: string;
  difficulty: "low" | "medium" | "high";
  evidence: {
    url: string;
    sha256: string;
    storageKey: string;
    quote: string;
    publishedAt: string;
    effectiveFrom: string;
    checkedAsOf: string;
    syllabusQuote: string;
    syllabusPage: number;
  }[];
  optionChecks: {
    index: number;
    verdict: "supported" | "contradicted";
    reason: string;
    quote: string;
    evidenceIndex: number;
  }[];
  quality: {
    state: "draft" | "documentary_checked" | "rejected";
    method: string;
    humanReviewed: boolean;
    issues: string[];
    checkedAt: string;
    sourceFingerprintsChecked: boolean;
    syllabusChecked: boolean;
    temporalChecked: boolean;
    uniqueAnswerChecked: boolean;
  };
}
export interface ExamItem {
  id: string;
  number: number;
  reserve: boolean;
  origin: "official" | "generated";
  stem: string;
  options: string[];
  correct: number | null;
  topicId: string | null;
  concept: string | null;
  conceptId: string | null;
  law: string | null;
  article: string | null;
  explanation: string;
  legalUrl: string | null;
  sourceId: string | null;
  keySourceId: string | null;
  issue: string | null;
  definitive: boolean;
  cancelled: boolean;
  cancellationAccredited: boolean;
  evidence?: GeneratedQuestion["evidence"];
  humanReviewed?: boolean;
  historicalReferences?: string[];
  referenceDate?: string;
  difficulty?: string;
}
export interface ExamRun {
  id: string;
  mode: "historical" | "generated";
  title: string;
  createdAt: string;
  updatedAt: string;
  status: "in_progress" | "finished";
  revision: number;
  blueprintId: string | null;
  officialExamId: string | null;
  items: ExamItem[];
  answers: Record<string, number>;
  flagged: string[];
  currentIndex: number;
  elapsedSeconds: number;
  scoring: typeof SCORING;
  result: ReturnType<typeof gradeExam> | null;
}
function rng(seed: string) {
  let n = createHash("sha256").update(seed).digest().readUInt32BE(0);
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], r: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function generatedProblems(q: GeneratedQuestion, data: Dataset) {
  const problems = [...q.quality.issues];
  if (q.options.length !== 4 || new Set(q.options.map(normalized)).size !== 4)
    problems.push("Cuatro alternativas distintas obligatorias.");
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
    problems.push("Clave fuera de rango.");
  if (!data.topics.some((t) => t.id === q.topicId && t.number <= 23))
    problems.push("Tema fuera del programa de conocimientos.");
  if (
    q.evidence.length === 0 ||
    q.evidence.some(
      (e) =>
        !/^https:\/\//.test(e.url) ||
        !/^[a-f0-9]{64}$/.test(e.sha256) ||
        e.quote.length < 20 ||
        !e.syllabusQuote ||
        !e.syllabusPage,
    )
  )
    problems.push("Fuente o inclusión en programa sin acreditar.");
  if (
    q.evidence.some(
      (e) =>
        e.publishedAt > q.referenceDate ||
        e.effectiveFrom > q.referenceDate ||
        e.checkedAsOf < q.referenceDate,
    )
  )
    problems.push("Fecha normativa no aplicable.");
  if (
    q.optionChecks.length !== 4 ||
    new Set(q.optionChecks.map((c) => c.index)).size !== 4 ||
    q.optionChecks.filter((c) => c.verdict === "supported").length !== 1 ||
    q.optionChecks.find((c) => c.index === q.correct)?.verdict !== "supported"
  )
    problems.push(
      "No se ha contrastado una única respuesta y tres distractores.",
    );
  if (
    q.optionChecks.some(
      (c) =>
        !q.evidence[c.evidenceIndex] ||
        c.reason.length < 12 ||
        !c.quote ||
        !normalized(q.evidence[c.evidenceIndex].quote).includes(
          normalized(c.quote),
        ),
    )
  )
    problems.push(
      "La comprobación de alternativas no está anclada en evidencia.",
    );
  if (
    !q.historicalReferences.length ||
    q.historicalReferences.some(
      (id) =>
        !data.questions.some(
          (x) => x.id === id && isDocumentaryVerified(x, data),
        ),
    )
  )
    problems.push("Referencias históricas de estilo no verificadas.");
  const flags = q.quality;
  if (
    !flags.sourceFingerprintsChecked ||
    !flags.syllabusChecked ||
    !flags.temporalChecked ||
    !flags.uniqueAnswerChecked
  )
    problems.push("Quedan controles documentales o semánticos pendientes.");
  const close = data.questions
    .filter(
      (x) => x.year >= 2023 && !x.reserve && isDocumentaryVerified(x, data),
    )
    .some(
      (x) =>
        normalized(x.stem) === normalized(q.stem) ||
        (overlap(x.stem, q.stem) > 0.82 &&
          overlap(x.options.join(" "), q.options.join(" ")) > 0.7),
    );
  if (close)
    problems.push("Redacción demasiado próxima a una pregunta histórica.");
  return [...new Set(problems)];
}
function generatedItem(
  q: GeneratedQuestion,
  number: number,
  reserve: boolean,
  r: () => number,
  targetPosition?: number,
): ExamItem {
  const order = shuffle([0, 1, 2, 3], r);
  if (targetPosition !== undefined) {
    const current = order.indexOf(q.correct);
    [order[current], order[targetPosition]] = [
      order[targetPosition],
      order[current],
    ];
  }
  return {
    id: q.id,
    number,
    reserve,
    origin: "generated",
    stem: q.stem,
    options: order.map((i) => q.options[i]),
    correct: order.indexOf(q.correct),
    topicId: q.topicId,
    concept: q.concept,
    conceptId: q.conceptId,
    law: q.law,
    article: q.article,
    explanation: q.explanation,
    legalUrl: q.evidence[0]?.url || null,
    sourceId: null,
    keySourceId: null,
    issue: null,
    definitive: false,
    cancelled: false,
    cancellationAccredited: false,
    evidence: q.evidence,
    humanReviewed: q.quality.humanReviewed,
    historicalReferences: q.historicalReferences,
    referenceDate: q.referenceDate,
    difficulty: q.difficulty,
  };
}
export function assembleGenerated(
  plan: ReturnType<typeof blueprint>,
  bank: GeneratedQuestion[],
  data: Dataset,
) {
  const r = rng(plan.seed),
    eligible = bank.filter(
      (q) =>
        q.quality.state === "documentary_checked" &&
        !generatedProblems(q, data).length,
    );
  const used = new Set<string>(),
    aspects = new Set<string>(),
    usedConcepts = new Set<string>(),
    items: ExamItem[] = [],
    shortages: { topicId: string; needed: number; available: number }[] = [];
  const classifyBand = (score: number) =>
    score <= plan.difficultyThresholds[0]
      ? "low"
      : score <= plan.difficultyThresholds[1]
        ? "medium"
        : "high";
  const candidateFeatures = new Map(
    eligible.map((q) => [q.id, questionFeatures(q)]),
  );
  const positions = (counts: Record<string, number>) =>
    shuffle(
      Object.entries(counts).flatMap(
        ([position, n]) => Array(n).fill(Number(position)) as number[],
      ),
      r,
    );
  const ordinaryPositions = positions(plan.answerPositionCounts);
  const reservePositions = positions(plan.reserveAnswerPositionCounts);
  for (const slot of plan.slots) {
    const pool = shuffle(
      eligible.filter((q) => {
        const f = candidateFeatures.get(q.id)!;
        return (
          q.topicId === slot.topicId &&
          !used.has(q.id) &&
          !aspects.has(q.subaspect) &&
          !usedConcepts.has(q.conceptId) &&
          f.type === slot.format &&
          f.negative === slot.negative &&
          classifyBand(f.complexity) === slot.complexityBand
        );
      }),
      r,
    );
    const q = pool.find(
      (q) =>
        !items.some((x) => overlap(x.stem, q.stem) > 0.82) &&
        !(
          q.law &&
          q.article &&
          items.filter((x) => x.law === q.law && x.article === q.article)
            .length >= 2
        ),
    );
    if (q) {
      const index = slot.reserve
        ? slot.number - plan.ordinary - 1
        : slot.number - 1;
      items.push(
        generatedItem(
          q,
          slot.number,
          slot.reserve,
          r,
          (slot.reserve ? reservePositions : ordinaryPositions)[index],
        ),
      );
      used.add(q.id);
      aspects.add(q.subaspect);
      usedConcepts.add(q.conceptId);
    }
  }
  for (const topicId of new Set(plan.slots.map((s) => s.topicId))) {
    const needed = plan.slots.filter((s) => s.topicId === topicId).length,
      available = items.filter((q) => q.topicId === topicId).length;
    if (available < needed) shortages.push({ topicId, needed, available });
  }
  const formatCounts: Record<string, number> = {};
  for (const q of items.filter((x) => !x.reserve)) {
    const f = questionFeatures(q).type;
    formatCounts[f] = (formatCounts[f] || 0) + 1;
  }
  const formatsMissing = Object.entries(plan.formats).filter(
    ([f, n]) => (formatCounts[f] || 0) < n,
  );
  const actualFeatures = items.filter((x) => !x.reserve).map(questionFeatures),
    negativeCount = actualFeatures.filter((f) => f.negative).length;
  const band = (score: number) =>
    score <= plan.difficultyThresholds[0]
      ? "low"
      : score <= plan.difficultyThresholds[1]
        ? "medium"
        : "high";
  const plannedBands: Record<string, number> = {},
    actualBands: Record<string, number> = {};
  for (const slot of plan.slots.filter((s) => !s.reserve))
    plannedBands[slot.complexityBand] =
      (plannedBands[slot.complexityBand] || 0) + 1;
  for (const f of actualFeatures) {
    const b = band(f.complexity);
    actualBands[b] = (actualBands[b] || 0) + 1;
  }
  const qualityBlocks = [
    ...formatsMissing.map(
      ([f, n]) =>
        `Formato ${f}: objetivo ${n}, seleccionado ${formatCounts[f] || 0}.`,
    ),
    ...(negativeCount !== plan.negative
      ? [
          `Enunciados negativos: objetivo ${plan.negative}, seleccionados ${negativeCount}.`,
        ]
      : []),
    ...Object.entries(plannedBands)
      .filter(([b, n]) => (actualBands[b] || 0) < n)
      .map(
        ([b, n]) =>
          `Complejidad textual ${b}: objetivo ${n}, seleccionadas ${actualBands[b] || 0}.`,
      ),
  ];
  const actualRecurring = items.filter(
    (q) =>
      !q.reserve &&
      q.conceptId &&
      (plan.historicalProfile.conceptSessions[q.conceptId]?.length || 0) > 1,
  ).length;
  if (actualRecurring !== plan.recurringConceptTarget)
    qualityBlocks.push(
      `Reglas recurrentes acreditadas en varias sesiones: objetivo ${plan.recurringConceptTarget}, seleccionadas ${actualRecurring}.`,
    );
  return {
    status: shortages.length || qualityBlocks.length ? "blocked" : "ready",
    items,
    shortages,
    qualityBlocks,
    eligible: eligible.length,
    bankTotal: bank.length,
    formatConformance: {
      planned: plan.formats,
      actual: formatCounts,
      negative: { planned: plan.negative, actual: negativeCount },
      complexity: { planned: plannedBands, actual: actualBands },
      recurrence: {
        planned: plan.recurringConceptTarget,
        actual: actualRecurring,
      },
      status: qualityBlocks.length
        ? "insufficient_bank"
        : "observable_constraints_met",
    },
    notes: [
      "Las alternativas se barajan con semilla reproducible: no se impone una secuencia A/B/C/D.",
      "La novedad se comprueba frente al banco disponible; no certifica que nadie haya publicado antes una redacción equivalente.",
      "La revisión documental asistida no es certificación jurídica ni revisión humana independiente.",
    ],
  };
}
export function historicalExams(data: Dataset) {
  return data.exams
    .filter((e) => e.year >= 2023 && e.year <= 2026)
    .map((e) => {
      const qs = data.questions.filter((q) => q.examId === e.id),
        ordinary = qs.filter(
          (q) => !q.reserve && isDocumentaryVerified(q, data),
        );
      return {
        ...e,
        ordinary: ordinary.length,
        reserves: qs.filter((q) => q.reserve && isDocumentaryVerified(q, data))
          .length,
        available: ordinary.length === 100,
        documentaryOnly: ordinary.some((q) => q.validation !== "validated"),
        issues: qs
          .filter((q) => q.answerIssue)
          .map((q) => ({
            number: q.number,
            description: q.answerIssue!.description,
          })),
      };
    })
    .filter((e) => e.available);
}
export function gradeExam(items: ExamItem[], answers: Record<string, number>) {
  const ordinary = items.filter((q) => !q.reserve),
    reserves = items
      .filter((q) => q.reserve)
      .sort((a, b) => a.number - b.number);
  const effective: ExamItem[] = [],
    substitutions: { cancelledId: string; reserveId: string }[] = [],
    excluded: string[] = [];
  let ri = 0;
  for (const q of ordinary) {
    if (q.cancelled && q.cancellationAccredited) {
      const reserve = reserves[ri++];
      if (reserve) {
        effective.push(reserve);
        substitutions.push({ cancelledId: q.id, reserveId: reserve.id });
      } else excluded.push(q.id);
    } else effective.push(q);
  }
  let correct = 0,
    wrong = 0,
    blank = 0,
    uncertainAnswered = 0;
  const byTopic: Record<
      string,
      { correct: number; wrong: number; blank: number }
    > = {},
    errorsByConcept: Record<string, number> = {};
  for (const q of effective) {
    const answer = answers[q.id],
      topic = q.topicId || "unclassified";
    byTopic[topic] ??= { correct: 0, wrong: 0, blank: 0 };
    if (answer === undefined) {
      blank++;
      byTopic[topic].blank++;
    } else if (answer === q.correct) {
      correct++;
      byTopic[topic].correct++;
    } else {
      wrong++;
      byTopic[topic].wrong++;
      if (!q.issue)
        errorsByConcept[q.concept || "Sin clasificación"] =
          (errorsByConcept[q.concept || "Sin clasificación"] || 0) + 1;
    }
    if (q.issue && answer !== undefined) uncertainAnswered++;
  }
  const rawScore = correct - wrong / 3,
    score = Math.max(0, Math.min(100, rawScore));
  const clean = effective.filter((q) => !q.issue),
    knownC = clean.filter(
      (q) => answers[q.id] !== undefined && answers[q.id] === q.correct,
    ).length,
    knownE = clean.filter(
      (q) => answers[q.id] !== undefined && answers[q.id] !== q.correct,
    ).length;
  const lower = Math.max(0, knownC - knownE / 3 - uncertainAnswered / 3),
    upper = Math.min(100, Math.max(0, knownC - knownE / 3 + uncertainAnswered));
  const provisional =
    effective.some((q) => !q.definitive) || excluded.length > 0;
  return {
    correct,
    wrong,
    blank,
    rawScore,
    score,
    minimum: 50,
    apt: score >= 50,
    aptLabel:
      score >= 50
        ? "Apto orientativo en conocimientos"
        : "No apto orientativo en conocimientos",
    provisional,
    scoreRange: { lower, upper },
    uncertainAnswered,
    unresolved: effective.filter((q) => q.issue).map((q) => q.id),
    byTopic,
    errorsByConcept,
    substitutions,
    excluded,
    graded: effective.length,
    unusedReserves: reserves.length - substitutions.length,
    warning: provisional
      ? "Calificación de práctica con la clave documental disponible. No equivale a una calificación oficial ni acredita todas las anulaciones."
      : "Calificación de práctica; la aptitud aquí se refiere solo a conocimientos.",
    scoring: SCORING,
  };
}
export function publicRun(run: ExamRun) {
  return {
    ...run,
    items: run.items.map((q) =>
      run.status === "finished"
        ? q
        : {
            id: q.id,
            number: q.number,
            reserve: q.reserve,
            origin: q.origin,
            stem: q.stem,
            options: q.options,
            topicId: q.topicId,
          },
    ),
    result: run.status === "finished" ? run.result : null,
  };
}
export async function readRun(id: string, db: DB = getDB()) {
  const rows = await db.query<{ payload: string }>(
    "SELECT payload FROM exam_sessions WHERE id=?",
    [id],
  );
  if (!rows.length) throw Error("Simulacro no encontrado.");
  return JSON.parse(rows[0].payload) as ExamRun;
}
export async function startHistorical(examId: string) {
  await initialize();
  const db = getDB(),
    d = await dataset();
  const exam = historicalExams(d).find((e) => e.id === examId);
  if (!exam) throw Error("No está disponible el modelo completo cotejado.");
  const entries = await db.query<{
    question_number: number;
    cancelled: number;
    source_id: string;
  }>(
    "SELECT question_number,cancelled,source_id FROM answer_entries WHERE exam_id=?",
    [examId],
  );
  const items: ExamItem[] = d.questions
    .filter((q) => q.examId === examId)
    .sort(
      (a, b) => Number(a.reserve) - Number(b.reserve) || a.number - b.number,
    )
    .map((q) => {
      const key = d.sources.find((s) => s.id === q.keySourceId),
        entry = entries.find(
          (e) =>
            e.question_number === q.number && e.source_id === q.keySourceId,
        );
      return {
        id: q.id,
        number: q.number,
        reserve: q.reserve,
        origin: "official",
        stem: q.stem,
        options: q.options,
        correct: q.correct,
        topicId: q.topicId,
        concept: q.concept,
        conceptId: q.conceptId,
        law: q.law,
        article: q.article,
        explanation:
          q.explanation ||
          "No consta explicación jurídica revisada; consulta la plantilla y la referencia original.",
        legalUrl: q.legalUrl,
        sourceId: q.sourceId,
        keySourceId: q.keySourceId,
        issue: q.answerIssue?.description || null,
        definitive:
          q.validation === "validated" && !!key?.verified && !!key.definitive,
        cancelled: q.validation === "cancelled",
        cancellationAccredited: !!(
          entry?.cancelled &&
          key?.verified &&
          key.definitive
        ),
      };
    });
  if (
    items.filter((q) => !q.reserve).length !== 100 ||
    items.filter((q) => q.reserve).length !== 5 ||
    items.some((q) => q.correct === null && !q.cancellationAccredited)
  )
    throw Error(
      "El ejercicio no dispone de las 100 preguntas y 5 reservas con claves completas.",
    );
  return createRun(
    {
      mode: "historical",
      title: `Examen ${exam.year} · ${exam.heldAt || exam.session} · modelo ${exam.model}`,
      officialExamId: examId,
      blueprintId: null,
      items,
    },
    db,
  );
}
async function createRun(
  input: Pick<
    ExamRun,
    "mode" | "title" | "officialExamId" | "blueprintId" | "items"
  >,
  db: DB,
) {
  const now = new Date().toISOString();
  const run: ExamRun = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "in_progress",
    revision: 1,
    answers: {},
    flagged: [],
    currentIndex: 0,
    elapsedSeconds: 0,
    scoring: SCORING,
    result: null,
  };
  await db.run(
    "INSERT INTO exam_sessions(id,payload,revision,status,created_at) VALUES(?,?,1,?,?)",
    [run.id, JSON.stringify(run), run.status, now],
  );
  return publicRun(run);
}
export async function startGenerated(input: {
  seed?: string;
  recentWeight?: number;
}) {
  await initialize();
  const db = getDB(),
    d = await dataset(),
    id = randomUUID();
  const plan = blueprint(
    d,
    input.seed || randomUUID(),
    2027,
    input.recentWeight ?? 1,
  );
  // Persist the plan before selecting questions. Failed generation remains inspectable.
  await db.run(
    "INSERT INTO exam_blueprints(id,payload,created_at) VALUES(?,?,?)",
    [id, JSON.stringify({ ...plan, status: "planned" }), plan.createdAt],
  );
  const bank = (
    await db.query<{ payload: string }>(
      "SELECT payload FROM generated_questions ORDER BY id",
    )
  ).map((r) => JSON.parse(r.payload) as GeneratedQuestion);
  const assembled = assembleGenerated(plan, bank, d);
  await db.run("UPDATE exam_blueprints SET payload=? WHERE id=?", [
    JSON.stringify({
      ...plan,
      status: assembled.status,
      shortages: assembled.shortages,
      selectedIds: assembled.items.map((q) => q.id),
      formatConformance: assembled.formatConformance,
    }),
    id,
  ]);
  if (assembled.status !== "ready")
    return {
      blueprintId: id,
      plan: {
        ...plan,
        historicalProfile: { ...plan.historicalProfile, features: undefined },
      },
      ...assembled,
      items: undefined,
    };
  return {
    status: "ready",
    blueprintId: id,
    run: await createRun(
      {
        mode: "generated",
        title: "Posible examen 2027 · práctica orientativa",
        officialExamId: null,
        blueprintId: id,
        items: assembled.items,
      },
      db,
    ),
  };
}
export const saveRunSchema = z.object({
  revision: z.number().int().positive(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  flagged: z.array(z.string()).max(105),
  currentIndex: z.number().int().min(0).max(104),
  elapsedSeconds: z
    .number()
    .int()
    .min(0)
    .max(7 * 86400),
});
export class ExamConflict extends Error {}
export async function updateRun(id: string, input: unknown, finish = false) {
  const changes = saveRunSchema.parse(input),
    db = getDB();
  return db.transaction(async (tx) => {
    const before = await readRun(id, tx);
    if (before.status !== "in_progress" || changes.revision !== before.revision)
      throw new ExamConflict(
        "El intento ha cambiado en otro dispositivo. Recarga antes de continuar.",
      );
    const ids = new Set(before.items.map((q) => q.id));
    if (
      Object.keys(changes.answers).some((key) => !ids.has(key)) ||
      changes.flagged.some((key) => !ids.has(key)) ||
      changes.currentIndex >= before.items.length
    )
      throw Error("La respuesta, marca o posición no pertenece al examen.");
    const updated: ExamRun = {
      ...before,
      ...changes,
      elapsedSeconds: Math.max(before.elapsedSeconds, changes.elapsedSeconds),
      revision: before.revision + 1,
      updatedAt: new Date().toISOString(),
      status: finish ? "finished" : "in_progress",
    };
    if (finish) updated.result = gradeExam(updated.items, updated.answers);
    const rows = await tx.query(
      "UPDATE exam_sessions SET payload=?,revision=?,status=? WHERE id=? AND revision=? RETURNING id",
      [
        JSON.stringify(updated),
        updated.revision,
        updated.status,
        id,
        before.revision,
      ],
    );
    if (!rows.length)
      throw new ExamConflict(
        "Otro dispositivo guardó el intento antes. Tus datos no se han sobrescrito.",
      );
    if (finish)
      await audit(
        tx,
        id,
        "finish_exam",
        { revision: before.revision },
        { result: updated.result, mode: updated.mode },
      );
    return publicRun(updated);
  });
}
