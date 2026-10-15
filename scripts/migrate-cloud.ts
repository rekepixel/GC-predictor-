/** Private, operator-only import. Never called during a Netlify build or HTTP request. */
import "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { Pool, type PoolClient } from "pg";
import { observedCorpus } from "../lib/analysis";
import type { Dataset } from "../lib/types";
import {
  ensurePrivateBucket,
  getPrivateObject,
  putPrivateObject,
} from "../lib/private-storage";

async function main() {
  const sha = (bytes: string | Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  const tableNames = [
    "sources",
    "exams",
    "concepts",
    "syllabi",
    "topics",
    "questions",
    "law_changes",
    "import_jobs",
    "attempts",
    "answer_entries",
    "audit_events",
    "schema_migrations",
  ];
  const reportDir = path.resolve(".local/netlify-migration");
  let defaultBackup = ".local/backups/netlify-before/gc-predictor.sqlite";
  try {
    await fs.access(".local/backups/exam-generator-final/gc-predictor.sqlite");
    defaultBackup = ".local/backups/exam-generator-final/gc-predictor.sqlite";
  } catch {}
  const dbPath = path.resolve(process.env.GC_MIGRATION_SQLITE || defaultBackup);
  const raw = new Database(dbPath, { readonly: true, fileMustExist: true });
  type SQLRow = Record<string, string | number | null>;
  const optionalTables = [
    "study_state",
    "generated_questions",
    "exam_blueprints",
    "exam_sessions",
  ].filter((name) =>
    raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(name),
  );
  const snapshots = [...tableNames, ...optionalTables].map((name) => {
    const columns = (
      raw.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]
    ).map((c) => c.name);
    const order =
      name === "answer_entries"
        ? "exam_id,question_number"
        : name === "schema_migrations"
          ? "version"
          : "id";
    const rows = raw
      .prepare(`SELECT * FROM ${name} ORDER BY ${order}`)
      .all() as SQLRow[];
    return { name, columns, order, rows, sha256: sha(JSON.stringify(rows)) };
  });
  try {
    if (
      raw.pragma("integrity_check", { simple: true }) !== "ok" ||
      (raw.pragma("foreign_key_check") as unknown[]).length
    )
      throw Error("La copia SQLite no supera integridad y referencias.");
  } finally {
    raw.close();
  }
  const rowsOf = (name: string) => snapshots.find((t) => t.name === name)!.rows;
  const parsed = (name: string) =>
    rowsOf(name).map((row) => JSON.parse(String(row.payload)));
  const data = {
    sources: parsed("sources"),
    questions: parsed("questions"),
  } as Dataset;
  const ordinaryQuestions = observedCorpus(data).questions.length;
  if (
    rowsOf("questions").length !== 2100 ||
    ordinaryQuestions !== 700 ||
    rowsOf("answer_entries").length !== 1470
  )
    throw Error(
      "No es la base privada completa esperada (2100 registros / 700 ordinarias cotejadas / 1470 claves). No se sustituirá por el banco público.",
    );

  const files: { key: string; path: string; bytes: number; sha256: string }[] =
    [];
  async function walk(folder: string, prefix: string) {
    for (const entry of (
      await fs.readdir(folder, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(folder, entry.name),
        key = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(full, key);
      else if (entry.isFile()) {
        const bytes = await fs.readFile(full);
        if (bytes.length > 25 * 1024 * 1024)
          throw Error(`Archivo superior al límite de importación: ${key}`);
        files.push({
          key,
          path: full,
          bytes: bytes.length,
          sha256: sha(bytes),
        });
      } else
        throw Error("La importación privada no acepta enlaces simbólicos.");
    }
  }
  await walk(path.resolve("data"), "data");
  try {
    await walk(path.join(path.dirname(dbPath), "originals"), "originals");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  for (const source of data.sources) {
    if (!source.storageKey) continue;
    const file = files.find((f) => f.key === source.storageKey);
    if (!file || (source.sha256 && file.sha256 !== source.sha256))
      throw Error(
        `Falta el documento original o su huella no coincide: ${source.id}`,
      );
  }
  // Check the five sealed banks and their evidence dependencies before copying anything.
  for (const name of [
    "data/verified/manifest.json",
    "data/verified/history/manifest.json",
    "data/verified/concepts-2023-2026/manifest.json",
    "data/verified/quality-audit-700/manifest.json",
    "data/verified/documentary-audit-2023/manifest.json",
  ]) {
    if (!files.some((f) => f.key === name))
      throw Error(`Falta evidencia privada: ${name}`);
    const seal = JSON.parse(await fs.readFile(name, "utf8"));
    for (const entry of [
      ...seal.files,
      ...Object.entries(seal.dependencies || {}).map(([path, sha256]) => ({
        path,
        sha256,
      })),
    ]) {
      if (
        files.find((file) => file.key === entry.path)?.sha256 !== entry.sha256
      )
        throw Error(`Huella de evidencia no válida: ${entry.path}`);
    }
  }
  const storageBytes = files.reduce((sum, f) => sum + f.bytes, 0);
  // Conservative initial quota guard. The actual PostgreSQL size is checked inside the transaction too.
  const jsonBytes = snapshots.reduce(
    (sum, t) => sum + Buffer.byteLength(JSON.stringify(t.rows)),
    0,
  );
  if (storageBytes > 800_000_000 || jsonBytes > 300_000_000)
    throw Error(
      "La importación supera el margen gratuito reservado; no se activará ningún plan de pago.",
    );
  const sourceSha256 = sha(
    JSON.stringify(snapshots.map((t) => [t.name, t.sha256])),
  );
  const manifest = {
    version: 1,
    sourceSha256,
    ordinaryQuestions,
    historicalRecords: 2100,
    counts: Object.fromEntries(snapshots.map((t) => [t.name, t.rows.length])),
    fingerprints: Object.fromEntries(snapshots.map((t) => [t.name, t.sha256])),
    storageBytes,
    jsonBytes,
    files: files.map(({ path: _path, ...file }) => file),
  };
  await fs.mkdir(reportDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(
    path.join(reportDir, "preflight.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      phase: "preflight",
      sourceSha256,
      counts: manifest.counts,
      ordinaryQuestions,
      storageBytes,
      jsonBytes,
    }),
  );

  if (process.argv.includes("--apply")) {
    if (!process.env.DATABASE_URL)
      throw Error("Falta la conexión PostgreSQL privada.");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw Error(
        "Falta el almacenamiento privado Supabase. No se marcará la migración como completa sin sus documentos.",
      );
    const url = new URL(process.env.DATABASE_URL);
    const local = ["127.0.0.1", "localhost"].includes(url.hostname);
    // Verify the server certificate; connection-string options must not disable verification.
    for (const option of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
      url.searchParams.delete(option);
    const pool = new Pool({
      connectionString: url.href,
      max: 1,
      connectionTimeoutMillis: 10000,
      ...(!local || process.env.DATABASE_CA_CERT
        ? {
            ssl: {
              rejectUnauthorized: true,
              ...(process.env.DATABASE_CA_CERT
                ? { ca: process.env.DATABASE_CA_CERT.replaceAll("\\n", "\n") }
                : {}),
            },
          }
        : {}),
    });
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      // Check policies BEFORE any private upload, not merely before the DB commit.
      const storageSecurity = await client.query(
        "SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname='objects'",
      );
      if (storageSecurity.rows[0]?.relrowsecurity !== true)
        throw Error(
          "Existen políticas de Storage pendientes: es obligatorio activar RLS antes de importar.",
        );
      if (
        (
          await client.query(
            "SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'",
          )
        ).rows.length
      )
        throw Error(
          "Existen políticas de Storage que requieren revisión antes de importar datos privados.",
        );
      const receiptTable = (
        await client.query(
          "SELECT to_regclass('public.deployment_state') AS name",
        )
      ).rows[0].name;
      const receipt = receiptTable
        ? (
            await client.query(
              "SELECT payload FROM deployment_state WHERE id='private-import-v1'",
            )
          ).rows[0]
        : undefined;
      if (receipt && JSON.parse(receipt.payload).sourceSha256 !== sourceSha256)
        throw Error(
          "Ya existe otra importación privada: se impide reemplazar sus datos y progreso.",
        );
      if (!receipt)
        for (const table of snapshots) {
          if (
            (
              await client.query("SELECT to_regclass($1) AS name", [
                "public." + table.name,
              ])
            ).rows[0].name &&
            Number(
              (await client.query(`SELECT count(*) AS n FROM ${table.name}`))
                .rows[0].n,
            )
          )
            throw Error(
              `Destino no vacío (${table.name}). No se sobrescribirán datos existentes.`,
            );
        }
      await ensurePrivateBucket();
      // Immutable objects first, only after privacy checks. A failed upload leaves no published DB.
      for (const file of files) {
        const bytes = await fs.readFile(file.path);
        await putPrivateObject(file.key, bytes);
        if (sha(await getPrivateObject(file.key)) !== file.sha256)
          throw Error(`La comprobación de subida ha fallado: ${file.key}`);
      }
      await putPrivateObject(
        `migration-manifests/${sourceSha256}.json`,
        Buffer.from(JSON.stringify(manifest)),
      );
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(2027,700)");
      for (const file of ["001_initial.sql", "002_cloud.sql"])
        await client.query(
          await fs.readFile(path.resolve("migrations", file), "utf8"),
        );
      const examSchema = await fs.readFile(
        "supabase/migrations/20261015113618_exam_generator.sql",
        "utf8",
      );
      for (const stmt of examSchema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => /^CREATE /i.test(s)))
        await client.query(stmt);
      const prior = await client.query(
        "SELECT payload FROM deployment_state WHERE id='private-import-v1'",
      );
      if (prior.rows.length) {
        if (JSON.parse(prior.rows[0].payload).sourceSha256 !== sourceSha256)
          throw Error(
            "Ya existe otra importación privada: se impide reemplazar sus datos y progreso.",
          );
        await client.query("ROLLBACK");
        console.log(
          JSON.stringify({
            phase: "already-imported",
            sourceSha256,
            preservedPersonalChanges: true,
          }),
        );
      } else {
        for (const t of snapshots) {
          if (
            Number(
              (await client.query(`SELECT count(*) AS n FROM ${t.name}`))
                .rows[0].n,
            )
          )
            throw Error(
              `Destino no vacío (${t.name}). No se sobrescribirán datos existentes.`,
            );
          for (let start = 0; start < t.rows.length; start += 100) {
            const chunk = t.rows.slice(start, start + 100),
              params: unknown[] = [];
            const values = chunk
              .map(
                (row) =>
                  "(" +
                  t.columns
                    .map((col) => {
                      params.push(row[col]);
                      return "$" + params.length;
                    })
                    .join(",") +
                  ")",
              )
              .join(",");
            await client.query(
              `INSERT INTO ${t.name} (${t.columns.join(",")}) VALUES ${values}`,
              params,
            );
          }
          const copied = (
            await client.query(`SELECT * FROM ${t.name} ORDER BY ${t.order}`)
          ).rows;
          // PostgreSQL may return object keys in column order; explicitly bind the source column order.
          const normalized = copied.map((row) =>
            Object.fromEntries(t.columns.map((col) => [col, row[col]])),
          );
          if (sha(JSON.stringify(normalized)) !== t.sha256)
            throw Error(
              `No coinciden los registros originales de ${t.name}. Se revierte toda la importación.`,
            );
        }
        const secureTables = [
          ...tableNames,
          "deployment_state",
          "login_limits",
          "study_state",
          "generated_questions",
          "exam_blueprints",
          "exam_sessions",
        ];
        for (const table of secureTables) {
          await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
          for (const role of ["anon", "authenticated"])
            if (
              (
                await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [
                  role,
                ])
              ).rows.length
            )
              await client.query(`REVOKE ALL ON TABLE ${table} FROM ${role}`);
        }
        // An existing broad storage policy could expose a private bucket. Require no user policies.
        const storagePolicies = await client.query(
          "SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'",
        );
        if (storagePolicies.rows.length)
          throw Error(
            "Existen políticas de Storage que requieren revisión antes de importar datos privados.",
          );
        const databaseBytes = Number(
          (
            await client.query(
              "SELECT pg_database_size(current_database()) AS n",
            )
          ).rows[0].n,
        );
        if (databaseBytes > 400_000_000)
          throw Error(
            "La base supera el margen de seguridad para Supabase Free. Se revierte la importación.",
          );
        await client.query(
          "INSERT INTO schema_migrations(version,applied_at) VALUES('002',$1) ON CONFLICT(version) DO NOTHING",
          [new Date().toISOString()],
        );
        await client.query(
          "INSERT INTO deployment_state(id,payload) VALUES('private-import-v1',$1)",
          [
            JSON.stringify({
              ...manifest,
              importedAt: new Date().toISOString(),
              databaseBytes,
            }),
          ],
        );
        await client.query("COMMIT");
        const report = {
          phase: "completed",
          sourceSha256,
          databaseBytes,
          counts: manifest.counts,
          storageBytes,
          ordinaryQuestions,
          rowFingerprintsVerified: true,
          privateStorageVerified: true,
        };
        await fs.writeFile(
          path.join(reportDir, "result.json"),
          JSON.stringify(report, null, 2),
          { mode: 0o600 },
        );
        console.log(JSON.stringify(report));
      }
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      // Never echo SQL parameters, passwords, connection strings or raw driver errors.
      if (
        error instanceof Error &&
        /Destino no vacío|Ya existe otra|No coinciden|supera el margen|políticas de Storage/.test(
          error.message,
        )
      )
        throw error;
      throw Error(
        "Migración no completada; los registros se han conservado. Revisa permisos, TLS y conexión en el registro privado.",
      );
    } finally {
      client?.release();
      await pool.end();
    }
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo completar la migración privada.",
  );
  process.exitCode = 1;
});
