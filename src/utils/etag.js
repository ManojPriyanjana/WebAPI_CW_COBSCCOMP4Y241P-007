export function buildCollectionEtag(total, lastUpdatedAt) {
  const count = Number.isFinite(total) ? total : 0
  const timestamp = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : 0
  return `W/"${count}-${timestamp}"`
}
