import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import crypto from 'crypto'
import createError from 'http-errors'
import { authConfig } from '../../config/auth.js'
import User, { USER_ROLES } from '../users/users.model.js'
import RefreshToken from './refreshToken.model.js'

function signAccessToken(payload) {
  if (!authConfig.privateKey) throw new Error('JWT private key not configured')
  return jwt.sign(payload, authConfig.privateKey, {
    algorithm: 'RS256',
    expiresIn: authConfig.accessTokenTtl,
  })
}

function verifyToken(token) {
  if (!authConfig.publicKey) throw new Error('JWT public key not configured')
  return jwt.verify(token, authConfig.publicKey, { algorithms: ['RS256'] })
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function resolveRefreshExpiry() {
  const ttlMs = parseDurationToMs(authConfig.refreshTokenTtl)
  return new Date(Date.now() + ttlMs)
}

async function issueRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('base64url')
  const tokenHash = hashRefreshToken(rawToken)
  const expiresAt = resolveRefreshExpiry()
  await RefreshToken.create({ userId, tokenHash, expiresAt })
  return rawToken
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken)
  await RefreshToken.findOneAndUpdate({ tokenHash }, { $set: { revokedAt: new Date() } })
}

async function getValidRefreshRecord(rawToken) {
  const tokenHash = hashRefreshToken(rawToken)
  const record = await RefreshToken.findOne({ tokenHash }).lean()
  if (!record) throw createError(401, 'invalid refresh token')
  if (record.revokedAt) throw createError(401, 'invalid refresh token')
  if (record.expiresAt <= new Date()) throw createError(401, 'invalid refresh token')
  return record
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
  const refreshToken = await issueRefreshToken(user._id)
  return { accessToken, refreshToken }
}

export async function refresh({ refreshToken }) {
  if (!refreshToken) throw createError(400, 'refreshToken is required')
  const record = await getValidRefreshRecord(refreshToken)
  const user = await User.findById(record.userId).lean()
  if (!user) {
    await RefreshToken.deleteOne({ _id: record._id })
    throw createError(401, 'invalid refresh token')
  }
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role })
  return { accessToken }
}

export async function logout({ refreshToken }) {
  if (!refreshToken) throw createError(400, 'refreshToken is required')
  await revokeRefreshToken(refreshToken)
  return { success: true }
}

function parseDurationToMs(input) {
  if (!input) throw new Error('refresh token ttl not configured')
  if (typeof input === 'number') return input
  const match = /^([0-9]+)([smhdw])$/.exec(String(input).trim())
  if (!match) throw new Error(`unsupported duration format: ${input}`)
  const value = Number(match[1])
  const unit = match[2]
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }
  return value * multipliers[unit]
}

export const _internals = { signAccessToken, verifyToken, parseDurationToMs, hashRefreshToken }
