import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
process.env.SQLITE_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gc-cloud-")),
  "test.sqlite",
);
delete process.env.DATABASE_URL;
import { getDB, migrate, put } from "../lib/db";
import { reserveLoginAttempt } from "../lib/auth";
import {
  saveStudyProgress,
  studyProgress,
  StudyConflict,
} from "../lib/study-state";
import { readPDF } from "../lib/files";
import {
  signPrivateDownload,
  signPrivateUpload,
  putPrivateObject,
} from "../lib/private-storage";

test("login throttling is atomic and survives a new serverless instance", async () => {
  await migrate();
  const now = Date.now();
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => reserveLoginAttempt("fixture-ip", now)),
  );
  assert.equal(responses.filter(Boolean).length, 10);
  assert.equal((await getDB().query("SELECT * FROM login_limits")).length, 2);
  assert.equal(await reserveLoginAttempt("fixture-ip", now + 16 * 60000), true);
});

test("progress persists answers, rejects stale edits, and never changes question quality", async () => {
  const db = getDB();
  await put(db, "sources", { id: "fixture-source" });
  await put(db, "exams", { id: "fixture-exam", sourceId: "fixture-source" });
  await put(db, "questions", {
    id: "fixture-question",
    sourceId: "fixture-source",
    examId: "fixture-exam",
    canonicalId: "fixture-q",
    validation: "draft",
  });
  const first = await saveStudyProgress("fixture-question", {
    revision: 0,
    status: "studied",
    answer: 2,
  });
  assert.equal(first.revision, 1);
  assert.equal((await studyProgress())["fixture-question"].answer, 2);
  const results = await Promise.allSettled([
    saveStudyProgress("fixture-question", {
      revision: 1,
      status: "review",
      answer: 0,
    }),
    saveStudyProgress("fixture-question", {
      revision: 1,
      status: "pending",
      answer: 1,
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof StudyConflict);
  const q = JSON.parse(
    (
      await db.query<{ payload: string }>(
        "SELECT payload FROM questions WHERE id=?",
        ["fixture-question"],
      )
    )[0].payload,
  );
  assert.equal(q.validation, "draft");
  await assert.rejects(
    () => saveStudyProgress("missing", { revision: 0, status: "studied" }),
    /inexistente/,
  );
});

test("retained evidence PDFs use private storage and signatures never contain a service key", async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://fixture.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-server-only-key";
  try {
    const called: string[] = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      called.push(url);
      assert.equal(
        new Headers(init?.headers).get("apikey"),
        "fixture-server-only-key",
      );
      if (url.includes("upload/sign"))
        return Response.json({
          url: "/object/upload/sign/gc-originals/originals/fixture.pdf?token=temporary",
        });
      if (url.includes("/object/sign/"))
        return Response.json({
          signedURL:
            "/object/sign/gc-originals/data/raw/fixture.pdf?token=temporary",
        });
      return new Response("%PDF-fixture");
    };
    assert.equal(
      (await readPDF("data/raw/fixture.pdf")).toString(),
      "%PDF-fixture",
    );
    assert.ok(
      called[0].includes(
        "object/authenticated/gc-originals/data/raw/fixture.pdf",
      ),
    );
    assert.ok(
      !(await signPrivateDownload("data/raw/fixture.pdf")).includes(
        "fixture-server-only-key",
      ),
    );
    assert.ok(
      (await signPrivateUpload("originals/fixture.pdf")).includes(
        "/storage/v1/object/upload/sign/",
      ),
    );
    await assert.rejects(() => readPDF("data/raw/../../.env"), /no válida/);
    const contents = Buffer.from("%PDF-fixture");
    globalThis.fetch = async (_input, init) =>
      init?.method === "POST"
        ? Response.json({ error: "Duplicate" }, { status: 400 })
        : new Response("%PDF-other");
    await assert.rejects(
      () =>
        putPrivateObject(
          "originals/" +
            createHash("sha256").update(contents).digest("hex") +
            ".pdf",
          contents,
        ),
      /sobrescribir/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("Netlify without a remote database cannot create an ephemeral SQLite bank", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "require('./lib/db.ts').getDB()"],
    {
      env: { ...process.env, GC_REMOTE_ONLY: "1", DATABASE_URL: "" },
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /se prohíbe crear/);
});
