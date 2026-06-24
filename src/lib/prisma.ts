import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    // Return a dummy client or handle it to prevent build-time crashes if DB env is not loaded yet
    console.warn('⚠️ DATABASE_URL is not set. Prisma Client initialized in fallback mode.');
    return new PrismaClient();
  }
  
  const pool = new Pool({ 
    connectionString,
    max: 10, // Adjust pool size based on serverless context
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
