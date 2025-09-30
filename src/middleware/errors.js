import createError from 'http-errors'
import { baseLogger } from './logger.js'

// Async wrapper to catch errors without try/catch in each route
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Not found handler (use before error handler)
export function notFound(req, res, next) {
  next(createError(404, 'Not Found'))
}

// Centralized error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Convert non-http-errors
  const httpErr = createError.isHttpError(err)
    ? err
    : createError(500, err.message || 'Internal Server Error')

  const status = httpErr.status || httpErr.statusCode || 500
  const payload = {
    error: {
      code: status,
      message: httpErr.message,
    },
  }

  // Log with request id context
  baseLogger.error({ err: httpErr, requestId: req.id }, httpErr.message)

  res.status(status).json(payload)
}
