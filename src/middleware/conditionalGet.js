import crypto from 'crypto'

// Compute weak ETag from JSON string
function computeETag(body) {
  const json = typeof body === 'string' ? body : JSON.stringify(body)
  const hash = crypto.createHash('sha1').update(json).digest('base64')
  return `W/"${Buffer.byteLength(json)}-${hash}"`
}

// Extract the latest updatedAt from an object or array of objects
function getLastModifiedFromBody(body) {
  if (!body) return undefined
  const pickDate = (o) => (o && o.updatedAt ? new Date(o.updatedAt) : undefined)
  if (Array.isArray(body)) {
    const dates = body.map(pickDate).filter(Boolean)
    if (dates.length === 0) return undefined
    return new Date(Math.max(...dates.map((d) => d.getTime())))
  }
  return pickDate(body)
}

// Middleware to set ETag and Last-Modified for GET responses and reply 304 when appropriate
export default function conditionalGet(req, res, next) {
  if (req.method !== 'GET') return next()

  const originalJson = res.json.bind(res)
  res.json = (data) => {
    try {
      const etag = computeETag(data)
      const lastModifiedDate = getLastModifiedFromBody(
        data?.data ? data.data : data
      )

      // Handle If-None-Match
      const inm = req.headers['if-none-match']
      if (inm && inm === etag) {
        res.status(304)
        return res.end()
      }

      // Handle If-Modified-Since
      if (lastModifiedDate) {
        const ims = req.headers['if-modified-since']
        if (ims) {
          const since = new Date(ims)
          if (!isNaN(since) && lastModifiedDate <= since) {
            res.status(304)
            return res.end()
          }
        }
        res.setHeader('Last-Modified', lastModifiedDate.toUTCString())
      }

      res.setHeader('ETag', etag)
    } catch (e) {
      // Ignore errors and proceed to send response
    }
    return originalJson(data)
  }

  return next()
}
