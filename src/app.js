import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import healthRouter from './routes/health.js'
import requestId from './middleware/requestId.js'
import logger from './middleware/logger.js'
import { notFound, errorHandler } from './middleware/errors.js'

const app = express()

// Security headers
app.use(helmet())

// CORS
app.use(cors())

// JSON body parsing
app.use(express.json())

// Observability middlewares
app.use(requestId)
app.use(logger)

// Routes
app.use('/', healthRouter)

// 404 and error handling
app.use(notFound)
app.use(errorHandler)

export default app
