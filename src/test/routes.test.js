import request from 'supertest'
import Route from '../modules/routes/routes.model.js'
import User from '../modules/users/users.model.js'

const base = () => process.env.TEST_BASE_URL

const PASSWORD = 'Passw0rd!'

async function createAdminToken() {
  const email = `admin-${Date.now()}@test.com`
  const register = await request(base()).post('/auth/register').send({ email, password: PASSWORD })
  expect(register.status).toBe(201)
  await User.updateOne({ email }, { $set: { role: 'admin' } }).exec()
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return login.body.accessToken
}

async function createOperatorToken() {
  const email = `operator-${Date.now()}@test.com`
  const register = await request(base())
    .post('/auth/register')
    .send({ email, password: PASSWORD })
  expect(register.status).toBe(201)
  await User.updateOne({ email }, { $set: { role: 'operator' } }).exec()
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return login.body.accessToken
}

async function seedRoutes() {
  await Route.create([
    {
      code: 'R1',
      name: 'Coastal Express',
      provinceFrom: 'Western',
      provinceTo: 'Southern',
      distanceKm: 120,
    },
    {
      code: 'R2',
      name: 'Hill Country',
      provinceFrom: 'Central',
      provinceTo: 'Uva',
      distanceKm: 150,
    },
    {
      code: 'R3',
      name: 'Northern Link',
      provinceFrom: 'Northern',
      provinceTo: 'North Central',
      distanceKm: 200,
    },
  ])
}

beforeEach(async () => {
  await seedRoutes()
})

test('filter by name and paginate', async () => {
  const res = await request(base()).get('/api/v1/routes?filter[name]=Hill&page=1&limit=2&sort=name')
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.data)).toBe(true)
  expect(res.body.data.length).toBe(1)
  expect(res.body.data[0].name).toContain('Hill')
  expect(res.body.page).toBe(1)
  expect(res.body.limit).toBe(2)
  expect(res.body.total).toBeGreaterThanOrEqual(1)
})

test('admin can create, update, and delete routes while enforcing RBAC', async () => {
  const adminToken = await createAdminToken()

  const createRes = await request(base())
    .post('/api/v1/routes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      code: 'RX01',
      name: 'Express North',
      provinceFrom: 'Northern',
      provinceTo: 'Western',
      distanceKm: 180,
    })
  expect(createRes.status).toBe(201)
  expect(createRes.body.code).toBe('RX01')

  const routeId = createRes.body._id

  const operatorToken = await createOperatorToken()
  const forbidden = await request(base())
    .post('/api/v1/routes')
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({
      code: 'RX02',
      name: 'Operator Attempt',
      provinceFrom: 'Central',
      provinceTo: 'Western',
      distanceKm: 90,
    })
  expect(forbidden.status).toBe(403)

  const patchRes = await request(base())
    .patch(`/api/v1/routes/${routeId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Express Northern' })
  expect(patchRes.status).toBe(200)
  expect(patchRes.body.name).toBe('Express Northern')

  const deleteRes = await request(base())
    .delete(`/api/v1/routes/${routeId}`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(deleteRes.status).toBe(204)

  const afterDelete = await request(base()).get(`/api/v1/routes/${routeId}`)
  expect(afterDelete.status).toBe(404)
})
