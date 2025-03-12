import postgres from 'postgres'

// Get the database URL from environment variable

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create postgres client with SSL disabled
const sql = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false }
})

export default sql 