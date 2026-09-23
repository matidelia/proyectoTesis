/**
 * EXPORTACION DE DATASET PARA EL MODELO SUPERVISADO (etapa 75%, Seccion 1.4.4)
 * ==============================================================================
 * Solo lectura: no modifica la base. Recorre los TrendScore de cada producto en
 * orden cronologico y arma, por cada par consecutivo (t, t+1), un ejemplo:
 *   - features de la ventana t: los 4 componentes ya calculados por
 *     compute_trend_scores.js (frecuencia, permanencia, ranking, estabilidad),
 *     su variacion contra la ventana t-1 (si existe), y la categoria del producto.
 *   - label: 1 si el score sube >=5 puntos de t a t+1 (mismo umbral que la
 *     alerta HU02 ya implementada), 0 en caso contrario.
 *
 * Uso: node scripts/export_ml_training_data.js > ml/dataset.json
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
    if (scores.length < 2) continue; // necesita al menos un par consecutivo

    for (let i = 0; i < scores.length - 1; i++) {
      const curr = scores[i];
      const next = scores[i + 1];
      const prev = i > 0 ? scores[i - 1] : null;

      const c = curr.components || {};
      const pv = prev ? (prev.components || {}) : null;

      const label = (next.score - curr.score) >= 5 ? 1 : 0;

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
        score_siguiente: next.score,
        label,
      });
    }
  }

  console.log(JSON.stringify(rows));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
