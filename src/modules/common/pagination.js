export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const rawLimit = Number.parseInt(query.limit, 10)
  const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))
  const sort = typeof query.sort === 'string' ? query.sort : undefined
  return { page, limit, sort }
}

export function paginate(items, { page, limit }) {
  const total = items.length
  const start = (page - 1) * limit
  const end = start + limit
  return { data: items.slice(start, end), page, limit, total }
}
