import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Ranking de productos por score de tendencia (RF02/RF03).
// Devuelve el último TrendScore de cada producto con su categoría,
// precio actual y variación de precio dentro de la ventana analizada.
export async function GET() {
  try {
    // Solo hacen falta las últimas 2 mediciones de cada producto (actual y
    // anterior, para el delta de HU02). Traer TODO el historial y filtrar
    // en JS se iba volviendo más lento cada semana a medida que se
    // acumulaba la minería 3x/día — esto selecciona esas 2 filas por
    // producto directamente en la base en vez de descartar el resto en
    // memoria después de traerlo.
    const topIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "computedAt" DESC) AS rn
        FROM "TrendScore"
      ) t WHERE rn <= 2
    `;

    // La variación de precio se mide contra una ventana de ~7 días; 21 días
    // da margen de sobra sin volver a cargar el historial de precios completo.
    const priceCutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    // Última predicción del modelo de ML supervisado por producto (Sección
    // 1.5.4/1.10.2): probabilidad de que el score siga creciendo. Se genera
    // aparte (ml/predict.py + scripts/import_ml_predictions.js), no en cada
    // request — acá solo se lee la más reciente por producto.
    const latestPredictionIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "computedAt" DESC) AS rn
        FROM "MLPrediction"
      ) t WHERE rn = 1
    `;
    const predictions = await prisma.mLPrediction.findMany({
      where: { id: { in: latestPredictionIds.map((r) => r.id) } },
    });
    const predictionByProduct = new Map(
      predictions.map((p) => [p.productId, p.probability])
    );

    const scores = await prisma.trendScore.findMany({
      where: { id: { in: topIds.map((r) => r.id) } },
      orderBy: { computedAt: 'desc' },
      include: {
        product: {
          include: {
            category: true,
            priceHistory: {
              where: { timestamp: { gte: priceCutoff } },
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    // Últimos DOS scores de cada producto (el actual y el anterior,
    // para detectar crecimiento — HU02)
    const historyByProduct = new Map<string, (typeof scores)[number][]>();
    for (const s of scores) {
      const arr = historyByProduct.get(s.productId) ?? [];
      if (arr.length < 2) {
        arr.push(s);
        historyByProduct.set(s.productId, arr);
      }
    }

    const GROWTH_THRESHOLD = 5; // puntos de score para considerar "en crecimiento"

    const items = [...historyByProduct.values()]
      .map(([s, prev]) => {
        // Variación % de precio dentro de la ventana del score (ej: "7d")
        const windowDays = parseInt(s.period) || 7;
        const since = new Date(s.computedAt.getTime() - windowDays * 86400000);
        const inWindow = s.product.priceHistory.filter(
          (h) => h.timestamp >= since
        );
        const serie =
          inWindow.length >= 2 ? inWindow : s.product.priceHistory;

        let variationPct: number | null = null;
        if (serie.length >= 2 && serie[0].price > 0) {
          variationPct =
            ((serie[serie.length - 1].price - serie[0].price) /
              serie[0].price) *
            100;
        }

        // Alerta de crecimiento (HU02): el score subió >= umbral vs. el
        // cálculo anterior
        const previousScore = prev ? prev.score : null;
        const scoreDelta =
          previousScore === null
            ? null
            : Math.round((s.score - previousScore) * 10) / 10;
        const growing = scoreDelta !== null && scoreDelta >= GROWTH_THRESHOLD;

        return {
          productId: s.productId,
          name: s.product.name,
          permalink: s.product.permalink,
          price: s.product.price,
          currency: s.product.currency || 'ARS',
          category: s.product.category?.name ?? 'Sin categoría',
          categoryMlId: s.product.category?.mlId ?? null,
          score: s.score,
          previousScore,
          scoreDelta,
          growing,
          period: s.period,
          computedAt: s.computedAt.toISOString(),
          variationPct:
            variationPct === null ? null : Math.round(variationPct * 10) / 10,
          growthProbability: predictionByProduct.get(s.productId) ?? null,
        };
      })
      .sort((a, b) => b.score - a.score);

    // KPIs del wireframe: productos detectados, score promedio, categoría top
    const avgScore = items.length
      ? Math.round(
          (items.reduce((acc, i) => acc + i.score, 0) / items.length) * 10
        ) / 10
      : 0;

    const countByCategory: Record<string, number> = {};
    for (const i of items) {
      countByCategory[i.category] = (countByCategory[i.category] || 0) + 1;
    }
    const topCategory =
      Object.entries(countByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      '—';

    const growingCount = items.filter((i) => i.growing).length;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      kpis: { detected: items.length, avgScore, topCategory, growingCount },
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching trend scores', details: error.message },
      { status: 500 }
    );
  }
}
