require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUserSearch() {
  try {
    const token = await prisma.oAuthToken.findUnique({
      where: { id: 'mercado_libre' }
    });

    if (!token) {
      console.log('No token found');
      return;
    }

    console.log('Testing search with user token...');
    const url = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1648&limit=5';
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    const data = await res.json();
    if (res.ok) {
      console.log('Success! Results found:', data.results ? data.results.length : 0);
      if (data.results && data.results.length > 0) {
        console.log('Cheapest or first item:', data.results[0].title, '-', data.results[0].price);
      }
    } else {
      console.error('Error:', res.status, JSON.stringify(data));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testUserSearch();
