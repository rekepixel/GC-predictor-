import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/[...path]/route";

const context = (action: string) => ({
  params: Promise.resolve({ path: [action] }),
});

test("legacy access endpoints need no password, session or database", async () => {
  for (const action of ["login", "logout"]) {
    const result = await POST(
      new NextRequest(`https://example.test/api/${action}`, { method: "POST" }),
      context(action),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.match(result.headers.get("set-cookie") || "", /gc-session=;/);
  }
});

test("cross-origin writes stay blocked without a password gate", async () => {
  const result = await POST(
    new NextRequest("https://example.test/api/login", {
      method: "POST",
      headers: { origin: "https://other.test" },
    }),
    context("login"),
  );
  assert.equal(result.status, 403);
});

test("anonymous study requests reach service initialization without credentials", async () => {
  const keys = [
    "GC_REMOTE_ONLY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const before = keys.map((key) => process.env[key]);
  try {
    process.env.GC_REMOTE_ONLY = "1";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await GET(
      new NextRequest("https://example.test/api/exam-home"),
      context("exam-home"),
    );
    assert.equal(result.status, 400);
    assert.deepEqual(await result.json(), {
      error: "Falta configurar el almacenamiento privado de Supabase.",
    });
  } finally {
    keys.forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    });
  }
});
