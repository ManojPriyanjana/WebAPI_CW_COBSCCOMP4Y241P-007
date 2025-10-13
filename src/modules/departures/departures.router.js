import { Router } from 'express'
import { getNearbyDepartures } from './departures.controller.js'

const router = Router()

router.get('/nearby', getNearbyDepartures)

export default router
