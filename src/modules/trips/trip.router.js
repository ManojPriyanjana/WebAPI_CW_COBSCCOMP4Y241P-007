import { Router } from 'express'
import { getTrips, getTripById, createTrip } from './trip.controller.js'

const router = Router()

router.get('/', getTrips)
router.get('/:id', getTripById)
router.post('/', createTrip)

export default router
