import { parsePagination } from '../common/pagination.js'
import { asString, pick } from '../common/validate.js'
import { httpError } from '../../middleware/errors.js'
import * as service from './routes.service.js'
import { buildCollectionEtag } from '../../utils/etag.js'

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
    const etag = buildCollectionEtag(result.total, result.lastUpdatedAt)
    if (etag) res.setHeader('ETag', etag)
    if (result.lastUpdatedAt) res.setHeader('Last-Modified', new Date(result.lastUpdatedAt).toUTCString())

    if (etag && req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    return res.json({ data: result.data, page: result.page, limit: result.limit, total: result.total })
  } catch (err) {
    return next(err)
  }
}

export async function getRouteById(req, res, next) {
  const id = req.params.id
  try {
    const route = await service.findById(id)
    if (!route) return next(httpError(404, 'Route not found'))
    return res.json(route)
  } catch (err) {
    return next(err)
  }
}

export async function getRouteByCode(req, res, next) {
  const code = req.params.code
  try {
    const route = await service.findByCode(code)
    if (!route) return next(httpError(404, 'Route not found'))
    return res.json(route)
  } catch (err) {
    return next(err)
  }
}

export async function createRoute(req, res, next) {
  const payload = pick(req.body, ['code', 'name', 'provinceFrom', 'provinceTo', 'distanceKm'])
  try {
    const created = await service.create(payload)
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}

export async function updateRoute(req, res, next) {
  const id = req.params.id
  const changes = pick(req.body, ['name', 'provinceFrom', 'provinceTo', 'distanceKm'])
  try {
    const updated = await service.update(id, changes)
    if (!updated) return next(httpError(404, 'Route not found'))
    return res.json(updated)
  } catch (err) {
    return next(err)
  }
}

export async function deleteRoute(req, res, next) {
  const id = req.params.id
  try {
    const removed = await service.remove(id)
    if (!removed) return next(httpError(404, 'Route not found'))
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
}
