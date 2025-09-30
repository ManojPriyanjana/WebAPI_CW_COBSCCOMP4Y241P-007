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

## MongoDB setup

1. Create a database and get a connection string (MongoDB Atlas or local). Example:
	 `MONGO_URI=mongodb+srv://<user>:<pass>@cluster.example.mongodb.net/mydb`
2. Create a `.env` file in project root:

```
PORT=4000
MONGO_URI=your-connection-string-here
```

3. Seed demo routes (first time only):

```powershell
node scripts/seedRoutes.js
```

4. Start the server (connects to MongoDB before listening):

```powershell
npm start
```

### Routes API

- List: `GET /api/v1/routes`
	- Query: `page`, `limit` (max 100), `sort` (e.g., `name` or `-name`), `filter[name]`, `filter[provinceFrom]`, `filter[provinceTo]`
	- Response: `{ data, page, limit, total }`
- Get by id: `GET /api/v1/routes/:id`
 - Get by code: `GET /api/v1/routes/by-code/:code`

### No-DB startup (for UI/dev only)

If you want to run the API without connecting to MongoDB (health/UI dev), use:

```powershell
npm run start:nodb
# or
npm run dev:nodb
```
