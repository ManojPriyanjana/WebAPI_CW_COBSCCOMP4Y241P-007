import { jest } from '@jest/globals'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import http from 'http'
import { generateKeyPairSync } from 'crypto'

jest.setTimeout(20000)

dotenv.config()

const MONGO_URI_TEST = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let server
let app

function ensureJwtKeys() {
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) return
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  process.env.JWT_PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' })
  process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'pkcs1', format: 'pem' })
}

beforeAll(async () => {
  ensureJwtKeys()
  if (!MONGO_URI_TEST) throw new Error('MONGO_URI_TEST not set')
  await mongoose.connect(MONGO_URI_TEST, { dbName: 'webapi_cw_test' })
  await mongoose.connection.db.dropDatabase()
  if (!app) {
    const appModule = await import('../app.js')
    app = appModule.default
  }
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
