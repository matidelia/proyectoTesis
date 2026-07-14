/**
 * CARRIL 1: Prueba de Endpoints Alternativos
 * Probamos /trends, /highlights y búsqueda por término específico
 * para ver cuáles están activos durante el Hot Sale.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Headers que simulan un navegador real
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Accept': 'application/json'
};

// Delay aleatorio entre peticiones (comportamiento humano)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const humanDelay = async () => {
  const ms = Math.floor(Math.random() * 5000) + 3000; // 3-8 segundos
  console.log(`  ⏳ Esperando ${(ms/1000).toFixed(1)}s (comportamiento humano)...`);
  await sleep(ms);
};

async function getToken() {
  try {
    const token = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
    return token?.accessToken || null;
  } catch { return null; }
}

async function testCarril1() {
  const token = await getToken();
  
  const authHeaders = token
    ? { ...BROWSER_HEADERS, 'Authorization': `Bearer ${token}` }
    : BROWSER_HEADERS;

  console.log(token ? '✓ Usando token de usuario OAuth2.' : '⚠ Sin token, usando headers de navegador.');
  console.log('==========================================\n');

  // --- TEST 1: Tendencias ---
  console.log('🔍 TEST 1: /trends/MLA (Qué busca la gente ahora)');
  const trendsRes = await fetch('https://api.mercadolibre.com/trends/MLA', {
    headers: authHeaders
  });
  console.log(`  Status: ${trendsRes.status}`);
  if (trendsRes.ok) {
    const data = await trendsRes.json();
    console.log(`  ✅ ¡FUNCIONA! Top 5 tendencias:`);
    data.slice(0, 5).forEach((t, i) => console.log(`    ${i+1}. ${t.keyword}`));
  } else {
    const err = await trendsRes.json();
    console.log(`  ❌ Error:`, err.message);
  }

  await humanDelay();

  // --- TEST 2: Destacados por Categoría ---
  console.log('\n🔍 TEST 2: /highlights/MLA/category/MLA1648 (Productos destacados - Computación)');
  const highlightsRes = await fetch('https://api.mercadolibre.com/highlights/MLA/category/MLA1648', {
    headers: authHeaders
  });
  console.log(`  Status: ${highlightsRes.status}`);
  if (highlightsRes.ok) {
    const data = await highlightsRes.json();
    const items = data.content || [];
    console.log(`  ✅ ¡FUNCIONA! ${items.length} productos destacados encontrados.`);
    if (items.length > 0) console.log(`  Primer item ID: ${items[0].id}`);
  } else {
    const err = await highlightsRes.json();
    console.log(`  ❌ Error:`, err.message);
  }

  await humanDelay();

  // --- TEST 3: Búsqueda por Término Específico ---
  console.log('\n🔍 TEST 3: /sites/MLA/search?q=notebook+gamer (Búsqueda por término)');
  const searchRes = await fetch('https://api.mercadolibre.com/sites/MLA/search?q=notebook+gamer&limit=5', {
    headers: authHeaders
  });
  console.log(`  Status: ${searchRes.status}`);
  if (searchRes.ok) {
    const data = await searchRes.json();
    console.log(`  ✅ ¡FUNCIONA! ${data.results?.length} resultados.`);
    if (data.results?.length > 0) {
      console.log(`  Primer resultado: ${data.results[0].title} - $${data.results[0].price}`);
    }
  } else {
    const err = await searchRes.json();
    console.log(`  ❌ Error:`, err.message);
  }

  await humanDelay();

  // --- TEST 4: Endpoint de Categoría ---
  console.log('\n🔍 TEST 4: /categories/MLA1648 (Info de categoría)');
  const catRes = await fetch('https://api.mercadolibre.com/categories/MLA1648', {
    headers: authHeaders
  });
  console.log(`  Status: ${catRes.status}`);
  if (catRes.ok) {
    const data = await catRes.json();
    console.log(`  ✅ ¡FUNCIONA! Categoría: ${data.name}`);
  } else {
    const err = await catRes.json();
    console.log(`  ❌ Error:`, err.message);
  }

  console.log('\n==========================================');
  console.log('Prueba de Carril 1 completada.');
  await prisma.$disconnect();
}

testCarril1().catch(e => {
  console.error('Error crítico:', e.message);
  prisma.$disconnect();
});
