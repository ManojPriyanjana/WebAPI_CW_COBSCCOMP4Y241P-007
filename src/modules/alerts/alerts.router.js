import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { listAlerts, getAlert, createAlert, updateAlert, deleteAlert } from './alerts.controller.js'
import { verifyJWT, requireRole } from '../../middleware/auth.js'

const router = Router()

// Public GET rate limiter: 60 req/min/ip
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })

router.get('/', readLimiter, listAlerts)
router.get('/:id', readLimiter, getAlert)

router.post('/', verifyJWT, requireRole('admin', 'operator'), createAlert)
router.patch('/:id', verifyJWT, requireRole('admin', 'operator'), updateAlert)
router.delete('/:id', verifyJWT, requireRole('admin', 'operator'), deleteAlert)

export default router
