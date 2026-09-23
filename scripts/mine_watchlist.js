/**
 * SCRIPT DE MONITOREO DE WATCHLIST (SERIES TEMPORALES FOCALIZADAS)
 * ===============================================================
 * Este script lee una lista fija de productos clave de 'scripts/watchlist.json',
 * consulta sus publicaciones más baratas en el catálogo oficial de Mercado Libre
 * y agrega un nuevo registro de precio a la base de datos Supabase.
 *
 * Ventaja: Genera series de tiempo continuas ideales para análisis predictivo/tesis.
 * Ejecución: node scripts/mine_watchlist.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { probeEndpoints } = require('./probe_endpoints');

const WATCHLIST_PATH = path.join(__dirname, 'watchlist.json');

const CONFIG = {
  DELAY_BETWEEN_PRODUCTS: { min: 4000, max: 8000 },
  LONG_PAUSE_CHANCE: 0.25,
  LONG_PAUSE: { min: 10000, max: 20000 }
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9',
  'Accept': 'application/json',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function randomDelay(range, label = 'Esperando') {
  const ms = Math.floor(Math.random() * (range.max - range.min)) + range.min;
  console.log(`  ⏳ ${label} (${(ms / 1000).toFixed(1)}s)...`);
  await sleep(ms);
}

async function getValidToken() {
  try {
    const token = await prisma.oAuthToken.findUnique({
      where: { id: 'mercado_libre' }
    });

    if (!token) return null;

    // Si expira en menos de 5 minutos, refrescarlo
    if (new Date(token.expiresAt).getTime() - Date.now() < 300000) {
      console.log('🔄 Token por expirar. Refrescando...');
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_APP_ID || '',
          client_secret: process.env.ML_CLIENT_SECRET || '',
          refresh_token: token.refreshToken
        })
      });

      const data = await res.json();
      if (res.ok) {
        console.log('✓ Token refrescado exitosamente.');
        await prisma.oAuthToken.update({
          where: { id: 'mercado_libre' },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000)
          }
        });
        return data.access_token;
      } else {
        console.error('❌ Error al refrescar token:', data);
        return null;
      }
    }

    return token.accessToken;
  } catch (e) {
    console.error('❌ Error al consultar la DB para el token:', e.message);
    return null;
  }
}

// Trae TODOS los vendedores activos del producto de catálogo (hasta 5), no
// solo el más barato -- misma agregación entre vendedores que mine_carril1.js
// (Sección 1.10.2 de la tesis).
async function getActiveItems(catalogId, accessToken) {
  const url = `https://api.mercadolibre.com/products/${catalogId}/items?limit=5`;
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status} al consultar items de catálogo`);
  }

  const data = await res.json();
  const listings = data.results || [];
  if (listings.length === 0) return null;

  const cheapest = listings.reduce(
    (min, item) => (item.price < min.price ? item : min),
    listings[0]
  );
  const avgPrice = listings.reduce((sum, item) => sum + item.price, 0) / listings.length;

  return { cheapest, avgPrice, sellerCount: listings.length };
}

async function updateWatchlist() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   MINERÍA WATCHLIST - HISTORIAL DE PRECIOS      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // 1. Probe de endpoints para monitorear bloqueos históricos
  console.log('🩺 Corriendo probe de salud de APIs...');
  const probeResults = await probeEndpoints(false);
  const online = probeResults.filter(r => r.isAvailable).length;
  console.log(`✓ Probe finalizado. APIs operativas: ${online}/${probeResults.length}\n`);

  // 2. Token de Autenticación
  const accessToken = await getValidToken();
  if (!accessToken) {
    console.error('❌ No se encontró un token válido en la base de datos. Autentícate en el dashboard.');
    return;
  }
  console.log('✓ Token de Mercado Libre verificado y cargado.');

  // 3. Cargar Watchlist
  if (!fs.existsSync(WATCHLIST_PATH)) {
    console.error(`❌ Archivo watchlist no encontrado en ${WATCHLIST_PATH}. Ejecuta scratch/find_catalog_ids.js primero.`);
    return;
  }

  const watchlistData = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf-8'));
  const products = watchlistData.products || [];
  console.log(`✓ Cargados ${products.length} productos para monitorear.\n`);

  let updatedCount = 0;
  let errorsCount = 0;

  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    console.log(`[${i + 1}/${products.length}] Monitoreando: "${item.label}" (Catálogo: ${item.catalogId})`);

    try {
      // Simular comportamiento humano con delay
      await randomDelay(CONFIG.DELAY_BETWEEN_PRODUCTS, 'Espera entre productos');
      
      if (Math.random() < CONFIG.LONG_PAUSE_CHANCE) {
        await randomDelay(CONFIG.LONG_PAUSE, 'Pausa larga humana');
      }

      const active = await getActiveItems(item.catalogId, accessToken);

      if (!active) {
        console.log(`  ↷ Sin publicaciones activas en este momento.`);
        continue;
      }

      const { cheapest, avgPrice, sellerCount } = active;
      const mlId = cheapest.item_id || cheapest.id;
      const price = cheapest.price; // precio mostrado al comprador (el mas barato)
      const currency = cheapest.currency_id || 'ARS';
      const sellerId = cheapest.seller_id ? BigInt(cheapest.seller_id) : null;

      // Guardar / actualizar en base de datos. Identidad real = item.catalogId
      // (estable entre vendedores), no mlId (la publicación más barata del
      // momento, que puede cambiar de vendedor de una corrida a otra) --
      // mismo criterio que mine_carril1.js, ver comentario ahí.
      const commonUpdate = { price, lastSeen: new Date(), name: item.name };
      let dbProduct;
      const legacyByMlId = await prisma.product.findUnique({ where: { mlId } });
      if (legacyByMlId && !legacyByMlId.catalogProductId) {
        dbProduct = await prisma.product.update({
          where: { id: legacyByMlId.id },
          data: { catalogProductId: item.catalogId, ...commonUpdate },
        });
      } else {
        dbProduct = await prisma.product.upsert({
          where: { catalogProductId: item.catalogId },
          update: { mlId, ...commonUpdate },
          create: {
            mlId,
            catalogProductId: item.catalogId,
            name: item.name,
            price: price,
            currency: currency,
            condition: cheapest.condition,
            sellerId: sellerId,
          },
        });
      }

      // Registrar punto en la serie temporal. avgPrice (no price) para que
      // la estabilidad del score use el precio agregado entre vendedores,
      // no solo el más barato del momento (Sección 1.10.2).
      await prisma.priceHistory.create({
        data: {
          productId: dbProduct.id,
          price: avgPrice
        }
      });

      console.log(`  ✅ Actualizado: $${price.toLocaleString('es-AR')} ${currency} (Publicación: ${mlId}, ${sellerCount} vendedores, prom. $${avgPrice.toFixed(0)})`);
      updatedCount++;

    } catch (err) {
      console.error(`  ❌ Error al procesar "${item.label}":`, err.message);
      errorsCount++;
    }
  }

  // Registrar la ejecución en el historial de búsqueda
  try {
    await prisma.searchHistory.create({
      data: {
        query: `MINE_WATCHLIST:updated=${updatedCount}:errors=${errorsCount}`,
        resultsCount: updatedCount
      }
    });
  } catch (dbErr) {
    console.error('⚠ Error al guardar el historial de búsqueda:', dbErr.message);
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║ SESIÓN COMPLETADA                                ║`);
  console.log(`║ - Productos actualizados: ${String(updatedCount).padEnd(23)}║`);
  console.log(`║ - Errores encontrados:    ${String(errorsCount).padEnd(23)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
}

updateWatchlist()
  .catch(e => console.error('Error crítico:', e))
  .finally(() => prisma.$disconnect());
