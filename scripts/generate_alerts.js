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
const APP_URL = 'https://proyectotesis-e4et.onrender.com';

// Envio real de alertas por email (RF09, item de "trabajo futuro" resuelto).
// Usa la API REST de Resend directamente (sin SDK, para no sumar una
// dependencia por un solo endpoint). Si no hay RESEND_API_KEY configurada
// (por ejemplo, en un entorno de desarrollo sin la clave), la alerta se
// sigue generando en /alerts como siempre, solo que sin el email -- el
// envio nunca es lo que hace fallar el resto del script.
async function sendAlertEmail(to, { productName, score, previousScore, scoreDelta }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tendar <onboarding@resend.dev>',
        to: [to],
        subject: `📈 ${productName} está en crecimiento`,
        html: `<p>El producto que seguís, <strong>${productName}</strong>, subió de ${previousScore} a ${score} puntos (+${scoreDelta}) en el score de tendencia.</p><p><a href="${APP_URL}/alerts">Ver el detalle en Tendar</a></p>`,
      }),
    });
    if (!res.ok) {
      console.error(`  ⚠ Resend respondió ${res.status} al enviar a ${to}: ${await res.text()}`);
    }
  } catch (e) {
    console.error(`  ⚠ Error de red enviando email a ${to}: ${e.message}`);
  }
}

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
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });

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

        const user = await prisma.user.findUnique({ where: { id: w.userId }, select: { email: true } });
        if (user) {
          await sendAlertEmail(user.email, {
            productName: product?.name || 'un producto',
            score: curr.score,
            previousScore: prev.score,
            scoreDelta,
          });
        }
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
