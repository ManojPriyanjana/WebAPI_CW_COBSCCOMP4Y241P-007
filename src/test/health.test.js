import request from 'supertest'

const base = () => process.env.TEST_BASE_URL

test('GET /healthz returns ok', async () => {
  const res = await request(base()).get('/healthz')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})
