import createError from 'http-errors'
import { parsePagination } from '../common/pagination.js'
import { asString } from '../common/validate.js'
import * as service from './trip.service.js'

export async function getTrips(req, res, next) {
  const { page, limit, sort } = parsePagination(req.query)
  const filters = {
    routeId: asString(req.query?.routeId),
    busId: asString(req.query?.busId),
    serviceDate: asString(req.query?.serviceDate)
  }
  try {
    const result = await service.list({ page, limit, sort, filters })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function getTripById(req, res, next) {
  try {
    const trip = await service.getById(req.params.id)
    if (!trip) return next(createError(404, 'Trip not found'))
    return res.json(trip)
  } catch (err) {
    return next(err)
  }
}

export async function createTrip(req, res, next) {
  try {
    const created = await service.create(req.body)
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}
