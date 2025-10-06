import createError from 'http-errors'
import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './bus.service.js'

export async function getBuses(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  const filterObject = typeof req.query.filter === 'object' ? req.query.filter : {}
  const filters = {
    operator: asString(filterObject.operator ?? req.query?.['filter[operator]'] ?? req.query?.operator),
    status: asString(filterObject.status ?? req.query?.['filter[status]'] ?? req.query?.status),
  }
  try {
    const result = await service.list({ page, limit, sort, filters })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function getBusById(req, res, next) {
  try {
    const bus = await service.getById(req.params.id)
    if (!bus) return next(createError(404, 'Bus not found'))
    return res.json(bus)
  } catch (err) {
    return next(err)
  }
}

export async function createBus(req, res, next) {
  try {
    const created = await service.create(req.body, req.user)
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}

export async function updateBus(req, res, next) {
  try {
    const updated = await service.update(req.params.id, req.body, req.user)
    if (!updated) return next(createError(404, 'Bus not found'))
    return res.json(updated)
  } catch (err) {
    return next(err)
  }
}

export async function deleteBus(req, res, next) {
  try {
    const removed = await service.remove(req.params.id, req.user)
    if (!removed) return next(createError(404, 'Bus not found'))
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
}
