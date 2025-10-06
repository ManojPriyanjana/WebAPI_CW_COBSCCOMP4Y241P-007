import mongoose from 'mongoose'
import createError from 'http-errors'
import Route from './routes.model.js'

function normalizeString(value) {
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  return str.length ? str : undefined
}

function parseDistance(value) {
  if (value === undefined || value === null) return undefined
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    throw createError(422, 'distanceKm must be a positive number')
  }
  return num
}

function ensureDbConnected() {
  // 1 = connected, 2 = connecting. Fail fast unless fully connected
  if (mongoose.connection.readyState !== 1) {
    throw createError(
      503,
      'Database not connected. Set MONGO_URI and restart, or run with SKIP_DB=true to disable DB-backed routes.'
    )
  }
}

export async function findAll({ page, limit, sort, filters }) {
  ensureDbConnected()
  const query = {}
  if (filters?.name) query.name = { $regex: filters.name, $options: 'i' }
  if (filters?.provinceFrom) query.provinceFrom = filters.provinceFrom
  if (filters?.provinceTo) query.provinceTo = filters.provinceTo

  // Sorting: 'name' or '-name'
  let sortSpec
  if (sort) {
    const desc = sort.startsWith('-')
    const key = desc ? sort.slice(1) : sort
    sortSpec = { [key]: desc ? -1 : 1 }
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Route.find(query).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
    Route.countDocuments(query),
  ])
  return { data: items, page, limit, total }
}

export async function findById(id) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    // Make it look like not found rather than a 500 cast error
    return null
  }
  return Route.findById(id).lean().exec()
}

export async function findByCode(code) {
  ensureDbConnected()
  return Route.findOne({ code }).lean().exec()
}

export async function create(data) {
  ensureDbConnected()
  const doc = {
    code: normalizeString(data.code),
    name: normalizeString(data.name),
    provinceFrom: normalizeString(data.provinceFrom),
    provinceTo: normalizeString(data.provinceTo),
    distanceKm: parseDistance(data.distanceKm),
  }

  if (!doc.code || !doc.name || !doc.provinceFrom || !doc.provinceTo || doc.distanceKm === undefined) {
    throw createError(422, 'code, name, provinceFrom, provinceTo, distanceKm are required')
  }

  try {
    const created = await Route.create(doc)
    return created.toObject()
  } catch (err) {
    if (err?.code === 11000) throw createError(409, 'Route code already exists')
    throw err
  }
}

export async function update(id, changes) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null

  const updateDoc = {}
  if (changes.name !== undefined) {
    const name = normalizeString(changes.name)
    if (!name) throw createError(422, 'name cannot be empty')
    updateDoc.name = name
  }
  if (changes.provinceFrom !== undefined) {
    const provinceFrom = normalizeString(changes.provinceFrom)
    if (!provinceFrom) throw createError(422, 'provinceFrom cannot be empty')
    updateDoc.provinceFrom = provinceFrom
  }
  if (changes.provinceTo !== undefined) {
    const provinceTo = normalizeString(changes.provinceTo)
    if (!provinceTo) throw createError(422, 'provinceTo cannot be empty')
    updateDoc.provinceTo = provinceTo
  }
  if (changes.distanceKm !== undefined) {
    updateDoc.distanceKm = parseDistance(changes.distanceKm)
  }

  if (Object.keys(updateDoc).length === 0) {
    return Route.findById(id).lean().exec()
  }

  const updated = await Route.findByIdAndUpdate(id, { $set: updateDoc }, { new: true, runValidators: true })
    .lean()
    .exec()
  return updated
}

export async function remove(id) {
  ensureDbConnected()
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const deleted = await Route.findByIdAndDelete(id).lean().exec()
  return deleted ? true : null
}
