# WebAPI_CW_COBSCCOMP241P-007

# Express API Scaffold (ESM)

## Run locally

1. Install dependencies
2. Start the dev server with auto-reload

### Scripts

- dev: runs nodemon on src/server.js
- start: runs node on src/server.js

## Quickstart

```powershell
npm install
npm run dev
```

Visit http://localhost:3000/healthz to see `{ "status": "ok" }`.

## Observability and error handling

- Structured logging via Pino (with pretty logs in non-production)
- Each request has a unique `X-Request-Id` header; it's also available on `req.id`
- Centralized error handling returns JSON:

```
{ "error": { "code": <statusCode>, "message": "<message>" } }
```

Use the `X-Request-Id` value to correlate logs with API responses.
