import pino from 'pino'
import pinoHttp from 'pino-http'

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
})

const loggerMiddleware = pinoHttp({
  logger: baseLogger,
  genReqId: (req) => req.id,
  customProps: (req) => ({ requestId: req.id }),
})

export default loggerMiddleware

export { baseLogger }
