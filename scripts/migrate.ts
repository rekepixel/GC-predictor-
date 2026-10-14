import "./env";
import { migrate } from "../lib/db";
migrate()
  .then(() => {
    console.log("Migración 001 aplicada.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
