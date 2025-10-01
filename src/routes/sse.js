import { Router } from 'express'
import mongoose from 'mongoose'
import LocationUpdate from '../modules/locations/locationUpdate.model.js'

const router = Router()

router.get('/stream/positions', async (req, res, next) => {
  try {
    // Ensure headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    // Heartbeat every 15s
    const heartbeat = setInterval(() => {
      res.write(`: hb\n\n`)
    }, 15000)

    // If DB not connected, end
    if (mongoose.connection.readyState !== 1) {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: 'DB not connected' })}\n\n`)
      clearInterval(heartbeat)
      return res.end()
    }

    // Watch new inserts
    const changeStream = LocationUpdate.watch([{ $match: { operationType: 'insert' } }], {
      fullDocument: 'updateLookup',
    })

    const onChange = (change) => {
      const doc = change.fullDocument
      const [lon, lat] = doc.location?.coordinates || []
      const payload = {
        busId: String(doc.busId),
        lat,
        lon,
        ts: doc.ts || doc.createdAt,
        speedKph: doc.speedKph,
      }
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    changeStream.on('change', onChange)
    changeStream.on('error', (err) => {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`)
    })

    // Cleanup on client close
    req.on('close', async () => {
      clearInterval(heartbeat)
      try {
        await changeStream.close()
      } catch {
        /* noop */
      }
    })
  } catch (err) {
    next(err)
  }
})

export default router
