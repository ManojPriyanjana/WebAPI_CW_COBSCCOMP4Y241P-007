import request from 'supertest'
import Trip from '../modules/trips/trip.model.js'

const base = () => process.env.TEST_BASE_URL
const PASSWORD = 'Passw0rd!'

async function createAdminToken() {
  const email = `admin-${Date.now()}@test.com`
  const register = await request(base()).post('/auth/register').send({ email, password: PASSWORD })
  expect(register.status).toBe(201)
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return { token: login.body.accessToken, email }
}

async function createOperatorToken(label = '') {
  const email = `operator${label}-${Date.now()}@test.com`
  const register = await request(base())
    .post('/auth/register')
    .send({ email, password: PASSWORD, role: 'operator' })
  expect(register.status).toBe(201)
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return { token: login.body.accessToken, email }
}

describe('Trip CRUD with RBAC', () => {
  test('operator can manage own trip, others blocked, validation enforced', async () => {
    const { token: adminToken } = await createAdminToken()
    const { token: operatorToken } = await createOperatorToken('one')
    const { token: otherOperatorToken } = await createOperatorToken('two')

    const routeRes = await request(base())
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: `TR-${Date.now()}`,
        name: 'Test Route',
        provinceFrom: 'Western',
        provinceTo: 'Central',
        distanceKm: 120,
      })
    expect(routeRes.status).toBe(201)
    const routeId = routeRes.body._id

    const busRes = await request(base())
      .post('/api/v1/buses')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ regNo: `NB-${Date.now()}`, operator: 'Operator Trips', capacity: 50 })
    expect(busRes.status).toBe(201)
    const busId = busRes.body._id

    const serviceDate = new Date().toISOString()
    const depart = new Date(Date.now() + 3600000).toISOString()
    const arrive = new Date(Date.now() + 7200000).toISOString()

    const invalid = await request(base())
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        routeId,
        busId,
        serviceDate,
        schedDepart: arrive,
        schedArrive: depart,
      })
    expect(invalid.status).toBe(422)

    const createTrip = await request(base())
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        routeId,
        busId,
        serviceDate,
        schedDepart: depart,
        schedArrive: arrive,
        status: 'SCHEDULED',
      })
    expect(createTrip.status).toBe(201)
    const tripId = createTrip.body._id

    const stored = await Trip.findById(tripId).lean().exec()
    expect(stored.ownerId).toBeDefined()

    const patchRes = await request(base())
      .patch(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'ONGOING' })
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.status).toBe('ONGOING')

    const forbidden = await request(base())
      .patch(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${otherOperatorToken}`)
      .send({ status: 'COMPLETED' })
    expect(forbidden.status).toBe(403)

    const adminPatch = await request(base())
      .patch(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' })
    expect(adminPatch.status).toBe(200)
    expect(adminPatch.body.status).toBe('COMPLETED')

    const deleteForbidden = await request(base())
      .delete(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${otherOperatorToken}`)
    expect(deleteForbidden.status).toBe(403)

    const deleteOk = await request(base())
      .delete(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
    expect(deleteOk.status).toBe(204)

    const afterDelete = await request(base()).get(`/api/v1/trips/${tripId}`)
    expect(afterDelete.status).toBe(404)
  })
})
