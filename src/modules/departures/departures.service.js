import mongoose from 'mongoose'
import createError from 'http-errors'
import Stop from '../stops/stop.model.js'
import Trip from '../trips/trip.model.js'
import {
  combineServiceDateAndTime,
  ensureStartBeforeEnd,
  getServiceDateRange,
} from '../../utils/datetime.js'

function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw createError(503, 'Database not connected')
  }
}

function parseCoordinate(value, field, { min, max }) {
  if (value === undefined || value === null || value === '') {
    throw createError(422, `${field} is required`)
  }
  const numeric = Number.parseFloat(value)
  if (Number.isNaN(numeric)) {
    throw createError(422, `${field} must be a valid number`)
  }
  if (numeric < min || numeric > max) {
    throw createError(422, `${field} must be between ${min} and ${max}`)
  }
  return numeric
}

function parseRadius(value) {
  if (value === undefined || value === null || value === '') {
    throw createError(422, 'radiusMeters is required')
  }
  const numeric = Number.parseFloat(value)
  if (Number.isNaN(numeric)) {
    throw createError(422, 'radiusMeters must be a valid number')
  }
  if (numeric <= 0) {
    throw createError(422, 'radiusMeters must be greater than zero')
  }
  return numeric
}

function roundDistance(distance) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) return undefined
  return Math.round(distance * 100) / 100
}

export async function findNearbyDepartures({
  lat,
  lng,
  radiusMeters,
  date,
  startTime,
  endTime,
  page,
  limit,
}) {
  ensureDbConnected()
  const latitude = parseCoordinate(lat, 'lat', { min: -90, max: 90 })
  const longitude = parseCoordinate(lng, 'lng', { min: -180, max: 180 })
  const radius = parseRadius(radiusMeters)

  if (date === undefined || date === null || date === '') {
    throw createError(422, 'date is required')
  }
  if (startTime === undefined || startTime === null || startTime === '') {
    throw createError(422, 'startTime is required')
  }
  if (endTime === undefined || endTime === null || endTime === '') {
    throw createError(422, 'endTime is required')
  }

  const startInstant = combineServiceDateAndTime(date, startTime, {
    dateField: 'date',
    timeField: 'startTime',
  })
  const endInstant = combineServiceDateAndTime(date, endTime, {
    dateField: 'date',
    timeField: 'endTime',
  })
  ensureStartBeforeEnd(startInstant, endInstant, 'startTime', 'endTime')

  const { start: serviceStart, end: serviceEnd } = getServiceDateRange(date, 'date')

  const stops = await Stop.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        spherical: true,
        maxDistance: radius,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        distanceMeters: 1,
      },
    },
  ])

  if (stops.length === 0) {
    return { data: [], page, limit, total: 0 }
  }

  const stopMap = new Map(
    stops.map((stop) => [
      stop._id.toString(),
      {
        id: stop._id.toString(),
        name: stop.name,
        distanceMeters: roundDistance(stop.distanceMeters),
      },
    ])
  )
  const stopIds = stops.map((stop) => stop._id)

  const match = {
    fromStopId: { $in: stopIds },
    serviceDate: { $gte: serviceStart, $lte: serviceEnd },
    schedDepart: { $gte: startInstant, $lte: endInstant },
  }

  const sortSpec = { schedDepart: 1 }
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Trip.find(match).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
    Trip.countDocuments(match),
  ])

  const data = items.map((trip) => {
    const stopInfo = stopMap.get(trip.fromStopId?.toString())
    return {
      ...trip,
      stop: stopInfo ?? null,
    }
  })

  return { data, page, limit, total }
}
