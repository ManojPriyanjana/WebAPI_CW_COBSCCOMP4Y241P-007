import { Router } from 'express'
import { getRoutes, getRouteById, getRouteByCode } from './routes.controller.js'

const router = Router()

router.get('/', getRoutes)
router.get('/by-code/:code', getRouteByCode)
router.get('/:id', getRouteById)

export default router
