import { test } from "node:test";
import assert from "node:assert/strict";
import {
  secureEqual,
  sessionToken,
  verifySession,
  localOpen,
  configured,
} from "../lib/auth";
test("session signature tampering is rejected", () => {
  const token = sessionToken();
  assert.equal(verifySession(token), true);
  assert.equal(verifySession(token + "x"), false);
  assert.equal(verifySession("forged.session"), false);
  assert.equal(secureEqual("secret", "Secret"), false);
});
test("development exception restricted to loopback and disabled by password", () => {
  delete process.env.PRIVATE_APP_PASSWORD;
  assert.equal(localOpen("127.0.0.1:3000"), true);
  assert.equal(localOpen("evil.test"), false);
  assert.equal(localOpen("localhost.evil.test"), false);
  process.env.PRIVATE_APP_PASSWORD = "test";
  assert.equal(localOpen("localhost:3000"), false);
  delete process.env.PRIVATE_APP_PASSWORD;
});
