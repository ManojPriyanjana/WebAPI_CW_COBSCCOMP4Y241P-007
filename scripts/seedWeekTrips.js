#!/usr/bin/env node
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Trip from '../src/modules/trips/trip.model.js'
import Route from '../src/modules/routes/routes.model.js'
import Bus from '../src/modules/buses/bus.model.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseArgs(argv) {
  const options = {}
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const key = token.replace(/^--/, '')
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for flag ${token}`)
      }
      options[key] = value
      i++
    } else if (!options.file) {
      options.file = token
    }
  }
  return options
}

async function ensureRoutes(routes) {
  const map = new Map()
  for (const route of routes) {
    const doc = await Route.findOneAndUpdate(
      { code: route.code },
      {
        $setOnInsert: {
          name: route.name,
          provinceFrom: route.provinceFrom ?? 'Unknown',
          provinceTo: route.provinceTo ?? 'Unknown',
          distanceKm: route.distanceKm ?? 50,
        },
      },
      { upsert: true, new: true }
    )
    map.set(route.code, doc)
  }
  return map
}

async function ensureBuses(buses) {
  const map = new Map()
  for (const bus of buses) {
    const doc = await Bus.findOneAndUpdate(
      { regNo: bus.regNo },
      {
        $setOnInsert: {
          operator: bus.operator ?? 'Simulation Operator',
          capacity: bus.capacity ?? 40,
          status: bus.status ?? 'ACTIVE',
        },
      },
      { upsert: true, new: true }
    )
    map.set(bus.regNo, doc)
  }
  return map
}

async function seedTrips(days, routeMap, busMap) {
  let inserted = 0
  for (const day of days) {
    if (!Array.isArray(day.trips)) continue
    for (const trip of day.trips) {
      const route = routeMap.get(trip.routeCode)
      const bus = busMap.get(trip.busRegNo)
      if (!route || !bus) {
        console.warn(`Skipping trip ${trip.routeCode}/${trip.busRegNo} because route or bus is missing`)
        continue
      }

      await Trip.findOneAndUpdate(
        {
          routeId: route._id,
          busId: bus._id,
          schedDepart: new Date(trip.schedDepart),
        },
        {
          $set: {
            routeId: route._id,
            busId: bus._id,
            serviceDate: new Date(trip.serviceDate),
            schedDepart: new Date(trip.schedDepart),
            schedArrive: new Date(trip.schedArrive),
            status: 'SCHEDULED',
          },
        },
        { upsert: true }
      )
      inserted += 1
    }
  }
  return inserted
}

async function main() {
  try {
    const { file } = parseArgs(process.argv.slice(2))
    const datasetPath = path.resolve(__dirname, file ?? '../data/simulation-week.json')

    const uri = process.env.MONGO_URI
    if (!uri) throw new Error('MONGO_URI env var is required')

    const raw = await fs.readFile(datasetPath, 'utf-8')
    const data = JSON.parse(raw)

    await mongoose.connect(uri)

    const routeMap = await ensureRoutes(data.routes ?? [])
    const busMap = await ensureBuses(data.buses ?? [])
    const tripsCount = await seedTrips(data.days ?? [], routeMap, busMap)

    console.log(`Seeded or updated ${routeMap.size} routes, ${busMap.size} buses, and ${tripsCount} trips from ${path.basename(datasetPath)}`)
    await mongoose.disconnect()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
