import { createHash } from "node:crypto";
export function normalized(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
// Literal equivalence preserves accents, negations, punctuation and mathematical operators.
export function literalNormalized(s: string) {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}
export function literalHash(stem: string, options: string[]) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        literalNormalized(stem),
        options.map(literalNormalized).sort(),
      ]),
    )
    .digest("hex");
}
const stop = new Set(
  "de la el en los las y a un una del por para que se al es o con su sus como no lo".split(
    " ",
  ),
);
export function tokens(s: string) {
  return normalized(s)
    .split(" ")
    .filter((t) => t.length > 1 && !stop.has(t));
}
/** TF-IDF cosine within this corpus; a suggestion of lexical similarity, never semantic validation. */
export function similarityPairs(
  items: { id: string; text: string; year: number }[],
  threshold = 0.72,
  limit = 150,
) {
  const docs = items.map((q) => tokens(q.text));
  const df = new Map<string, number>();
  docs.forEach((ts) =>
    new Set(ts).forEach((t) => df.set(t, (df.get(t) || 0) + 1)),
  );
  const vectors = docs.map((ts) => {
    const counts = new Map<string, number>();
    ts.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    const v = new Map<string, number>();
    counts.forEach((n, t) =>
      v.set(
        t,
        (1 + Math.log(n)) * Math.log(1 + items.length / (df.get(t) || 1)),
      ),
    );
    return v;
  });
  const norms = vectors.map((v) =>
    Math.sqrt([...v.values()].reduce((a, b) => a + b * b, 0)),
  );
  const results: {
    a: string;
    b: string;
    score: number;
    differentYears: boolean;
  }[] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      if (!norms[i] || !norms[j]) continue;
      let dot = 0;
      vectors[i].forEach((v, t) => (dot += v * (vectors[j].get(t) || 0)));
      const score = dot / (norms[i] * norms[j]);
      if (score >= threshold)
        results.push({
          a: items[i].id,
          b: items[j].id,
          score,
          differentYears: items[i].year !== items[j].year,
        });
    }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
export interface Extracted {
  number: number;
  stem: string;
  options: string[];
  sourcePage: number | null;
  reserve: boolean;
}
export function parseQuestions(text: string): {
  questions: Extracted[];
  warnings: string[];
} {
  // A parser proposes drafts. Page numbers and all four choices require review against the PDF.
  const lines = text.replace(/\r/g, "").split("\n");
  const questions: Extracted[] = [];
  let current: Extracted | null = null;
  let option = -1;
  const flush = () => {
    if (current && current.stem.trim() && current.options.length === 4)
      questions.push({
        ...current,
        stem: current.stem.trim(),
        options: current.options.map((s) => s.trim()),
      });
  };
  for (const line of lines) {
    const head = line.match(/^\s*(\d{1,3})\s*[.)\-]\s+(.+)/);
    if (head) {
      flush();
      current = {
        number: Number(head[1]),
        stem: head[2],
        options: [],
        sourcePage: null,
        reserve: false,
      };
      option = -1;
      continue;
    }
    const choice = line.match(/^\s*([a-dA-D])\s*[.)\-]\s*(.*)/);
    if (choice && current) {
      const index = choice[1].toLowerCase().charCodeAt(0) - 97;
      if (index === current.options.length) {
        current.options.push(choice[2]);
        option = index;
      } else if (index === option) current.options[option] += "\n" + line;
      continue;
    }
    if (current) {
      if (option < 0) current.stem += "\n" + line;
      else current.options[option] += "\n" + line;
    }
  }
  flush();
  const counts = new Map<number, number>();
  questions.forEach((q) =>
    counts.set(q.number, (counts.get(q.number) || 0) + 1),
  );
  const warnings = [
    "La extracción es un borrador. Contrasta secciones, numeración, saltos de página y opciones con el documento original.",
  ];
  if (!questions.length)
    warnings.push(
      "No se han reconocido preguntas con cuatro opciones. Usa OCR local o importa el JSON revisado.",
    );
  if ([...counts.values()].some((n) => n > 1))
    warnings.push(
      "Hay números repetidos: el PDF puede contener varias pruebas. Selecciona sólo conocimientos generales.",
    );
  return { questions, warnings };
}
export function parseAnswerKey(text: string) {
  const entries = new Map<
    number,
    { number: number; correct: number | null; cancelled: boolean }
  >();
  for (const match of text.matchAll(
    /\b(\d{1,3})\s*[.)\-:]?\s*(ANULADA|ANULADO|ANUL\.?|[a-dA-D])\b/gi,
  )) {
    const answer = match[2].toUpperCase();
    const n = Number(match[1]);
    if (n < 1 || n > 300) continue;
    entries.set(n, {
      number: n,
      correct: answer.length === 1 ? answer.charCodeAt(0) - 65 : null,
      cancelled: answer.length > 1,
    });
  }
  return [...entries.values()].sort((a, b) => a.number - b.number);
}
