import { asyncHandler } from '../../middleware/errors.js'
import * as svc from './alerts.service.js'

export const listAlerts = asyncHandler(async (req, res) => {
  const { routeId, tripId, severity } = req.query || {}
  const data = await svc.list({ routeId, tripId, severity })
  res.json({ data })
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
