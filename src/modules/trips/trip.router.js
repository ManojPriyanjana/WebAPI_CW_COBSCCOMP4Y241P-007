import { Router } from 'express'
import { getTrips, getTripById, createTrip, updateTrip, deleteTrip, searchTrips } from './trip.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', getTrips)
router.get('/search', searchTrips)
router.get('/:id', getTripById)
router.post('/', verifyJWT, requireRole('admin', 'operator'), createTrip)
router.patch('/:id', verifyJWT, requireRole('admin', 'operator'), updateTrip)
router.delete('/:id', verifyJWT, requireRole('admin', 'operator'), deleteTrip)

export default router
