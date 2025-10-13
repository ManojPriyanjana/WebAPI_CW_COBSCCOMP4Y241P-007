import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import createError from 'http-errors'
import { authConfig } from '../../config/auth.js'
import User, { USER_ROLES } from '../users/users.model.js'

// In-memory refresh token store (placeholder). For production, use Redis or DB with rotation/blacklist.
const refreshStore = new Map() // key: token, value: { userId, exp }

function signAccessToken(payload) {
  if (!authConfig.privateKey) throw new Error('JWT private key not configured')
  return jwt.sign(payload, authConfig.privateKey, {
    algorithm: 'RS256',
    expiresIn: authConfig.accessTokenTtl,
  })
}

function signRefreshToken(payload) {
  if (!authConfig.privateKey) throw new Error('JWT private key not configured')
  return jwt.sign(payload, authConfig.privateKey, {
    algorithm: 'RS256',
    expiresIn: authConfig.refreshTokenTtl,
  })
}

function verifyToken(token) {
  if (!authConfig.publicKey) throw new Error('JWT public key not configured')
  return jwt.verify(token, authConfig.publicKey, { algorithms: ['RS256'] })
}

export async function register({ email, password }) {
  if (!email || !password) throw createError(400, 'email and password are required')
  const existing = await User.findOne({ email })
  if (existing) throw createError(409, 'email already registered')

  const finalRole = 'commuter'
  if (!USER_ROLES.includes(finalRole)) throw createError(400, 'invalid role')

  const passwordHash = await argon2.hash(password)
  const user = await User.create({ email, passwordHash, role: finalRole })
  return { _id: user._id, email: user.email, role: user.role }
}

export async function login({ email, password }) {
  if (!email || !password) throw createError(400, 'email and password are required')
  const user = await User.findOne({ email })
  if (!user) throw createError(401, 'invalid credentials')
  const ok = await argon2.verify(user.passwordHash, password)
  if (!ok) throw createError(401, 'invalid credentials')

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role })
  const refreshToken = signRefreshToken({ sub: user._id.toString(), type: 'refresh' })
  const decoded = verifyToken(refreshToken)
  refreshStore.set(refreshToken, { userId: user._id.toString(), exp: decoded.exp })
  return { accessToken, refreshToken }
}

export async function refresh({ refreshToken }) {
  if (!refreshToken) throw createError(400, 'refreshToken is required')
  const stored = refreshStore.get(refreshToken)
  if (!stored) throw createError(401, 'invalid refresh token')
  let decoded
  try {
    decoded = verifyToken(refreshToken)
  } catch (e) {
    refreshStore.delete(refreshToken)
    throw createError(401, 'invalid refresh token')
  }
  // Fetch user to include current role in refreshed token
  const userId = decoded.sub
  const user = await User.findById(userId).lean()
  const accessToken = signAccessToken({ sub: userId, role: user?.role || 'commuter' })
  return { accessToken }
}

export async function logout({ refreshToken }) {
  if (!refreshToken) throw createError(400, 'refreshToken is required')
  refreshStore.delete(refreshToken)
  return { success: true }
}

export const _internals = { refreshStore, signAccessToken, signRefreshToken, verifyToken }
