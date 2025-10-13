import mongoose from 'mongoose'
import createError from 'http-errors'
import LocationUpdate from './locationUpdate.model.js'
import * as busService from '../buses/bus.service.js'

function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw createError(503, 'Database not connected')
  }
}

function toDto(doc) {
  if (!doc) return null
  const [lon, lat] = doc.location?.coordinates || []
  return {
    _id: doc._id,
    busId: doc.busId?.toString?.() || doc.busId,
    ts: doc.ts,
    lat,
    lon,
    speedKph: doc.speedKph,
    heading: doc.heading,
    accuracyM: doc.accuracyM,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function loadBusOrThrow(busId) {
  const bus = await busService.getById(busId)
  if (!bus) throw createError(404, 'Bus not found')
  return bus
}

function ensureActorCanWrite(bus, actor) {
  if (!actor) throw createError(401, 'unauthorized')
  if (actor.role === 'admin') return
  if (actor.role === 'operator' && bus?.operatorId && bus.operatorId.toString() === actor.id) {
    return
  }
  throw createError(403, 'forbidden')
}

export async function recordLocation(busId, actor, { ts, coordinates, speedKph, heading, accuracyM }) {
  ensureDbConnected()
  const bus = await loadBusOrThrow(busId)
  ensureActorCanWrite(bus, actor)
  const payload = {
    busId,
    ts,
    location: { type: 'Point', coordinates },
  }
  if (speedKph !== undefined) payload.speedKph = speedKph
  if (heading !== undefined) payload.heading = heading
  if (accuracyM !== undefined) payload.accuracyM = accuracyM

  const created = await LocationUpdate.create(payload)
  return toDto(created.toObject())
}

export async function getLatest(busId) {
  ensureDbConnected()
  await loadBusOrThrow(busId)
  const latest = await LocationUpdate.findOne({ busId })
    .sort({ ts: -1, createdAt: -1 })
    .lean()
    .exec()
  return toDto(latest)
}

export async function getHistory(busId, { since, until, limit, bbox }) {
  ensureDbConnected()
  await loadBusOrThrow(busId)

  const query = { busId }
  if (since || until) {
    query.ts = {}
    if (since) query.ts.$gte = since
    if (until) query.ts.$lte = until
  }
  if (bbox) {
    query.location = {
      $geoWithin: {
        $box: [
          [bbox.minLon, bbox.minLat],
          [bbox.maxLon, bbox.maxLat],
        ],
      },
    }
  }

  const cursor = LocationUpdate.find(query)
    .sort({ ts: 1, createdAt: 1 })
    .limit(limit)
    .lean()
    .exec()
  const items = await cursor
  return items.map(toDto)
}
