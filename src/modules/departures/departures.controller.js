import { parsePagination } from '../common/pagination.js'
import * as service from './departures.service.js'

export async function getNearbyDepartures(req, res, next) {
  const { page, limit } = parsePagination(req.query)
  try {
    const result = await service.findNearbyDepartures({
      lat: req.query.lat,
      lng: req.query.lng,
      radiusMeters: req.query.radiusMeters,
      date: req.query.date,
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      page,
      limit,
    })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}
