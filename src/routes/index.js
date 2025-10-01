import { Router } from 'express'
import routesRouter from '../modules/routes/routes.router.js'
import busesRouter from '../modules/buses/bus.router.js'
import tripsRouter from '../modules/trips/trip.router.js'
import alertsRouter from '../modules/alerts/alerts.router.js'

const api = Router()

api.use('/routes', routesRouter)
api.use('/buses', busesRouter)
api.use('/trips', tripsRouter)
api.use('/alerts', alertsRouter)

export default api
