import "./env";
import fs from "node:fs";
import { dataset } from "../lib/store";
import { validationByYear } from "../lib/history";
import { frequencies } from "../lib/analysis";
async function main() {
  const data = await dataset();
  const report = {
    generatedAt: new Date().toISOString(),
    scope: "official-corrected-documentary; finality separately disclosed",
    byYear: validationByYear(data),
    statistics: frequencies(data),
  };
  fs.mkdirSync(".local/reports", { recursive: true });
  fs.writeFileSync(
    ".local/reports/validation-summary.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        years: report.byYear.filter((y) =>
          [2023, 2024, 2025, 2026].includes(y.year),
        ),
        statistics: {
          ordinary: report.statistics.questions,
          definitive: report.statistics.definitiveQuestions,
          topics: report.statistics.topics.length,
          laws: report.statistics.laws.length,
          articles: report.statistics.articles.length,
          concepts: report.statistics.concepts.length,
        },
      },
      null,
      2,
    ),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
