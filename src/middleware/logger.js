import pino from 'pino'
import pinoHttp from 'pino-http'

const usePretty = process.env.NODE_ENV !== 'production'

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // only enable pretty transport outside production
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      }
    : {})
})

const loggerMiddleware = pinoHttp({
  logger: baseLogger,
  genReqId: (req) => req.id,
  customProps: (req) => ({ requestId: req.id })
})

export default loggerMiddleware
export { baseLogger }
