import fs from "node:fs";
import { createHash } from "node:crypto";
const catalog = JSON.parse(fs.readFileSync("data/source-catalog.json", "utf8"));
let checked = 0;
let official = 0,
  secondary = 0;
for (const source of catalog.sources) {
  if (!source.localPath) continue;
  const hash = createHash("sha256")
    .update(fs.readFileSync(source.localPath))
    .digest("hex");
  if (hash !== source.sha256) throw Error(`Huella distinta: ${source.id}`);
  checked++;
  if (source.origin === "official") official++;
  else secondary++;
}
console.log(
  `${checked} archivos coinciden con SHA-256: ${official} documentos de procedencia oficial y ${secondary} copias secundarias sin autenticar. Una huella íntegra no acredita la autenticidad de una copia secundaria.`,
);
