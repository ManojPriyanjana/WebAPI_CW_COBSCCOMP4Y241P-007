import mongoose from 'mongoose'
import createError from 'http-errors'
import Trip from './trip.model.js'
import Route from '../routes/routes.model.js'
import Bus from '../buses/bus.model.js'
import Stop from '../stops/stop.model.js'
import {
  combineServiceDateAndTime,
  ensureStartBeforeEnd,
  getServiceDateRange,
  isServiceDateString,
  parseDateTimeInput,
} from '../../utils/datetime.js'

function parseObjectId(value, fieldName) {
  if (!value) throw createError(422, `${fieldName} is required`)
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(422, `${fieldName} must be a valid ObjectId`)
  }
  return value
}

function parseDateTime(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw createError(422, `${fieldName} is required`)
  }
  const date = parseDateTimeInput(String(value), fieldName)
  if (!date) throw createError(422, `${fieldName} must be a valid date/time`)
  return date
}

function parseStatus(value) {
  if (value === undefined || value === null) return undefined
  const status = String(value).toUpperCase()
  if (!['SCHEDULED', 'ONGOING', 'COMPLETED'].includes(status)) {
    throw createError(422, 'status must be SCHEDULED, ONGOING, or COMPLETED')
  }
  return status
}

function resolveSearchSort(rawSort) {
  const input = rawSort ?? 'schedDepart'
  const mapping = {
    schedDepart: { field: 'schedDepart', dir: 1 },
    '-schedDepart': { field: 'schedDepart', dir: -1 },
    schedDeparture: { field: 'schedDepart', dir: 1 },
    '-schedDeparture': { field: 'schedDepart', dir: -1 },
  }
  const resolved = mapping[input]
  if (!resolved) {
    throw createError(422, 'sort must be one of schedDepart, -schedDepart, schedDeparture, -schedDeparture')
  }
  return { [resolved.field]: resolved.dir }
}

function ensureTripOwner(user, trip) {
  if (!user) throw createError(401, 'unauthorized')
  if (user.role === 'admin') return true
  if (user.role === 'operator') {
    if (trip?.ownerId && trip.ownerId.toString() === user.id) return true
    throw createError(403, 'forbidden')
  }
  throw createError(403, 'forbidden')
}

async function ensureRoute(routeId) {
  const exists = await Route.exists({ _id: routeId })
  if (!exists) throw createError(404, 'Route not found')
}

async function ensureBus(busId, user) {
  const bus = await Bus.findById(busId).select('_id ownerId').lean().exec()
  if (!bus) throw createError(404, 'Bus not found')
  if (user?.role === 'operator' && bus.ownerId && bus.ownerId.toString() !== user.id) {
    throw createError(403, 'forbidden')
  }
  return bus
}

async function ensureStop(stopId, fieldName) {
  const exists = await Stop.exists({ _id: stopId })
  if (!exists) throw createError(404, `${fieldName ?? 'stopId'} not found`)
}

function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) throw createError(503, 'Database not connected')
}

export async function list({ page, limit, sort, filters }) {
  ensureDbConnected()
  const query = {}
  if (filters?.routeId && mongoose.Types.ObjectId.isValid(filters.routeId))
    query.routeId = filters.routeId
  if (filters?.busId && mongoose.Types.ObjectId.isValid(filters.busId)) query.busId = filters.busId
  if (filters?.serviceDate) {
    const raw = String(filters.serviceDate).trim()
    if (isServiceDateString(raw)) {
      const { start, end } = getServiceDateRange(raw, 'filter[serviceDate]')
      query.serviceDate = { $gte: start, $lte: end }
    } else {
      const instant = parseDateTimeInput(raw, 'filter[serviceDate]')
      query.serviceDate = { $gte: instant, $lte: instant }
    }
  }

  let sortSpec
  if (sort) {
    const desc = sort.startsWith('-')
    const key = desc ? sort.slice(1) : sort
    sortSpec = { [key]: desc ? -1 : 1 }
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Trip.find(query).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
    Trip.countDocuments(query),
  ])
  return { data: items, page, limit, total }
}

export async function getById(id) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  return Trip.findById(id).lean().exec()
}

export async function create(data, user) {
  ensureDbConnected()
  const routeId = parseObjectId(data.routeId, 'routeId')
  const busId = parseObjectId(data.busId, 'busId')
  const fromStopId = parseObjectId(data.fromStopId, 'fromStopId')
  const toStopId = parseObjectId(data.toStopId, 'toStopId')
  const serviceDate = parseDateTime(data.serviceDate, 'serviceDate')
  const schedDepart = parseDateTime(data.schedDepart, 'schedDepart')
  const schedArrive = parseDateTime(data.schedArrive, 'schedArrive')
  if (schedArrive <= schedDepart) throw createError(422, 'schedArrive must be after schedDepart')
  const status = parseStatus(data.status) ?? 'SCHEDULED'
  const ownerId = user?.role === 'operator' ? user.id : data.ownerId ? parseObjectId(data.ownerId, 'ownerId') : undefined

  await Promise.all([
    ensureRoute(routeId),
    ensureBus(busId, user),
    ensureStop(fromStopId, 'fromStopId'),
    ensureStop(toStopId, 'toStopId'),
  ])

  const trip = await Trip.create({
    routeId,
    busId,
    fromStopId,
    toStopId,
    serviceDate,
    schedDepart,
    schedArrive,
    status,
    ownerId,
  })
  return trip.toObject()
}

export async function update(id, changes, user) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const existing = await Trip.findById(id).exec()
  if (!existing) return null

  ensureTripOwner(user, existing)

  const updateDoc = {}

  if (changes.routeId !== undefined) {
    const routeId = parseObjectId(changes.routeId, 'routeId')
    await ensureRoute(routeId)
    updateDoc.routeId = routeId
  }

  if (changes.busId !== undefined) {
    const busId = parseObjectId(changes.busId, 'busId')
    await ensureBus(busId, user)
    updateDoc.busId = busId
  }

  if (changes.fromStopId !== undefined) {
    const fromStopId = parseObjectId(changes.fromStopId, 'fromStopId')
    await ensureStop(fromStopId, 'fromStopId')
    updateDoc.fromStopId = fromStopId
  }

  if (changes.toStopId !== undefined) {
    const toStopId = parseObjectId(changes.toStopId, 'toStopId')
    await ensureStop(toStopId, 'toStopId')
    updateDoc.toStopId = toStopId
  }

  let effectiveDepart = existing.schedDepart
  let effectiveArrive = existing.schedArrive

  if (changes.schedDepart !== undefined) {
    effectiveDepart = parseDateTime(changes.schedDepart, 'schedDepart')
    updateDoc.schedDepart = effectiveDepart
  }
  if (changes.schedArrive !== undefined) {
    effectiveArrive = parseDateTime(changes.schedArrive, 'schedArrive')
    updateDoc.schedArrive = effectiveArrive
  }
  if (updateDoc.schedDepart || updateDoc.schedArrive) {
    const depart = updateDoc.schedDepart ?? new Date(effectiveDepart)
    const arrive = updateDoc.schedArrive ?? new Date(effectiveArrive)
    if (arrive <= depart) {
      throw createError(422, 'schedArrive must be after schedDepart')
    }
  }

  if (changes.serviceDate !== undefined) {
    updateDoc.serviceDate = parseDateTime(changes.serviceDate, 'serviceDate')
  }

  if (changes.status !== undefined) {
    updateDoc.status = parseStatus(changes.status)
  }

  if (changes.ownerId !== undefined) {
    if (user?.role !== 'admin') throw createError(403, 'forbidden')
    updateDoc.ownerId = parseObjectId(changes.ownerId, 'ownerId')
  }

  if (Object.keys(updateDoc).length === 0) {
    return existing.toObject()
  }

  const updated = await Trip.findByIdAndUpdate(id, { $set: updateDoc }, { new: true, runValidators: true })
    .lean()
    .exec()
  return updated
}

export async function remove(id, user) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const existing = await Trip.findById(id).exec()
  if (!existing) return null
  ensureTripOwner(user, existing)
  await Trip.deleteOne({ _id: id })
  return true
}

export async function search({
  fromStopId,
  toStopId,
  date,
  startTime,
  endTime,
  page,
  limit,
  sort,
}) {
  ensureDbConnected()
  const fromId = parseObjectId(fromStopId, 'fromStopId')
  const toId = parseObjectId(toStopId, 'toStopId')
  if (date === undefined || date === null || date === '') {
    throw createError(422, 'date is required')
  }
  if (startTime === undefined || startTime === null || startTime === '') {
    throw createError(422, 'startTime is required')
  }
  if (endTime === undefined || endTime === null || endTime === '') {
    throw createError(422, 'endTime is required')
  }

  const [startInstant, endInstant] = [
    combineServiceDateAndTime(date, startTime, { dateField: 'date', timeField: 'startTime' }),
    combineServiceDateAndTime(date, endTime, { dateField: 'date', timeField: 'endTime' }),
  ]
  ensureStartBeforeEnd(startInstant, endInstant, 'startTime', 'endTime')

  const { start: serviceStart, end: serviceEnd } = getServiceDateRange(date, 'date')

  await Promise.all([
    ensureStop(fromId, 'fromStopId'),
    ensureStop(toId, 'toStopId'),
  ])

  const match = {
    fromStopId: fromId,
    toStopId: toId,
    serviceDate: { $gte: serviceStart, $lte: serviceEnd },
    schedDepart: { $gte: startInstant, $lte: endInstant },
  }

  const sortSpec = resolveSearchSort(sort)
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Trip.find(match)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .populate('fromStopId')
      .populate('toStopId')
      .lean()
      .exec(),
    Trip.countDocuments(match),
  ])

  return {
    data: items.map(mapTripSearchResult),
    page,
    limit,
    total,
  }
}

function mapStopDocument(stopDoc) {
  if (!stopDoc || typeof stopDoc !== 'object') return undefined
  if (!stopDoc._id) return undefined
  return {
    _id: stopDoc._id,
    code: stopDoc.code,
    name: stopDoc.name,
    location: stopDoc.location,
    createdAt: stopDoc.createdAt,
  }
}

function mapTripSearchResult(doc) {
  const fromStopDoc = doc.fromStopId && doc.fromStopId.code ? doc.fromStopId : undefined
  const toStopDoc = doc.toStopId && doc.toStopId.code ? doc.toStopId : undefined
  return {
    _id: doc._id,
    routeId: doc.routeId,
    busId: doc.busId,
    fromStopId: fromStopDoc?._id ?? doc.fromStopId,
    toStopId: toStopDoc?._id ?? doc.toStopId,
    serviceDate: doc.serviceDate,
    schedDepart: doc.schedDepart,
    schedArrive: doc.schedArrive,
    status: doc.status,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    fromStop: mapStopDocument(fromStopDoc),
    toStop: mapStopDocument(toStopDoc),
  }
}
