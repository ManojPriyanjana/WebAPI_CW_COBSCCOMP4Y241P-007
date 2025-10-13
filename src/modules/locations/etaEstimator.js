const EARTH_RADIUS_KM = 6371

function clampMinutes(value) {
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded < 0 ? 0 : rounded
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function extractCoordinates(input) {
  const coords = input?.location?.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) return null
  const [lon, lat] = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon }
}

export function computeDistanceKm(from, to) {
  const a = extractCoordinates(from)
  const b = extractCoordinates(to)
  if (!a || !b) return null

  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const dLat = toRadians(b.lat - a.lat)
  const dLon = toRadians(b.lon - a.lon)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine))
  return distance
}

function timestampOf(sample) {
  const ts = sample?.ts ?? sample?.createdAt ?? sample?.updatedAt
  const date = toDate(ts)
  return date?.getTime?.() ?? null
}

export function averageSpeedFromSamples(samples, maxSamples = 5) {
  if (!Array.isArray(samples) || samples.length === 0) return null
  const slice = samples.slice(0, maxSamples)

  const explicitSpeeds = slice
    .map((item) => Number(item?.speedKph))
    .filter((speed) => Number.isFinite(speed) && speed > 0)

  if (explicitSpeeds.length > 0) {
    const total = explicitSpeeds.reduce((sum, speed) => sum + speed, 0)
    return total / explicitSpeeds.length
  }

  if (slice.length < 2) return null

  let distanceKm = 0
  let hours = 0

  for (let index = 0; index < slice.length - 1; index += 1) {
    const current = slice[index]
    const next = slice[index + 1]
    const firstCoords = extractCoordinates(current)
    const secondCoords = extractCoordinates(next)
    if (!firstCoords || !secondCoords) continue

    const firstTs = timestampOf(current)
    const secondTs = timestampOf(next)
    if (!firstTs || !secondTs || firstTs === secondTs) continue

    const segmentDistance = computeDistanceKm(current, next)
    if (!Number.isFinite(segmentDistance) || segmentDistance <= 0) continue

    const segmentHours = Math.abs(firstTs - secondTs) / 3600000
    if (segmentHours <= 0) continue

    distanceKm += segmentDistance
    hours += segmentHours
  }

  if (distanceKm === 0 || hours === 0) return null
  return distanceKm / hours
}

export function estimateTravelMinutes(distanceKm, speedKph) {
  if (distanceKm === null || distanceKm === undefined) return null
  if (!Number.isFinite(distanceKm)) return null
  if (distanceKm <= 0) return 0
  if (!Number.isFinite(speedKph) || speedKph <= 0) return null
  return clampMinutes((distanceKm / speedKph) * 60)
}

export function estimateEtaFromSchedule(now, schedArrive) {
  const current = toDate(now)
  const arrival = toDate(schedArrive)
  if (!current || !arrival) return null
  const remaining = (arrival.getTime() - current.getTime()) / 60000
  return clampMinutes(remaining)
}

function buildStopDescriptor(stop) {
  if (!stop) return null
  const id = stop._id ?? stop.id
  if (!id) return null
  return {
    id: String(id),
    name: stop.name ?? '',
    location: stop.location,
  }
}

function etaForDeparture(now, schedDepart) {
  const current = toDate(now)
  const depart = toDate(schedDepart)
  if (!current || !depart) return null
  const diffMinutes = (depart.getTime() - current.getTime()) / 60000
  return clampMinutes(diffMinutes)
}

export function buildEtaPayload({
  now,
  latestSample,
  trip,
  recentSamples,
  maxSamples = 5,
}) {
  if (!trip || !latestSample) return null

  const fromStop = buildStopDescriptor(trip.fromStopId)
  const destinationStop = buildStopDescriptor(trip.toStopId)
  if (!destinationStop) return null

  const position = extractCoordinates(latestSample)
  if (!position) return null

  const averageSpeed = averageSpeedFromSamples(recentSamples ?? [latestSample], maxSamples)
  const distanceToDestination = computeDistanceKm(latestSample, { location: destinationStop.location })

  let destinationEta = estimateTravelMinutes(distanceToDestination, averageSpeed ?? null)
  if (destinationEta === null) {
    destinationEta = estimateEtaFromSchedule(now, trip.schedArrive)
  }
  if (destinationEta === null) return null

  let nextStopEta = destinationEta
  let nextStop = destinationStop

  if (fromStop) {
    const distanceToOrigin = computeDistanceKm(latestSample, { location: fromStop.location })
    const departEta = etaForDeparture(now, trip.schedDepart)
    const hasDeparted = Number.isFinite(distanceToOrigin) && Number.isFinite(distanceToDestination)
      ? distanceToDestination <= distanceToOrigin
      : (departEta ?? 0) === 0

    if (!hasDeparted && departEta !== null) {
      nextStopEta = departEta
      nextStop = fromStop
    }
  }

  const delayMinutes = (() => {
    const scheduledRemaining = estimateEtaFromSchedule(now, trip.schedArrive)
    if (scheduledRemaining === null) return null
    return destinationEta - scheduledRemaining
  })()

  return {
    nextStop: {
      id: nextStop.id,
      name: nextStop.name,
      etaMinutes: nextStopEta,
    },
    destination: {
      id: destinationStop.id,
      name: destinationStop.name,
      etaMinutes: destinationEta,
    },
    delayMinutes,
  }
}
