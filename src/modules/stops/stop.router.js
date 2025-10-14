import { Router } from 'express'
import { getStops } from './stop.controller.js'

const router = Router()

router.get('/', getStops)

export default router
