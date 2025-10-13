#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUTES = [
  { code: 'R001', name: 'Colombo - Kandy', provinceFrom: 'Western', provinceTo: 'Central', distanceKm: 115 },
  { code: 'R002', name: 'Galle - Matara', provinceFrom: 'Southern', provinceTo: 'Southern', distanceKm: 45 },
  { code: 'R003', name: 'Jaffna - Kilinochchi', provinceFrom: 'Northern', provinceTo: 'Northern', distanceKm: 70 },
  { code: 'R004', name: 'Kandy - Nuwara Eliya', provinceFrom: 'Central', provinceTo: 'Central', distanceKm: 76 },
  { code: 'R005', name: 'Kurunegala - Anuradhapura', provinceFrom: 'North Western', provinceTo: 'North Central', distanceKm: 120 },
  { code: 'R006', name: 'Badulla - Monaragala', provinceFrom: 'Uva', provinceTo: 'Uva', distanceKm: 60 },
  { code: 'R007', name: 'Ratnapura - Kalutara', provinceFrom: 'Sabaragamuwa', provinceTo: 'Western', distanceKm: 85 },
  { code: 'R008', name: 'Trincomalee - Batticaloa', provinceFrom: 'Eastern', provinceTo: 'Eastern', distanceKm: 110 },
  { code: 'R009', name: 'Puttalam - Chilaw', provinceFrom: 'North Western', provinceTo: 'North Western', distanceKm: 25 },
  { code: 'R010', name: 'Hambantota - Tissamaharama', provinceFrom: 'Southern', provinceTo: 'Southern', distanceKm: 35 },
]

const BUSES = [
  { regNo: 'NB-1001', operator: 'CityLink', capacity: 45 },
  { regNo: 'NB-1002', operator: 'CityLink', capacity: 45 },
  { regNo: 'NB-1003', operator: 'IslandExpress', capacity: 52 },
  { regNo: 'NB-1004', operator: 'IslandExpress', capacity: 52 },
  { regNo: 'NB-1005', operator: 'Serendib Coaches', capacity: 48 },
  { regNo: 'NB-1006', operator: 'Serendib Coaches', capacity: 48 },
  { regNo: 'NB-1007', operator: 'LankaTransit', capacity: 50 },
  { regNo: 'NB-1008', operator: 'LankaTransit', capacity: 50 },
  { regNo: 'NB-1009', operator: 'Central Lines', capacity: 40 },
  { regNo: 'NB-1010', operator: 'Central Lines', capacity: 40 },
  { regNo: 'NB-1011', operator: 'Highland Riders', capacity: 42 },
  { regNo: 'NB-1012', operator: 'Highland Riders', capacity: 42 },
]

const MINUTES = 60 * 1000

function parseArgs(argv) {
  const args = { csv: false }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--csv') {
      args.csv = true
      continue
    }
    if (token.startsWith('--')) {
      const key = token.replace(/^--/, '')
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for flag ${token}`)
      }
      args[key] = value
      i++
    } else if (!args.startDate) {
      args.startDate = token
    }
  }
  return args
}

function ensureIsoDate(value) {
  if (!value) {
    const today = new Date()
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid startDate: ${value}`)
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

function toInt(value, fallback) {
  if (value === undefined) return fallback
  const num = Number.parseInt(value, 10)
  if (Number.isNaN(num) || num <= 0) {
    throw new Error(`Invalid numeric value: ${value}`)
  }
  return num
}

function formatYmd(date) {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}${month}${day}`
}

function durationForRoute(route) {
  const avgSpeedKph = 45
  const minutes = Math.round((route.distanceKm / avgSpeedKph) * 60)
  return Math.max(45, minutes)
}

function makeUtc(baseDate, hour, minute = 0) {
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), hour, minute))
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * MINUTES)
}

function assignBus(busAvailability, departTime, busIntervalMinutes) {
  let chosen = null
  let soonestAvailable = null

  for (const bus of BUSES) {
    const availableAt = busAvailability.get(bus.regNo) ?? new Date(0)
    if (availableAt <= departTime) {
      chosen = bus
      break
    }
    if (!soonestAvailable || availableAt < soonestAvailable) {
      chosen = bus
      soonestAvailable = availableAt
    }
  }

  if (!chosen) {
    chosen = BUSES[0]
  }

  const nextAvailable = addMinutes(departTime, busIntervalMinutes)
  busAvailability.set(chosen.regNo, nextAvailable)
  return chosen
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2))
    const startDate = ensureIsoDate(args.startDate)
    const days = toInt(args.days, 7)
    const routeIntervalMinutes = toInt(args.routes ?? args.routeInterval, 5)
    const busIntervalMinutes = toInt(args.buses ?? args.busInterval, 25)
    const includeCsv = Boolean(args.csv)

    const outputDir = path.resolve(__dirname, '../data')
    await fs.mkdir(outputDir, { recursive: true })

    const master = {
      startDate: startDate.toISOString(),
      generatedAt: new Date().toISOString(),
      totalDays: days,
      routeIntervalMinutes,
      busIntervalMinutes,
      routes: ROUTES,
      buses: BUSES,
      days: [],
    }

    const masterCsvRows = includeCsv
      ? [['routeCode', 'busRegNo', 'serviceDate', 'schedDepart', 'schedArrive', 'headsign']]
      : null

    for (let offset = 0; offset < days; offset++) {
      const dayDate = addMinutes(startDate, offset * 24 * 60)
      const busAvailability = new Map()
      const trips = []

      for (const route of ROUTES) {
        const durationMinutes = durationForRoute(route)
        const headsign = route.name
        const dayStart = makeUtc(dayDate, 5)
        const dayEnd = makeUtc(dayDate, 23)

        for (let depart = dayStart; depart <= dayEnd; depart = addMinutes(depart, routeIntervalMinutes)) {
          const bus = assignBus(busAvailability, depart, busIntervalMinutes)
          const arrive = addMinutes(depart, durationMinutes)

          const trip = {
            routeCode: route.code,
            busRegNo: bus.regNo,
            serviceDate: makeUtc(dayDate, 0).toISOString(),
            schedDepart: depart.toISOString(),
            schedArrive: arrive.toISOString(),
            headsign,
          }

          trips.push(trip)
          if (includeCsv) {
            masterCsvRows.push([
              trip.routeCode,
              trip.busRegNo,
              trip.serviceDate,
              trip.schedDepart,
              trip.schedArrive,
              trip.headsign,
            ])
          }
        }
      }

      trips.sort((a, b) => new Date(a.schedDepart).getTime() - new Date(b.schedDepart).getTime())

      const dayTag = formatYmd(dayDate)
      const dayFile = `trips-${dayTag}.json`
      const dayPath = path.join(outputDir, dayFile)
      await fs.writeFile(dayPath, JSON.stringify(trips, null, 2))

      if (includeCsv) {
        const csvLines = [['routeCode', 'busRegNo', 'serviceDate', 'schedDepart', 'schedArrive', 'headsign'], ...trips.map((t) => [t.routeCode, t.busRegNo, t.serviceDate, t.schedDepart, t.schedArrive, t.headsign])]
          .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
          .join('\n')
        await fs.writeFile(path.join(outputDir, `trips-${dayTag}.csv`), `${csvLines}\n`)
      }

      master.days.push({
        serviceDate: makeUtc(dayDate, 0).toISOString(),
        file: dayFile,
        tripCount: trips.length,
        trips,
      })
    }

    const masterPath = path.join(outputDir, 'simulation-week.json')
    await fs.writeFile(masterPath, JSON.stringify(master, null, 2))

    if (includeCsv && masterCsvRows) {
      const csvContent = masterCsvRows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      await fs.writeFile(path.join(outputDir, 'simulation-week.csv'), `${csvContent}\n`)
    }

    console.log(`Generated simulation data for ${days} day(s) starting ${startDate.toISOString().slice(0, 10)}`)
    console.log(`Files written to ${outputDir}`)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

main()
