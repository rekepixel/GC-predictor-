import "./env";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { dataset } from "../lib/store";
import { profile, blueprint, examRetrospective } from "../lib/exam-profile";
import {
  assembleGenerated,
  generatedProblems,
  SCORING,
  type GeneratedQuestion,
} from "../lib/exam-engine";
import { getDB } from "../lib/db";
async function main() {
  const data = await dataset(),
    p = profile(data),
    plan = blueprint(data, "gc-first-blueprint-v1");
  const bank = (
    await getDB().query<{ payload: string }>(
      "SELECT payload FROM generated_questions ORDER BY id",
    )
  ).map((r) => JSON.parse(r.payload) as GeneratedQuestion);
  const assembled = assembleGenerated(plan, bank, data);
  const before = new Map<string, { count: number; years: Set<number> }>();
  for (const f of p.features) {
    const q = data.questions.find((q) => q.id === f.id)!;
    const key = [f.law || "", f.article || "", f.paragraph || ""].join("|");
    if (!f.article) continue;
    const g = before.get(key) || { count: 0, years: new Set<number>() };
    g.count++;
    g.years.add(q.year);
    before.set(key, g);
  }
  const report = {
    createdAt: new Date().toISOString(),
    basis:
      "700 ordinary documentary questions; models deduplicated; six sessions normalized",
    retainedRecords: data.questions.length,
    featureVersion: p.version,
    profile: p,
    plan,
    assembly: {
      ...assembled,
      items: assembled.items.map((q) => ({
        id: q.id,
        topicId: q.topicId,
        reserve: q.reserve,
      })),
    },
    bank: bank.map((q) => ({
      id: q.id,
      state: q.quality.state,
      issues: generatedProblems(q, data),
      humanReviewed: q.quality.humanReviewed,
      sourceHashes: q.evidence.map((e) => e.sha256),
      historicalReferences: q.historicalReferences,
    })),
    datedArticleAspects: [...before].map(([key, v]) => ({
      key,
      count: v.count,
      years: [...v.years].sort(),
    })),
    retrospective: examRetrospective(data),
    scoring: SCORING,
    limitations: [
      "La caracterización individual es computacional y asistida; no es revisión humana nueva de las 700 etiquetas.",
      "Mismo artículo no demuestra misma regla: se conservan taxonomía, apartados y relaciones anteriores sin modificarlos para mejorar el resultado.",
      "No se infiere mayor probabilidad de contenidos ausentes ni se convierte un ajuste de estilo en predicción de conceptos.",
      "El programa 2027 y la dificultad psicométrica real no están acreditados.",
    ],
  };
  await fs.mkdir("data/research/exam-generator", { recursive: true });
  await fs.writeFile(
    "data/research/exam-generator/analysis-v1.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      ordinary: p.questions,
      sessions: p.sessions.length,
      retained: data.questions.length,
      candidates: bank.length,
      eligible: assembled.eligible,
      status: assembled.status,
      featureFingerprint: createHash("sha256")
        .update(JSON.stringify(p.features))
        .digest("hex"),
      negativeSignals: p.features.filter((f) => f.negative).length,
      topics: plan.topics,
      retrospective: report.retrospective.map((f) => ({
        year: f.year,
        status: f.status,
        ...("topicTotalVariation" in f
          ? { topicTV: f.topicTotalVariation, concepts: f.top25Concepts }
          : {}),
      })),
    }),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
