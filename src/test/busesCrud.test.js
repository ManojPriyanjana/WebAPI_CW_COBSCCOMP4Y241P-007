import request from 'supertest'
import Bus from '../modules/buses/bus.model.js'

const base = () => process.env.TEST_BASE_URL
const PASSWORD = 'Passw0rd!'

async function createAdminToken() {
  const email = `admin-${Date.now()}@test.com`
  const register = await request(base()).post('/auth/register').send({ email, password: PASSWORD })
  expect(register.status).toBe(201)
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return login.body.accessToken
}

async function createOperatorToken(label = '') {
  const email = `operator${label}-${Date.now()}@test.com`
  const register = await request(base())
    .post('/auth/register')
    .send({ email, password: PASSWORD, role: 'operator' })
  expect(register.status).toBe(201)
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return login.body.accessToken
}

describe('Bus CRUD with RBAC', () => {
  test('operator manages own bus while others blocked', async () => {
    const adminToken = await createAdminToken()
    const operatorToken = await createOperatorToken('one')
    const otherOperatorToken = await createOperatorToken('two')

    const regNo = `NB-${Date.now()}`
    const createRes = await request(base())
      .post('/api/v1/buses')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ regNo, operator: 'Operator One', capacity: 40 })
    expect(createRes.status).toBe(201)
    const busId = createRes.body._id

    const afterCreate = await Bus.findById(busId).lean().exec()
    expect(afterCreate.ownerId).toBeDefined()

    const patchRes = await request(base())
      .patch(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ capacity: 55 })
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.capacity).toBe(55)

    const blocked = await request(base())
      .patch(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${otherOperatorToken}`)
      .send({ capacity: 60 })
    expect(blocked.status).toBe(403)

    const adminPatch = await request(base())
      .patch(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' })
    expect(adminPatch.status).toBe(200)
    expect(adminPatch.body.status).toBe('INACTIVE')

    const deleted = await request(base())
      .delete(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
    expect(deleted.status).toBe(204)

    const afterDelete = await request(base()).get(`/api/v1/buses/${busId}`)
    expect(afterDelete.status).toBe(404)
  })

  test('operator cannot delete buses without ownership but admin can', async () => {
    const adminToken = await createAdminToken()
    const operatorToken = await createOperatorToken('three')

    const regNo = `NB-${Date.now()}-ADM`
    const adminBus = await request(base())
      .post('/api/v1/buses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ regNo, operator: 'Admin Fleet', capacity: 40 })
    expect(adminBus.status).toBe(201)
    const busId = adminBus.body._id

    const forbidden = await request(base())
      .delete(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
    expect(forbidden.status).toBe(403)

    const allow = await request(base())
      .delete(`/api/v1/buses/${busId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(allow.status).toBe(204)
  })
})
