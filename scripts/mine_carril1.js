/**
 * SCRIPT DE MINERÍA - CARRIL 1 (PROTOCOLO HUMANO v2)
 * ====================================================
 * Mejoras sobre v1:
 *  - Usa TOP 3 tendencias dinámicas por categoría (no keywords fijas)
 *  - Ejecuta probe de salud de endpoints al inicio (loguea en EndpointHealthLog)
 *  - Persistencia más robusta con reintentos
 *
 * Reglas anti-detección:
 *  - Delays aleatorios entre cada petición (simula lectura humana)
 *  - Pausa larga entre categorías (simula cambio de sección)
 *  - Orden de categorías aleatorio en cada ejecución
 *  - Headers de navegador real en todas las peticiones
 *  - Máximo 3 keywords x 8 items por categoría por sesión
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importar el probe de endpoints (se ejecuta al inicio)
const { probeEndpoints } = require('./probe_endpoints');

// ─── Configuración ────────────────────────────────────────────────────────────
const CONFIG = {
  ITEMS_PER_CATEGORY: 8,         // Productos de catálogo por keyword
  MAX_TREND_KEYWORDS: 3,         // Cuántas tendencias usar por categoría
  DELAY_BETWEEN_ITEMS: { min: 4000, max: 10000 },
  DELAY_BETWEEN_KEYWORDS: { min: 8000, max: 18000 },
  DELAY_BETWEEN_CATEGORIES: { min: 25000, max: 50000 },
  LONG_PAUSE_CHANCE: 0.3,
  LONG_PAUSE: { min: 15000, max: 30000 },
};

// ─── Categorías Semilla ───────────────────────────────────────────────────────
// fallbackQuery: keyword PROBADA que siempre da resultados (corre siempre)
// El script agrega dinámicamente keywords de tendencias como búsquedas extra
const CATEGORIES = [
  { id: 'MLA1648',   name: 'Computación',         fallbackQuery: 'notebook' },
  { id: 'MLA1051',   name: 'Celulares',            fallbackQuery: 'samsung celular' },
  { id: 'MLA1000',   name: 'Electrónica',          fallbackQuery: 'auriculares jbl' },
  { id: 'MLA1430',   name: 'Ropa y Accesorios',    fallbackQuery: 'zapatillas nike' },
  { id: 'MLA1403',   name: 'Alimentos y Bebidas',  fallbackQuery: 'cafe dolca' },
  { id: 'MLA436069', name: 'Limpieza del Hogar',   fallbackQuery: 'jabon liquido' },
];

// ─── Headers Navegador ────────────────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept': 'application/json, text/plain, */*',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

// ─── Utilidades ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const randomDelay = async (range, label = 'Esperando') => {
  const ms = Math.floor(Math.random() * (range.max - range.min)) + range.min;
  process.stdout.write(`  ⏳ ${label} (${(ms / 1000).toFixed(1)}s)...`);
  await sleep(ms);
  process.stdout.write(' ✓\n');
};

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ─── Token OAuth2 ─────────────────────────────────────────────────────────────
async function getToken() {
  try {
    const token = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
    if (!token) return null;

    if (new Date(token.expiresAt).getTime() - Date.now() < 300000) {
      console.log('🔄 Token por expirar. Refrescando...');
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_APP_ID || '',
          client_secret: process.env.ML_CLIENT_SECRET || '',
          refresh_token: token.refreshToken,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log('✓ Token refrescado.');
        await prisma.oAuthToken.update({
          where: { id: 'mercado_libre' },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000),
          },
        });
        return data.access_token;
      } else {
        console.error('❌ Error al refrescar token:', data);
        return null;
      }
    }
    return token.accessToken;
  } catch (err) {
    console.error('❌ Error leyendo token:', err.message);
    return null;
  }
}

// ─── Obtener Top N Tendencias de una Categoría ────────────────────────────────
// Estrategia HÍBRIDA:
//   1. SIEMPRE incluye el fallbackQuery (keyword probada con resultados garantizados)
//   2. AGREGA hasta maxN keywords de tendencias reales como búsquedas extra
// Esto asegura datos + detecta gaps de oferta (valioso para la tesis)
async function getTopTrends(categoryId, fallbackQuery, headers, maxN = 2) {
  const baseKeywords = [fallbackQuery]; // Fallback garantizado SIEMPRE va primero

  try {
    const res = await fetch(`https://api.mercadolibre.com/trends/MLA/${categoryId}`, { headers });
    if (!res.ok) return baseKeywords;

    const trends = await res.json();
    if (!trends || trends.length === 0) return baseKeywords;

    // Tomamos tendencias extra (excluyendo el fallback si ya está)
    const trendKeywords = trends
      .slice(0, maxN * 3)
      .map(t => t.keyword)
      .filter(k => k && k.trim().length > 2 && k.toLowerCase() !== fallbackQuery.toLowerCase())
      .slice(0, maxN);

    const combined = [...baseKeywords, ...trendKeywords];
    console.log(`    ✓ Fallback: "${fallbackQuery}" | 🔥 Tendencias extra: ${trendKeywords.map(k => `"${k}"`).join(', ') || 'ninguna'}`);
    return combined;
  } catch {
    return baseKeywords;
  }
}

// ─── Catálogo: IDs de productos por keyword ───────────────────────────────────
async function getCatalogProductIds(query, headers) {
  const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}&limit=${CONFIG.ITEMS_PER_CATEGORY}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Error ${res.status} en products/search: ${err.message || 'unknown'}`);
  }

  const data = await res.json();
  return (data.results || []).map(item => item.id);
}

// ─── Nombre Real del Producto de Catálogo ─────────────────────────────────────
async function getProductName(productId, headers) {
  try {
    const res = await fetch(`https://api.mercadolibre.com/products/${productId}`, { headers });
    if (!res.ok) return productId;
    const data = await res.json();
    return data.name || data.title || productId;
  } catch {
    return productId;
  }
}

// ─── Item Más Barato del Catálogo ─────────────────────────────────────────────
async function getCheapestItem(productId, headers) {
  const res = await fetch(`https://api.mercadolibre.com/products/${productId}/items?limit=5`, { headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Error ${res.status} en products/${productId}/items: ${err.message || 'unknown'}`);
  }

  const data = await res.json();
  const items = data.results || [];
  if (items.length === 0) return null;

  return items.reduce((min, item) => (item.price < min.price ? item : min), items[0]);
}

// ─── Categoría en DB ──────────────────────────────────────────────────────────
// Asegura que la categoría oficial de ML exista en la tabla Category y
// devuelve su id interno (para relacionar los productos minados).
async function ensureCategory(mlCategoryId, name) {
  const cat = await prisma.category.upsert({
    where: { mlId: mlCategoryId },
    update: { name },
    create: { mlId: mlCategoryId, name },
  });
  return cat.id;
}

// ─── Guardar en DB ────────────────────────────────────────────────────────────
// context: { categoryDbId, permalink, keyword, rankPosition }
async function saveProduct(item, productName, context = {}) {
  if (!item.price || item.price <= 10) return false;

  const mlId = item.item_id || item.id;
  const sellerId = item.seller_id ? BigInt(item.seller_id) : null;
  const { categoryDbId = null, permalink = null, keyword = null, rankPosition = null } = context;

  const product = await prisma.product.upsert({
    where: { mlId },
    update: {
      price: item.price,
      lastSeen: new Date(),
      ...(categoryDbId ? { categoryId: categoryDbId } : {}),
      ...(permalink ? { permalink } : {}),
    },
    create: {
      mlId,
      name: productName,
      price: item.price,
      currency: item.currency_id || 'ARS',
      imageUrl: null,
      condition: item.condition,
      sellerId,
      categoryId: categoryDbId,
      permalink,
    },
  });

  await prisma.priceHistory.create({
    data: { productId: product.id, price: item.price },
  });

  // Registro temporal de aparición (base de frecuencia/permanencia/ranking)
  await prisma.trendSnapshot.create({
    data: { productId: product.id, keyword, rankPosition },
  });

  return true;
}

// ─── Proceso Principal ────────────────────────────────────────────────────────
async function mine() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   MINERÍA CARRIL 1 - PROTOCOLO HUMANO v2        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // PASO 0: Token OAuth2 (PRIMERO: refresca si está vencido, así el probe
  // no registra falsos 401 por token expirado)
  const token = await getToken();
  if (!token) {
    console.error('❌ No se encontró token OAuth2. Ejecuta primero el flujo de login.');
    return;
  }
  console.log('✓ Token OAuth2 activo.');

  // PASO 1: Probe de salud de endpoints (loguea en DB con el token fresco)
  console.log('🩺 Ejecutando probe de salud de endpoints...');
  const probeResults = await probeEndpoints(false); // silent=true, solo guarda en DB
  const available = probeResults.filter(r => r.isAvailable).length;
  const blocked = probeResults.length - available;
  console.log(`✓ Probe completado: ${available}/${probeResults.length} disponibles, ${blocked} bloqueados.\n`);

  const headers = { ...BROWSER_HEADERS, 'Authorization': `Bearer ${token}` };

  const categoriesThisRun = shuffle(CATEGORIES);
  console.log(`✓ Orden de sesión: ${categoriesThisRun.map(c => c.name).join(' → ')}\n`);

  let totalSaved = 0;

  for (const [catIndex, category] of categoriesThisRun.entries()) {
    console.log(`\n▶ [${catIndex + 1}/${categoriesThisRun.length}] Categoría: ${category.name}`);

    try {
      // Registrar/actualizar la categoría oficial en DB
      const categoryDbId = await ensureCategory(category.id, category.name);

      // Obtener top N tendencias dinámicas de la categoría
      console.log(`  🔍 Consultando tendencias de "${category.name}"...`);
      const trendKeywords = await getTopTrends(
        category.id,
        category.fallbackQuery,
        headers,
        CONFIG.MAX_TREND_KEYWORDS
      );

      let savedInCategory = 0;

      // Por cada keyword de tendencia, buscar en el catálogo
      for (const [kwIdx, keyword] of trendKeywords.entries()) {
        console.log(`\n  🔑 Keyword [${kwIdx + 1}/${trendKeywords.length}]: "${keyword}"`);

        try {
          const itemIds = await getCatalogProductIds(keyword, headers);
          console.log(`  → ${itemIds.length} productos encontrados en catálogo.`);

          for (const [itemIndex, productId] of itemIds.entries()) {
            await randomDelay(CONFIG.DELAY_BETWEEN_ITEMS, `Producto ${itemIndex + 1}/${itemIds.length}`);

            if (Math.random() < CONFIG.LONG_PAUSE_CHANCE) {
              await randomDelay(CONFIG.LONG_PAUSE, '  📱 Pausa larga');
            }

            try {
              const [productName, item] = await Promise.all([
                getProductName(productId, headers),
                getCheapestItem(productId, headers),
              ]);

              if (!item) {
                console.log(`  ↷ [${productId}] Sin publicaciones activas.`);
                continue;
              }

              const saved = await saveProduct(item, productName, {
                categoryDbId,
                permalink: `https://www.mercadolibre.com.ar/p/${productId}`,
                keyword,
                rankPosition: itemIndex + 1,
              });
              if (saved) {
                savedInCategory++;
                console.log(`  ✓ [${productId}] "${productName.substring(0, 50)}" → $${item.price} ${item.currency_id}`);
              } else {
                console.log(`  ↷ [${productId}] Precio inválido, omitido.`);
              }
            } catch (itemErr) {
              console.log(`  ⚠ Error en ${productId}: ${itemErr.message}`);
            }
          }

          // Pausa entre keywords de la misma categoría
          if (kwIdx < trendKeywords.length - 1) {
            await randomDelay(CONFIG.DELAY_BETWEEN_KEYWORDS, '  Pausa entre keywords');
          }
        } catch (kwErr) {
          console.log(`  ⚠ Error con keyword "${keyword}": ${kwErr.message}`);
        }
      }

      // Registrar sesión de minería
      await prisma.searchHistory.create({
        data: {
          query: `MINE_CARRIL1:${category.name}:${trendKeywords.join('|')}`,
          resultsCount: savedInCategory,
        },
      });

      totalSaved += savedInCategory;
      console.log(`  ✅ Categoría completada: ${savedInCategory} productos guardados.`);

    } catch (catErr) {
      console.error(`  ❌ Error en categoría ${category.name}: ${catErr.message}`);
    }

    // Pausa entre categorías
    if (catIndex < categoriesThisRun.length - 1) {
      console.log('\n  🧭 Cambiando de sección...');
      await randomDelay(CONFIG.DELAY_BETWEEN_CATEGORIES, '  Pausa entre categorías');
    }
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  SESIÓN COMPLETADA: ${String(totalSaved).padEnd(3)} productos guardados.     ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
}

mine()
  .catch(e => console.error('\n❌ Error crítico:', e.message))
  .finally(() => prisma.$disconnect());
