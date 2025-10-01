import dotenv from 'dotenv'
import mongoose from 'mongoose'
import app from '../app.js'
import http from 'http'

dotenv.config()

const MONGO_URI_TEST = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let server

beforeAll(async () => {
  if (!MONGO_URI_TEST) throw new Error('MONGO_URI_TEST not set')
  await mongoose.connect(MONGO_URI_TEST, { dbName: 'webapi_cw_test' })
  await mongoose.connection.db.dropDatabase()
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const addr = server.address()
  process.env.TEST_BASE_URL = `http://127.0.0.1:${addr.port}`
})

afterEach(async () => {
  await mongoose.connection.db.dropDatabase()
})

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})
