import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import healthRouter from './routes/health.js'

const app = express()

// Security headers
app.use(helmet())

// CORS
app.use(cors())

// JSON body parsing
app.use(express.json())

// Routes
app.use('/', healthRouter)

export default app
