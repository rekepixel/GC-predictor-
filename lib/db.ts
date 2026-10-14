import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";
type Row = Record<string, unknown>;
export interface DB {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
}
const globals = globalThis as typeof globalThis & {
  gcDb?: DB;
  gcMigration?: Promise<void>;
};
function postgresSQL(sql: string) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}
function connect(): DB {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    const wrap = (
      q: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>,
      transaction: DB["transaction"],
    ): DB => ({
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        return (await q(postgresSQL(sql), params)).rows as T[];
      },
      async run(sql, params = []) {
        await q(postgresSQL(sql), params);
      },
      transaction,
    });
    const db = wrap(
      (s, p) => pool.query(s, p),
      async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const tx = wrap(
            (s, p) => client.query(s, p),
            async () => {
              throw Error("Transacción anidada no admitida");
            },
          );
          const result = await fn(tx);
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
    );
    return db;
  }
  const location = path.resolve(
    /* turbopackIgnore: true */ process.env.SQLITE_PATH ||
      ".local/gc-predictor.sqlite",
  );
  fs.mkdirSync(path.dirname(location), { recursive: true });
  const raw = new Database(location);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  raw.pragma("busy_timeout = 5000");
  // All asynchronous SQLite transactions share a FIFO lock. No other query may observe uncommitted state.
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(fn: () => T | Promise<T>) => {
    const result = tail.then(fn, fn);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  const direct: DB = {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async run(sql, params = []) {
      raw.prepare(sql).run(...params);
    },
    async transaction() {
      throw Error("Transacción anidada no admitida");
    },
  };
  return {
    query: (s, p) => enqueue(() => direct.query(s, p)),
    run: (s, p) => enqueue(() => direct.run(s, p)),
    transaction: (fn) =>
      enqueue(async () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          const result = await fn(direct);
          raw.exec("COMMIT");
          return result;
        } catch (e) {
          raw.exec("ROLLBACK");
          throw e;
        }
      }),
  };
}
export function getDB() {
  return (globals.gcDb ??= connect());
}
export async function migrate() {
  return (globals.gcMigration ??= (async () => {
    const db = getDB();
    const sql = fs.readFileSync(
      path.resolve("migrations/001_initial.sql"),
      "utf8",
    );
    await db.transaction(async (tx) => {
      for (const stmt of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.run(stmt);
      if (process.env.DATABASE_URL)
        for (const table of [
          ...tables,
          "answer_entries",
          "audit_events",
          "schema_migrations",
        ])
          await tx.run(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await tx.run(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING",
        ["001", new Date().toISOString()],
      );
    });
  })());
}
export const tables = [
  "sources",
  "exams",
  "concepts",
  "syllabi",
  "topics",
  "questions",
  "law_changes",
  "import_jobs",
  "attempts",
] as const;
export type Table = (typeof tables)[number];
export async function put(db: DB, table: Table, item: Record<string, unknown>) {
  const extra: Record<string, unknown> = {};
  if (
    table === "exams" ||
    table === "syllabi" ||
    table === "import_jobs" ||
    table === "questions"
  )
    extra.source_id = item.sourceId;
  if (table === "questions") {
    extra.exam_id = item.examId;
    extra.canonical_id = item.canonicalId;
  }
  if (table === "topics") extra.syllabus_id = item.syllabusId;
  const cols = ["id", ...Object.keys(extra), "payload"];
  const values = [item.id, ...Object.values(extra), JSON.stringify(item)];
  await db.run(
    `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${cols
      .slice(1)
      .map((c) => `${c}=excluded.${c}`)
      .join(",")}`,
    values,
  );
}
export async function readAll<T>(db: DB, table: Table): Promise<T[]> {
  return (
    await db.query<{ payload: string }>(
      `SELECT payload FROM ${table} ORDER BY id`,
    )
  ).map((r) => JSON.parse(r.payload));
}
export async function audit(
  db: DB,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
  actor = "owner",
) {
  await db.run(
    "INSERT INTO audit_events(id,entity_id,action,actor,before_payload,after_payload,created_at) VALUES(?,?,?,?,?,?,?)",
    [
      crypto.randomUUID(),
      entityId,
      action,
      actor,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      new Date().toISOString(),
    ],
  );
}
