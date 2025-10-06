import createError from 'http-errors'
import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './routes.service.js'

export async function getRoutes(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)

  const filterObject = typeof req.query.filter === 'object' ? req.query.filter : {}
  const filters = {
    name: asString(filterObject.name ?? req.query?.['filter[name]']),
    provinceFrom: asString(filterObject.provinceFrom ?? req.query?.['filter[provinceFrom]']),
    provinceTo: asString(filterObject.provinceTo ?? req.query?.['filter[provinceTo]']),
  }

  try {
    const result = await service.findAll({ page, limit, sort, filters })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function getRouteById(req, res, next) {
  const id = req.params.id
  try {
    const route = await service.findById(id)
    if (!route) return next(createError(404, 'Route not found'))
    return res.json(route)
  } catch (err) {
    return next(err)
  }
}

export async function getRouteByCode(req, res, next) {
  const code = req.params.code
  try {
    const route = await service.findByCode(code)
    if (!route) return next(createError(404, 'Route not found'))
    return res.json(route)
  } catch (err) {
    return next(err)
  }
}
