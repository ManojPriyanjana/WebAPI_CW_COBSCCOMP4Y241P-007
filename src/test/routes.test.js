import request from 'supertest'
import Route from '../modules/routes/routes.model.js'

const base = () => process.env.TEST_BASE_URL

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
