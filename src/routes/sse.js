import { Router } from 'express'
import mongoose from 'mongoose'
import LocationUpdate from '../modules/locations/locationUpdate.model.js'
import Trip from '../modules/trips/trip.model.js'
import Alert from '../modules/alerts/alerts.model.js'

const router = Router()

router.get('/stream/positions', async (req, res, next) => {
  try {
    // Ensure headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-store, no-transform')
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

router.get('/stream/trips/:tripId/status', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: { message: 'Database not connected' } })
    }

    const { tripId } = req.params
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(404).json({ error: { message: 'Trip not found' } })
    }

    const trip = await Trip.findById(tripId).lean()
    if (!trip) {
      return res.status(404).json({ error: { message: 'Trip not found' } })
    }

    const tripObjectId = trip._id
    const tripIdString = tripObjectId.toString()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-store, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    res.write(`retry: 15000\n\n`)

    const sendEvent = (payload) => {
      res.write(`event: status\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    const now = new Date()
    const updatedAt = trip.updatedAt || trip.createdAt || now
    sendEvent({
      kind: 'trip-status',
      tripId: tripIdString,
      status: trip.status,
      updatedAt,
    })

    const activeAlerts = await Alert.find({
      tripId: tripObjectId,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    })
      .sort({ validFrom: -1 })
      .lean()

    activeAlerts.forEach((alert) => {
      sendEvent({
        kind: 'alert',
        tripId: tripIdString,
        alert: {
          id: alert._id.toString(),
          severity: alert.severity,
          message: alert.message,
          validFrom: alert.validFrom,
          validTo: alert.validTo,
        },
      })
    })

    const heartbeat = setInterval(() => {
      res.write(`: hb\n\n`)
    }, 15000)

    const streams = []

    try {
      const tripStream = Trip.watch(
        [
          {
            $match: {
              'documentKey._id': tripObjectId,
              operationType: { $in: ['update', 'replace'] },
            },
          },
        ],
        { fullDocument: 'updateLookup' }
      )

      tripStream.on('change', (change) => {
        const doc = change.fullDocument
        if (!doc) return
        sendEvent({
          kind: 'trip-status',
          tripId: tripIdString,
          status: doc.status,
          updatedAt: doc.updatedAt || new Date(),
        })
      })

      tripStream.on('error', (err) => {
        res.write(`event: error\n`)
        res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`)
      })

      streams.push(tripStream)
    } catch (err) {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: 'Trip status stream unavailable' })}\n\n`)
    }

    try {
      const alertStream = Alert.watch(
        [
          {
            $match: {
              operationType: { $in: ['insert', 'update', 'replace'] },
              'fullDocument.tripId': tripObjectId,
            },
          },
        ],
        { fullDocument: 'updateLookup' }
      )

      alertStream.on('change', (change) => {
        const doc = change.fullDocument
        if (!doc) return
        sendEvent({
          kind: 'alert',
          tripId: tripIdString,
          alert: {
            id: doc._id.toString(),
            severity: doc.severity,
            message: doc.message,
            validFrom: doc.validFrom,
            validTo: doc.validTo,
          },
        })
      })

      alertStream.on('error', (err) => {
        res.write(`event: error\n`)
        res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`)
      })

      streams.push(alertStream)
    } catch (err) {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: 'Alert stream unavailable' })}\n\n`)
    }

    const cleanup = async () => {
      clearInterval(heartbeat)
      await Promise.all(
        streams.map(async (stream) => {
          try {
            await stream.close()
          } catch {
            /* noop */
          }
        })
      )
    }

    req.on('close', () => {
      cleanup().catch(() => {
        /* noop */
      })
    })
  } catch (err) {
    next(err)
  }
})

export default router
