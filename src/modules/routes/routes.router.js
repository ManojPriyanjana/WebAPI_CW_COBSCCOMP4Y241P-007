import { Router } from 'express'
import {
	getRoutes,
	getRouteById,
	getRouteByCode,
	createRoute,
	updateRoute,
	deleteRoute,
} from './routes.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', getRoutes)
router.get('/by-code/:code', getRouteByCode)
router.get('/:id', getRouteById)
router.post('/', verifyJWT, requireRole('admin'), createRoute)
router.patch('/:id', verifyJWT, requireRole('admin'), updateRoute)
router.delete('/:id', verifyJWT, requireRole('admin'), deleteRoute)

export default router
