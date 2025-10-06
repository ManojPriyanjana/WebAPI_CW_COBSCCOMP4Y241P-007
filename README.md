# WebAPI_CW_COBSCCOMP241P-007

# Express API Scaffold (ESM)

> **Server entry point:** `src/server.js` (the legacy root-level `server.js` has been removed).

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

> **Heads up:** If you see `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'cors'`, it means dependencies were not installed. Run `npm install` (or `npm ci`) once after cloning and the server will start normally—`cors` and the rest of the runtime deps are already tracked in `package.json`/`package-lock.json`.

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
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
```

3. Seed demo routes (first time only):

```powershell
node scripts/seedRoutes.js
```

4. Start the server (connects to MongoDB before listening):

```powershell
npm start
```

## Simulation Data

- Generate a rolling week of trip schedules:

  ```powershell
  node scripts/generateSimulationData.js --startDate 2025-10-06 --days 7 --csv
  ```

  - `--startDate` is any ISO date (defaults to today if omitted).
  - `--days` defaults to 7; `--routeInterval`/`--busInterval` control minute gaps (defaults 5 and 25 respectively, short forms `--routes` and `--buses` also work).
  - Passing `--csv` adds CSV mirrors for each JSON file; the JSON output alone already satisfies the project brief.
  - Files land in `data/` as one JSON per day (`trips-YYYYMMDD.json`) plus an aggregate `simulation-week.json` (and optional `simulation-week.csv`).

- Seed Mongo with the generated trips (routes/buses are upserted automatically):

  ```powershell
  node scripts/seedWeekTrips.js
  ```

  Add `--file <path>` if your dataset lives somewhere else.

## Authentication (JWT RS256)

- Required env vars: `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (PEM strings). For development you can generate a key pair with OpenSSL:

```powershell
# Private key
openssl genrsa -out private.pem 2048
# Public key
openssl rsa -in private.pem -pubout -out public.pem
```

Put the PEM contents into your `.env` as quoted multi-line strings (see above). On Windows PowerShell, escape newlines with `\n` inside the quoted string or use a `.env` with actual newlines.

### Auth endpoints

- POST `/auth/register` { email, password, role? }
  - If no users exist, the first registered becomes `admin`.
  - Only an `admin` should create other roles in production.
- POST `/auth/login` { email, password } -> `{ accessToken, refreshToken }`
- POST `/auth/refresh` { refreshToken } -> `{ accessToken }`
- POST `/auth/logout` { refreshToken } -> `{ success: true }`

Access tokens expire in 15 minutes; refresh tokens in 7 days. Use the `Authorization: Bearer <accessToken>` header for protected endpoints.

### RBAC protections

- Write routes for Buses and Trips require role `admin` or `operator`:
  - POST `/api/v1/buses`
  - POST `/api/v1/trips`

  ## Testing

  Set `MONGO_URI_TEST` in your `.env` to a separate database (it will be dropped during tests). Then run:

  ```powershell
  npm test
  ```

  This runs Jest in-band with Supertest and generates coverage in the `coverage/` folder. Watch mode:

  ```powershell
  npm run test:watch
  ```

### Routes API

- List: `GET /api/v1/routes`
  - Query: `page`, `limit` (max 100), `sort` (e.g., `name` or `-name`), `filter[name]`, `filter[provinceFrom]`, `filter[provinceTo]`
  - Response: `{ data, page, limit, total }`
- Get by id: `GET /api/v1/routes/:id`
- Get by code: `GET /api/v1/routes/by-code/:code`

### Bus location endpoints

- `POST /api/v1/buses/:id/locations`
  - Requires `Authorization: Bearer <token>` for users with the `operator` role.
  - Body: `{ lat, lon, ts?, speedKph?, heading?, accuracyM? }`
    - `lat`/`lon` are required, validated against geographic bounds.
    - `ts` defaults to the server time when omitted.
    - Optional telemetry fields (`speedKph`, `heading`, `accuracyM`) are stored when supplied.
  - Rate limited to 60 requests per minute per IP. Standard headers surface limits and remaining quota:
    - `RateLimit-Limit`
    - `RateLimit-Remaining`
    - `RateLimit-Reset`
- `GET /api/v1/buses/:id/locations/latest`
  - Returns the most recent location update (`{ data: { ... } }`), or `null` if no samples exist yet.
- `GET /api/v1/buses/:id/locations/history`
  - Query parameters: `since`, `until`, `limit` (default 500, max 1000), `bbox=lon1,lat1,lon2,lat2` for rectangular geo filtering.
  - Response: `{ data: [ ... ], meta: { limit, since?, until?, bbox? } }`.

All GET responses participate in conditional caching. Provide `If-None-Match` or `If-Modified-Since` to receive `304 Not Modified` when the underlying data is unchanged; responses include both `ETag` and `Last-Modified` headers.

### No-DB startup (for UI/dev only)

If you want to run the API without connecting to MongoDB (health/UI dev), use:

```powershell
npm run start:nodb
# or
npm run dev:nodb
```
