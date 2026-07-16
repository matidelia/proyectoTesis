/**
 * PROBE DE SALUD DE ENDPOINTS - Mercado Libre API
 * ================================================
 * Testea todos los endpoints relevantes y guarda los resultados
 * en la tabla EndpointHealthLog para análisis histórico.
 *
 * Integración: se llama automáticamente al inicio de mine_carril1.js
 * También se puede correr manualmente: node scripts/probe_endpoints.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista completa de endpoints a monitorear
const ENDPOINTS_TO_PROBE = [
  {
    key: '/trends/MLA',
    label: 'Tendencias Generales MLA',
    url: 'https://api.mercadolibre.com/trends/MLA',
    useAuth: true,
  },
  {
    key: '/trends/MLA/{catId}',
    label: 'Tendencias por Categoría (Computación)',
    url: 'https://api.mercadolibre.com/trends/MLA/MLA1648',
    useAuth: true,
  },
  {
    key: '/products/search',
    label: 'Búsqueda en Catálogo Oficial',
    url: 'https://api.mercadolibre.com/products/search?site_id=MLA&q=notebook&limit=1',
    useAuth: true,
  },
  {
    key: '/products/{id}/items',
    label: 'Items de Producto de Catálogo',
    // URL dinámica: usa el producto de catálogo minado más recientemente
    // (su permalink contiene el id de catálogo y tiene oferta ganadora fresca).
    // Fallback si no hay productos con permalink en la DB.
    url: 'https://api.mercadolibre.com/products/MLA2783207734/items?limit=1',
    dynamicUrl: async () => {
      const p = await prisma.product.findFirst({
        where: { permalink: { not: null } },
        orderBy: { lastSeen: 'desc' },
        select: { permalink: true },
      });
      const catalogId = p?.permalink?.split('/p/')[1];
      return catalogId
        ? `https://api.mercadolibre.com/products/${catalogId}/items?limit=1`
        : null;
    },
    useAuth: true,
  },
  {
    key: '/sites/MLA/search',
    label: 'Búsqueda Tradicional (Buscador Público)',
    url: 'https://api.mercadolibre.com/sites/MLA/search?q=notebook&limit=1',
    useAuth: true,
  },
  {
    key: '/highlights/MLA/category/{id}',
    label: 'Productos Destacados por Categoría',
    url: 'https://api.mercadolibre.com/highlights/MLA/category/MLA1648',
    useAuth: true,
  },
  {
    key: '/categories/{id}',
    label: 'Info de Categoría',
    url: 'https://api.mercadolibre.com/categories/MLA1648',
    useAuth: false,
  },
  {
    key: '/sites/MLA/domain_discovery/search',
    label: 'Descubrimiento de Dominio/Categoría',
    url: 'https://api.mercadolibre.com/sites/MLA/domain_discovery/search?q=notebook',
    useAuth: true,
  },
  {
    key: '/users/me',
    label: 'Validación de Token OAuth2',
    url: 'https://api.mercadolibre.com/users/me',
    useAuth: true,
  },
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'application/json',
};

// Genera un cuid-like ID simple para compatibilidad sin dependencias extra
function makeId() {
  return (
    'c' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

async function getToken() {
  try {
    const t = await prisma.$queryRawUnsafe(
      'SELECT "accessToken" FROM "OAuthToken" WHERE id = \'mercado_libre\' LIMIT 1'
    );
    return t[0]?.accessToken || null;
  } catch {
    return null;
  }
}

async function probeEndpoints(verbose = true) {
  const token = await getToken();

  if (verbose) {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   PROBE DE SALUD DE ENDPOINTS - Mercado Libre    ║');
    console.log(`╚══════════════════════════════════════════════════╝`);
    console.log(`Token OAuth2: ${token ? '✓ Disponible' : '✗ No encontrado (algunas pruebas serán anónimas)'}\n`);
  }

  const results = [];

  for (const ep of ENDPOINTS_TO_PROBE) {
    const headers = { ...BROWSER_HEADERS };
    if (ep.useAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Resolver URL dinámica si el endpoint la define (fallback a la fija)
    let probeUrl = ep.url;
    if (ep.dynamicUrl) {
      try {
        probeUrl = (await ep.dynamicUrl()) || ep.url;
      } catch {
        probeUrl = ep.url;
      }
    }

    const start = Date.now();
    let httpStatus = 0;
    let errorMsg = null;

    try {
      const res = await fetch(probeUrl, { headers });
      httpStatus = res.status;
      const latencyMs = Date.now() - start;
      const isAvailable = res.status >= 200 && res.status < 300;

      if (!isAvailable) {
        try {
          const errData = await res.json();
          errorMsg = errData.message || errData.error || `HTTP ${res.status}`;
        } catch {
          errorMsg = `HTTP ${res.status}`;
        }
      }

      results.push({ ep, httpStatus, isAvailable, errorMsg, latencyMs });

      if (verbose) {
        const icon = isAvailable ? '✅' : '❌';
        const latLabel = latencyMs > 2000 ? ` ⚠ ${latencyMs}ms` : ` (${latencyMs}ms)`;
        console.log(`${icon} [${httpStatus}]${latLabel} ${ep.label}`);
        if (!isAvailable) console.log(`   → ${errorMsg}`);
      }
    } catch (netErr) {
      const latencyMs = Date.now() - start;
      errorMsg = `Network error: ${netErr.message}`;
      results.push({ ep, httpStatus: 0, isAvailable: false, errorMsg, latencyMs });
      if (verbose) {
        console.log(`❌ [NET_ERR] ${ep.label}`);
        console.log(`   → ${errorMsg}`);
      }
    }

    // Pequeña pausa entre requests para no parecer un bot
    await new Promise((r) => setTimeout(r, 500));
  }

  // Persistir todos los resultados en la DB
  try {
    for (const r of results) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "EndpointHealthLog" (id, endpoint, label, "httpStatus", "isAvailable", "errorMsg", "latencyMs", timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        makeId(),
        r.ep.key,
        r.ep.label,
        r.httpStatus,
        r.isAvailable,
        r.errorMsg,
        r.latencyMs
      );
    }
    if (verbose) {
      console.log(`\n✓ ${results.length} resultados guardados en EndpointHealthLog.`);
    }
  } catch (dbErr) {
    if (verbose) console.error('⚠ Error al guardar en DB:', dbErr.message);
  }

  // Resumen
  const available = results.filter((r) => r.isAvailable).length;
  const blocked = results.length - available;

  if (verbose) {
    console.log(`\n📊 Resumen: ${available}/${results.length} endpoints disponibles, ${blocked} bloqueados.`);
    console.log('════════════════════════════════════════════════════\n');
  }

  return results;
}

// Si se ejecuta directamente
if (require.main === module) {
  probeEndpoints(true)
    .catch((e) => console.error('Error crítico:', e.message))
    .finally(() => prisma.$disconnect());
}

module.exports = { probeEndpoints };
