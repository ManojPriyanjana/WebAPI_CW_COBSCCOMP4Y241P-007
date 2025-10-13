import http from 'http'
import mongoose from 'mongoose'
import request from 'supertest'
import Trip from '../modules/trips/trip.model.js'
import Route from '../modules/routes/routes.model.js'
import Bus from '../modules/buses/bus.model.js'
import Stop from '../modules/stops/stop.model.js'
import Alert from '../modules/alerts/alerts.model.js'

const base = () => process.env.TEST_BASE_URL

async function createTripWithDependencies(status = 'SCHEDULED') {
  const now = new Date()

  const route = await Route.create({
    code: `RT-${Date.now()}`,
    name: 'Trip Status Stream Route',
    provinceFrom: 'Western',
    provinceTo: 'Central',
    distanceKm: 100,
  })

  const [fromStop, toStop] = await Stop.create([
    {
      code: `ST-A-${Date.now()}`,
      name: 'Origin Stop',
      location: { type: 'Point', coordinates: [79.86, 6.92] },
    },
    {
      code: `ST-B-${Date.now()}`,
      name: 'Destination Stop',
      location: { type: 'Point', coordinates: [79.95, 6.97] },
    },
  ])

  const bus = await Bus.create({
    regNo: `BUS-${Date.now()}`,
    operator: 'Stream Operator',
    capacity: 45,
    operatorId: new mongoose.Types.ObjectId(),
  })

  const schedDepart = new Date(now.getTime() + 5 * 60000)
  const schedArrive = new Date(now.getTime() + 65 * 60000)
  const serviceDate = new Date(now)
  serviceDate.setHours(0, 0, 0, 0)

  const trip = await Trip.create({
    routeId: route._id,
    busId: bus._id,
    fromStopId: fromStop._id,
    toStopId: toStop._id,
    serviceDate,
    schedDepart,
    schedArrive,
    status,
  })

  return { trip, route, bus, fromStop, toStop }
}

describe('Trip status SSE stream', () => {
  test('returns 404 when trip is missing', async () => {
    const missingTripId = new mongoose.Types.ObjectId().toString()
    const res = await request(base()).get(`/stream/trips/${missingTripId}/status`)
    expect(res.status).toBe(404)
  })

  test('emits initial status and active alerts payload', async () => {
    const { trip } = await createTripWithDependencies()
    const now = new Date()

    await Alert.create({
      tripId: trip._id,
      severity: 'warning',
      message: 'Bridge delay ahead',
      validFrom: new Date(now.getTime() - 5 * 60000),
      validTo: new Date(now.getTime() + 15 * 60000),
    })

    const streamUrl = new URL(`/stream/trips/${trip._id}/status`, base())

    await new Promise((resolve, reject) => {
      let resolved = false
      const req = http.get(streamUrl, { headers: { Accept: 'text/event-stream' } }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Unexpected status: ${res.statusCode}`))
          return
        }
        expect(res.headers['content-type']).toContain('text/event-stream')
        let buffer = ''
        res.on('data', (chunk) => {
          buffer += chunk.toString()
          if (
            buffer.includes('event: status') &&
            buffer.includes('"kind":"trip-status"') &&
            buffer.includes('"kind":"alert"') &&
            buffer.includes('Bridge delay ahead') &&
            !resolved
          ) {
            resolved = true
            req.destroy()
            resolve()
          }
        })
      })

      req.on('error', (err) => {
        if (resolved && (err.code === 'ECONNRESET' || err.message === 'socket hang up')) {
          return
        }
        reject(err)
      })
    })
  })
})
