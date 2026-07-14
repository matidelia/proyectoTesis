require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSearchById() {
  try {
    const tokenRecord = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
    if (!tokenRecord) {
      console.log('No token');
      return;
    }

    const testId = 'MLA1836144872'; // Item real
    console.log(`Testing search by ID term: ${testId} with user token...`);
    
    // Probamos con q=MLA...
    const res = await fetch(`https://api.mercadolibre.com/sites/MLA/search?q=${testId}`, {
      headers: {
        'Authorization': `Bearer ${tokenRecord.accessToken}`,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await res.json();
    if (res.ok && data.results && data.results.length > 0) {
      console.log('Success! Found via search! Title:', data.results[0].title);
    } else {
      console.log('Not found via search. Results:', data.results?.length);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testSearchById();
