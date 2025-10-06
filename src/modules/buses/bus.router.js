import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getBuses, getBusById, createBus } from './bus.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'
import {
	postBusLocation,
	getLatestBusLocation,
	getBusLocationHistory,
} from '../locations/location.controller.js'

const router = Router()

const locationWriteLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 60,
	standardHeaders: true,
	legacyHeaders: false,
})

router.get('/', getBuses)
router.post('/:id/locations', verifyJWT, requireRole('operator'), locationWriteLimiter, postBusLocation)
router.get('/:id/locations/latest', getLatestBusLocation)
router.get('/:id/locations/history', getBusLocationHistory)
router.get('/:id', getBusById)
router.post('/', verifyJWT, requireRole('admin', 'operator'), createBus)

export default router
