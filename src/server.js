import http from 'http'
import dotenv from 'dotenv'
import app from './app.js'
import { connectDB } from './config/db.js'

dotenv.config()

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
const server = http.createServer(app)

async function start() {
  const skipDb = process.env.SKIP_DB === 'true'
  if (!skipDb) {
    await connectDB()
  } else {
    // eslint-disable-next-line no-console
    console.warn('SKIP_DB is true: starting server without MongoDB connection')
  }
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default server
