import mongoose from 'mongoose'
import createError from 'http-errors'
import Trip from './trip.model.js'

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

export async function create(data) {
  ensureDbConnected()
  const { routeId, busId, serviceDate, schedDepart, schedArrive, status } = data
  if (!routeId || !busId || !serviceDate || !schedDepart || !schedArrive) {
    throw createError(400, 'routeId, busId, serviceDate, schedDepart, schedArrive are required')
  }
  const trip = await Trip.create({ routeId, busId, serviceDate, schedDepart, schedArrive, status })
  return trip.toObject()
}
