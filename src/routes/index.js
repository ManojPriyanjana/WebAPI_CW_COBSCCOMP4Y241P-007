import { Router } from 'express'
import routesRouter from '../modules/routes/routes.router.js'
import busesRouter from '../modules/buses/bus.router.js'
import tripsRouter from '../modules/trips/trip.router.js'
import alertsRouter from '../modules/alerts/alerts.router.js'
import stopsRouter from '../modules/stops/stop.router.js'
import { publicReadLimiter } from '../middleware/rateLimits.js'

const api = Router()

api.use((req, res, next) => {
	if (req.method === 'GET' || req.method === 'HEAD') {
		return publicReadLimiter(req, res, next)
	}
	return next()
})

api.use('/routes', routesRouter)
api.use('/stops', stopsRouter)
api.use('/buses', busesRouter)
api.use('/trips', tripsRouter)
api.use('/alerts', alertsRouter)

export default api
