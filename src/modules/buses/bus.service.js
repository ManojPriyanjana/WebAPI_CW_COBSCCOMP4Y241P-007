import mongoose from 'mongoose'
import createError from 'http-errors'
import Bus from './bus.model.js'

function normalizeString(value) {
  if (value === undefined || value === null) return undefined
  const trimmed = String(value).trim()
  return trimmed.length ? trimmed : undefined
}

function parseCapacity(value) {
  if (value === undefined || value === null) return undefined
  const num = Number(value)
  if (!Number.isFinite(num) || num < 1) {
    throw createError(422, 'capacity must be a positive number')
  }
  return Math.round(num)
}

function parseStatus(value) {
  if (value === undefined || value === null) return undefined
  const status = String(value).toUpperCase()
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw createError(422, 'status must be ACTIVE or INACTIVE')
  }
  return status
}

function parseOwnerId(value) {
  if (!value) return undefined
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(422, 'ownerId must be a valid ObjectId')
  }
  return value
}

function ensureCanMutate(user, doc) {
  if (!user) throw createError(401, 'unauthorized')
  if (user.role === 'admin') return true
  if (user.role === 'operator') {
    if (doc?.ownerId && doc.ownerId.toString() === user.id) return true
    throw createError(403, 'forbidden')
  }
  throw createError(403, 'forbidden')
}

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
    Bus.countDocuments(query),
  ])
  return { data: items, page, limit, total }
}

export async function getById(id) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  return Bus.findById(id).lean().exec()
}

export async function create(data, user) {
  ensureDbConnected()
  const regNo = normalizeString(data.regNo)
  const operator = normalizeString(data.operator)
  const capacity = parseCapacity(data.capacity)
  const status = parseStatus(data.status) ?? 'ACTIVE'

  if (!regNo || !operator || capacity === undefined) {
    throw createError(422, 'regNo, operator and capacity are required')
  }

  let ownerId
  if (user?.role === 'operator') {
    ownerId = user.id
  } else if (data.ownerId) {
    ownerId = parseOwnerId(data.ownerId)
  }

  try {
    const bus = await Bus.create({ regNo, operator, capacity, status, ownerId })
    return bus.toObject()
  } catch (err) {
    if (err?.code === 11000) throw createError(409, 'Bus registration already exists')
    throw err
  }
}

export async function update(id, changes, user) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null

  const existing = await Bus.findById(id).exec()
  if (!existing) return null

  ensureCanMutate(user, existing)

  const updateDoc = {}
  if (changes.operator !== undefined) {
    const operator = normalizeString(changes.operator)
    if (!operator) throw createError(422, 'operator cannot be empty')
    updateDoc.operator = operator
  }
  if (changes.capacity !== undefined) {
    updateDoc.capacity = parseCapacity(changes.capacity)
  }
  if (changes.status !== undefined) {
    updateDoc.status = parseStatus(changes.status)
  }
  if (changes.ownerId !== undefined) {
    if (user?.role !== 'admin') throw createError(403, 'forbidden')
    updateDoc.ownerId = parseOwnerId(changes.ownerId)
  }

  if (Object.keys(updateDoc).length === 0) {
    return existing.toObject()
  }

  const updated = await Bus.findByIdAndUpdate(id, { $set: updateDoc }, { new: true, runValidators: true })
    .lean()
    .exec()
  return updated
}

export async function remove(id, user) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const existing = await Bus.findById(id).exec()
  if (!existing) return null
  ensureCanMutate(user, existing)
  await Bus.deleteOne({ _id: id })
  return true
}
