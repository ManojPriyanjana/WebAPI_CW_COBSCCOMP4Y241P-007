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
