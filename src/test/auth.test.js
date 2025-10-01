import request from 'supertest'

const base = () => process.env.TEST_BASE_URL

async function registerAndLogin(email = 'admin@test.com', password = 'Passw0rd!') {
  // Register (first user becomes admin)
  await request(base()).post('/auth/register').send({ email, password })
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
