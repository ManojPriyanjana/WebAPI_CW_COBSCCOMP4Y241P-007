import createError from 'http-errors'
import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './bus.service.js'

export async function getBuses(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  const filters = {
    operator: asString(req.query?.operator),
    status: asString(req.query?.status),
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
    const created = await service.create(req.body)
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}
