import createError from 'http-errors'

export const SERVICE_TIMEZONE = 'Asia/Colombo'
export const SERVICE_UTC_OFFSET_MINUTES = 5 * 60 + 30

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^\d{2}:\d{2}$/

function assert(condition, status, message) {
  if (!condition) {
    throw createError(status, message)
  }
}

function isValidCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function parseServiceDate(value, field = 'date') {
  if (value === undefined || value === null || value === '') return undefined
  assert(typeof value === 'string', 422, `${field} must be a string in YYYY-MM-DD format`)
  const trimmed = value.trim()
  assert(DATE_PATTERN.test(trimmed), 422, `${field} must be in YYYY-MM-DD format`)
  const [yearStr, monthStr, dayStr] = trimmed.split('-')
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const day = Number.parseInt(dayStr, 10)
  assert(isValidCalendarDate(year, month, day), 422, `${field} is not a valid calendar date`)
  return { year, month, day, source: trimmed }
}

export function parseServiceTime(value, field = 'time') {
  if (value === undefined || value === null || value === '') return undefined
  assert(typeof value === 'string', 422, `${field} must be a string in HH:mm format`)
  const trimmed = value.trim()
  assert(TIME_PATTERN.test(trimmed), 422, `${field} must be in HH:mm format`)
  const [hourStr, minuteStr] = trimmed.split(':')
  const hour = Number.parseInt(hourStr, 10)
  const minute = Number.parseInt(minuteStr, 10)
  assert(hour >= 0 && hour <= 23, 422, `${field} hour must be between 00 and 23`)
  assert(minute >= 0 && minute <= 59, 422, `${field} minute must be between 00 and 59`)
  return { hour, minute, source: trimmed }
}

function localDateTimeToUtc(dateParts, timeParts = {}) {
  const { year, month, day } = dateParts
  const { hour = 0, minute = 0, second = 0, millisecond = 0 } = timeParts
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const offsetMillis = SERVICE_UTC_OFFSET_MINUTES * 60 * 1000
  return new Date(utcMillis - offsetMillis)
}

export function getServiceDateRange(value, field = 'date') {
  const date = parseServiceDate(value, field)
  if (!date) return undefined
  const start = localDateTimeToUtc(date)
  const end = localDateTimeToUtc(date, { hour: 23, minute: 59, second: 59, millisecond: 999 })
  return { start, end }
}

export function combineServiceDateAndTime(dateValue, timeValue, fields = {}) {
  const { dateField = 'date', timeField = 'time' } = fields
  const date = parseServiceDate(dateValue, dateField)
  const time = parseServiceTime(timeValue, timeField)
  assert(date, 422, `${dateField} is required`)
  assert(time, 422, `${timeField} is required`)
  return localDateTimeToUtc(date, { hour: time.hour, minute: time.minute })
}

export function parseDateTimeInput(value, field = 'timestamp') {
  if (value === undefined || value === null || value === '') return undefined
  assert(typeof value === 'string', 422, `${field} must be a string`)
  const trimmed = value.trim()
  if (DATE_PATTERN.test(trimmed)) {
    const { start } = getServiceDateRange(trimmed, field)
    return start
  }
  const date = new Date(trimmed)
  assert(!Number.isNaN(date.getTime()), 422, `${field} must be ISO 8601 or YYYY-MM-DD`)
  return date
}

export function ensureStartBeforeEnd(start, end, startField = 'start', endField = 'end') {
  if (!start || !end) return
  assert(start <= end, 422, `${startField} must be before or equal to ${endField}`)
}

export function toIsoString(date) {
  if (!date) return undefined
  return date.toISOString()
}

export function isServiceDateString(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value.trim())
}

export function isServiceTimeString(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value.trim())
}