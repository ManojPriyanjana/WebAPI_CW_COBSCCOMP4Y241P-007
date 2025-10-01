import createError from 'http-errors'
import Alert from './alerts.model.js'
import mongoose from 'mongoose'

export async function list({ routeId, tripId, severity }) {
  const now = new Date()
  const query = { validFrom: { $lte: now }, validTo: { $gte: now } }
  if (routeId) {
    if (!mongoose.Types.ObjectId.isValid(routeId)) throw createError(422, 'invalid routeId')
    query.routeId = routeId
  }
  if (tripId) {
    if (!mongoose.Types.ObjectId.isValid(tripId)) throw createError(422, 'invalid tripId')
    query.tripId = tripId
  }
  if (severity) {
    const allowed = ['info', 'warning', 'critical']
    if (!allowed.includes(severity)) throw createError(422, 'invalid severity')
    query.severity = severity
  }
  const data = await Alert.find(query).sort({ validFrom: -1 }).lean()
  return data
}

export async function getById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(404, 'alert not found')
  const alert = await Alert.findById(id).lean()
  if (!alert) throw createError(404, 'alert not found')
  return alert
}

export async function create(payload) {
  const { severity, message, validFrom, validTo, routeId, tripId } = payload || {}
  if (!severity || !message || !validFrom || !validTo) throw createError(422, 'missing required fields')
  const allowed = ['info', 'warning', 'critical']
  if (!allowed.includes(severity)) throw createError(422, 'invalid severity')
  if (routeId && !mongoose.Types.ObjectId.isValid(routeId)) throw createError(422, 'invalid routeId')
  if (tripId && !mongoose.Types.ObjectId.isValid(tripId)) throw createError(422, 'invalid tripId')
  const from = new Date(validFrom)
  const to = new Date(validTo)
  if (isNaN(from) || isNaN(to) || from > to) throw createError(422, 'invalid validity range')
  const doc = await Alert.create({ severity, message, validFrom: from, validTo: to, routeId, tripId })
  return doc.toObject()
}

export async function update(id, payload) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(404, 'alert not found')
  const updates = {}
  const allowed = ['info', 'warning', 'critical']
  if ('severity' in payload) {
    if (!allowed.includes(payload.severity)) throw createError(422, 'invalid severity')
    updates.severity = payload.severity
  }
  if ('message' in payload) updates.message = payload.message
  if ('validFrom' in payload) {
    const v = new Date(payload.validFrom)
    if (isNaN(v)) throw createError(422, 'invalid validFrom')
    updates.validFrom = v
  }
  if ('validTo' in payload) {
    const v = new Date(payload.validTo)
    if (isNaN(v)) throw createError(422, 'invalid validTo')
    updates.validTo = v
  }
  if ('routeId' in payload) {
    if (payload.routeId && !mongoose.Types.ObjectId.isValid(payload.routeId)) throw createError(422, 'invalid routeId')
    updates.routeId = payload.routeId || undefined
  }
  if ('tripId' in payload) {
    if (payload.tripId && !mongoose.Types.ObjectId.isValid(payload.tripId)) throw createError(422, 'invalid tripId')
    updates.tripId = payload.tripId || undefined
  }
  if (updates.validFrom && updates.validTo && updates.validFrom > updates.validTo) throw createError(422, 'invalid validity range')
  const alert = await Alert.findByIdAndUpdate(id, updates, { new: true }).lean()
  if (!alert) throw createError(404, 'alert not found')
  return alert
}

export async function remove(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(404, 'alert not found')
  const res = await Alert.findByIdAndDelete(id).lean()
  if (!res) throw createError(404, 'alert not found')
  return { success: true }
}
