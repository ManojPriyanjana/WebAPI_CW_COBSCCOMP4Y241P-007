import mongoose from 'mongoose'
import createError from 'http-errors'
import Route from './routes.model.js'

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
