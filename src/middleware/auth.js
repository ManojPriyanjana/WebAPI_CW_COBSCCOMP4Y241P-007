import createError from 'http-errors'
import jwt from 'jsonwebtoken'
import { authConfig } from '../config/auth.js'

export function verifyJWT(req, _res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.substring(7) : null
  if (!token) return next(createError(401, 'missing bearer token'))
  try {
    const decoded = jwt.verify(token, authConfig.publicKey, { algorithms: ['RS256'] })
    req.user = { id: decoded.sub, role: decoded.role }
    return next()
  } catch (e) {
    return next(createError(401, 'invalid or expired token'))
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(createError(401, 'unauthorized'))
    if (!roles.includes(req.user.role)) return next(createError(403, 'forbidden'))
    return next()
  }
}
