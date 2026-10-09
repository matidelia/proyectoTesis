/**
 * Exporta, para cada producto activo, las features de SU ULTIMA ventana
 * calculada (mismo esquema que scripts/export_ml_training_data.js, una sola
 * fila por producto). Es la entrada de ml/predict.py.
 *
 * Solo se exportan productos con score en la ultima corrida y cuyo score
 * anterior es de menos de MAX_GAP_H horas antes: son las mismas condiciones
 * con las que se armaron los ejemplos de entrenamiento.
 *
 * Uso: node scripts/export_latest_features.js > ml/latest_features.json
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAX_GAP_H = 24;

function delta(curr, prev, key) {
  if (!prev || curr[key] == null || prev[key] == null) return 0;
  return curr[key] - prev[key];
}

async function main() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      trendScores: { orderBy: { computedAt: 'desc' }, take: 2 },
    },
  });

  const latestRun = Math.max(
    ...products.filter((p) => p.trendScores.length).map((p) => p.trendScores[0].computedAt.getTime())
  );

  const rows = [];
  for (const p of products) {
    const [curr, prev] = p.trendScores;
    if (!curr) continue;
    if (latestRun - curr.computedAt.getTime() > MAX_GAP_H * 3600_000) continue;
    const usablePrev = prev && curr.computedAt - prev.computedAt <= MAX_GAP_H * 3600_000 ? prev : null;

    const c = curr.components || {};
    const pv = usablePrev ? (usablePrev.components || {}) : null;

    rows.push({
      productId: p.id,
      categoria: p.category?.name || 'Sin categoria',
      computedAt: curr.computedAt,
      score: curr.score,
      frecuencia: c.frecuencia ?? null,
      permanencia: c.permanencia ?? null,
      ranking: c.ranking ?? null,
      estabilidad: c.estabilidad ?? null,
      delta_frecuencia: delta(c, pv, 'frecuencia'),
      delta_permanencia: delta(c, pv, 'permanencia'),
      delta_ranking: delta(c, pv, 'ranking'),
      delta_estabilidad: delta(c, pv, 'estabilidad'),
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
