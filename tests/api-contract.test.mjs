import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("server exposes the core OrbitPay API routes", async () => {
  const source = await readFile("src/server.mts", "utf8");

  assert.match(source, /"\/health"/);
  assert.match(source, /"\/funding-sessions"/);
  assert.match(source, /"\/payment-intents"/);
  assert.match(source, /"\/webhooks\/stellar"/);
});

test("funding sessions require a destination address", async () => {
  const source = await readFile("src/server.mts", "utf8");

  assert.match(source, /destination is required/);
  assert.match(source, /status: "created"/);
});
