import { jest } from '@jest/globals'
import request from 'supertest'
import User from '../modules/users/users.model.js'
import Alert from '../modules/alerts/alerts.model.js'
import AdminAudit from '../modules/audit/adminAudit.model.js'

jest.setTimeout(15000)

const base = () => process.env.TEST_BASE_URL
const PASSWORD = 'Passw0rd!'

async function registerWithRole(role, label) {
  const email = `${role}-${label}-${Date.now()}@test.com`
  const register = await request(base())
    .post('/auth/register')
    .send({ email, password: PASSWORD })
  expect(register.status).toBe(201)
  await User.updateOne({ email }, { $set: { role } }).exec()
  const login = await request(base()).post('/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  return { email, token: login.body.accessToken, id: register.body.data._id }
}

describe('Alerts ownership enforcement', () => {
  test('operators are restricted to their own alerts while admins can override', async () => {
    const admin = await registerWithRole('admin', 'alerts')
    const operatorOne = await registerWithRole('operator', 'one')
    const operatorTwo = await registerWithRole('operator', 'two')

    const createRes = await request(base())
      .post('/api/v1/alerts')
      .set('Authorization', `Bearer ${operatorOne.token}`)
      .send({
        severity: 'info',
        message: 'Delay near station',
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 3600000).toISOString(),
      })
    expect(createRes.status).toBe(201)
    const alertId = createRes.body.data._id

    const stored = await Alert.findById(alertId).lean().exec()
    expect(stored.operatorId?.toString()).toBe(operatorOne.id)

    const forbiddenPatch = await request(base())
      .patch(`/api/v1/alerts/${alertId}`)
      .set('Authorization', `Bearer ${operatorTwo.token}`)
      .send({ message: 'Updated by other operator' })
    expect(forbiddenPatch.status).toBe(403)

    const adminPatch = await request(base())
      .patch(`/api/v1/alerts/${alertId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ severity: 'warning', operatorId: operatorTwo.id })
    expect(adminPatch.status).toBe(200)
    expect(adminPatch.body.data.severity).toBe('warning')
    expect(adminPatch.body.data.operatorId).toBe(operatorTwo.id)

    const forbiddenDelete = await request(base())
      .delete(`/api/v1/alerts/${alertId}`)
      .set('Authorization', `Bearer ${operatorOne.token}`)
    expect(forbiddenDelete.status).toBe(403)

    const deleteOk = await request(base())
      .delete(`/api/v1/alerts/${alertId}`)
      .set('Authorization', `Bearer ${admin.token}`)
    expect(deleteOk.status).toBe(204)
    expect(deleteOk.body).toEqual({})

    const auditEntries = await AdminAudit.find({ targetType: 'alert', targetId: alertId })
      .sort({ at: 1 })
      .lean()
    const actions = auditEntries.map((entry) => entry.action)
    expect(actions).toEqual(expect.arrayContaining(['alert.create', 'alert.update', 'alert.delete']))
    const updateEntry = auditEntries.find((entry) => entry.action === 'alert.update')
    expect(updateEntry?.meta?.severity).toBe('warning')
  })
})
