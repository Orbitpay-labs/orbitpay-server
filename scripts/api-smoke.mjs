import { spawn } from "node:child_process";

const port = 8899;
const child = spawn(process.execPath, ["dist/server.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore"
});

async function request(path, options) {
  let lastError;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, options);

      if (response.status < 500) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw lastError || new Error(`API did not respond for ${path}`);
}

try {
  const health = await request("/health");
  const healthJson = await health.json();

  if (!healthJson.ok) {
    throw new Error("Health check did not return ok: true");
  }

  const session = await request("/funding-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: "CC4VBD5EBGTEJQ7YAHU3MVP7SP2JNCQX6M6NPVZV4LQWF3N9QP",
      asset: "USDC",
      amount: "45.00"
    })
  });

  const sessionJson = await session.json();

  if (session.status !== 201 || sessionJson.status !== "created") {
    throw new Error("Funding session smoke check failed");
  }

  console.log("API smoke test passed.");
} finally {
  child.kill();
}
