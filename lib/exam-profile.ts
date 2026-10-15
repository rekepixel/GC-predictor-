import { observedCorpus } from "./analysis";
import type { Dataset, Question } from "./types";
import { normalized } from "./text";

export const FEATURE_VERSION = "observable-style-v1";
export const tokens = (s: string) => normalized(s).split(/\s+/).filter(Boolean);
export function overlap(a: string, b: string) {
  const x = new Set(tokens(a)),
    y = new Set(tokens(b));
  return (
    [...x].filter((v) => y.has(v)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export function questionFeatures(
  q: Pick<
    Question,
    "id" | "stem" | "options" | "topicId" | "conceptId" | "law" | "article"
  > & { paragraph?: string | null },
) {
  const stem = normalized(q.stem),
    words = tokens(q.stem).length;
  const negative =
    /\b(incorrect[ao]s?|fals[ao]s?|excepto)\b/.test(stem) ||
    /\bno (es|son|corresponde|forma|pertenece|se incluye|podra)\b/.test(stem);
  const signals = {
    deadline: /\b(plazo|dias|horas|meses|anos|computo)\b/.test(stem),
    competence:
      /\b(competen|corresponde|funciones|atribu|nombra|designa|presid|depend)/.test(
        stem,
      ),
    definition: /\b(defin|concepto|se entiende|se considera|se denomin)/.test(
      stem,
    ),
    majority: /\b(mayoria|quorum|votos|dos tercios|tres quintos)\b/.test(stem),
    exception: /\b(salvo|excepto|excepcion|no obstante)\b/.test(stem),
    application:
      /\b(supuesto|una persona|un funcionario|un ciudadano|caso|situacion|si una|si un)\b/.test(
        stem,
      ),
    multipleStatements:
      /\b(proposiciones|afirmaciones|enunciados)\b/.test(stem) ||
      /(?:\bI[IVX]*[).]|\b[123][).]).*(?:\bI[IVX]*[).]|\b[234][).])/.test(
        q.stem,
      ),
  };
  const similarities = q.options.flatMap((a, i) =>
    q.options.slice(i + 1).map((b) => overlap(a, b)),
  );
  const optionSimilarity =
    similarities.reduce((a, b) => a + b, 0) / Math.max(1, similarities.length);
  const type = signals.application
    ? "application"
    : signals.multipleStatements
      ? "multiple_statements"
      : signals.deadline
        ? "deadline"
        : signals.majority
          ? "majority"
          : signals.competence
            ? "competence"
            : signals.definition
              ? "definition"
              : signals.exception
                ? "exception"
                : "statement";
  const complexity =
    words +
    q.options.reduce((n, o) => n + tokens(o).length, 0) * 0.35 +
    optionSimilarity * 30 +
    Number(negative) * 8 +
    Number(signals.multipleStatements) * 12;
  return {
    id: q.id,
    topicId: q.topicId,
    conceptId: q.conceptId,
    law: q.law,
    article: q.article,
    paragraph: q.paragraph,
    words,
    characters: q.stem.length,
    negative,
    type,
    signals,
    optionSimilarity,
    distractorSignals: {
      numericVariation:
        new Set(q.options.flatMap((o) => o.match(/\b\d+\b/g) || [])).size > 1,
      absoluteQualifiers:
        q.options.filter((o) =>
          /\b(siempre|nunca|unicamente|exclusivamente|en ningun caso)\b/.test(
            normalized(o),
          ),
        ).length > 0,
      institutionVariation:
        q.options.filter((o) =>
          /\b(congreso|senado|gobierno|ministro|juez|fiscal|tribunal|consejo)\b/.test(
            normalized(o),
          ),
        ).length > 1,
    },
    complexity,
    literalLegislation: "not_checked" as const,
    memorizationProxy: !signals.application,
    version: FEATURE_VERSION,
  };
}
type Feature = ReturnType<typeof questionFeatures>;
export function quantile(values: number[], p: number) {
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))] || 0;
}
export function profile(
  data: Dataset,
  beforeYear = 2027,
  recentWeight = 1,
  recentFrom = 2025,
) {
  const questions = observedCorpus(data).questions.filter(
    (q) => q.year < beforeYear,
  );
  const sessions = new Map<string, Question[]>();
  for (const q of questions) {
    const key = `${q.year}|${q.session}`;
    sessions.set(key, [...(sessions.get(key) || []), q]);
  }
  const units = [...sessions].map(([id, qs]) => ({
    id,
    year: qs[0].year,
    questions: qs,
    weight: qs[0].year >= recentFrom ? recentWeight : 1,
  }));
  const denominator = units.reduce((n, u) => n + u.weight, 0);
  const questionWeights = Object.fromEntries(
    units.flatMap((u) =>
      u.questions.map((q) => [
        q.id,
        u.weight / u.questions.length / Math.max(Number.EPSILON, denominator),
      ]),
    ),
  );
  const features = questions.map(questionFeatures);
  const weightedQuantile = (p: number) => {
    let sum = 0;
    for (const f of [...features].sort((a, b) => a.complexity - b.complexity)) {
      sum += questionWeights[f.id];
      if (sum >= p) return f.complexity;
    }
    return features.at(-1)?.complexity || 0;
  };
  const rates = (key: (f: Feature) => string) => {
    const out: Record<string, number> = {};
    for (const u of units)
      for (const q of u.questions) {
        const k = key(questionFeatures(q));
        out[k] =
          (out[k] || 0) +
          u.weight / u.questions.length / Math.max(Number.EPSILON, denominator);
      }
    return out;
  };
  const conceptSessions: Record<string, string[]> = {};
  for (const u of units)
    for (const c of new Set(
      u.questions.map((q) => q.conceptId).filter(Boolean) as string[],
    )) {
      conceptSessions[c] ??= [];
      conceptSessions[c].push(u.id);
    }
  return {
    version: FEATURE_VERSION,
    beforeYear,
    recentWeight,
    recentFrom,
    questionIds: questions.map((q) => q.id),
    questions: questions.length,
    sessions: units.map((u) => ({
      id: u.id,
      year: u.year,
      count: u.questions.length,
      weight: u.weight,
    })),
    features,
    questionWeights,
    answerPositions: Object.fromEntries(
      [0, 1, 2, 3].map((i) => [
        String(i),
        questions
          .filter((q) => q.correct === i)
          .reduce((sum, q) => sum + questionWeights[q.id], 0),
      ]),
    ),
    topics: rates((f) => f.topicId || "unclassified"),
    formats: rates((f) => f.type),
    polarity: rates((f) =>
      f.negative ? "negative" : "positive_or_unspecified",
    ),
    difficultyThresholds: [weightedQuantile(1 / 3), weightedQuantile(2 / 3)],
    conceptSessions,
    recurrenceShare: units.reduce(
      (sum, u) =>
        sum +
        ((u.weight / Math.max(denominator, Number.EPSILON)) *
          u.questions.filter(
            (q) =>
              q.conceptId && (conceptSessions[q.conceptId]?.length || 0) > 1,
          ).length) /
          u.questions.length,
      0,
    ),
    limitations: [
      "Clasificación de estilo por señales observables; no es revisión semántica humana.",
      "La complejidad textual no estima una tasa real de acierto ni dificultad psicométrica.",
      "Literalidad normativa sin cotejo de fragmento se informa como no comprobada.",
      "Cada sesión aporta una unidad; formas diferentes de una misma fecha se promedian dentro de esa sesión.",
    ],
  };
}
export function allocate(shares: Record<string, number>, total: number) {
  const entries = Object.entries(shares)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const sum = entries.reduce((n, [, v]) => n + v, 0),
    result: Record<string, number> = {};
  for (const [key, v] of entries)
    result[key] = Math.floor((v / Math.max(sum, 1e-10)) * total);
  const remainder = entries
    .map(([key, v]) => ({
      key,
      r: (v / Math.max(sum, 1e-10)) * total - result[key],
    }))
    .sort((a, b) => b.r - a.r || a.key.localeCompare(b.key));
  const remaining = total - Object.values(result).reduce((a, b) => a + b, 0);
  if (!remainder.length && total) throw Error("Distribución vacía.");
  for (let i = 0; i < remaining; i++)
    result[remainder[i % remainder.length].key]++;
  return result;
}
export function blueprint(
  data: Dataset,
  seed: string,
  beforeYear = 2027,
  recentWeight = 1,
) {
  const p = profile(data, beforeYear, recentWeight);
  if (!p.questions)
    throw Error("No hay preguntas documentales anteriores para planificar.");
  const topics = allocate(p.topics, 100),
    reserveTopics = allocate(p.topics, 5);
  const slots: {
    number: number;
    reserve: boolean;
    topicId: string;
    format: string;
    negative: boolean;
    complexityBand: string;
  }[] = [];
  for (const [reserve, quotas] of [
    [false, topics],
    [true, reserveTopics],
  ] as const)
    for (const [topicId, n] of Object.entries(quotas)) {
      const features = p.features.filter((f) => f.topicId === topicId),
        counts: Record<string, number> = {};
      for (const f of features)
        counts[f.type] = (counts[f.type] || 0) + p.questionWeights[f.id];
      const formats = Object.entries(allocate(counts, n)).flatMap(
        ([key, count]) => Array(count).fill(key) as string[],
      );
      const negatives = Math.round(
        (features
          .filter((f) => f.negative)
          .reduce((n, f) => n + p.questionWeights[f.id], 0) /
          Math.max(
            Number.EPSILON,
            features.reduce((n, f) => n + p.questionWeights[f.id], 0),
          )) *
          n,
      );
      const bands: Record<string, number> = {};
      for (const f of features) {
        const band =
          f.complexity <= p.difficultyThresholds[0]
            ? "low"
            : f.complexity <= p.difficultyThresholds[1]
              ? "medium"
              : "high";
        bands[band] = (bands[band] || 0) + p.questionWeights[f.id];
      }
      const bandSlots = Object.entries(allocate(bands, n)).flatMap(
        ([key, count]) => Array(count).fill(key) as string[],
      );
      for (let i = 0; i < n; i++)
        slots.push({
          number: slots.length + 1,
          reserve,
          topicId,
          format: formats[i],
          negative: i < negatives,
          complexityBand: bandSlots[i],
        });
    }
  const formats: Record<string, number> = {};
  for (const s of slots.filter((s) => !s.reserve))
    formats[s.format] = (formats[s.format] || 0) + 1;
  return {
    version: 1,
    seed,
    targetYear: beforeYear,
    createdAt: new Date().toISOString(),
    referenceSyllabus: "syllabus-2026",
    syllabus2027: "not_verified",
    slots,
    ordinary: 100,
    reserves: 5,
    alternatives: 4,
    topics,
    reserveTopics,
    formats,
    negative: slots.filter((s) => !s.reserve && s.negative).length,
    literalLegislation: { status: "not_identified", target: null },
    difficultyThresholds: p.difficultyThresholds,
    recurringConceptTarget: Math.round(p.recurrenceShare * 100),
    answerPositionCounts: allocate(p.answerPositions, 100),
    reserveAnswerPositionCounts: allocate(p.answerPositions, 5),
    conceptPlan: {
      recurringRules: Math.round(p.recurrenceShare * 100),
      otherSyllabusRules: 100 - Math.round(p.recurrenceShare * 100),
      maximumQuestionsPerRule: 1,
      maximumPerArticle: 2,
      historicalPool: data.concepts
        .filter((c) => p.features.some((f) => f.conceptId === c.id))
        .map((c) => ({
          id: c.id,
          name: c.name,
          topicId: c.topicId,
          sessions: p.conceptSessions[c.id] || [],
          normalizedWeight: p.features
            .filter((f) => f.conceptId === c.id)
            .reduce((n, f) => n + p.questionWeights[f.id], 0),
          referenceQuestionIds: p.features
            .filter((f) => f.conceptId === c.id)
            .map((f) => f.id),
        })),
      note: "La recurrencia exige vincular la misma regla conceptual; compartir norma o artículo no acredita esa relación. Los conceptos nuevos se eligen dentro del programa y del tema planificado.",
    },
    historicalProfile: p,
    rationale:
      "Distribución por sesión, redondeo por restos mayores. Los pesos recientes son una preferencia exploratoria, sin ajuste contra el año objetivo. Las reservas se planifican aparte.",
    predictionProbability: null,
    coverageStatus: "provisional_2026_program",
  };
}
const l1 = (a: Record<string, number>, b: Record<string, number>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].reduce(
    (s, k) => s + Math.abs((a[k] || 0) - (b[k] || 0)),
    0,
  ) / 2;
export function examRetrospective(data: Dataset) {
  return [2025, 2026].map((year) => {
    const train = profile(data, year),
      held = observedCorpus(data).questions.filter((q) => q.year === year);
    if (!train.questions || !held.length)
      return { year, status: "insufficient_data", predictionProbability: null };
    const targetProfile = profile(
      { ...data, questions: data.questions.filter((q) => q.year === year) },
      year + 1,
    );
    const themes = Object.keys(train.topics),
      uniform = Object.fromEntries(themes.map((t) => [t, 1 / themes.length]));
    const conceptCounts = new Map<string, number>();
    for (const f of train.features)
      if (f.conceptId)
        conceptCounts.set(
          f.conceptId,
          (conceptCounts.get(f.conceptId) || 0) + 1,
        );
    const top = [...conceptCounts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 25)
      .map(([id]) => id);
    const actual = new Set(held.map((q) => q.conceptId).filter(Boolean)),
      hits = top.filter((id) => actual.has(id));
    let state = 2027 + year;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) | 0;
      return (state >>> 0) / 4294967296;
    };
    const tvs: number[] = [],
      randomHits: number[] = [],
      allConcepts = [...conceptCounts.keys()].sort();
    for (let repeat = 0; repeat < 200; repeat++) {
      const sample: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        const t = themes[Math.floor(random() * themes.length)];
        sample[t] = (sample[t] || 0) + 0.01;
      }
      tvs.push(l1(sample, targetProfile.topics));
      const pool = [...allConcepts];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      randomHits.push(pool.slice(0, 25).filter((c) => actual.has(c)).length);
    }
    const rawCounts: Record<string, number> = {};
    for (const f of train.features) {
      const topic = f.topicId || "unclassified";
      rawCounts[topic] = (rawCounts[topic] || 0) + 1 / train.questions;
    }
    return {
      year,
      status: "diagnostic_reconstruction",
      trainingQuestions: train.questions,
      trainingIds: train.questionIds,
      targetQuestions: held.length,
      topicTotalVariation: {
        sessionHistorical: l1(train.topics, targetProfile.topics),
        rawHistoricalFrequency: l1(rawCounts, targetProfile.topics),
        uniformSyllabus: l1(uniform, targetProfile.topics),
        randomSyllabus: {
          seed: 2027 + year,
          repetitions: 200,
          mean: tvs.reduce((a, b) => a + b, 0) / 200,
          p05: quantile(tvs, 0.05),
          p95: quantile(tvs, 0.95),
        },
      },
      formatTotalVariation: l1(train.formats, targetProfile.formats),
      negativeShareDifference: Math.abs(
        (train.polarity.negative || 0) - (targetProfile.polarity.negative || 0),
      ),
      textComplexity: {
        trainingMedian: quantile(
          train.features.map((f) => f.complexity),
          0.5,
        ),
        targetMedian: quantile(
          targetProfile.features.map((f) => f.complexity),
          0.5,
        ),
      },
      top25Concepts: {
        selected: top,
        observedHits: hits,
        hitCount: hits.length,
        frequencyBaselineHits: hits.length,
        randomMeanHits: randomHits.reduce((a, b) => a + b, 0) / 200,
        uniqueTargetConcepts: actual.size,
      },
      generatedExamQuality:
        "not_evaluable_without_bank_available_before_target",
      predictionProbability: null,
      limitations: [
        "Solo se usan preguntas anteriores al año objetivo en la planificación.",
        "Los conceptos tienen taxonomía retrospectiva, no congelada antes del examen: sus coincidencias son diagnósticas y no validación predictiva estricta.",
        "Reproducir temas o estilo no prueba anticipación de reglas ni calidad de preguntas inéditas.",
      ],
    };
  });
}
