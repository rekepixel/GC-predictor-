import "./env";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { initialize, dataset } from "../lib/store";
import { importBundle } from "../lib/importer";
import { getDB, put } from "../lib/db";
async function main() {
  await initialize();
  const catalog = JSON.parse(
    fs.readFileSync("data/source-catalog.json", "utf8"),
  );
  let data = await dataset();
  let imported = 0;
  let extracted = 0;
  for (const source of catalog.sources.filter(
    (s: { kind: string; localPath?: string }) =>
      s.kind === "exam" &&
      s.localPath &&
      "origin" in s &&
      s.origin === "official",
  )) {
    if (
      createHash("sha256")
        .update(fs.readFileSync(source.localPath))
        .digest("hex") !== source.sha256
    )
      throw Error(`El original no coincide con su huella: ${source.localPath}`);
    if (data.exams.some((e) => e.sourceId === source.id)) {
      console.log(`Ya registrado: ${source.id}`);
      continue;
    }
    const draft = JSON.parse(
      execFileSync(
        process.env.PYTHON_BIN || "python",
        ["python/extract.py", source.localPath],
        { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      ),
    );
    const sourceInput = {
      id: source.id,
      title: source.title,
      url: source.url,
      year: source.year,
      session: source.session || "",
      model: source.model || "",
      kind: "exam",
      origin: "official",
      publishedAt: source.publicationAt || null,
      definitive: false,
      verified: true,
      notes: source.notes || "",
    };
    let answerKey;
    if (source.year === 2026) {
      const key = catalog.sources.find(
        (s: { id: string }) => s.id === "key-2026-corrected",
      );
      answerKey = {
        source: {
          ...sourceInput,
          id: key.id,
          title: key.title,
          url: key.url,
          kind: "answer_key",
          model: "A/B",
          notes: key.notes,
          definitive: false,
          publishedAt: key.publicationAt || null,
        },
        entries: JSON.parse(
          execFileSync(
            process.env.PYTHON_BIN || "python",
            ["python/extract.py", key.localPath, "--key-2026", source.model],
            { encoding: "utf8" },
          ),
        ),
      };
    }
    const result = await importBundle(
      {
        source: sourceInput,
        exam: {
          year: source.year,
          session: source.session,
          model: source.model,
          heldAt: /^\d{4}-\d{2}-\d{2}$/.test(source.session || "")
            ? source.session
            : null,
          expectedQuestions: 100,
        },
        questions: draft.questions,
        answerKey,
      },
      undefined,
      "archive-cli",
    );
    if (draft.warnings.length) {
      result.job.warnings.push(...draft.warnings);
      await put(
        getDB(),
        "import_jobs",
        result.job as unknown as Record<string, unknown>,
      );
    }
    // Catalogue PDFs are immutable originals in data/raw. No claim of validation is made.
    imported++;
    extracted += result.questions.length;
    console.log(
      `${source.year} ${source.model}: ${result.questions.length} borradores, ${result.aliases} variantes equivalentes.`,
    );
    data = await dataset();
  }
  console.log(
    JSON.stringify(
      {
        newModels: imported,
        newDraftQuestions: extracted,
        totalModels: data.exams.length,
        sessions: new Set(data.exams.map((e) => e.year + "|" + e.session)).size,
        totalRecords: data.questions.length,
        canonicalGroups: new Set(data.questions.map((q) => q.canonicalId)).size,
        validated: data.questions.filter((q) => q.validation === "validated")
          .length,
      },
      null,
      2,
    ),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
