import request from 'supertest'
import Route from '../modules/routes/routes.model.js'
import Stop from '../modules/stops/stop.model.js'

const base = () => process.env.TEST_BASE_URL

async function seedRoutes() {
  await Route.create([
    {
      code: 'R-100',
      name: 'Galle Express',
      provinceFrom: 'Western',
      provinceTo: 'Southern',
      distanceKm: 120,
    },
    {
      code: 'R-200',
      name: 'Kandy Runner',
      provinceFrom: 'Western',
      provinceTo: 'Central',
      distanceKm: 95,
    },
  ])
}

async function seedStops() {
  await Stop.create([
    {
      code: 'ST-001',
      name: 'Fort Central',
      description: 'Main interchange',
      lat: 6.935,
      lon: 79.852,
      province: 'Western',
    },
    {
      code: 'ST-002',
      name: 'Galle Face',
      description: 'Coastal stop',
      lat: 6.912,
      lon: 79.854,
      province: 'Western',
    },
  ])
}

describe('Collection ETag behaviour', () => {
  test('routes list exposes stable ETag and returns 304 when unchanged', async () => {
    await seedRoutes()

    const first = await request(base()).get('/api/v1/routes')
    expect(first.status).toBe(200)
    expect(first.headers.etag).toMatch(/^W\/"\d+-\d+"$/)

    const cached = await request(base())
      .get('/api/v1/routes')
      .set('If-None-Match', first.headers.etag)
    expect(cached.status).toBe(304)
    expect(cached.body).toEqual({})

    await Route.create({
      code: 'R-300',
      name: 'Highland Shuttle',
      provinceFrom: 'Central',
      provinceTo: 'Uva',
      distanceKm: 160,
    })

    const refreshed = await request(base())
      .get('/api/v1/routes')
      .set('If-None-Match', first.headers.etag)
    expect(refreshed.status).toBe(200)
    expect(refreshed.headers.etag).not.toBe(first.headers.etag)
  })

  test('stops list exposes stable ETag and returns 304 when unchanged', async () => {
    await seedStops()

    const first = await request(base()).get('/api/v1/stops')
    expect(first.status).toBe(200)
    expect(first.headers.etag).toMatch(/^W\/"\d+-\d+"$/)

    const cached = await request(base())
      .get('/api/v1/stops')
      .set('If-None-Match', first.headers.etag)
    expect(cached.status).toBe(304)
    expect(cached.body).toEqual({})

    await Stop.create({
      code: 'ST-003',
      name: 'Colpetty',
      description: 'Urban stop',
      lat: 6.9101,
      lon: 79.8498,
      province: 'Western',
    })

    const refreshed = await request(base())
      .get('/api/v1/stops')
      .set('If-None-Match', first.headers.etag)
    expect(refreshed.status).toBe(200)
    expect(refreshed.headers.etag).not.toBe(first.headers.etag)
  })
})
