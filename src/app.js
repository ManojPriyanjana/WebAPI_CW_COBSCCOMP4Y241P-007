import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import healthRouter from './routes/health.js'
import apiRouter from './routes/index.js'
import sseRouter from './routes/sse.js'
import authRouter from './modules/auth/auth.router.js'
import requestId from './middleware/requestId.js'
import logger from './middleware/logger.js'
import conditionalGet from './middleware/conditionalGet.js'
import { notFound, errorHandler } from './middleware/errors.js'

const app = express()

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
	.split(',')
	.map((o) => o.trim())
	.filter(Boolean)

const exposedCacheHeaders = ['ETag', 'Last-Modified', 'Cache-Control', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
const exposedRateHeaders = ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']

const corsOptionsDelegate = (req, callback) => {
	if (req.method === 'GET' || req.method === 'HEAD') {
		callback(null, {
			origin: true,
			methods: ['GET', 'HEAD', 'OPTIONS'],
			exposedHeaders: exposedCacheHeaders,
		})
		return
	}

	callback(null, {
		origin: allowedOrigins.length ? allowedOrigins : false,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		exposedHeaders: exposedRateHeaders,
	})
}

// Security headers
app.use(helmet())

// CORS
app.use(cors(corsOptionsDelegate))

// JSON body parsing
app.use(express.json())

// Observability middlewares
app.use(requestId)
app.use(logger)
// Conditional GET for GET responses (ETag/Last-Modified)
app.use(conditionalGet)

// Routes
app.use('/', healthRouter)
app.use('/', sseRouter)
app.use('/auth', authRouter)
app.use('/api/v1', apiRouter)

// 404 and error handling
app.use(notFound)
app.use(errorHandler)

export default app
