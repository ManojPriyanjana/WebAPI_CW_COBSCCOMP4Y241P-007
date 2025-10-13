import {
  SERVICE_TIMEZONE,
  combineServiceDateAndTime,
  ensureStartBeforeEnd,
  getServiceDateRange,
  parseDateTimeInput,
} from '../utils/datetime.js'

describe('datetime utilities', () => {
  test('service timezone constant is Asia/Colombo', () => {
    expect(SERVICE_TIMEZONE).toBe('Asia/Colombo')
  })

  test('getServiceDateRange honors Asia/Colombo midnight boundaries', () => {
    const { start, end } = getServiceDateRange('2025-10-06')
    expect(start.toISOString()).toBe('2025-10-05T18:30:00.000Z')
    expect(end.toISOString()).toBe('2025-10-06T18:29:59.999Z')
  })

  test('combineServiceDateAndTime merges date/time in service zone', () => {
    const instant = combineServiceDateAndTime('2025-10-06', '07:15')
    expect(instant.toISOString()).toBe('2025-10-06T01:45:00.000Z')
  })

  test('parseDateTimeInput accepts ISO instants and local dates', () => {
    const iso = parseDateTimeInput('2025-10-06T01:45:00Z')
    expect(iso.toISOString()).toBe('2025-10-06T01:45:00.000Z')

    const localDate = parseDateTimeInput('2025-10-06')
    expect(localDate.toISOString()).toBe('2025-10-05T18:30:00.000Z')
  })

  test('ensureStartBeforeEnd throws when start is after end', () => {
    const start = combineServiceDateAndTime('2025-10-06', '10:00')
    const end = combineServiceDateAndTime('2025-10-06', '09:00')
    expect(() => ensureStartBeforeEnd(start, end, 'start', 'end')).toThrow('start must be before or equal to end')
  })
})
