import { Router } from 'express'
import { verifyJWT, requireRole } from '../../middleware/auth.js'
import { patchUserRole } from './users.controller.js'

const router = Router()

router.patch('/:id/role', verifyJWT, requireRole('admin'), patchUserRole)

export default router
