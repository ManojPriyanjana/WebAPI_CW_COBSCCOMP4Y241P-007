import { Router } from 'express'
import { getBuses, getBusById, createBus } from './bus.controller.js'

const router = Router()

router.get('/', getBuses)
router.get('/:id', getBusById)
router.post('/', createBus)

export default router
