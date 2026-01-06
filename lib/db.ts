import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Explicitly pass the datasource url
// Usage of process.env.DATABASE_URL or fallback to local file path
const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    })
}

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
