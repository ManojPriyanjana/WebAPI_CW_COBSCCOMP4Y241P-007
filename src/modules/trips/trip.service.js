import mongoose from 'mongoose'
import createError from 'http-errors'
import Trip from './trip.model.js'
import Route from '../routes/routes.model.js'
import Bus from '../buses/bus.model.js'

function parseObjectId(value, fieldName) {
  if (!value) throw createError(422, `${fieldName} is required`)
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(422, `${fieldName} must be a valid ObjectId`)
  }
  return value
}

function parseDate(value, fieldName) {
  if (!value) throw createError(422, `${fieldName} is required`)
  const date = new Date(value)
  if (isNaN(date)) throw createError(422, `${fieldName} must be a valid ISO date`)
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
    // match same calendar date (UTC)
    const date = new Date(filters.serviceDate)
    if (!isNaN(date)) {
      const start = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0)
      )
      const end = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
      )
      query.serviceDate = { $gte: start, $lte: end }
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
  const serviceDate = parseDate(data.serviceDate, 'serviceDate')
  const schedDepart = parseDate(data.schedDepart, 'schedDepart')
  const schedArrive = parseDate(data.schedArrive, 'schedArrive')
  if (schedArrive <= schedDepart) throw createError(422, 'schedArrive must be after schedDepart')
  const status = parseStatus(data.status) ?? 'SCHEDULED'
  const ownerId = user?.role === 'operator' ? user.id : data.ownerId ? parseObjectId(data.ownerId, 'ownerId') : undefined

  await Promise.all([ensureRoute(routeId), ensureBus(busId, user)])

  const trip = await Trip.create({
    routeId,
    busId,
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

  let effectiveDepart = existing.schedDepart
  let effectiveArrive = existing.schedArrive

  if (changes.schedDepart !== undefined) {
    effectiveDepart = parseDate(changes.schedDepart, 'schedDepart')
    updateDoc.schedDepart = effectiveDepart
  }
  if (changes.schedArrive !== undefined) {
    effectiveArrive = parseDate(changes.schedArrive, 'schedArrive')
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
    updateDoc.serviceDate = parseDate(changes.serviceDate, 'serviceDate')
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
