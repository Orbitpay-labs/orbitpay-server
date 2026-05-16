import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);

const store = {
  fundingSessions: new Map(),
  paymentIntents: new Map(),
  webhooks: []
};

const contributorIssues = [
  {
    id: "OPK-001",
    title: "Implement Stellar payment watcher",
    area: "server",
    difficulty: "medium"
  },
  {
    id: "OPK-002",
    title: "Add merchant API key auth",
    area: "server",
    difficulty: "medium"
  },
  {
    id: "OPK-003",
    title: "Build webhook retry queue",
    area: "server",
    difficulty: "hard"
  },
  {
    id: "OPK-004",
    title: "Connect funding sessions to Soroban contract",
    area: "contracts",
    difficulty: "hard"
  }
];

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

function createFundingSession(body) {
  const now = new Date().toISOString();
  const session = {
    id: `fs_${randomUUID()}`,
    network: body.network || "testnet",
    sourceType: body.sourceType || "stellar-wallet",
    destination: body.destination,
    asset: body.asset || "USDC",
    amount: body.amount || "0",
    status: "created",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: now
  };

  store.fundingSessions.set(session.id, session);
  return session;
}

function createPaymentIntent(body) {
  const intent = {
    id: `pi_${randomUUID()}`,
    merchant: body.merchant || "Demo merchant",
    invoice: body.invoice || "OP-1000",
    amount: body.amount || "0",
    asset: body.asset || "USDC",
    status: "requires_payment",
    paymentUrl: `https://pay.orbitkit.dev/i/${encodeURIComponent(body.invoice || "op-1000")}`,
    createdAt: new Date().toISOString()
  };

  store.paymentIntents.set(intent.id, intent);
  return intent;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    return sendJson(response, 204, {});
  }

  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, {
        ok: true,
        name: "orbitpay-server",
        network: "stellar-testnet",
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "GET" && url.pathname === "/contributor-issues") {
      return sendJson(response, 200, { issues: contributorIssues });
    }

    if (request.method === "POST" && url.pathname === "/funding-sessions") {
      const body = await readJson(request);

      if (!body.destination) {
        return sendJson(response, 422, {
          error: "destination is required"
        });
      }

      return sendJson(response, 201, createFundingSession(body));
    }

    if (request.method === "POST" && url.pathname === "/payment-intents") {
      const body = await readJson(request);
      return sendJson(response, 201, createPaymentIntent(body));
    }

    if (request.method === "POST" && url.pathname === "/webhooks/stellar") {
      const body = await readJson(request);
      const event = {
        id: `evt_${randomUUID()}`,
        receivedAt: new Date().toISOString(),
        body
      };
      store.webhooks.push(event);
      return sendJson(response, 202, event);
    }

    return sendJson(response, 404, {
      error: "Not found",
      path: url.pathname
    });
  } catch (error) {
    return sendJson(response, error.statusCode || 500, {
      error: error.message || "Unexpected server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`OrbitPay API listening on http://localhost:${PORT}`);
});

