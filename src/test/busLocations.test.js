import request from 'supertest'
import mongoose from 'mongoose'
import argon2 from 'argon2'
import Bus from '../modules/buses/bus.model.js'
import User from '../modules/users/users.model.js'
import Route from '../modules/routes/routes.model.js'
import Stop from '../modules/stops/stop.model.js'
import Trip from '../modules/trips/trip.model.js'
import LocationUpdate from '../modules/locations/locationUpdate.model.js'
import { buildEtaPayload } from '../modules/locations/etaEstimator.js'

const base = () => process.env.TEST_BASE_URL

const PASSWORD = 'Passw0rd!'

let cachedOperator

async function ensureOperatorAccount() {
  if (cachedOperator) {
    const stillExists = await User.exists({ _id: cachedOperator.id })
    if (stillExists) return cachedOperator
  }

  const email = `operator-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@test.com`
  const passwordHash = await argon2.hash(PASSWORD)
  const user = await User.create({ email, passwordHash, role: 'operator' })
  cachedOperator = { email, id: user._id.toString() }
  return cachedOperator
}

async function getOperatorToken() {
  const { email } = await ensureOperatorAccount()
  const loginRes = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(loginRes.status).toBe(200)
  return loginRes.body.accessToken
}

async function getOperatorId() {
  const { id } = await ensureOperatorAccount()
  return id
}

async function createBusDoc() {
  const regNo = `BUS-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const operatorId = await getOperatorId()
  const bus = await Bus.create({ regNo, operator: 'Test Operator', capacity: 40, operatorId })
  return bus._id.toString()
}

async function createForeignOperatorToken() {
  const email = `other-operator-${Date.now()}@test.com`
  const passwordHash = await argon2.hash(PASSWORD)
  await User.create({ email, passwordHash, role: 'operator' })
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return login.body.accessToken
}

async function seedTripForBus(busId, ownerId, referenceTime = Date.now()) {
  const routeCode = `RT-${referenceTime}`
  const route = await Route.create({
    code: routeCode,
    name: 'Location ETA Test Route',
    provinceFrom: 'Western',
    provinceTo: 'Central',
    distanceKm: 120,
  })

  const stopKey = referenceTime
  const [fromStop, toStop] = await Stop.create([
    {
      code: `ST-F-${stopKey}`,
      name: 'Central Depot',
      location: { type: 'Point', coordinates: [79.85, 6.93] },
    },
    {
      code: `ST-T-${stopKey}`,
      name: 'Northern Terminal',
      location: { type: 'Point', coordinates: [80.02, 7.05] },
    },
  ])

  const serviceDate = new Date(referenceTime)
  serviceDate.setHours(0, 0, 0, 0)
  const schedDepart = new Date(referenceTime - 5 * 60000)
  const schedArrive = new Date(referenceTime + 45 * 60000)

  const trip = await Trip.create({
    routeId: route._id,
    busId,
    fromStopId: fromStop._id,
    toStopId: toStop._id,
    serviceDate,
    schedDepart,
    schedArrive,
    status: 'ONGOING',
    ownerId,
  })

  return { route, fromStop, toStop, trip, referenceTime, schedDepart, schedArrive }
}

describe('Bus location endpoints', () => {
  test('operator can create locations and latest endpoint returns newest point with caching headers', async () => {
    const operatorToken = await getOperatorToken()
    const busId = await createBusDoc()
    const ownerId = await getOperatorId()
    const { trip, toStop, referenceTime } = await seedTripForBus(busId, ownerId)

    const samplePoints = [
      { lat: 6.94, lon: 79.88, speedKph: 42, ts: new Date(referenceTime - 4 * 60000).toISOString() },
      { lat: 6.98, lon: 79.94, speedKph: 44, ts: new Date(referenceTime - 2 * 60000).toISOString() },
      { lat: 7.01, lon: 80.00, speedKph: 46, ts: new Date(referenceTime - 60000).toISOString() },
    ]

    const unauth = await request(base()).post(`/api/v1/buses/${busId}/locations`).send({ lat: 6.9, lon: 79.9 })
    expect(unauth.status).toBe(401)

    for (const point of samplePoints) {
      const createRes = await request(base())
        .post(`/api/v1/buses/${busId}/locations`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(point)
      expect(createRes.status).toBe(201)
      expect(createRes.body.data.busId).toBe(busId)
    }

    const latestRes = await request(base()).get(`/api/v1/buses/${busId}/locations/latest`)
    expect(latestRes.status).toBe(200)
    expect(latestRes.body.data.busId).toBe(busId)
    expect(latestRes.body.data.lat).toBeCloseTo(samplePoints.at(-1).lat)
    expect(latestRes.body.data.lon).toBeCloseTo(samplePoints.at(-1).lon)
    expect(latestRes.headers.etag).toBeDefined()
    expect(latestRes.headers['last-modified']).toBeDefined()
    expect(latestRes.headers['cache-control']).toBe('no-store')

    const latestDoc = await LocationUpdate.findOne({ busId })
      .sort({ ts: -1, createdAt: -1 })
      .lean()
      .exec()
    const populatedTrip = await Trip.findById(trip._id)
      .populate('fromStopId', 'name location')
      .populate('toStopId', 'name location')
      .lean()
      .exec()
    const recentSamples = await LocationUpdate.find({ busId })
      .sort({ ts: -1, createdAt: -1 })
      .limit(5)
      .lean()
      .exec()

    const reference = latestDoc?.ts ? new Date(latestDoc.ts) : latestDoc?.createdAt ? new Date(latestDoc.createdAt) : new Date()
    const expectedEta = populatedTrip
      ? buildEtaPayload({
          now: reference,
          latestSample: latestDoc,
          trip: populatedTrip,
          recentSamples,
        })
      : null

  expect(expectedEta).not.toBeNull()
  expect(latestRes.body.data.estimates).not.toBeNull()
    expect(latestRes.body.data.estimates.destination.name).toBe(toStop.name)
    expect(latestRes.body.data.estimates.destination.etaMinutes).toBe(expectedEta.destination.etaMinutes)
    expect(latestRes.body.data.estimates.nextStop.name).toBe(expectedEta.nextStop.name)
    expect(latestRes.body.data.estimates.nextStop.etaMinutes).toBe(expectedEta.nextStop.etaMinutes)
    expect(latestRes.body.data.estimates.delayMinutes).toBe(expectedEta.delayMinutes)

    const cached = await request(base())
      .get(`/api/v1/buses/${busId}/locations/latest`)
      .set('If-None-Match', latestRes.headers.etag)
    expect(cached.status).toBe(304)
  })

  test('history endpoint supports time, bbox, and limit filters', async () => {
    const operatorToken = await getOperatorToken()
    const busId = await createBusDoc()
    const now = Date.now()

    const payloads = [
      { lat: 6.9, lon: 79.8, ts: new Date(now - 120000).toISOString(), speedKph: 30 },
      { lat: 7.0, lon: 80.0, ts: new Date(now - 60000).toISOString(), heading: 90 },
      { lat: 9.0, lon: 82.0, ts: new Date(now - 30000).toISOString(), accuracyM: 10 },
    ]

    for (const body of payloads) {
      const res = await request(base())
        .post(`/api/v1/buses/${busId}/locations`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(body)
      expect(res.status).toBe(201)
    }

    const since = new Date(now - 90000).toISOString()
    const until = new Date(now - 10000).toISOString()
    const historyRes = await request(base()).get(
      `/api/v1/buses/${busId}/locations/history?since=${encodeURIComponent(since)}&until=${encodeURIComponent(
        until
      )}&bbox=${encodeURIComponent('79.5,6.5,80.5,7.5')}&limit=2`
    )

    expect(historyRes.status).toBe(200)
    expect(Array.isArray(historyRes.body.data)).toBe(true)
    expect(historyRes.body.data.length).toBeLessThanOrEqual(2)
    expect(historyRes.body.data.every((p) => p.lat >= 6.5 && p.lat <= 7.5)).toBe(true)
    expect(historyRes.body.meta.limit).toBe(2)
  expect(historyRes.body.meta.since).toMatch(/Z$/)
  expect(historyRes.body.meta.until).toMatch(/Z$/)
    expect(historyRes.headers.etag).toBeDefined()
    expect(historyRes.headers['cache-control']).toBe('no-store')
  })

  test('validation errors return 422 and unknown bus returns 404', async () => {
    const operatorToken = await getOperatorToken()
    const busId = await createBusDoc()

    const invalid = await request(base())
      .post(`/api/v1/buses/${busId}/locations`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ lat: 123, lon: 200 })
    expect(invalid.status).toBe(422)

    const fakeId = new mongoose.Types.ObjectId().toString()
    const notFound = await request(base()).get(`/api/v1/buses/${fakeId}/locations/latest`)
    expect(notFound.status).toBe(404)
  })

  test('operators cannot mutate locations for buses owned by other operators', async () => {
    const operatorToken = await getOperatorToken()
    const busId = await createBusDoc()
    const otherOperatorToken = await createForeignOperatorToken()

    const forbidden = await request(base())
      .post(`/api/v1/buses/${busId}/locations`)
      .set('Authorization', `Bearer ${otherOperatorToken}`)
      .send({ lat: 6.9, lon: 79.9 })

    expect(forbidden.status).toBe(403)
  })
})

describe('Location rate limiting', () => {
  test('write endpoint enforces tighter rate limits', async () => {
    const operatorToken = await getOperatorToken()
    const busId = await createBusDoc()

    for (let i = 0; i < 5; i += 1) {
      const res = await request(base())
        .post(`/api/v1/buses/${busId}/locations`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ lat: 6.9 + i * 0.001, lon: 79.8 + i * 0.001 })
      expect(res.status).toBe(201)
      expect(res.headers['ratelimit-limit']).toBeDefined()
    }

    const limited = await request(base())
      .post(`/api/v1/buses/${busId}/locations`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ lat: 6.95, lon: 79.85 })

    expect(limited.status).toBe(429)
    expect(limited.body.error.message).toMatch(/Too many location updates/i)
    expect(limited.headers['ratelimit-limit']).toBeDefined()
    expect(limited.headers['ratelimit-remaining']).toBeDefined()
  })
})
