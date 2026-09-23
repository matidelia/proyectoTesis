/**
 * Genera alertas (HU02) para los clientes que siguen un producto (Watch)
 * cuyo score acaba de subir >= 5 puntos respecto de la medicion anterior
 * (mismo umbral que la fila "growing" de /api/trend-scores y que el label
 * del modelo de ML, Seccion 1.10.2/1.5.4).
 *
 * Se corre DESPUES de compute_trend_scores.js. trendScoreId en el modelo
 * Alert evita duplicar la misma alerta si este script se corre mas de una
 * vez sobre el mismo calculo.
 *
 * Uso: node scripts/generate_alerts.js
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GROWTH_THRESHOLD = 5; // mismo umbral que HU02 en /api/trend-scores

async function main() {
  // Productos con al menos un Watch activo (no tiene sentido calcular para el resto).
  const watchedProductIds = await prisma.watch.findMany({
    distinct: ['productId'],
    select: { productId: true },
  });

  if (watchedProductIds.length === 0) {
    console.log('Nadie sigue ningún producto todavía. Nada para hacer.');
    await prisma.$disconnect();
    return;
  }

  let created = 0;

  for (const { productId } of watchedProductIds) {
    const lastTwo = await prisma.trendScore.findMany({
      where: { productId },
      orderBy: { computedAt: 'desc' },
      take: 2,
    });
    if (lastTwo.length < 2) continue;

    const [curr, prev] = lastTwo;
    const scoreDelta = Math.round((curr.score - prev.score) * 10) / 10;
    if (scoreDelta < GROWTH_THRESHOLD) continue;

    const watchers = await prisma.watch.findMany({ where: { productId } });

    for (const w of watchers) {
      try {
        await prisma.alert.create({
          data: {
            userId: w.userId,
            productId,
            trendScoreId: curr.id,
            score: curr.score,
            previousScore: prev.score,
            scoreDelta,
          },
        });
        created++;
      } catch (e) {
        // Ya existe una alerta para este usuario + este TrendScore (constraint unique) -- se ignora.
        if (!String(e.message).includes('Unique constraint')) throw e;
      }
    }
  }

  console.log(`✅ ${created} alertas nuevas generadas.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
