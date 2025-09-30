import mongoose from 'mongoose'
import createError from 'http-errors'
import Bus from './bus.model.js'

function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) throw createError(503, 'Database not connected')
}

export async function list({ page, limit, sort, filters }) {
  ensureDbConnected()
  const query = {}
  if (filters?.operator) query.operator = { $regex: filters.operator, $options: 'i' }
  if (filters?.status) query.status = filters.status

  let sortSpec
  if (sort) {
    const desc = sort.startsWith('-')
    const key = desc ? sort.slice(1) : sort
    sortSpec = { [key]: desc ? -1 : 1 }
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Bus.find(query).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
    Bus.countDocuments(query)
  ])
  return { data: items, page, limit, total }
}

export async function getById(id) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  return Bus.findById(id).lean().exec()
}

export async function create(data) {
  ensureDbConnected()
  const { regNo, operator, capacity, status } = data
  if (!regNo || !operator || capacity == null) {
    throw createError(400, 'regNo, operator and capacity are required')
  }
  const bus = await Bus.create({ regNo, operator, capacity, status })
  return bus.toObject()
}
