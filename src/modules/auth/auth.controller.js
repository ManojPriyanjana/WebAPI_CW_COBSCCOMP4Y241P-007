import { asyncHandler } from '../../middleware/errors.js'
import * as authService from './auth.service.js'

export const register = asyncHandler(async (req, res) => {
  const { email, password, role, operatorId } = req.body || {}
  const user = await authService.register({ email, password, role, operatorId })
  res.status(201).json({ data: user })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}
  const tokens = await authService.login({ email, password })
  res.json(tokens)
})

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {}
  const token = await authService.refresh({ refreshToken })
  res.json(token)
})

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {}
  const result = await authService.logout({ refreshToken })
  res.json(result)
})
