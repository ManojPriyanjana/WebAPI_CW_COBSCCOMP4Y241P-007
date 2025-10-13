import { asyncHandler } from '../../middleware/errors.js'
import { parsePagination } from '../common/pagination.js'
import * as svc from './alerts.service.js'

function parseBoolean(value) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return undefined
}

export const listAlerts = asyncHandler(async (req, res) => {
  const { routeId, tripId, severity } = req.query || {}
  const { page, limit } = parsePagination(req.query)
  const active = parseBoolean(req.query?.active)
  const { data, total } = await svc.list({ routeId, tripId, severity, active, page, limit })
  res.json({ data, page, limit, total })
})

export const getAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = await svc.getById(id)
  res.json({ data })
})

export const createAlert = asyncHandler(async (req, res) => {
  const data = await svc.create(req.body || {}, req.user)
  res.status(201).json({ data })
})

export const updateAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = await svc.update(id, req.body || {}, req.user)
  res.json({ data })
})

export const deleteAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  await svc.remove(id, req.user)
  res.status(204).send()
})
