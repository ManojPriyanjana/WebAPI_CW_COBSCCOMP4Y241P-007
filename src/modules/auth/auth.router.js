import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, refresh, logout } from './auth.controller.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
})

router.post('/register', limiter, register)
router.post('/login', limiter, login)
router.post('/refresh', limiter, refresh)
router.post('/logout', limiter, logout)

export default router
