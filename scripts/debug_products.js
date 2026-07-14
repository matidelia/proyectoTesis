require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const token = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
  const headers = {
    'Authorization': 'Bearer ' + token.accessToken,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0'
  };

  // Test 1: /products/{id} - endpoint de catálogo
  console.log('TEST 1: GET /products/MLA39962085');
  const prodRes = await fetch('https://api.mercadolibre.com/products/MLA39962085', { headers });
  console.log('Status:', prodRes.status);
  if (prodRes.ok) {
    const data = await prodRes.json();
    console.log('Nombre:', data.name);
    console.log('Precio Buy Box:', data.buy_box_winner?.price);
    console.log('Campos disponibles:', Object.keys(data).join(', '));
  } else {
    const err = await prodRes.json();
    console.log('Error:', JSON.stringify(err));
  }

  // Test 2: Buscar publicaciones de ese producto
  console.log('\nTEST 2: /products/MLA39962085/items (publicaciones del producto)');
  const itemsRes = await fetch('https://api.mercadolibre.com/products/MLA39962085/items?limit=3', { headers });
  console.log('Status:', itemsRes.status);
  if (itemsRes.ok) {
    const data = await itemsRes.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    const err = await itemsRes.json();
    console.log('Error:', JSON.stringify(err));
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e.message); prisma.$disconnect(); });
