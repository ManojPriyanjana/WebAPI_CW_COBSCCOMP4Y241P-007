import request from 'supertest'

import Alert from '../modules/alerts/alerts.model.js'

const base = () => process.env.TEST_BASE_URL
const PASSWORD = 'Passw0rd!'

let adminToken

beforeAll(async () => {
  const email = `admin-${Date.now()}@test.com`
  const register = await request(base())
    .post('/auth/register')
    .send({ email, password: PASSWORD, role: 'admin' })
  expect(register.status).toBe(201)
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  adminToken = login.body.accessToken
})

describe('API response shapes', () => {
  test('list endpoints include pagination metadata', async () => {
    const uniqueCode = `RC-${Date.now()}`
    const createRoute = await request(base())
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: uniqueCode,
        name: 'Pagination Route',
        provinceFrom: 'Western',
        provinceTo: 'Central',
        distanceKm: 100,
      })
    expect(createRoute.status).toBe(201)

    const res = await request(base()).get('/api/v1/routes?page=1&limit=1')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toMatchObject({ page: 1, limit: 1 })
    expect(typeof res.body.total).toBe('number')
  })

  test('alerts list paginates controller results', async () => {
    await Alert.deleteMany({})
    const now = new Date()
    const payload = {
      severity: 'info',
      message: 'Scheduled maintenance',
      validFrom: new Date(now.getTime() - 60000).toISOString(),
      validTo: new Date(now.getTime() + 3600000).toISOString(),
    }

    const createAlert = await request(base())
      .post('/api/v1/alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
    expect(createAlert.status).toBe(201)

    const res = await request(base()).get('/api/v1/alerts?page=1&limit=1')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ page: 1, limit: 1 })
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  test('validation errors follow unified error payload', async () => {
    const res = await request(base()).post('/auth/login').send({ email: 'user@example.com' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: {
        code: 400,
        message: 'email and password are required',
      },
    })
  })
})
