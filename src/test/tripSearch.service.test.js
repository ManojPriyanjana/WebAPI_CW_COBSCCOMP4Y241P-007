import Route from '../modules/routes/routes.model.js'
import Bus from '../modules/buses/bus.model.js'
import Stop from '../modules/stops/stop.model.js'
import Trip from '../modules/trips/trip.model.js'
import * as TripService from '../modules/trips/trip.service.js'
import { combineServiceDateAndTime, getServiceDateRange } from '../utils/datetime.js'

describe('TripService.search', () => {
  test('returns trips ordered by schedDepart with populated stops', async () => {
    const [origin, destination] = await Stop.create([
      {
        code: `ST-${Date.now()}`,
        name: 'Origin Hub',
        location: { type: 'Point', coordinates: [79.874, 6.921] },
      },
      {
        code: `ST-${Date.now() + 1}`,
        name: 'Destination Hub',
        location: { type: 'Point', coordinates: [80.015, 7.012] },
      },
    ])

    const route = await Route.create({
      code: `RT-${Date.now()}`,
      name: 'Central Corridor',
      provinceFrom: 'Western',
      provinceTo: 'Central',
      distanceKm: 150,
    })

    const bus = await Bus.create({
      regNo: `NB-${Date.now()}`,
      operator: 'Central Transit',
      capacity: 40,
    })

    const { start: serviceDate } = getServiceDateRange('2025-11-01')

    const earlyDepart = combineServiceDateAndTime('2025-11-01', '06:30')
    const lateDepart = combineServiceDateAndTime('2025-11-01', '08:15')

    await Trip.create([
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: origin._id,
        toStopId: destination._id,
        serviceDate,
        schedDepart: lateDepart,
        schedArrive: combineServiceDateAndTime('2025-11-01', '10:00'),
        status: 'SCHEDULED',
      },
      {
        routeId: route._id,
        busId: bus._id,
        fromStopId: origin._id,
        toStopId: destination._id,
        serviceDate,
        schedDepart: earlyDepart,
        schedArrive: combineServiceDateAndTime('2025-11-01', '08:00'),
        status: 'SCHEDULED',
      },
    ])

    const result = await TripService.search({
      fromStopId: origin._id.toString(),
      toStopId: destination._id.toString(),
      date: '2025-11-01',
      startTime: '06:00',
      endTime: '09:00',
      page: 1,
      limit: 10,
      sort: '-schedDeparture',
    })

    expect(result.total).toBe(2)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].schedDepart.toISOString()).toBe(lateDepart.toISOString())
    expect(result.data[0].fromStop._id.toString()).toBe(origin._id.toString())
    expect(result.data[0].fromStop.code).toBe(origin.code)
    expect(result.data[0].toStop._id.toString()).toBe(destination._id.toString())
    expect(result.data[0].toStop.code).toBe(destination.code)
  })
})
