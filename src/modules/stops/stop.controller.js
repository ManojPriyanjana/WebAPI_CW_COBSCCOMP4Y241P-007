import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './stop.service.js'
import { buildCollectionEtag } from '../../utils/etag.js'

export async function getStops(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  const filterObject = typeof req.query.filter === 'object' ? req.query.filter : {}
  const filters = {
    code: asString(filterObject.code ?? req.query?.['filter[code]']),
    name: asString(filterObject.name ?? req.query?.['filter[name]']),
    province: asString(filterObject.province ?? req.query?.['filter[province]']),
  }

  try {
    const result = await service.findAll({ page, limit, sort, filters })
    const etag = buildCollectionEtag(result.total, result.lastUpdatedAt)
    if (etag) res.setHeader('ETag', etag)
    if (result.lastUpdatedAt) res.setHeader('Last-Modified', new Date(result.lastUpdatedAt).toUTCString())
    res.setHeader('Cache-Control', 'public, max-age=300')

    if (etag && req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    return res.json({ data: result.data, page: result.page, limit: result.limit, total: result.total })
  } catch (err) {
    return next(err)
  }
}
