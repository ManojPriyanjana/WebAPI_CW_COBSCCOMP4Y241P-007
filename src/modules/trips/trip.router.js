import { Router } from 'express'
import { getTrips, getTripById, createTrip } from './trip.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', getTrips)
router.get('/:id', getTripById)
router.post('/', verifyJWT, requireRole('admin', 'operator'), createTrip)

export default router
