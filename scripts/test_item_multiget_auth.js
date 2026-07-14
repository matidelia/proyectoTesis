require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAuthMultiget() {
  try {
    const tokenRecord = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
    if (!tokenRecord) {
      console.log('No token found');
      return;
    }

    const testId = 'MLA1836144872'; // Item real
    console.log(`Testing multi-get for ${testId} with user token...`);
    
    const res = await fetch(`https://api.mercadolibre.com/items?ids=${testId}`, {
      headers: {
        'Authorization': `Bearer ${tokenRecord.accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    const data = await res.json();
    if (res.ok) {
      console.log('Success! Details:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Error:', res.status, data);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthMultiget();
