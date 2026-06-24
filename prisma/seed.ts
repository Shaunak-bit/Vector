import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL environment variable is missing.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Books',
  'Home & Kitchen',
  'Beauty',
  'Sports',
  'Toys',
  'Automotive',
  'Garden',
  'Tools',
];

const ADJECTIVES = ['Wireless', 'Ergonomic', 'Rustic', 'Modern', 'Sleek', 'Premium', 'Eco-friendly', 'Portable', 'Durable', 'Classic'];
const MATERIALS = ['Steel', 'Cotton', 'Wooden', 'Plastic', 'Leather', 'Bamboo', 'Glass', 'Aluminium', 'Silicone', 'Ceramic'];
const NOUNS = ['Headphones', 'T-Shirt', 'Bookcase', 'Water Bottle', 'Moisturizer', 'Running Shoes', 'Action Figure', 'Car Charger', 'Shovel', 'Drill Set'];

const IMAGES = {
  Electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
  Clothing: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
  Books: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop&q=60',
  'Home & Kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=60',
  Beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60',
  Toys: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=500&auto=format&fit=crop&q=60',
  Automotive: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop&q=60',
  Garden: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=60',
  Tools: 'https://images.unsplash.com/photo-1581147036324-c17da41dfa6c?w=500&auto=format&fit=crop&q=60',
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🚀 Starting database seeding...');
  
  // Clear existing products to ensure clean seed
  console.log('🧹 Clearing existing products...');
  await prisma.product.deleteMany();
  console.log('✨ Database cleared.');

const TOTAL_RECORDS = process.env.SEED_COUNT ? parseInt(process.env.SEED_COUNT, 10) : 200000;
const CHUNK_SIZE = Math.min(10000, TOTAL_RECORDS);
  const totalChunks = TOTAL_RECORDS / CHUNK_SIZE;
  
  const baseTime = new Date();
  
  console.time('⏳ Total Seeding Time');
  
  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    console.time(`Chunk ${chunkIdx + 1}/${totalChunks}`);
    
    const products = [];
    
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const overallIndex = chunkIdx * CHUNK_SIZE + i;
      
      const category = getRandomElement(CATEGORIES);
      const adj = getRandomElement(ADJECTIVES);
      const mat = getRandomElement(MATERIALS);
      const noun = getRandomElement(NOUNS);
      
      const name = `${adj} ${mat} ${noun} #${overallIndex + 1}`;
      const price = parseFloat((Math.random() * 995 + 5).toFixed(2));
      const description = `This is a high-performance ${name.toLowerCase()} designed to exceed all standards. Part of our limited ${category.toLowerCase()} edition series.`;
      
      // Keyset tie-breaker testing: Intentionally generate duplicate timestamps for testing.
      // Every 100th record shares the exact same timestamp as the previous record.
      let timestampOffsetSeconds = overallIndex * 10;
      if (overallIndex % 100 === 0 && overallIndex > 0) {
        timestampOffsetSeconds = (overallIndex - 1) * 10;
      }
      
      const createdAt = new Date(baseTime.getTime() - timestampOffsetSeconds * 1000);
      
      products.push({
        name,
        price,
        category,
        description,
        imageUrl: IMAGES[category as keyof typeof IMAGES] || IMAGES.Electronics,
        createdAt,
      });
    }

    // Insert chunk
    await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });
    
    console.timeEnd(`Chunk ${chunkIdx + 1}/${totalChunks}`);
    
    // Output memory stats to verify no heap exhaustion
    const memory = process.memoryUsage();
    console.log(`Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
  
  console.log('✅ Seeding completed successfully!');
  console.timeEnd('⏳ Total Seeding Time');
  
  const count = await prisma.product.count();
  console.log(`📊 Total products in database: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
