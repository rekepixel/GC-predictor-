import "./env";
import fs from "node:fs";
import { importBundle } from "../lib/importer";
const filename = process.argv[2];
if (!filename) {
  console.error("Uso: npm run data:import -- fichero-bundle.json");
  process.exit(1);
}
importBundle(JSON.parse(fs.readFileSync(filename, "utf8")))
  .then((result) => {
    console.log(
      JSON.stringify(
        {
          examId: result.exam.id,
          questions: result.questions.length,
          aliases: result.aliases,
          warnings: result.job.warnings,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
