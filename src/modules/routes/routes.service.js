import { paginate } from '../common/pagination.js'

// Demo in-memory data (10 routes)
const routes = [
  { id: 'r1', name: 'Colombo - Kandy', provinceFrom: 'Western', provinceTo: 'Central' },
  { id: 'r2', name: 'Galle - Matara', provinceFrom: 'Southern', provinceTo: 'Southern' },
  { id: 'r3', name: 'Jaffna - Kilinochchi', provinceFrom: 'Northern', provinceTo: 'Northern' },
  { id: 'r4', name: 'Kandy - Nuwara Eliya', provinceFrom: 'Central', provinceTo: 'Central' },
  { id: 'r5', name: 'Kurunegala - Anuradhapura', provinceFrom: 'North Western', provinceTo: 'North Central' },
  { id: 'r6', name: 'Badulla - Monaragala', provinceFrom: 'Uva', provinceTo: 'Uva' },
  { id: 'r7', name: 'Ratnapura - Kalutara', provinceFrom: 'Sabaragamuwa', provinceTo: 'Western' },
  { id: 'r8', name: 'Trincomalee - Batticaloa', provinceFrom: 'Eastern', provinceTo: 'Eastern' },
  { id: 'r9', name: 'Puttalam - Chilaw', provinceFrom: 'North Western', provinceTo: 'North Western' },
  { id: 'r10', name: 'Hambantota - Tissamaharama', provinceFrom: 'Southern', provinceTo: 'Southern' }
]

export function findAll({ page, limit, sort, filters }) {
  let filtered = [...routes]

  if (filters?.name) {
    const q = filters.name.toLowerCase()
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q))
  }
  if (filters?.provinceFrom) {
    filtered = filtered.filter((r) => r.provinceFrom === filters.provinceFrom)
  }
  if (filters?.provinceTo) {
    filtered = filtered.filter((r) => r.provinceTo === filters.provinceTo)
  }

  // Sorting: e.g., 'name' or '-name'
  if (sort) {
    const desc = sort.startsWith('-')
    const key = desc ? sort.slice(1) : sort
    filtered.sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av === undefined || bv === undefined) return 0
      if (av < bv) return desc ? 1 : -1
      if (av > bv) return desc ? -1 : 1
      return 0
    })
  }

  return paginate(filtered, { page, limit })
}

export function findById(id) {
  return routes.find((r) => r.id === id) || null
}
