import mongoose from 'mongoose'
import createError from 'http-errors'
import Stop from './stop.model.js'

function ensureDbConnected() {
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
  if (filters?.code) query.code = filters.code
  if (filters?.name) query.name = { $regex: filters.name, $options: 'i' }

  let sortSpec
  if (sort) {
    const desc = sort.startsWith('-')
    const key = desc ? sort.slice(1) : sort
    sortSpec = { [key]: desc ? -1 : 1 }
  }

  const skip = (page - 1) * limit
  const [items, total, newest] = await Promise.all([
    Stop.find(query).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
    Stop.countDocuments(query),
    Stop.findOne(query).sort({ updatedAt: -1 }).select({ updatedAt: 1 }).lean().exec(),
  ])

  return { data: items, page, limit, total, lastUpdatedAt: newest?.updatedAt }
}
