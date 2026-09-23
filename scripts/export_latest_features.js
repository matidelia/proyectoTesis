/**
 * Exporta, para cada producto, las features de SU ULTIMA ventana calculada
 * (mismo esquema de features que scripts/export_ml_training_data.js, pero
 * una sola fila por producto en vez de todos los pares historicos). Es lo
 * que ml/predict.py usa como entrada para predecir sobre el estado actual.
 *
 * Uso: node scripts/export_latest_features.js > ml/latest_features.json
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      trendScores: { orderBy: { computedAt: 'asc' } },
    },
  });

  const rows = [];

  for (const p of products) {
    const scores = p.trendScores;
    if (scores.length < 1) continue;

    const curr = scores[scores.length - 1];
    const prev = scores.length >= 2 ? scores[scores.length - 2] : null;

    const c = curr.components || {};
    const pv = prev ? (prev.components || {}) : null;

    rows.push({
      productId: p.id,
      categoria: p.category?.name || 'Sin categoria',
      computedAt: curr.computedAt,
      score: curr.score,
      frecuencia: c.frecuencia ?? null,
      permanencia: c.permanencia ?? null,
      ranking: c.ranking ?? null,
      estabilidad: c.estabilidad ?? null,
      delta_frecuencia: pv ? (c.frecuencia - pv.frecuencia) : 0,
      delta_permanencia: pv ? (c.permanencia - pv.permanencia) : 0,
      delta_ranking: pv ? (c.ranking - pv.ranking) : 0,
      delta_estabilidad: pv ? (c.estabilidad - pv.estabilidad) : 0,
      variacion_precio_pct: c.estabilidad != null ? (1 - c.estabilidad) : null,
    });
  }

  console.log(JSON.stringify(rows));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
