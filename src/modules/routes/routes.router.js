import { Router } from 'express'
import { getRoutes, getRouteById } from './routes.controller.js'

const router = Router()

router.get('/', getRoutes)
router.get('/:id', getRouteById)

export default router
