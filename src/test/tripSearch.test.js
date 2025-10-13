import request from 'supertest'
import Route from '../modules/routes/routes.model.js'
import Bus from '../modules/buses/bus.model.js'
import Stop from '../modules/stops/stop.model.js'
import Trip from '../modules/trips/trip.model.js'
import { combineServiceDateAndTime, getServiceDateRange } from '../utils/datetime.js'

const base = () => process.env.TEST_BASE_URL

async function seedStops() {
  const [fromStop, toStop, otherStop] = await Stop.create([
    {
      code: `STO-${Date.now()}`,
      name: 'Origin Terminal',
      location: { type: 'Point', coordinates: [79.861, 6.927] },
    },
    {
      code: `STD-${Date.now() + 1}`,
      name: 'Destination Terminal',
      location: { type: 'Point', coordinates: [80.027, 7.001] },
    },
    {
      code: `STX-${Date.now() + 2}`,
      name: 'Alternate Terminal',
      location: { type: 'Point', coordinates: [80.112, 6.901] },
    },
  ])
  return { fromStop, toStop, otherStop }
}

describe('GET /api/v1/trips/search', () => {
  test('filters trips by stops and departure window', async () => {
    const { fromStop, toStop, otherStop } = await seedStops()

    const route = await Route.create({
      code: `TR-${Date.now()}`,
      name: 'Southern Express',
      provinceFrom: 'Western',
      provinceTo: 'Southern',
      distanceKm: 120,
    })

    const bus = await Bus.create({
      regNo: `NB-${Date.now()}`,
      operator: 'TransitCo',
      capacity: 45,
    })

    const { start: serviceDate } = getServiceDateRange('2025-10-14')

    await Trip.create([
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: fromStop._id,
        toStopId: toStop._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-10-14', '08:45'),
        schedArrive: combineServiceDateAndTime('2025-10-14', '10:15'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: fromStop._id,
        toStopId: toStop._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-10-14', '11:00'),
        schedArrive: combineServiceDateAndTime('2025-10-14', '12:00'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: fromStop._id,
        toStopId: otherStop._id,
        serviceDate,
        schedDepart: combineServiceDateAndTime('2025-10-14', '09:30'),
        schedArrive: combineServiceDateAndTime('2025-10-14', '11:00'),
        status: 'SCHEDULED',
      },
    ])

    const res = await request(base())
      .get('/api/v1/trips/search')
      .query({
        fromStopId: fromStop._id.toString(),
        toStopId: toStop._id.toString(),
        date: '2025-10-14',
        startTime: '08:00',
        endTime: '10:00',
        sort: 'schedDeparture',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1 })
    expect(res.body.data).toHaveLength(1)
    const [trip] = res.body.data
    expect(trip.fromStopId).toBe(fromStop._id.toString())
    expect(trip.toStopId).toBe(toStop._id.toString())
    expect(trip.fromStop).toMatchObject({
      _id: fromStop._id.toString(),
      code: fromStop.code,
      name: fromStop.name,
    })
    expect(trip.toStop).toMatchObject({
      _id: toStop._id.toString(),
      code: toStop.code,
      name: toStop.name,
    })
  })

  test('returns 422 for inverted time ranges', async () => {
    const { fromStop, toStop } = await seedStops()

    const res = await request(base())
      .get('/api/v1/trips/search')
      .query({
        fromStopId: fromStop._id.toString(),
        toStopId: toStop._id.toString(),
        date: '2025-10-14',
        startTime: '12:00',
        endTime: '11:00',
      })

    expect(res.status).toBe(422)
    expect(res.body.error?.message ?? '').toMatch(/startTime/i)
  })
})
