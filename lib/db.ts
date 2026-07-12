import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  // 1. Initialize the Postgres connection pool
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  // 2. Wrap it in the Prisma adapter
  const adapter = new PrismaPg(pool)
  
  // 3. Pass the adapter into the Prisma Client constructor
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db