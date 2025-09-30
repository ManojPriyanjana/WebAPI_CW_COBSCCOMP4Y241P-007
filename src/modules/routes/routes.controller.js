import createError from 'http-errors'
import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './routes.service.js'

export function getRoutes(req, res) {
  const { page, limit, sort } = parsePagination(req.query)

  const filters = {
    name: asString(req.query?.['filter[name]']),
    provinceFrom: asString(req.query?.['filter[provinceFrom]']),
    provinceTo: asString(req.query?.['filter[provinceTo]'])
  }

  const result = service.findAll({ page, limit, sort, filters })
  return res.json(result)
}

export function getRouteById(req, res, next) {
  const id = req.params.id
  const route = service.findById(id)
  if (!route) return next(createError(404, 'Route not found'))
  return res.json(route)
}
