import request from 'supertest'

const base = () => process.env.TEST_BASE_URL

async function registerAndLogin(email = 'admin@test.com', password = 'Passw0rd!') {
  // Register (first user becomes admin); tolerate already-registered users for reuse across tests.
  const registerRes = await request(base()).post('/auth/register').send({ email, password })
  if (![201, 409].includes(registerRes.status)) {
    throw new Error(`unexpected register status ${registerRes.status}`)
  }
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
