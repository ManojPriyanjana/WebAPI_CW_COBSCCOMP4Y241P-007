import request from 'supertest'
import Alert from '../modules/alerts/alerts.model.js'

const base = () => process.env.TEST_BASE_URL

describe('Alerts listing pagination', () => {
  test('returns paginated active alerts with total count', async () => {
    const now = new Date()
    await Alert.create([
      {
        severity: 'info',
        message: 'Active alert 1',
        validFrom: new Date(now.getTime() - 20 * 60000),
        validTo: new Date(now.getTime() + 40 * 60000),
      },
      {
        severity: 'warning',
        message: 'Active alert 2',
        validFrom: new Date(now.getTime() - 10 * 60000),
        validTo: new Date(now.getTime() + 30 * 60000),
      },
      {
        severity: 'critical',
        message: 'Active alert 3',
        validFrom: new Date(now.getTime() - 5 * 60000),
        validTo: new Date(now.getTime() + 20 * 60000),
      },
    ])

    const res = await request(base()).get('/api/v1/alerts?page=2&limit=2')

    expect(res.status).toBe(200)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(2)
    expect(res.body.total).toBe(3)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toHaveProperty('_id')
  })

  test('supports active query flag for inactive results', async () => {
    const now = new Date()
    await Alert.create([
      {
        severity: 'info',
        message: 'Expired alert',
        validFrom: new Date(now.getTime() - 120 * 60000),
        validTo: new Date(now.getTime() - 60 * 60000),
      },
      {
        severity: 'warning',
        message: 'Upcoming alert',
        validFrom: new Date(now.getTime() + 30 * 60000),
        validTo: new Date(now.getTime() + 90 * 60000),
      },
      {
        severity: 'critical',
        message: 'Live alert',
        validFrom: new Date(now.getTime() - 15 * 60000),
        validTo: new Date(now.getTime() + 15 * 60000),
      },
    ])

    const defaultRes = await request(base()).get('/api/v1/alerts')
    expect(defaultRes.status).toBe(200)
    expect(defaultRes.body.total).toBe(1)
    expect(defaultRes.body.data).toHaveLength(1)
    expect(defaultRes.body.data[0].message).toBe('Live alert')

    const inactiveRes = await request(base()).get('/api/v1/alerts?active=false')
    expect(inactiveRes.status).toBe(200)
    expect(inactiveRes.body.total).toBe(2)
    expect(inactiveRes.body.data).toHaveLength(2)
    const messages = inactiveRes.body.data.map((alert) => alert.message).sort()
    expect(messages).toEqual(['Expired alert', 'Upcoming alert'])
  })
})
