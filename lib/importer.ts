import { z } from "zod";
import { getDB, put, audit, type DB } from "./db";
import { dataset, initialize } from "./store";
import {
  literalHash,
  normalized,
  literalNormalized,
  parseQuestions,
  parseAnswerKey,
} from "./text";
import type { Source, Exam, Question, ImportJob, Dataset } from "./types";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida");
export const sourceSchema = z.object({
  id: z.string().max(150).optional(),
  title: z.string().min(3).max(300),
  url: z.string().url().or(z.literal("")),
  year: z.number().int().min(1900).max(2100).nullable(),
  session: z.string().min(1).max(150),
  model: z.string().max(20),
  kind: z.enum(["exam", "answer_key", "syllabus", "call", "announcement"]),
  origin: z.enum(["official", "secondary", "manual"]),
  publishedAt: date.nullable().default(null),
  definitive: z.boolean().default(false),
  verified: z.boolean().default(false),
  notes: z.string().max(4000).default(""),
});
export const draftSchema = z.object({
  printedNumber: z.number().int().positive().max(300).nullable().default(null),
  number: z.number().int().min(1).max(300),
  stem: z.string().min(5).max(15000),
  options: z.array(z.string().min(1).max(10000)).length(4),
  sourcePage: z.number().int().positive().nullable().default(null),
  reserve: z.boolean().default(false),
});
export const bundleSchema = z.object({
  source: sourceSchema,
  exam: z.object({
    year: z.number().int().min(1900).max(2100),
    session: z.string().min(1).max(150),
    model: z.string().max(20),
    heldAt: date.nullable().default(null),
    expectedQuestions: z.number().int().min(1).max(300).default(100),
  }),
  questions: z.array(draftSchema).max(300),
  answerKey: z
    .object({
      source: sourceSchema,
      entries: z
        .array(
          z.object({
            number: z.number().int().positive().max(300),
            correct: z.number().int().min(0).max(3).nullable(),
            cancelled: z.boolean().default(false),
          }),
        )
        .max(300),
    })
    .optional(),
});
export function officialURL(url: string) {
  try {
    const u = new URL(url),
      h = u.hostname;
    return (
      u.protocol === "https:" &&
      [
        "guardiacivil.es",
        "guardiacivil.org",
        "guardiacivil.gob.es",
        "boe.es",
        "interior.gob.es",
        "europa.eu",
        "un.org",
        "ohchr.org",
        "coe.int",
        "icc-cpi.int",
        "ilo.org",
        "unesco.org",
      ].some((d) => h === d || h.endsWith("." + d))
    );
  } catch {
    return false;
  }
}
export function sourceRecord(
  raw: z.infer<typeof sourceSchema>,
  storage?: { key: string; sha256: string },
): Source {
  if (raw.origin === "official" && !officialURL(raw.url))
    throw Error(
      "Una fuente oficial necesita una URL institucional verificable. Usa procedencia manual o secundaria.",
    );
  if (
    raw.definitive &&
    (raw.kind !== "answer_key" ||
      !raw.verified ||
      raw.origin !== "official" ||
      !raw.notes.trim())
  )
    throw Error(
      "Para marcar una plantilla definitiva debes acreditar su carácter definitivo en las notas y verificar la fuente oficial.",
    );
  return {
    ...raw,
    id: raw.id || crypto.randomUUID(),
    access: storage ? "downloaded" : "available",
    storageKey: storage?.key || null,
    sha256: storage?.sha256 || null,
    consultedAt: new Date().toISOString(),
  };
}
export function deduplicate(q: Question, others: Question[]) {
  const match = others.find(
    (p) =>
      p.year === q.year &&
      p.session === q.session &&
      p.model !== q.model &&
      p.literalHash === q.literalHash &&
      !others.some(
        (o) =>
          o.year === q.year &&
          o.session === q.session &&
          o.model === q.model &&
          o.canonicalId === p.canonicalId,
      ),
  );
  if (!match) return q;
  // Matching model options by content preserves the literal order of each occurrence.
  const mapping = q.options.map((s) =>
    match.options.findIndex(
      (t) => literalNormalized(t) === literalNormalized(s),
    ),
  );
  if (mapping.some((n) => n < 0) || new Set(mapping).size !== 4) return q;
  return {
    ...q,
    canonicalId: match.canonicalId,
    optionMap: mapping.map((i) => match.optionMap[i]),
  };
}
const topicRules: [RegExp, number, number][] = [
  [/violencia de g[eé]nero/i, 21, 0.9],
  [/responsabilidad penal.*menores/i, 20, 0.9],
  [
    /derechos humanos|naciones unidas|carta social|corte penal|defensor del pueblo|pacto internacional/i,
    1,
    0.9,
  ],
  [/igualdad/i, 2, 0.8],
  [/riesgos laborales/i, 3, 0.9],
  [/constituci[oó]n|tribunal constitucional/i, 4, 0.85],
  [/uni[oó]n europea|tratado de la uni[oó]n/i, 5, 0.8],
  [/derecho civil|c[oó]digo civil|declaraci[oó]n de fallecimiento/i, 7, 0.85],
  [/c[oó]digo penal|derecho penal/i, 8, 0.85],
  [/enjuiciamiento criminal|polic[ií]a judicial|habeas corpus/i, 9, 0.8],
  [/r[eé]gimen jur[ií]dico|procedimiento administrativo/i, 10, 0.85],
  [/protecci[oó]n de datos/i, 11, 0.9],
  [/extranjer[ií]a|extranjeros/i, 12, 0.85],
  [/seguridad ciudadana|seguridad p[uú]blica|seguridad privada/i, 13, 0.8],
  [
    /ley org[aá]nica.*guardia civil|r[eé]gimen disciplinario.*guardia civil/i,
    15,
    0.65,
  ],
  [/medio ambiente|patrimonio natural/i, 16, 0.7],
  [/topograf[ií]a/i, 18, 0.85],
  [/inform[aá]tica|tecnolog[ií]as de la informaci[oó]n/i, 17, 0.65],
  [/armas|explosivos/i, 22, 0.8],
];
export function proposeClassification(
  stem: string,
  data: Pick<Dataset, "topics">,
) {
  const rule = topicRules.find(([re]) => re.test(stem));
  const topic = rule ? data.topics.find((t) => t.number === rule[1]) : null;
  const prefix = stem.split(/[.?!]/)[0].trim();
  const law =
    /ley|reglamento|c[oó]digo|constituci[oó]n|pacto|carta|convenio|estatuto/i.test(
      prefix,
    )
      ? prefix
      : null;
  // Numbers in a question are not automatically treated as legal articles.
  return {
    topicId: topic?.id || null,
    confidence: topic ? rule![2] : null,
    classificationMethod: topic ? "rules-v1" : "unassigned",
    law,
    style: /incorrecta|incorrecto/i.test(stem)
      ? "negativa"
      : /correcta|correcto/i.test(stem)
        ? "selección afirmativa"
        : /plazo|d[ií]as|a[nñ]os|meses/i.test(stem)
          ? "plazos y cifras"
          : "conceptual",
    distractorType: /incorrecta|incorrecto/i.test(stem)
      ? "inversión del enunciado"
      : null,
  };
}
export async function importBundle(
  input: unknown,
  storage?: { key: string; sha256: string },
  actor = "owner",
) {
  const bundle = bundleSchema.parse(input);
  await initialize();
  const db = getDB();
  if (
    bundle.source.year !== bundle.exam.year ||
    bundle.source.model !== bundle.exam.model ||
    bundle.source.session !== bundle.exam.session
  )
    throw Error(
      "Año, convocatoria y modelo deben coincidir entre documento y examen.",
    );
  if (bundle.source.kind !== "exam")
    throw Error("La fuente del cuadernillo debe ser de tipo examen.");
  const numbers = bundle.questions.map((q) => q.number);
  if (new Set(numbers).size !== numbers.length)
    throw Error(
      "Numeración duplicada: separa las pruebas o modelos antes de importar.",
    );
  if (bundle.answerKey) {
    const k = bundle.answerKey;
    if (
      k.source.kind !== "answer_key" ||
      k.source.year !== bundle.exam.year ||
      k.source.session !== bundle.exam.session ||
      (k.source.model !== bundle.exam.model && k.source.model !== "A/B")
    )
      throw Error("La plantilla no corresponde al examen o modelo.");
    if (new Set(k.entries.map((e) => e.number)).size !== k.entries.length)
      throw Error("La plantilla contiene números duplicados.");
  }
  return db.transaction(async (tx) => {
    const data = await dataset(tx);
    if (
      storage &&
      data.exams.some(
        (e) =>
          data.sources.find((s) => s.id === e.sourceId)?.sha256 ===
          storage.sha256,
      )
    )
      throw Error(
        "Este PDF ya está importado. Revisa la importación existente.",
      );
    let source = sourceRecord(bundle.source, storage);
    const existingSource = data.sources.find((s) => s.id === source.id);
    if (existingSource) {
      if (
        existingSource.url !== source.url ||
        existingSource.year !== source.year ||
        existingSource.model !== source.model ||
        data.exams.some((e) => e.sourceId === source.id)
      )
        throw Error("La fuente ya está importada o es incompatible.");
      source = existingSource;
    } else
      await put(tx, "sources", source as unknown as Record<string, unknown>);
    const key = bundle.answerKey ? sourceRecord(bundle.answerKey.source) : null;
    if (key) {
      const existing = data.sources.find((s) => s.id === key.id);
      if (existing) {
        if (
          existing.url !== key.url ||
          existing.year !== key.year ||
          existing.session !== key.session
        )
          throw Error("Identificador de plantilla incompatible.");
        Object.assign(key, existing);
      } else
        await put(tx, "sources", key as unknown as Record<string, unknown>);
    }
    const exam: Exam = {
      ...bundle.exam,
      id: crypto.randomUUID(),
      sourceId: source.id,
      keySourceId: key?.id || null,
      status: "draft",
      notes: "",
    };
    await put(tx, "exams", exam as unknown as Record<string, unknown>);
    const imported: Question[] = [];
    for (const draft of bundle.questions) {
      const answer = bundle.answerKey?.entries.find(
        (a) => a.number === draft.number,
      );
      const id = crypto.randomUUID();
      const dates = [source.publishedAt, key?.publishedAt].filter(
        (d): d is string => !!d,
      );
      const availableAt = dates.length === 2 ? dates.sort().at(-1)! : null;
      let q: Question = {
        ...draft,
        id,
        examId: exam.id,
        year: exam.year,
        session: exam.session,
        model: exam.model,
        correct: answer?.correct ?? null,
        validation: answer?.cancelled ? "cancelled" : "draft",
        conceptId: null,
        concept: null,
        article: null,
        paragraph: null,
        legalUrl: null,
        legalVerified: false,
        classificationReviewed: false,
        validity: "unreviewed",
        explanation: "",
        active: !draft.reserve && !answer?.cancelled,
        sourceId: source.id,
        keySourceId: key?.id || null,
        availableAt,
        literalHash: literalHash(draft.stem, draft.options),
        optionMap: [0, 1, 2, 3],
        canonicalId: id,
        createdAt: new Date().toISOString(),
        ...proposeClassification(draft.stem, data),
      };
      q = deduplicate(q, [...data.questions, ...imported]);
      imported.push(q);
      await put(tx, "questions", q as unknown as Record<string, unknown>);
    }
    if (key && bundle.answerKey)
      for (const entry of bundle.answerKey.entries)
        await tx.run(
          "INSERT INTO answer_entries(exam_id,question_number,correct,cancelled,source_id) VALUES(?,?,?,?,?)",
          [
            exam.id,
            entry.number,
            entry.correct,
            entry.cancelled ? 1 : 0,
            key.id,
          ],
        );
    const warnings = [
      "Preguntas en borrador; pendientes de cotejo literal y plantilla definitiva.",
    ];
    if (imported.filter((q) => !q.reserve).length !== exam.expectedQuestions)
      warnings.push(
        `Se esperaban ${exam.expectedQuestions} preguntas ordinarias; se extrajeron ${imported.filter((q) => !q.reserve).length}.`,
      );
    const job: ImportJob = {
      id: crypto.randomUUID(),
      examId: exam.id,
      sourceId: source.id,
      kind: "exam",
      status: "needs_review",
      errors: [],
      warnings,
      createdAt: new Date().toISOString(),
    };
    await put(tx, "import_jobs", job as unknown as Record<string, unknown>);
    await audit(
      tx,
      exam.id,
      "import",
      null,
      { questions: imported.length, sourceId: source.id },
      actor,
    );
    return {
      exam,
      source,
      questions: imported,
      job,
      aliases: imported.filter((q) => q.canonicalId !== q.id).length,
    };
  });
}
export async function attachAnswerKey(
  examId: string,
  input: unknown,
  entriesInput: unknown,
  storage?: { key: string; sha256: string },
  actor = "owner",
) {
  const raw = sourceSchema.parse(input);
  const entries = bundleSchema.shape.answerKey
    .unwrap()
    .shape.entries.parse(entriesInput);
  await initialize();
  if (new Set(entries.map((e) => e.number)).size !== entries.length)
    throw Error("Numeración duplicada en plantilla.");
  return getDB().transaction(async (tx) => {
    const data = await dataset(tx);
    const exam = data.exams.find((e) => e.id === examId);
    if (!exam) throw Error("Examen no encontrado");
    if (
      raw.kind !== "answer_key" ||
      raw.year !== exam.year ||
      raw.session !== exam.session ||
      (raw.model !== exam.model && raw.model !== "A/B")
    )
      throw Error("La plantilla no corresponde al examen seleccionado.");
    const source = sourceRecord(raw, storage);
    if (data.sources.some((s) => s.id === source.id))
      throw Error("Fuente ya registrada.");
    await put(tx, "sources", source as unknown as Record<string, unknown>);
    await tx.run("DELETE FROM answer_entries WHERE exam_id=?", [examId]);
    for (const entry of entries)
      await tx.run(
        "INSERT INTO answer_entries(exam_id,question_number,correct,cancelled,source_id) VALUES(?,?,?,?,?)",
        [
          examId,
          entry.number,
          entry.correct,
          entry.cancelled ? 1 : 0,
          source.id,
        ],
      );
    for (const q of data.questions.filter((q) => q.examId === examId)) {
      const answer = entries.find((e) => e.number === q.number);
      const src = data.sources.find((s) => s.id === q.sourceId);
      const dates = [src?.publishedAt, source.publishedAt];
      const updated = {
        ...q,
        keySourceId: source.id,
        correct: answer?.correct ?? null,
        validation: answer?.cancelled ? "cancelled" : "draft",
        active: answer?.cancelled ? false : !q.reserve,
        availableAt: dates.every(Boolean)
          ? (dates as string[]).sort().at(-1)!
          : null,
      };
      await put(tx, "questions", updated);
      await audit(tx, q.id, "replace_answer_key", q, updated, actor);
    }
    await put(tx, "exams", {
      ...exam,
      keySourceId: source.id,
      status: "draft",
    });
    await audit(
      tx,
      examId,
      "attach_answer_key",
      exam,
      { ...exam, keySourceId: source.id },
      actor,
    );
    return { source, count: entries.length };
  });
}
export async function extractPDF(buffer: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: buffer, useSystemFonts: true });
  const pdf = await task.promise;
  if (pdf.numPages > 150) {
    await task.destroy();
    throw Error("Máximo 150 páginas por documento.");
  }
  const pages: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      let line = "";
      const lines: string[] = [];
      let previousY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 3) {
          lines.push(line);
          line = "";
        }
        line += (line ? " " : "") + item.str;
        previousY = y;
        if (item.hasEOL) {
          lines.push(line);
          line = "";
          previousY = undefined;
        }
      }
      if (line) lines.push(line);
      pages.push(lines.join("\n"));
    }
  } finally {
    await task.destroy();
  }
  return {
    text: pages.join("\n"),
    pages: pages.length,
    questions: parseQuestions(pages.join("\n")),
    answers: parseAnswerKey(pages.join("\n")),
  };
}
