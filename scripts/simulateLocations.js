import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Bus from '../src/modules/buses/bus.model.js'
import LocationUpdate from '../src/modules/locations/locationUpdate.model.js'

dotenv.config()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Simple set of base points (lon, lat) to simulate a straight-ish route
const baseRoutes = [
  [79.8612, 6.9271], // Colombo
  [80.0433, 7.1460],
  [80.2140, 7.2906],
  [80.3765, 7.3350],
  [80.6280, 7.2906],
  [80.6350, 7.2940]
]

function jitter([lon, lat], scale = 0.01) {
  const jLon = lon + (Math.random() - 0.5) * scale
  const jLat = lat + (Math.random() - 0.5) * scale
  return [jLon, jLat]
}

async function ensureDemoBuses(n = 25) {
  const count = await Bus.countDocuments()
  if (count >= n) return
  const docs = []
  for (let i = 0; i < n; i++) {
    docs.push({ regNo: `SIM-${String(i + 1).padStart(3, '0')}`, operator: 'SimOps', capacity: 40, status: 'ACTIVE' })
  }
  await Bus.insertMany(docs, { ordered: false }).catch(() => {})
}

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  await ensureDemoBuses(25)
  const buses = await Bus.find({ operator: 'SimOps' }).lean().limit(25)
  if (buses.length === 0) throw new Error('No buses available for simulation')

  let idx = 0
  while (true) {
    const base = baseRoutes[idx % baseRoutes.length]
    idx++
    const ops = buses.map((b) => {
      const [lon, lat] = jitter(base, 0.02)
      const speed = 30 + Math.floor(Math.random() * 40)
      return LocationUpdate.create({
        busId: b._id,
        ts: new Date(),
        location: { type: 'Point', coordinates: [lon, lat] },
        speedKph: speed
      })
    })
    await Promise.allSettled(ops)
    console.log('Inserted location updates for', buses.length, 'buses')
    await sleep(20000)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
