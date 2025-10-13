import rateLimit from 'express-rate-limit'

function jsonHandler(message) {
  return (req, res, _next, options) => {
    const statusCode = options.statusCode || 429
    res.status(statusCode).json({ error: { code: statusCode, message } })
  }
}

const standardHeaders = true
const legacyHeaders = false

export const locationWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_LOCATION_WRITE ?? 5),
  standardHeaders,
  legacyHeaders,
  handler: jsonHandler('Too many location updates from this client. Try again later.'),
  keyGenerator: (req) => `${req.ip}:${req.params?.id ?? 'global'}`,
})

export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PUBLIC_READ ?? 300),
  standardHeaders,
  legacyHeaders,
  handler: jsonHandler('Too many requests. Please slow down and retry shortly.'),
})
