// import pino from 'pino'
// import pinoHttp from 'pino-http'

// const usePretty = process.env.NODE_ENV !== 'production'

// const baseLogger = pino({
//   level: process.env.LOG_LEVEL || 'info',
//   // only enable pretty transport outside production
//   ...(usePretty
//     ? {
//         transport: {
//           target: 'pino-pretty',
//           options: { colorize: true }
//         }
//       }
//     : {})
// })

// const loggerMiddleware = pinoHttp({
//   logger: baseLogger,
//   genReqId: (req) => req.id,
//   customProps: (req) => ({ requestId: req.id })
// })

// export default loggerMiddleware
// export { baseLogger }
//--------------------------------

import pino from 'pino'
import pinoHttp from 'pino-http'

// Plain JSON logs only (safe for dev/stage/prod)
export const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info'
})

const loggerMiddleware = pinoHttp({
  logger: baseLogger,
  genReqId: (req) => req.id,
  customProps: (req) => ({ requestId: req.id })
})

export default loggerMiddleware
export const logger = baseLogger
