/**
 * CÁLCULO DE SCORE DE TENDENCIA (RF02)
 * ====================================
 * Implementa el "indicador compuesto" de la tesis: combinación ponderada
 * de las métricas temporales sobre una ventana de análisis (default 7 días).
 *
 * Fórmula (score 0-100):
 *   score = 100 * ( 0.35 * frecuencia      // apariciones en la ventana (normalizada)
 *                 + 0.25 * permanencia     // días distintos con presencia / días de la ventana
 *                 + 0.20 * ranking         // posición promedio en el catálogo (1 = mejor)
 *                 + 0.20 * estabilidad )   // estabilidad de precio (descarta picos artificiales)
 *
 * Justificación de cada componente (ver tabla "Métricas preliminares" del PFI):
 *  - frecuencia:   presencia sostenida → señal principal de tendencia.
 *  - permanencia:  diferencia señales aisladas de tendencias sostenidas.
 *  - ranking:      aparecer arriba en el catálogo indica relevancia.
 *  - estabilidad:  un precio estable con alta presencia indica demanda real;
 *                  variaciones bruscas suelen ser picos aislados u ofertas.
 *
 * Uso:  node scripts/compute_trend_scores.js [--days=7]
 * Guarda un registro TrendScore por producto con el desglose en `components`.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Configuración ────────────────────────────────────────────────────────────
const WEIGHTS = {
  frecuencia: 0.35,
  permanencia: 0.25,
  ranking: 0.20,
  estabilidad: 0.20,
};
const MAX_RANK = 8; // ITEMS_PER_CATEGORY de la minería: posiciones 1..8

function getWindowDays() {
  const arg = process.argv.find(a => a.startsWith('--days='));
  const days = arg ? parseInt(arg.split('=')[1], 10) : 7;
  return Number.isFinite(days) && days > 0 ? days : 7;
}

// ─── Cálculo por producto ─────────────────────────────────────────────────────
function computeComponents(snapshots, prices, windowDays, maxFreq) {
  // 1. Frecuencia: apariciones normalizadas contra el máximo del dataset
  const frecuencia = maxFreq > 0 ? snapshots.length / maxFreq : 0;

  // 2. Permanencia: días distintos con presencia / días de la ventana
  const distinctDays = new Set(
    snapshots.map(s => s.capturedAt.toISOString().slice(0, 10))
  ).size;
  const permanencia = Math.min(1, distinctDays / windowDays);

  // 3. Ranking: posición promedio mapeada a [0,1] (posición 1 → 1.0)
  const ranks = snapshots.map(s => s.rankPosition).filter(r => r != null);
  let ranking = 0;
  if (ranks.length > 0) {
    const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    ranking = Math.max(0, (MAX_RANK + 1 - avgRank) / MAX_RANK);
  }

  // 4. Estabilidad de precio: 1 - |variación %| (acotada a [0,1])
  let estabilidad = 0;
  if (prices.length >= 2) {
    const first = prices[0].price;
    const last = prices[prices.length - 1].price;
    const pctChange = first > 0 ? Math.abs(last - first) / first : 1;
    estabilidad = Math.max(0, 1 - Math.min(1, pctChange));
  } else if (prices.length === 1) {
    estabilidad = 0.5; // un solo registro: neutro
  }

  return { frecuencia, permanencia, ranking, estabilidad };
}

// ─── Proceso principal ────────────────────────────────────────────────────────
async function main() {
  const windowDays = getWindowDays();
  const period = `${windowDays}d`;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   CÁLCULO DE SCORE DE TENDENCIA (RF02)          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`Ventana de análisis: últimos ${windowDays} días (period="${period}")\n`);

  // Productos con al menos una aparición en la ventana (sin señal no hay score)
  const products = await prisma.product.findMany({
    where: { trendSnapshots: { some: { capturedAt: { gte: since } } } },
    include: {
      category: true,
      trendSnapshots: {
        where: { capturedAt: { gte: since } },
        orderBy: { capturedAt: 'asc' },
      },
      priceHistory: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (products.length === 0) {
    console.log('⚠ No hay productos con apariciones en la ventana. Corré la minería primero.');
    return;
  }

  const maxFreq = Math.max(...products.map(p => p.trendSnapshots.length));
  const results = [];

  for (const p of products) {
    const comp = computeComponents(p.trendSnapshots, p.priceHistory, windowDays, maxFreq);
    const score =
      100 *
      (WEIGHTS.frecuencia * comp.frecuencia +
        WEIGHTS.permanencia * comp.permanencia +
        WEIGHTS.ranking * comp.ranking +
        WEIGHTS.estabilidad * comp.estabilidad);

    await prisma.trendScore.create({
      data: {
        productId: p.id,
        score: Math.round(score * 10) / 10,
        period,
        components: {
          ...comp,
          weights: WEIGHTS,
          snapshots: p.trendSnapshots.length,
          preciosRegistrados: p.priceHistory.length,
        },
      },
    });

    results.push({
      name: p.name.substring(0, 45),
      category: p.category?.name || '—',
      score: Math.round(score * 10) / 10,
    });
  }

  // Reporte: top productos por score
  results.sort((a, b) => b.score - a.score);
  console.log(`✓ ${results.length} scores calculados y guardados.\n`);
  console.log('  TOP PRODUCTOS POR SCORE DE TENDENCIA:');
  console.log('  ' + '─'.repeat(70));
  for (const r of results.slice(0, 10)) {
    console.log(`  ${String(r.score).padStart(5)}  ${r.name.padEnd(47)} ${r.category}`);
  }
  console.log();
}

main()
  .catch(e => console.error('\n❌ Error crítico:', e.message))
  .finally(() => prisma.$disconnect());
