// Very lightweight validators (placeholder for zod)

export function asString(value) {
  if (value === undefined || value === null) return undefined
  return String(value)
}

export function asInt(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? fallback : n
}

export function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}
