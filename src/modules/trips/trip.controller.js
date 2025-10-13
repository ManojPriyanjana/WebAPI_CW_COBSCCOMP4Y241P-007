import { parsePagination } from '../common/pagination.js'
import { asString, pick } from '../common/validate.js'
import { httpError } from '../../middleware/errors.js'
import * as service from './trip.service.js'

export async function getTrips(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  const filterObject = typeof req.query.filter === 'object' ? req.query.filter : {}
  const filters = {
    routeId: asString(filterObject.routeId ?? req.query?.['filter[routeId]'] ?? req.query?.routeId),
    busId: asString(filterObject.busId ?? req.query?.['filter[busId]'] ?? req.query?.busId),
    serviceDate: asString(
      filterObject.serviceDate ?? req.query?.['filter[serviceDate]'] ?? req.query?.serviceDate
    ),
  }
  try {
    const result = await service.list({ page, limit, sort, filters })
    return res.json({ data: result.data, page: result.page, limit: result.limit, total: result.total })
  } catch (err) {
    return next(err)
  }
}

export async function getTripById(req, res, next) {
  try {
    const trip = await service.getById(req.params.id)
    if (!trip) return next(httpError(404, 'Trip not found'))
    return res.json(trip)
  } catch (err) {
    return next(err)
  }
}

export async function searchTrips(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  try {
    const result = await service.search({
      fromStopId: req.query.fromStopId,
      toStopId: req.query.toStopId,
      date: req.query.date,
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      page,
      limit,
      sort,
    })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function createTrip(req, res, next) {
  try {
    const created = await service.create(req.body, req.user)
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}

export async function updateTrip(req, res, next) {
  const payload = pick(req.body, [
    'routeId',
    'busId',
    'serviceDate',
    'schedDepart',
    'schedArrive',
    'status',
    'ownerId',
  ])
  try {
    const updated = await service.update(req.params.id, payload, req.user)
    if (!updated) return next(httpError(404, 'Trip not found'))
    return res.json(updated)
  } catch (err) {
    return next(err)
  }
}

export async function deleteTrip(req, res, next) {
  try {
    const removed = await service.remove(req.params.id, req.user)
    if (!removed) return next(httpError(404, 'Trip not found'))
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
}
