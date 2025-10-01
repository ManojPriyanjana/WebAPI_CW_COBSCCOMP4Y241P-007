import { Router } from 'express'
import { getBuses, getBusById, createBus } from './bus.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', getBuses)
router.get('/:id', getBusById)
router.post('/', verifyJWT, requireRole('admin', 'operator'), createBus)

export default router
