import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);

interface FundingSession {
  id: string;
  network: string;
  sourceType: string;
  destination: string;
  asset: string;
  amount: string;
  status: "created";
  expiresAt: string;
  createdAt: string;
}

interface PaymentIntent {
  id: string;
  merchant: string;
  invoice: string;
  amount: string;
  asset: string;
  status: "requires_payment";
  paymentUrl: string;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  receivedAt: string;
  body: unknown;
}

interface IntegrationSurface {
  id: string;
  title: string;
  area: "client" | "server" | "contracts";
  status: "planned" | "scaffolded";
}

interface AppStore {
  fundingSessions: Map<string, FundingSession>;
  paymentIntents: Map<string, PaymentIntent>;
  webhooks: WebhookEvent[];
}

type JsonObject = Record<string, unknown>;

const store: AppStore = {
  fundingSessions: new Map(),
  paymentIntents: new Map(),
  webhooks: []
};

const integrationSurfaces: IntegrationSurface[] = [
  {
    id: "OPK-001",
    title: "Hosted checkout for invoices and deposits",
    area: "client",
    status: "scaffolded"
  },
  {
    id: "OPK-002",
    title: "Payment intent API for app backends",
    area: "server",
    status: "scaffolded"
  },
  {
    id: "OPK-003",
    title: "C-address funding session builder",
    area: "server",
    status: "scaffolded"
  },
  {
    id: "OPK-004",
    title: "Soroban-ready contract intent model",
    area: "contracts",
    status: "planned"
  }
];

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request: IncomingMessage): Promise<JsonObject> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonObject;
  } catch {
    const error = new Error("Invalid JSON body") as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
}

function stringField(body: JsonObject, key: string, fallback = ""): string {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function createFundingSession(body: JsonObject): FundingSession {
  const now = new Date().toISOString();
  const session: FundingSession = {
    id: `fs_${randomUUID()}`,
    network: stringField(body, "network", "testnet"),
    sourceType: stringField(body, "sourceType", "stellar-wallet"),
    destination: stringField(body, "destination"),
    asset: stringField(body, "asset", "USDC"),
    amount: stringField(body, "amount", "0"),
    status: "created",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: now
  };

  store.fundingSessions.set(session.id, session);
  return session;
}

function createPaymentIntent(body: JsonObject): PaymentIntent {
  const invoice = stringField(body, "invoice", "OP-1000");
  const intent: PaymentIntent = {
    id: `pi_${randomUUID()}`,
    merchant: stringField(body, "merchant", "Demo merchant"),
    invoice,
    amount: stringField(body, "amount", "0"),
    asset: stringField(body, "asset", "USDC"),
    status: "requires_payment",
    paymentUrl: `https://pay.orbitkit.dev/i/${encodeURIComponent(invoice)}`,
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

    if (request.method === "GET" && url.pathname === "/integration-surfaces") {
      return sendJson(response, 200, { surfaces: integrationSurfaces });
    }

    if (request.method === "POST" && url.pathname === "/funding-sessions") {
      const body = await readJson(request);

      if (!stringField(body, "destination")) {
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
      const event: WebhookEvent = {
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
    const err = error as Error & { statusCode?: number };
    return sendJson(response, err.statusCode || 500, {
      error: err.message || "Unexpected server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`OrbitPay API listening on http://localhost:${PORT}`);
});

