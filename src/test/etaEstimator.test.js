import {
  averageSpeedFromSamples,
  buildEtaPayload,
  computeDistanceKm,
  estimateEtaFromSchedule,
  estimateTravelMinutes,
} from '../modules/locations/etaEstimator.js'

describe('ETA estimator helpers', () => {
  test('averageSpeedFromSamples returns mean of provided speed samples', () => {
    const samples = [
      { speedKph: 40 },
      { speedKph: 45 },
      { speedKph: 55 },
    ]

    expect(averageSpeedFromSamples(samples)).toBeCloseTo((40 + 45 + 55) / 3, 3)
  })

  test('averageSpeedFromSamples falls back to distance over time when speeds absent', () => {
    const samples = [
      {
        ts: new Date('2025-10-13T10:05:00Z'),
        location: { coordinates: [79.90, 6.95] },
      },
      {
        ts: new Date('2025-10-13T10:00:00Z'),
        location: { coordinates: [79.88, 6.94] },
      },
    ]

    const speed = averageSpeedFromSamples(samples)
    expect(speed).not.toBeNull()
    expect(speed).toBeGreaterThan(0)
  })

  test('buildEtaPayload prefers averaged speed and exposes delay calculation', () => {
    const now = new Date('2025-10-13T10:00:00Z')

    const trip = {
      fromStopId: {
        _id: 'from-1',
        name: 'Origin Exchange',
        location: { type: 'Point', coordinates: [79.85, 6.93] },
      },
      toStopId: {
        _id: 'to-1',
        name: 'Destination Hub',
        location: { type: 'Point', coordinates: [80.00, 7.00] },
      },
      schedDepart: new Date('2025-10-13T09:40:00Z'),
      schedArrive: new Date('2025-10-13T10:40:00Z'),
      status: 'ONGOING',
    }

    const samples = [
      {
        ts: new Date('2025-10-13T09:58:00Z'),
        speedKph: 44,
        location: { coordinates: [79.98, 6.99] },
      },
      {
        ts: new Date('2025-10-13T09:52:00Z'),
        speedKph: 48,
        location: { coordinates: [79.94, 6.97] },
      },
    ]

    const latestSample = samples[0]
    const payload = buildEtaPayload({ now, latestSample, trip, recentSamples: samples })

    const averageSpeed = averageSpeedFromSamples(samples)
    const distanceToDestination = computeDistanceKm(latestSample, {
      location: trip.toStopId.location,
    })
    const expectedEta = estimateTravelMinutes(distanceToDestination, averageSpeed)
    const scheduleRemaining = estimateEtaFromSchedule(now, trip.schedArrive)

    expect(payload).not.toBeNull()
    expect(payload.destination.etaMinutes).toBe(expectedEta)
    expect(payload.destination.name).toBe('Destination Hub')
    expect(payload.nextStop.name).toBe('Destination Hub')
    expect(payload.delayMinutes).toBe(expectedEta - scheduleRemaining)
  })

  test('buildEtaPayload falls back to schedule when speeds unavailable', () => {
    const now = new Date('2025-10-13T08:55:00Z')

    const trip = {
      fromStopId: {
        _id: 'from-2',
        name: 'Depot',
        location: { type: 'Point', coordinates: [79.85, 6.93] },
      },
      toStopId: {
        _id: 'to-2',
        name: 'Terminus',
        location: { type: 'Point', coordinates: [80.01, 7.02] },
      },
      schedDepart: new Date('2025-10-13T09:00:00Z'),
      schedArrive: new Date('2025-10-13T09:45:00Z'),
      status: 'SCHEDULED',
    }

    const latestSample = {
      ts: new Date('2025-10-13T08:55:00Z'),
      location: { coordinates: [79.85, 6.93] },
    }

    const payload = buildEtaPayload({ now, latestSample, trip, recentSamples: [latestSample] })
    const scheduleRemaining = estimateEtaFromSchedule(now, trip.schedArrive)
    const departRemaining = Math.max(
      0,
      Math.round((trip.schedDepart.getTime() - now.getTime()) / 60000)
    )

    expect(payload).not.toBeNull()
    expect(payload.destination.etaMinutes).toBe(scheduleRemaining)
    expect(payload.nextStop.name).toBe('Depot')
    expect(payload.nextStop.etaMinutes).toBe(departRemaining)
    expect(payload.delayMinutes).toBe(0)
  })
})
