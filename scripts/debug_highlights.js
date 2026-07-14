require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const token = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
  const res = await fetch('https://api.mercadolibre.com/highlights/MLA/category/MLA1648', {
    headers: {
      'Authorization': 'Bearer ' + token.accessToken,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0'
    }
  });
  const data = await res.json();
  console.log('ESTRUCTURA RAW (primeros 3 items):');
  console.log(JSON.stringify((data.content || []).slice(0, 3), null, 2));
  await prisma.$disconnect();
}

check().catch(e => { console.error(e.message); prisma.$disconnect(); });
