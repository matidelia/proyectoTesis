/**
 * SCRIPT DE MINERÍA DE DATOS - PROYECTO DE TESIS
 * Este script recolecta los productos más económicos y activos de las categorías semilla
 * para iniciar la construcción del dataset histórico.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
console.log('[DEBUG] DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES (truncated)' : 'NO');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { id: 'MLA1648', name: 'Tecnología (Computación)' },
  { id: 'MLA1051', name: 'Tecnología (Celulares)' },
  { id: 'MLA1000', name: 'Tecnología (Electrónica)' },
  { id: 'MLA1430', name: 'Ropa y Accesorios' },
  { id: 'MLA1403', name: 'Alimentos y Bebidas' },
  { id: 'MLA436069', name: 'Limpieza (Hogar y Lavandería)' }
];

async function getAccessToken() {
  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: clientSecret
    })
  });

  const data = await res.json();
  return data.access_token;
}

async function getValidUserToken() {
  try {
    const token = await prisma.oAuthToken.findUnique({
      where: { id: 'mercado_libre' }
    });
    if (token) {
      return token.accessToken;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function mineData() {
  console.log('=== Iniciando Proceso de Minería de Datos para Tesis ===');
  
  try {
    let accessToken = await getValidUserToken();
    let isUserToken = !!accessToken;

    if (!accessToken) {
      console.log('! No se encontró token de usuario activo. Usando Client Credentials (Limitado).');
      accessToken = await getAccessToken();
    } else {
      console.log('✓ Usando Token de Usuario (Acceso completo a listados).');
    }

    for (const cat of CATEGORIES) {
      console.log(`\nProcesando categoría: ${cat.name} (${cat.id})...`);
      
      // Si tenemos token de usuario, usamos el endpoint de sitios. Si no, el de productos.
      const searchUrl = isUserToken
        ? `https://api.mercadolibre.com/sites/MLA/search?category=${cat.id}&status=active&limit=50`
        : `https://api.mercadolibre.com/products/search?category=${cat.id}&status=active&site_id=MLA&limit=50`;
      
      const res = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error(`  ❌ Error API (${res.status}):`, data.message || data.error || data);
        if (data.cause) console.error(`  Causa:`, JSON.stringify(data.cause));
        continue;
      }

      const items = data.results || [];
      console.log(`  - Encontrados ${items.length} productos disponibles.`);

      let savedCount = 0;
      for (const item of items) {
        // Solo procesamos si tiene un precio válido (evitar publicaciones de $1 placeholder)
        if (item.price > 10) {
          try {
            const product = await prisma.product.upsert({
              where: { mlId: item.id },
              update: {
                price: item.price,
                lastSeen: new Date(),
                name: item.title,
                imageUrl: item.thumbnail?.replace('-I.jpg', '-O.jpg')
              },
              create: {
                mlId: item.id,
                name: item.title,
                price: item.price,
                currency: item.currency_id,
                imageUrl: item.thumbnail?.replace('-I.jpg', '-O.jpg'),
                condition: item.condition,
                sellerId: item.seller?.id ? BigInt(item.seller.id) : null
              }
            });

            // Guardar historial de precio
            await prisma.priceHistory.create({
              data: {
                productId: product.id,
                price: item.price
              }
            });

            savedCount++;
          } catch (err) {
            // Ignorar errores individuales para que el script siga corriendo
          }
        }
      }

      // Registrar la búsqueda en el historial
      await prisma.searchHistory.create({
        data: {
          query: `MINING:${cat.name}`,
          resultsCount: items.length
        }
      });

      console.log(`  - ✓ ${savedCount} productos guardados/actualizados.`);
    }

    console.log('\n=== Proceso de Minería Completado con Éxito ===');
  } catch (error) {
    console.error('\n❌ Error crítico durante la minería:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

mineData();
