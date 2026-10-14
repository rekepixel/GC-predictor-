import {
  DEFAULT_WEIGHTS,
  type Dataset,
  type Question,
  type Weights,
} from "./types";
import { normalized, literalNormalized, similarityPairs } from "./text";
export function validatedCorpus(data: Dataset) {
  const groups = new Map<string, Question[]>();
  for (const q of data.questions) {
    if (q.validation !== "validated" || !q.active) continue;
    const src = data.sources.find((s) => s.id === q.sourceId),
      key = data.sources.find((s) => s.id === q.keySourceId);
    if (
      src?.origin !== "official" ||
      !src.verified ||
      !key?.definitive ||
      !key.verified ||
      q.correct === null
    )
      continue;
    const group = groups.get(q.canonicalId) || [];
    group.push(q);
    groups.set(q.canonicalId, group);
  }
  const questions: Question[] = [];
  const conflicts: string[] = [];
  for (const [id, group] of groups) {
    const answers = new Set(
      group.map((q) => literalNormalized(q.options[q.correct!])),
    );
    if (answers.size > 1) {
      conflicts.push(id);
      continue;
    }
    questions.push(
      [...group].sort(
        (a, b) =>
          Number(b.classificationReviewed) - Number(a.classificationReviewed) ||
          Number(b.legalVerified) - Number(a.legalVerified) ||
          a.model.localeCompare(b.model),
      )[0],
    );
  }
  return { questions, conflicts };
}
const sessionKey = (q: Question) => `${q.year}|${q.session}`;
const rate = (n: number, d: number) => (d ? n / d : 0);
function counts(items: Question[], label: (q: Question) => string | null) {
  const result = new Map<string, number>();
  items.forEach((q) => {
    const key = label(q);
    if (key) result.set(key, (result.get(key) || 0) + 1);
  });
  return [...result]
    .map(([name, count]) => ({ name, count, share: rate(count, items.length) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function frequencies(data: Dataset) {
  const { questions, conflicts } = validatedCorpus(data);
  const topicName = (q: Question) =>
    q.classificationReviewed && q.topicId
      ? data.topics.find((t) => t.id === q.topicId)?.title || null
      : null;
  const years = [...new Set(questions.map((q) => q.year))].sort();
  return {
    questions: questions.length,
    occurrences: data.questions.length,
    validatedOccurrences: data.questions.filter(
      (q) => q.validation === "validated",
    ).length,
    drafts: data.questions.filter(
      (q) => q.validation !== "validated" && q.validation !== "cancelled",
    ).length,
    conflicts,
    years,
    examinations: new Set(questions.map(sessionKey)).size,
    topics: counts(questions, topicName),
    laws: counts(questions, (q) => (q.legalVerified ? q.law : null)),
    articles: counts(questions, (q) =>
      q.legalVerified && q.law && q.article
        ? `${q.law} · art. ${q.article}${q.paragraph ? " · " + q.paragraph : ""}`
        : null,
    ),
    concepts: counts(questions, (q) =>
      q.classificationReviewed ? q.concept : null,
    ),
    bySession: [...new Set(questions.map(sessionKey))].sort().map((key) => {
      const subset = questions.filter((q) => sessionKey(q) === key);
      return {
        label: key.replace("|", " · "),
        questions: subset.length,
        topics: counts(subset, topicName),
        styles: counts(subset, (q) => q.style),
        distractors: counts(subset, (q) => q.distractorType),
      };
    }),
    byYear: years.map((year) => {
      const subset = questions.filter((q) => q.year === year);
      return {
        year,
        questions: subset.length,
        exams: new Set(subset.map(sessionKey)).size,
        topics: counts(subset, topicName),
        classified: subset.filter((q) => q.classificationReviewed && q.topicId)
          .length,
        styles: counts(subset, (q) => q.style),
        distractors: counts(subset, (q) => q.distractorType),
      };
    }),
    styles: counts(questions, (q) => q.style),
    distractors: counts(questions, (q) => q.distractorType),
    classified: questions.filter((q) => q.classificationReviewed && q.topicId)
      .length,
    legalVerified: questions.filter((q) => q.legalVerified).length,
    coverage: rate(
      new Set(
        questions
          .filter((q) => q.classificationReviewed && q.topicId)
          .map((q) => q.topicId),
      ).size,
      data.topics.filter((t) => t.number <= 23).length,
    ),
  };
}
export interface Priority {
  id: string;
  name: string;
  topicId: string | null;
  count: number;
  years: number[];
  lastYear: number;
  historicalRate: number;
  recentRate: number;
  persistence: number;
  score: number;
  components: {
    historical: number;
    recent: number;
    persistence: number;
    syllabus: number;
    legislation: number;
  };
  evidence: string[];
  warnings: string[];
}
export function rank(
  data: Dataset,
  input: Partial<Weights> = {},
  targetYear = 2027,
  cutoff = `${targetYear}-01-01`,
  kind: "concept" | "article" = "concept",
) {
  const w = { ...DEFAULT_WEIGHTS, ...input };
  const total =
    w.historical + w.recent + w.persistence + w.syllabus + w.legislation;
  if (total <= 0) throw Error("Los pesos deben sumar más de cero.");
  const corpus = validatedCorpus(data).questions.filter(
    (q) => q.year < targetYear && (!q.availableAt || q.availableAt < cutoff),
  );
  const units = [...new Set(corpus.map(sessionKey))];
  const historicalYears = [...new Set(corpus.map((q) => q.year))];
  const recent = corpus.filter((q) => q.year >= w.recentFrom);
  const recentUnits = [...new Set(recent.map(sessionKey))];
  const keyOf = (q: Question) =>
    kind === "concept"
      ? q.classificationReviewed
        ? q.conceptId
        : null
      : q.legalVerified && q.law && q.article
        ? normalized(q.law) + "|" + q.article + "|" + (q.paragraph || "")
        : null;
  const ids = [...new Set(corpus.map(keyOf).filter((s): s is string => !!s))];
  const unitRate = (matches: Question[], base: Question[], u: string[]) =>
    u.length
      ? u.reduce(
          (sum, key) =>
            sum +
            rate(
              matches.filter((q) => sessionKey(q) === key).length,
              base.filter((q) => sessionKey(q) === key).length,
            ),
          0,
        ) / u.length
      : 0;
  const raw = ids.map((id) => {
    const qs = corpus.filter((q) => keyOf(q) === id),
      years = [...new Set(qs.map((q) => q.year))].sort();
    const sample = qs[0];
    const name =
      kind === "concept"
        ? sample.concept!
        : sample.law +
          " · art. " +
          sample.article +
          (sample.paragraph ? " · " + sample.paragraph : "");
    const topic = sample.topicId
      ? data.topics.find((t) => t.id === sample.topicId)
      : null;
    const syllabus = topic
      ? data.syllabi.find((s) => s.id === topic.syllabusId)
      : null;
    const source = syllabus
      ? data.sources.find((s) => s.id === syllabus.sourceId)
      : null;
    const syllabusKnown = !!(
      syllabus?.effectiveFrom &&
      syllabus.effectiveFrom < cutoff &&
      source?.publishedAt &&
      source.publishedAt < cutoff &&
      syllabus.status === "verified" &&
      topic?.number &&
      topic.number <= 23
    );
    const lawChange = data.changes.some(
      (c) =>
        c.reviewed &&
        c.publishedAt < cutoff &&
        c.effectiveFrom < cutoff &&
        c.publishedAt >= `${targetYear - 2}-01-01` &&
        (c.affectedConceptId === id ||
          (sample.law &&
            normalized(c.law) === normalized(sample.law) &&
            (!c.article || c.article === sample.article))),
    );
    const warnings = [];
    if (years.length < 3)
      warnings.push("Pocos años observados; prioridad exploratoria.");
    if (qs.some((q) => !q.availableAt))
      warnings.push(
        "Fecha de disponibilidad incompleta: no utilizable en retrospectiva estricta.",
      );
    if (!syllabusKnown)
      warnings.push("Relevancia curricular no verificada para esta fecha.");
    if (
      targetYear === 2027 &&
      !data.syllabi.some((s) => s.year === 2027 && s.status === "verified")
    )
      warnings.push(
        "Temario 2027 pendiente; usa 2026 como referencia provisional.",
      );
    if (sample.validity !== "current")
      warnings.push(
        "Vigencia normativa pendiente o afectada: revisa la versión legal.",
      );
    return {
      id,
      name,
      topicId: sample.topicId,
      count: qs.length,
      years,
      lastYear: Math.max(...years),
      historicalRate: unitRate(qs, corpus, units),
      recentRate: unitRate(
        qs.filter((q) => q.year >= w.recentFrom),
        recent,
        recentUnits,
      ),
      persistence: rate(years.length, historicalYears.length),
      syllabus: syllabusKnown ? 1 : 0,
      legislation: lawChange ? 1 : 0,
      evidence: qs.map((q) => q.id),
      warnings,
    };
  });
  const maxHistorical = Math.max(0, ...raw.map((r) => r.historicalRate)),
    maxRecent = Math.max(0, ...raw.map((r) => r.recentRate));
  const priorities: Priority[] = raw
    .map((r) => {
      const components = {
        historical: rate(r.historicalRate, maxHistorical),
        recent: rate(r.recentRate, maxRecent),
        persistence: r.persistence,
        syllabus: r.syllabus,
        legislation: r.legislation,
      };
      const score =
        (100 *
          (components.historical * w.historical +
            components.recent * w.recent +
            components.persistence * w.persistence +
            components.syllabus * w.syllabus +
            components.legislation * w.legislation)) /
        total;
      return { ...r, components, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.count - a.count || a.name.localeCompare(b.name),
    );
  return {
    priorities,
    weights: w,
    trainingQuestions: corpus.length,
    trainingYears: historicalYears,
    probability: null,
    probabilityStatus:
      "No se ha entrenado ni calibrado un modelo probabilístico. La puntuación es una heurística de estudio.",
    formula:
      "100 × suma(peso × componente) / suma(pesos). Frecuencias: media de proporciones por examen; frecuencia y presencia reciente se escalan por el máximo del corpus. Persistencia: años observados / años cubiertos. Temario y cambios: indicadores documentados.",
  };
}
export function seededShuffle<T>(items: T[], seed: number) {
  let state = seed >>> 0;
  const rand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function wilson(success: number, total: number) {
  if (!total) return [0, 0];
  const z = 1.96,
    p = success / total,
    d = 1 + (z * z) / total,
    mid = (p + (z * z) / (2 * total)) / d,
    half =
      (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
      d;
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}
export function backtest(
  data: Dataset,
  weights: Partial<Weights> = {},
  k = 10,
  seed = 2027,
) {
  const corpus = validatedCorpus(data).questions;
  const rows = [2024, 2025, 2026].map((year) => {
    const targets = corpus.filter((q) => q.year === year);
    const dates = data.exams
      .filter((e) => e.year === year && e.heldAt)
      .map((e) => e.heldAt!)
      .sort();
    const cutoff = dates[0] || `${year}-01-01`;
    const training = corpus.filter(
      (q) => q.year < year && q.availableAt && q.availableAt < cutoff,
    );
    const trainData = { ...data, questions: training };
    const ranking = rank(trainData, weights, year, cutoff);
    const target = targets.filter(
      (q) => q.classificationReviewed && q.conceptId,
    );
    const trueConcepts = new Set(target.map((q) => q.conceptId!));
    const universe = ranking.priorities.map((r) => r.id);
    const effectiveK = Math.min(k, universe.length);
    const metrics = (ids: string[]) => {
      const hit = ids.filter((id) => trueConcepts.has(id));
      return {
        hits: hit.length,
        precision: rate(hit.length, ids.length),
        conceptCoverage: rate(hit.length, trueConcepts.size),
        questionCoverage: rate(
          target.filter((q) => ids.includes(q.conceptId!)).length,
          target.length,
        ),
        coverageInterval: wilson(hit.length, trueConcepts.size),
        byTopic: [...new Set(target.map((q) => q.topicId))].map((topicId) => {
          const qs = target.filter((q) => q.topicId === topicId);
          return {
            topicId,
            questions: qs.length,
            covered: qs.filter((q) => ids.includes(q.conceptId!)).length,
            coverage: rate(
              qs.filter((q) => ids.includes(q.conceptId!)).length,
              qs.length,
            ),
          };
        }),
      };
    };
    const heuristic = metrics(
      ranking.priorities.slice(0, effectiveK).map((r) => r.id),
    );
    const frequency = metrics(
      [...ranking.priorities]
        .sort(
          (a, b) =>
            b.historicalRate - a.historicalRate || a.name.localeCompare(b.name),
        )
        .slice(0, effectiveK)
        .map((r) => r.id),
    );
    const draws = Array.from({ length: 200 }, (_, i) =>
      metrics(
        seededShuffle(universe, seed + year * 1000 + i).slice(0, effectiveK),
      ),
    );
    const random = draws[0];
    const meanRandom =
      draws.reduce((sum, m) => sum + m.conceptCoverage, 0) / draws.length;
    const reason = !targets.length
      ? "No hay preguntas definitivas validadas en el año objetivo."
      : !target.length
        ? "Falta clasificación conceptual revisada."
        : !training.length
          ? "No hay entrenamiento anterior con fechas de publicación verificadas."
          : !universe.length
            ? "No hay conceptos históricos revisados."
            : null;
    const eligible = !reason;
    return {
      year,
      cutoff,
      status: eligible ? "evaluated" : "insufficient",
      reason,
      k: effectiveK,
      requestedK: k,
      trainingQuestions: training.length,
      excludedUndated: corpus.filter((q) => q.year < year && !q.availableAt)
        .length,
      targetQuestions: targets.length,
      classifiedTargetQuestions: target.length,
      targetConcepts: trueConcepts.size,
      unseenConcepts: [...trueConcepts].filter((id) => !universe.includes(id))
        .length,
      heuristic: eligible ? heuristic : null,
      frequency: eligible ? frequency : null,
      random: eligible ? random : null,
      randomMeanCoverage: eligible ? meanRandom : null,
      beatsReferences: eligible
        ? heuristic.conceptCoverage > frequency.conceptCoverage &&
          heuristic.conceptCoverage > meanRandom
        : null,
    };
  });
  const evaluated = rows.filter((r) => r.status === "evaluated");
  return {
    rows,
    k,
    seed,
    randomDraws: 200,
    probability: null,
    status: !evaluated.length
      ? "Sin evidencia suficiente para evaluar."
      : evaluated.every((r) => r.beatsReferences)
        ? "La heurística supera las referencias en las particiones disponibles; esto no demuestra generalización ni calibración."
        : "La heurística no supera ambas referencias en todas las particiones. No debe presentarse como predicción fiable.",
    limitations: [
      "Sólo se entrena con convocatorias anteriores y fuentes cuya publicación precede al examen objetivo. Las fechas desconocidas se excluyen.",
      "Los conceptos del año objetivo no amplían el universo del ranking de entrenamiento. No se ajustan pesos usando el examen objetivo.",
      "La referencia aleatoria toma el mismo número de conceptos del universo histórico, con semilla fija y 200 repeticiones.",
      "La precisión usa conceptos únicos del top-k; la cobertura se informa por conceptos y preguntas. Intervalos Wilson orientativos; las preguntas no son independientes.",
      "Las etiquetas conceptuales son anotaciones retrospectivas revisadas; no constituyen una reconstrucción completa de lo que el opositor sabía entonces.",
      "Con pocos años, sin un último conjunto externo y con pesos elegidos por el usuario, no se emiten probabilidades calibradas.",
    ],
  };
}
export function patterns(data: Dataset, weights: Partial<Weights> = {}) {
  const qs = validatedCorpus(data).questions;
  const groups = new Map<string, Question[]>();
  qs.forEach((q) => {
    const g = groups.get(q.literalHash) || [];
    g.push(q);
    groups.set(q.literalHash, g);
  });
  const literals = [...groups.values()]
    .filter((g) => new Set(g.map((q) => q.year)).size > 1)
    .map((g) => ({
      ids: g.map((q) => q.id),
      stem: g[0].stem,
      years: [...new Set(g.map((q) => q.year))].sort(),
    }));
  const concepts = rank(data, weights).priorities.filter(
    (p) => p.years.length > 1,
  );
  const latest = Math.max(0, ...qs.map((q) => q.year));
  const dormant = rank(data, weights).priorities.filter(
    (p) => latest - p.lastYear >= 3,
  );
  const similar = similarityPairs(
    qs.slice(0, 1000).map((q) => ({ id: q.id, text: q.stem, year: q.year })),
    0.72,
  );
  return {
    literals,
    concepts,
    dormant,
    similar,
    similarityMethod:
      "Similitud léxica TF-IDF/coseno sobre enunciados, umbral 0,72. Requiere revisión humana; no confirma equivalencia conceptual.",
    truncated: qs.length > 1000,
    styles: frequencies(data).styles,
    distractors: frequencies(data).distractors,
  };
}
