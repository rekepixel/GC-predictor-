import fs from "node:fs";
import { createHash } from "node:crypto";
const catalog = JSON.parse(fs.readFileSync("data/source-catalog.json", "utf8"));
let checked = 0;
for (const source of catalog.sources) {
  if (!source.localPath) continue;
  const hash = createHash("sha256")
    .update(fs.readFileSync(source.localPath))
    .digest("hex");
  if (hash !== source.sha256) throw Error(`Huella distinta: ${source.id}`);
  checked++;
}
console.log(
  `${checked} originales coinciden con las huellas SHA-256 registradas.`,
);
