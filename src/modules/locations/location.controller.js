import mongoose from 'mongoose'
import createError from 'http-errors'
import { asyncHandler } from '../../middleware/errors.js'
import { ensureStartBeforeEnd, parseDateTimeInput } from '../../utils/datetime.js'
import * as service from './location.service.js'

function parseObjectId(value) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(422, 'invalid bus id')
  }
  return value
}

function parseNumber(value, { field, required = false, min, max }) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createError(422, `${field} is required`)
    return undefined
  }
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) throw createError(422, `${field} must be a number`)
  if (min !== undefined && num < min) throw createError(422, `${field} must be >= ${min}`)
  if (max !== undefined && num > max) throw createError(422, `${field} must be <= ${max}`)
  return num
}

function parseDateTimeQuery(value, { field }) {
  if (value === undefined || value === null || value === '') return undefined
  try {
    return parseDateTimeInput(String(value), field)
  } catch (err) {
    throw createError(err.status ?? 422, err.message)
  }
}

function parseBBox(value) {
  if (!value) return undefined
  if (typeof value !== 'string') throw createError(422, 'bbox must be a comma-separated string')
  const parts = value.split(',').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) {
    throw createError(422, 'bbox must be lon1,lat1,lon2,lat2')
  }
  const [lon1, lat1, lon2, lat2] = parts
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw createError(422, 'bbox longitude must be between -180 and 180')
  }
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw createError(422, 'bbox latitude must be between -90 and 90')
  }
  const minLon = Math.min(lon1, lon2)
  const maxLon = Math.max(lon1, lon2)
  const minLat = Math.min(lat1, lat2)
  const maxLat = Math.max(lat1, lat2)
  return { minLon, minLat, maxLon, maxLat }
}

function serializeMeta({ since, until, limit, bbox }) {
  const meta = { limit }
  if (since) meta.since = since.toISOString()
  if (until) meta.until = until.toISOString()
  if (bbox) meta.bbox = bbox
  return meta
}

export const postBusLocation = asyncHandler(async (req, res) => {
  const busId = parseObjectId(req.params.id)
  const lat = parseNumber(req.body?.lat, { field: 'lat', required: true, min: -90, max: 90 })
  const lon = parseNumber(req.body?.lon, { field: 'lon', required: true, min: -180, max: 180 })
  const ts = parseDateTimeQuery(req.body?.ts, { field: 'ts' }) || new Date()
  const speedKph = parseNumber(req.body?.speedKph, { field: 'speedKph', min: 0 })
  const heading = parseNumber(req.body?.heading, { field: 'heading', min: 0, max: 360 })
  const accuracyM = parseNumber(req.body?.accuracyM, { field: 'accuracyM', min: 0 })

  const result = await service.recordLocation(busId, {
    ts,
    coordinates: [lon, lat],
    speedKph,
    heading,
    accuracyM,
  })

  res.status(201).json({ data: result })
})

export const getLatestBusLocation = asyncHandler(async (req, res) => {
  const busId = parseObjectId(req.params.id)
  const latest = await service.getLatest(busId)
  res.json({ data: latest })
})

export const getBusLocationHistory = asyncHandler(async (req, res) => {
  const busId = parseObjectId(req.params.id)
  const since = parseDateTimeQuery(req.query?.since, { field: 'since' })
  const until = parseDateTimeQuery(req.query?.until, { field: 'until' })
  ensureStartBeforeEnd(since, until, 'since', 'until')

  const rawLimit = parseNumber(req.query?.limit, { field: 'limit' })
  const limit = rawLimit === undefined ? 500 : rawLimit
  if (limit < 1 || limit > 1000) throw createError(422, 'limit must be between 1 and 1000')

  const bbox = parseBBox(req.query?.bbox)

  const data = await service.getHistory(busId, { since, until, limit, bbox })
  res.json({ data, meta: serializeMeta({ since, until, limit, bbox }) })
})
