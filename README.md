# OrbitPay Server

Zero-dependency Node API scaffold for OrbitPay Kit.

## Scope

This server exposes the API shape needed by the MVP client:

- `GET /health`
- `POST /funding-sessions`
- `POST /payment-intents`
- `POST /webhooks/stellar`
- `GET /integration-surfaces`

The MVP stores data in memory. Production contributors should replace this with persistent storage, real Stellar RPC/Horizon lookups, webhook retries, auth, and merchant API keys.

## Run

```powershell
node dist/server.mjs
```

The API listens on `http://localhost:8787`.

## TypeScript

The API source lives in `src/server.mts` and compiles to `dist/server.mjs`.

```powershell
npm install
npm run build
```

## Contributor Tracks

- Add Stellar SDK integration.
- Add payment intent persistence.
- Add webhook retry queue.
- Add merchant API key authentication.
- Add unit tests and contract integration tests.
