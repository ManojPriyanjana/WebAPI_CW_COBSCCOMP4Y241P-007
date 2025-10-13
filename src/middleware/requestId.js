import { v4 as uuidv4 } from 'uuid'

export default function requestId(req, res, next) {
  const incoming = req.headers['x-request-id']
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4()
  req.id = id
  res.setHeader('X-Request-Id', id)
  next()
}
