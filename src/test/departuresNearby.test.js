import request from 'supertest'
import Route from '../modules/routes/routes.model.js'
import Bus from '../modules/buses/bus.model.js'
import Stop from '../modules/stops/stop.model.js'
import Trip from '../modules/trips/trip.model.js'
import { combineServiceDateAndTime, getServiceDateRange } from '../utils/datetime.js'

const base = () => process.env.TEST_BASE_URL

async function seedCoreEntities() {
  const route = await Route.create({
    code: `RT-${Date.now()}`,
    name: 'Downtown Loop',
    provinceFrom: 'Western',
    provinceTo: 'Western',
    distanceKm: 18,
  })

  const bus = await Bus.create({
    regNo: `NB-${Date.now()}`,
    operator: 'Metro Transit',
    capacity: 45,
  })

  return { route, bus }
}

describe('GET /api/v1/departures/nearby', () => {
  test('returns departures within radius sorted by departure time', async () => {
    const { route, bus } = await seedCoreEntities()

    const [origin, nearby, distant] = await Stop.create([
      {
        code: `ST-${Date.now()}`,
        name: 'Central Station',
        location: { type: 'Point', coordinates: [79.861, 6.927] },
      },
      {
        code: `ST-${Date.now() + 1}`,
        name: 'Park Avenue',
        location: { type: 'Point', coordinates: [79.8645, 6.9285] },
      },
      {
        code: `ST-${Date.now() + 2}`,
        name: 'Harbor Front',
        location: { type: 'Point', coordinates: [79.905, 6.92] },
      },
    ])

    const serviceDate = getServiceDateRange('2025-12-01').start

    await Trip.create([
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: origin._id,
        toStopId: nearby._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-12-01', '08:30'),
        schedArrive: combineServiceDateAndTime('2025-12-01', '09:30'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: nearby._id,
        toStopId: origin._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-12-01', '08:45'),
        schedArrive: combineServiceDateAndTime('2025-12-01', '09:35'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: origin._id,
        toStopId: nearby._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-12-01', '09:15'),
        schedArrive: combineServiceDateAndTime('2025-12-01', '10:05'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: distant._id,
        toStopId: origin._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-12-01', '08:35'),
        schedArrive: combineServiceDateAndTime('2025-12-01', '09:45'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: origin._id,
        toStopId: nearby._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-12-01', '11:00'),
        schedArrive: combineServiceDateAndTime('2025-12-01', '12:00'),
        status: 'SCHEDULED',
      },
    ])

    const res = await request(base())
      .get('/api/v1/departures/nearby')
      .query({
        lat: '6.927',
        lng: '79.861',
        radiusMeters: '600',
        date: '2025-12-01',
        startTime: '08:00',
        endTime: '10:00',
      })

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(3)
    expect(res.body.data).toHaveLength(3)

    const departureTimes = res.body.data.map((item) => item.schedDepart)
    expect(departureTimes).toEqual([...departureTimes].sort())

    res.body.data.forEach((item) => {
      expect(item.stop).toBeDefined()
      expect(item.stop.id).toBeDefined()
      expect(item.stop.name).toBeDefined()
      expect(item.stop.distanceMeters).toBeGreaterThanOrEqual(0)
      expect(item.stop.distanceMeters).toBeLessThanOrEqual(600)
    })
  })

  test('validates required coordinates', async () => {
    const res = await request(base())
      .get('/api/v1/departures/nearby')
      .query({
        lng: '79.861',
        radiusMeters: '400',
        date: '2025-12-01',
        startTime: '08:00',
        endTime: '09:00',
      })

    expect(res.status).toBe(422)
    expect(res.body.error?.message ?? '').toMatch(/lat/i)
  })
})
