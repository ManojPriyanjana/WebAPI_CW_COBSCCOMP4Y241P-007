import createError from 'http-errors'
import Alert from './alerts.model.js'
import mongoose from 'mongoose'

function ensureActor(actor) {
  if (!actor) throw createError(401, 'unauthorized')
}

function ensureOperatorOwned(actor, alert) {
  if (!actor) throw createError(401, 'unauthorized')
  if (actor.role === 'admin') return
  if (actor.role === 'operator' && alert?.operatorId && alert.operatorId.toString() === actor.id) return
  throw createError(403, 'forbidden')
}

function resolveOperatorId({ actor, operatorId }) {
  if (actor?.role === 'operator') return actor.id
  if (!operatorId) return undefined
  if (!mongoose.Types.ObjectId.isValid(operatorId)) throw createError(422, 'invalid operatorId')
  return operatorId
}

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

export async function create(payload, actor) {
  ensureActor(actor)
  const { severity, message, validFrom, validTo, routeId, tripId } = payload || {}
  if (!severity || !message || !validFrom || !validTo)
    throw createError(422, 'missing required fields')
  const allowed = ['info', 'warning', 'critical']
  if (!allowed.includes(severity)) throw createError(422, 'invalid severity')
  if (routeId && !mongoose.Types.ObjectId.isValid(routeId))
    throw createError(422, 'invalid routeId')
  if (tripId && !mongoose.Types.ObjectId.isValid(tripId)) throw createError(422, 'invalid tripId')
  const from = new Date(validFrom)
  const to = new Date(validTo)
  if (isNaN(from) || isNaN(to) || from > to) throw createError(422, 'invalid validity range')
  const operatorId = resolveOperatorId({ actor, operatorId: payload?.operatorId })
  const doc = await Alert.create({
    severity,
    message,
    validFrom: from,
    validTo: to,
    routeId,
    tripId,
    operatorId,
  })
  return doc.toObject()
}

export async function update(id, payload, actor) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(404, 'alert not found')
  ensureActor(actor)
  const existing = await Alert.findById(id)
  if (!existing) throw createError(404, 'alert not found')
  ensureOperatorOwned(actor, existing)
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
    if (payload.routeId && !mongoose.Types.ObjectId.isValid(payload.routeId))
      throw createError(422, 'invalid routeId')
    updates.routeId = payload.routeId || undefined
  }
  if ('tripId' in payload) {
    if (payload.tripId && !mongoose.Types.ObjectId.isValid(payload.tripId))
      throw createError(422, 'invalid tripId')
    updates.tripId = payload.tripId || undefined
  }
  if ('operatorId' in payload) {
    const operatorId = resolveOperatorId({ actor, operatorId: payload.operatorId })
    updates.operatorId = operatorId
  }
  if (updates.validFrom && updates.validTo && updates.validFrom > updates.validTo)
    throw createError(422, 'invalid validity range')
  const alert = await Alert.findByIdAndUpdate(id, updates, { new: true }).lean()
  if (!alert) throw createError(404, 'alert not found')
  return alert
}

export async function remove(id, actor) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(404, 'alert not found')
  ensureActor(actor)
  const existing = await Alert.findById(id)
  if (!existing) throw createError(404, 'alert not found')
  ensureOperatorOwned(actor, existing)
  await Alert.deleteOne({ _id: id })
  return { success: true }
}
