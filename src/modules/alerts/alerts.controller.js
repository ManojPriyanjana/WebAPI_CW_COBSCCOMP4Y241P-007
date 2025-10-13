import { asyncHandler } from '../../middleware/errors.js'
import { parsePagination } from '../common/pagination.js'
import * as svc from './alerts.service.js'

export const listAlerts = asyncHandler(async (req, res) => {
  const { routeId, tripId, severity } = req.query || {}
  const { page, limit } = parsePagination(req.query)
  const data = await svc.list({ routeId, tripId, severity })
  const total = data.length
  const start = (page - 1) * limit
  const end = start + limit
  const sliced = data.slice(start, end)
  res.json({ data: sliced, page, limit, total })
})

export const getAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = await svc.getById(id)
  res.json({ data })
})

export const createAlert = asyncHandler(async (req, res) => {
  const data = await svc.create(req.body || {})
  res.status(201).json({ data })
})

export const updateAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = await svc.update(id, req.body || {})
  res.json({ data })
})

export const deleteAlert = asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = await svc.remove(id)
  res.json(data)
})
