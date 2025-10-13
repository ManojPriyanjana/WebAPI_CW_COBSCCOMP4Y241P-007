import request from 'supertest'
import User from '../modules/users/users.model.js'

const base = () => process.env.TEST_BASE_URL

async function registerAndLogin(email = 'admin@test.com', password = 'Passw0rd!') {
  const registerRes = await request(base()).post('/auth/register').send({ email, password })
  if (![201, 409].includes(registerRes.status)) {
    throw new Error(`unexpected register status ${registerRes.status}`)
  }
  await User.updateOne({ email }, { $set: { role: 'admin' } }).exec()
  const login = await request(base()).post('/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return login.body
}

test('alerts POST requires admin/operator; succeeds with token', async () => {
  // Without token should be 401
  const noAuth = await request(base())
    .post('/api/v1/alerts')
    .send({
      severity: 'info',
      message: 'Test alert',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 3600000).toISOString(),
    })
  expect(noAuth.status).toBe(401)

  // With admin token should succeed
  const tokens = await registerAndLogin()
  const res = await request(base())
    .post('/api/v1/alerts')
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({
      severity: 'info',
      message: 'Test alert',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 3600000).toISOString(),
    })
  expect(res.status).toBe(201)
  expect(res.body.data.severity).toBe('info')
})

test('refresh token is rejected after logout', async () => {
  const tokens = await registerAndLogin('authlogout@test.com')

  const refreshBeforeLogout = await request(base())
    .post('/auth/refresh')
    .send({ refreshToken: tokens.refreshToken })
  expect(refreshBeforeLogout.status).toBe(200)

  const logoutRes = await request(base())
    .post('/auth/logout')
    .send({ refreshToken: tokens.refreshToken })
  expect(logoutRes.status).toBe(200)
  expect(logoutRes.body.success).toBe(true)

  const refreshAfterLogout = await request(base())
    .post('/auth/refresh')
    .send({ refreshToken: tokens.refreshToken })
  expect(refreshAfterLogout.status).toBe(401)
})

test('registration always returns commuter role even when role provided', async () => {
  const email = `commuter-${Date.now()}@test.com`
  const res = await request(base())
    .post('/auth/register')
    .send({ email, password: 'Passw0rd!', role: 'operator' })
  expect(res.status).toBe(201)
  expect(res.body.data.role).toBe('commuter')
})

test('PATCH /api/v1/users/:id/role enforces admin access and validates payload', async () => {
  const adminTokens = await registerAndLogin(`admin-${Date.now()}@test.com`)

  const userEmail = `target-${Date.now()}@test.com`
  const userRegister = await request(base())
    .post('/auth/register')
    .send({ email: userEmail, password: 'Passw0rd!' })
  expect(userRegister.status).toBe(201)
  const targetId = userRegister.body.data._id

  const patch = await request(base())
    .patch(`/api/v1/users/${targetId}/role`)
    .set('Authorization', `Bearer ${adminTokens.accessToken}`)
    .send({ role: 'operator' })
  expect(patch.status).toBe(200)
  expect(patch.body.data.role).toBe('operator')

  const stored = await User.findById(targetId).lean()
  expect(stored.role).toBe('operator')

  const commuterEmail = `commuter-${Date.now()}@test.com`
  await request(base()).post('/auth/register').send({ email: commuterEmail, password: 'Passw0rd!' })
  const commuterLogin = await request(base()).post('/auth/login').send({ email: commuterEmail, password: 'Passw0rd!' })
  expect(commuterLogin.status).toBe(200)

  const forbidden = await request(base())
    .patch(`/api/v1/users/${targetId}/role`)
    .set('Authorization', `Bearer ${commuterLogin.body.accessToken}`)
    .send({ role: 'admin' })
  expect(forbidden.status).toBe(403)

  const invalid = await request(base())
    .patch(`/api/v1/users/${targetId}/role`)
    .set('Authorization', `Bearer ${adminTokens.accessToken}`)
    .send({ role: 'not-a-role' })
  expect(invalid.status).toBe(422)
})
