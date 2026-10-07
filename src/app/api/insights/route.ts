import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { classifySignal, deltaOverHours } from '@/lib/insights';

export const dynamic = 'force-dynamic';

// Datos para el tablero de decisión (/insights): por producto, el último
// score con su desglose, una serie corta para el sparkline, la probabilidad
// del modelo de ML y la cantidad promedio de vendedores. No reemplaza a
// /api/trend-scores (que sigue alimentando /dashboard).
const SERIES_POINTS = 12; // ~4 días a 3 corridas diarias

type Components = {
  frecuencia?: number;
  permanencia?: number;
  ranking?: number;
  estabilidad?: number;
  saturacion?: number;
  avgSellerCount?: number | null;
};

type ScoreRow = { productId: string; score: number; computedAt: Date; components: Components | null };

export async function GET() {
  try {
    // Las tres consultas son independientes: van en paralelo para pagar la
    // latencia a la base una sola vez.
    const [scores, predictions, products] = await Promise.all([
      prisma.$queryRaw<ScoreRow[]>`
        SELECT "productId", score, "computedAt", components FROM (
          SELECT "productId", score, "computedAt", components,
                 ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "computedAt" DESC) AS rn
          FROM "TrendScore"
        ) t WHERE rn <= ${SERIES_POINTS}
        ORDER BY "computedAt" ASC
      `,
      prisma.$queryRaw<{ productId: string; probability: number }[]>`
        SELECT "productId", probability FROM (
          SELECT "productId", probability,
                 ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "computedAt" DESC) AS rn
          FROM "MLPrediction"
        ) t WHERE rn = 1
      `,
      prisma.product.findMany({
        where: { trendScores: { some: {} } },
        select: {
          id: true, name: true, imageUrl: true, price: true, currency: true,
          permalink: true, category: { select: { name: true } },
        },
      }),
    ]);

    const seriesByProduct = new Map<string, ScoreRow[]>();
    for (const s of scores) {
      const arr = seriesByProduct.get(s.productId) ?? [];
      arr.push(s);
      seriesByProduct.set(s.productId, arr);
    }
    const probByProduct = new Map(predictions.map((p) => [p.productId, p.probability]));

    const items = products
      .filter((p) => seriesByProduct.has(p.id))
      .map((p) => {
        const series = seriesByProduct.get(p.id)!;
        const last = series[series.length - 1];
        const comp = last.components ?? {};
        const points = series.map((s) => ({ t: new Date(s.computedAt).getTime(), score: s.score }));
        const probability = probByProduct.get(p.id) ?? null;
        const delta72h = deltaOverHours(points, 72);

        return {
          productId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          price: p.price,
          currency: p.currency || 'ARS',
          permalink: p.permalink,
          category: p.category?.name ?? 'Sin categoría',
          score: last.score,
          computedAt: new Date(last.computedAt).toISOString(),
          delta72h,
          probability,
          sellers: comp.avgSellerCount ?? null,
          components: {
            frecuencia: comp.frecuencia ?? null,
            permanencia: comp.permanencia ?? null,
            ranking: comp.ranking ?? null,
            estabilidad: comp.estabilidad ?? null,
            saturacion: comp.saturacion ?? null,
          },
          series: points.map((x) => x.score),
          signal: classifySignal({
            score: last.score,
            probability,
            sellers: comp.avgSellerCount ?? null,
            delta72h,
          }),
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ timestamp: new Date().toISOString(), items });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching insights', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
