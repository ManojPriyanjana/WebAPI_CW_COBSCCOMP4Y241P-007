import { Router } from 'express'
import routesRouter from '../modules/routes/routes.router.js'

const api = Router()

api.use('/routes', routesRouter)

export default api
