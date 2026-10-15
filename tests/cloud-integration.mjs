// Explicit private integration suite: real PostgreSQL over TLS, local Storage contract double.
// Requires a dedicated EMPTY test database. Never point this at a production project.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { storageEmulator } from "./storage-emulator.mjs";
const base = path.resolve(".local/netlify-test");
const connectionURL = new URL(
  await fs.readFile(path.join(base, "postgres-url.txt"), "utf8"),
);
if (process.env.GC_TEST_DATABASE)
  connectionURL.pathname = "/" + process.env.GC_TEST_DATABASE;
const connectionString = connectionURL.href;
const ca = await fs.readFile(path.join(base, "tls/server.crt"), "utf8");
const pool = new Pool({
  connectionString,
  ssl: { ca, rejectUnauthorized: true },
  max: 1,
});
const storage = await storageEmulator();
const env = {
  ...process.env,
  DATABASE_URL: connectionString,
  GC_MIGRATION_SQLITE: path.resolve(
    ".local/backups/netlify-before/gc-predictor.sqlite",
  ),
  DATABASE_CA_CERT: ca,
  SUPABASE_URL: storage.url,
  SUPABASE_SERVICE_ROLE_KEY: storage.secret,
  GC_REMOTE_ONLY: "1",
  PRIVATE_APP_PASSWORD: crypto.randomBytes(24).toString("hex"),
  SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
};
const appArgs =
  process.env.GC_TEST_NETLIFY === "1"
    ? ["tests/netlify-handler-server.mjs"]
    : [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3003",
      ];
async function command(args, log, binary = process.execPath, expectedCode = 0) {
  const child = spawn(binary, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => (output += data));
  child.stderr.on("data", (data) => (output += data));
  const code = await new Promise((resolve) => child.on("exit", resolve));
  await fs.writeFile(path.join(base, log), output, { mode: 0o600 });
  assert.equal(code, expectedCode, `Failed ${log}: ${output.slice(-700)}`);
  return output;
}
let app;
try {
  const existing = await pool.query(
    "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema='public'",
  );
  assert.equal(
    Number(existing.rows[0].n),
    0,
    "Use an empty isolated PostgreSQL database.",
  );
  await pool.query(
    "CREATE SCHEMA storage; CREATE TABLE storage.objects(id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  );
  await command(
    ["--import", "tsx", "scripts/migrate-cloud.ts", "--apply"],
    "migration-first.log",
  );
  assert.equal(
    Number((await pool.query("SELECT count(*) AS n FROM questions")).rows[0].n),
    2100,
  );
  assert.equal(
    Number(
      (await pool.query("SELECT count(*) AS n FROM audit_events")).rows[0].n,
    ),
    15569,
  );
  await command(
    ["--import", "tsx", "scripts/migrate-cloud.ts", "--apply"],
    "migration-repeat.log",
  );
  assert.equal(
    Number((await pool.query("SELECT count(*) AS n FROM questions")).rows[0].n),
    2100,
  );
  assert.equal(
    Number(
      (await pool.query("SELECT count(*) AS n FROM audit_events")).rows[0].n,
    ),
    15569,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*) AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity=false",
      )
    ).rows[0].n,
    "0",
  );
  if (process.env.GC_TEST_EXAMS === "1") {
    for (const file of [
      "data/generated/2027-v1/literal-candidates.json",
      "data/generated/2027-v1/authored-candidates-v1.json",
    ]) {
      for (const q of JSON.parse(await fs.readFile(file, "utf8")))
        await pool.query(
          "INSERT INTO generated_questions(id,payload) VALUES($1,$2)",
          [q.id, JSON.stringify(q)],
        );
    }
  }
  await assert.rejects(
    () => pool.query("SET ROLE anon; SELECT * FROM questions"),
    /permission denied/,
  );
  await pool.query("RESET ROLE");
  const leaked = await fetch(
    storage.url +
      "/storage/v1/object/authenticated/gc-originals/data/raw/exam.pdf",
  );
  assert.equal(leaked.status, 403);
  const appLog = await fs.open(path.join(base, "app.log"), "w", 0o600);
  app = spawn(process.execPath, appArgs, {
    env: { ...env, NODE_ENV: "production" },
    stdio: ["ignore", appLog.fd, appLog.fd],
  });
  const origin = "http://127.0.0.1:3003";
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(origin + "/api/bootstrap");
      if (r.status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Next production server must reject anonymous bootstrap.");
  const cross = await fetch(origin + "/api/login", {
    method: "POST",
    headers: {
      Origin: "https://foreign.invalid",
      "content-type": "application/json",
    },
    body: JSON.stringify({ password: env.PRIVATE_APP_PASSWORD }),
  });
  assert.equal(cross.status, 403);
  async function login() {
    const r = await fetch(origin + "/api/login", {
      method: "POST",
      headers: { Origin: origin, "content-type": "application/json" },
      body: JSON.stringify({ password: env.PRIVATE_APP_PASSWORD }),
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(r.headers.get("set-cookie"), /Secure/i);
    return r.headers.get("set-cookie").split(";")[0];
  }
  const cookie1 = await login(),
    cookie2 = await login();
  async function api(url, body, method = "POST", cookie = cookie1) {
    const r = await fetch(origin + "/api/" + url, {
      method: body === undefined ? "GET" : method,
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    assert.ok(Buffer.byteLength(text) < 4_000_000, `Netlify payload: ${url}`);
    const data = JSON.parse(text);
    assert.equal(r.status, 200, `${url}: ${text.slice(0, 500)}`);
    return data;
  }
  const bootstrap = await api("bootstrap");
  assert.equal(bootstrap.questionCount, 2100);
  assert.equal(bootstrap.stats.questions, 700);
  assert.equal(bootstrap.data.questions.length, 0);
  let cursor = "",
    questions = [],
    pages = 0;
  do {
    const page = await api("question-page?after=" + encodeURIComponent(cursor));
    questions.push(...page.questions);
    cursor = page.next;
    pages++;
  } while (cursor);
  assert.equal(questions.length, 2100);
  assert.equal(new Set(questions.map((q) => q.id)).size, 2100);
  const q = questions.find((q) => q.documentaryEligible && !q.reserve);
  await api(
    "study-state/" + q.id,
    { revision: 0, status: "studied", answer: 1 },
    "PATCH",
  );
  const secondDevice = await api("study-state", undefined, "GET", cookie2);
  assert.equal(secondDevice[q.id].status, "studied");
  assert.equal(secondDevice[q.id].answer, 1);
  const conflict = await fetch(origin + "/api/study-state/" + q.id, {
    method: "PATCH",
    headers: {
      Cookie: cookie2,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ revision: 0, status: "review", answer: 2 }),
  });
  assert.equal(conflict.status, 409);
  const analysis = await api("analysis", { k: 10 });
  assert.equal(analysis.patterns.concepts.length, 37);
  const document = bootstrap.data.sources.find((s) => s.storageKey);
  const original = await fetch(origin + "/api/documents/" + document.id, {
    headers: { Cookie: cookie1 },
    redirect: "manual",
  });
  assert.equal(original.status, 302);
  assert.ok(!original.headers.get("location").includes(storage.secret));
  const bytes = Buffer.from(
    await (await fetch(original.headers.get("location"))).arrayBuffer(),
  );
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    document.sha256,
  );
  const pdf = Buffer.from("%PDF-fixture signed upload contract");
  const hash = crypto.createHash("sha256").update(pdf).digest("hex");
  const ticket = await api("upload-ticket", {
    sha256: hash,
    bytes: pdf.length,
  });
  assert.equal(
    (
      await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdf,
      })
    ).status,
    200,
  );
  const realExam = bootstrap.data.sources.find(
    (s) =>
      s.year === 2026 && s.model === "A" && s.kind === "exam" && s.storageKey,
  );
  assert.ok(realExam, "Real 2026 model A source must survive the migration");
  const originalPDF = storage.objects.get(
    "gc-originals/" + realExam.storageKey,
  );
  const realHash = crypto
    .createHash("sha256")
    .update(originalPDF)
    .digest("hex");
  const realTicket = await api("upload-ticket", {
    sha256: realHash,
    bytes: originalPDF.length,
  });
  const upload = await fetch(realTicket.url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: originalPDF,
  });
  assert.ok([200, 409].includes(upload.status));
  const extracted = await api("extract", { key: realTicket.key });
  assert.equal(extracted.pages, 19);
  assert.ok(extracted.questions.questions.length >= 100);
  const manifest = await fetch(origin + "/manifest.webmanifest");
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).display, "standalone");
  const sw = await fetch(origin + "/sw.js");
  assert.equal(sw.status, 200);
  let savedExamId;
  if (process.env.GC_TEST_EXAMS === "1") {
    const home = await api("exam-home");
    assert.equal(home.exams.length, 14);
    assert.equal(home.bank.eligible, 13);
    assert.equal(home.profile.questions, 700);
    const exam = home.exams.find((e) => e.year === 2026 && e.model === "A");
    assert.ok(exam);
    const started = (
      await api("exam-start", { mode: "historical", examId: exam.id })
    ).run;
    savedExamId = started.id;
    assert.equal(started.items.length, 105);
    assert.equal(started.items.filter((q) => q.reserve).length, 5);
    assert.ok(
      started.items.every((q) => !("correct" in q) && !("explanation" in q)),
    );
    const real = questions.filter((q) => q.examId === exam.id && !q.reserve);
    const answers = Object.fromEntries(
      real.map((q, i) => [q.id, i < 75 ? q.correct : (q.correct + 1) % 4]),
    );
    const saved = await api(
      "exam-runs/" + started.id,
      {
        revision: 1,
        answers,
        flagged: [real[0].id],
        currentIndex: 5,
        elapsedSeconds: 1200,
      },
      "PATCH",
    );
    const mobile = await api(
      "exam-runs/" + started.id,
      undefined,
      "GET",
      cookie2,
    );
    assert.deepEqual(mobile.answers, answers);
    assert.equal(mobile.revision, 2);
    const finished = await api("exam-finish/" + started.id, {
      revision: 2,
      answers,
      flagged: [real[0].id],
      currentIndex: 5,
      elapsedSeconds: 1201,
    });
    assert.equal(finished.result.correct, 75);
    assert.equal(finished.result.wrong, 25);
    assert.equal(finished.result.blank, 0);
    assert.ok(Math.abs(finished.result.score - (75 - 25 / 3)) < 1e-8);
    assert.equal(finished.result.unusedReserves, 5);
    assert.equal(finished.result.provisional, true);
    assert.ok("correct" in finished.items[0]);
    const disputedExam = home.exams.find(
      (e) => e.year === 2024 && e.model === "2A",
    );
    const disputed = await api("exam-start", {
      mode: "historical",
      examId: disputedExam.id,
    });
    const issue = questions.find(
      (q) => q.examId === disputedExam.id && q.number === 81,
    );
    const issueFinished = await api("exam-finish/" + disputed.run.id, {
      revision: 1,
      answers: { [issue.id]: 1 },
      flagged: [issue.id],
      currentIndex: 80,
      elapsedSeconds: 100,
    });
    assert.equal(issueFinished.result.uncertainAnswered, 1);
    assert.equal(issueFinished.result.unresolved.length, 1);
    assert.ok(
      issueFinished.result.scoreRange.upper >
        issueFinished.result.scoreRange.lower,
    );
    const generated = await api("exam-start", {
      mode: "generated",
      seed: "private-e2e-test",
    });
    assert.equal(generated.status, "blocked");
    assert.equal(generated.eligible, 13);
    assert.ok(generated.shortages.length > 0);
    assert.ok(!generated.run);
    const plan = await api("exam-blueprints/" + generated.blueprintId);
    assert.equal(plan.slots.length, 105);
    assert.equal(plan.status, "blocked");
  }
  if (process.env.GC_TEST_BROWSER === "1") {
    const ui = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3005",
      ],
      {
        env: { ...env, NODE_ENV: "production" },
        stdio: ["ignore", appLog.fd, appLog.fd],
      },
    );
    try {
      for (let i = 0; i < 100; i++) {
        try {
          if (
            (await fetch("http://127.0.0.1:3005/api/bootstrap")).status === 401
          )
            break;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      await command(["tests/cloud-browser.py"], "browser.log", "python");
      if (process.env.GC_TEST_EXAMS === "1")
        await command(["tests/exam-browser.py"], "exam-browser.log", "python");
    } finally {
      ui.kill("SIGTERM");
    }
  }
  // A fresh process reads the same persisted state; authentication uses a stable secret.
  app.kill("SIGTERM");
  await new Promise((r) => app.once("exit", r));
  app = spawn(process.execPath, appArgs, {
    env: { ...env, NODE_ENV: "production" },
    stdio: ["ignore", appLog.fd, appLog.fd],
  });
  for (let i = 0; i < 100; i++) {
    try {
      const state = await api("study-state", undefined, "GET", cookie2);
      if (state[q.id]?.answer === 1) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.equal(
    (await api("study-state", undefined, "GET", cookie2))[q.id].status,
    "studied",
  );
  if (savedExamId) {
    const persisted = await api(
      "exam-runs/" + savedExamId,
      undefined,
      "GET",
      cookie2,
    );
    assert.equal(persisted.status, "finished");
    assert.equal(persisted.result.correct, 75);
  }
  await pool.query(
    "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; CREATE POLICY fixture_public_access ON storage.objects FOR SELECT TO anon USING(true)",
  );
  const writesBefore = storage.stats.writes;
  const refused = await command(
    ["--import", "tsx", "scripts/migrate-cloud.ts", "--apply"],
    "migration-refused-policy.log",
    process.execPath,
    1,
  );
  assert.match(refused, /políticas de Storage/);
  assert.equal(
    storage.stats.writes,
    writesBefore,
    "An unsafe existing policy must block before any evidence upload",
  );
  const size = Number(
    (await pool.query("SELECT pg_database_size(current_database()) AS n"))
      .rows[0].n,
  );
  const report = {
    runtime:
      process.env.GC_TEST_NETLIFY === "1"
        ? "generated OpenNext Netlify function (local harness)"
        : "Next production server",
    realPostgres: true,
    tlsCertificateVerified: true,
    storage:
      "local Supabase REST contract double; live application Storage access not configured",
    historicalRecords: questions.length,
    ordinaryQuestions: bootstrap.stats.questions,
    auditEvents: 15569,
    pages,
    objects: storage.objects.size,
    databaseBytes: size,
    idempotent: true,
    noDuplicateIds: true,
    anonymousDenied: true,
    csrfDenied: true,
    rlsEnabled: true,
    twoDeviceProgress: true,
    optimisticConflict: true,
    processRestartPersistence: true,
    examModes:
      process.env.GC_TEST_EXAMS === "1"
        ? {
            officialModels: 14,
            historicalFullRun: true,
            resultsAcrossDevices: true,
            disputedKeyWarning: true,
            generatedBlockedBelowQuality: true,
            generatedEligible: 13,
          }
        : undefined,
    patterns: 37,
    pwaAssets: true,
    allBufferedResponsesBelow4MB: true,
    unsafePolicyStopsBeforeUpload: true,
    realPDFExtracted: {
      pages: extracted.pages,
      drafts: extracted.questions.questions.length,
      autoValidated: 0,
    },
  };
  await fs.writeFile(
    path.join(base, "integration-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  app?.kill("SIGTERM");
  await pool.end();
  await new Promise((resolve) => storage.server.close(resolve));
}
