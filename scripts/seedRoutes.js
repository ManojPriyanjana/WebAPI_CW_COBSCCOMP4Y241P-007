import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Route from '../src/modules/routes/routes.model.js'

dotenv.config()

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  await mongoose.connect(uri)

  const count = await Route.countDocuments()
  if (count > 0) {
    console.log(`Routes collection already has ${count} docs; skipping seed`)
    await mongoose.disconnect()
    return
  }

  const demo = [
    {
      code: 'R001',
      name: 'Colombo - Kandy',
      provinceFrom: 'Western',
      provinceTo: 'Central',
      distanceKm: 115,
    },
    {
      code: 'R002',
      name: 'Galle - Matara',
      provinceFrom: 'Southern',
      provinceTo: 'Southern',
      distanceKm: 45,
    },
    {
      code: 'R003',
      name: 'Jaffna - Kilinochchi',
      provinceFrom: 'Northern',
      provinceTo: 'Northern',
      distanceKm: 70,
    },
    {
      code: 'R004',
      name: 'Kandy - Nuwara Eliya',
      provinceFrom: 'Central',
      provinceTo: 'Central',
      distanceKm: 76,
    },
    {
      code: 'R005',
      name: 'Kurunegala - Anuradhapura',
      provinceFrom: 'North Western',
      provinceTo: 'North Central',
      distanceKm: 120,
    },
    {
      code: 'R006',
      name: 'Badulla - Monaragala',
      provinceFrom: 'Uva',
      provinceTo: 'Uva',
      distanceKm: 60,
    },
    {
      code: 'R007',
      name: 'Ratnapura - Kalutara',
      provinceFrom: 'Sabaragamuwa',
      provinceTo: 'Western',
      distanceKm: 85,
    },
    {
      code: 'R008',
      name: 'Trincomalee - Batticaloa',
      provinceFrom: 'Eastern',
      provinceTo: 'Eastern',
      distanceKm: 110,
    },
    {
      code: 'R009',
      name: 'Puttalam - Chilaw',
      provinceFrom: 'North Western',
      provinceTo: 'North Western',
      distanceKm: 25,
    },
    {
      code: 'R010',
      name: 'Hambantota - Tissamaharama',
      provinceFrom: 'Southern',
      provinceTo: 'Southern',
      distanceKm: 35,
    },
  ]

  await Route.insertMany(demo)
  console.log('Seeded 10 routes')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
