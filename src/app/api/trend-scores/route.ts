import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Ranking de productos por score de tendencia (RF02/RF03).
// Devuelve el último TrendScore de cada producto con su categoría,
// precio actual y variación de precio dentro de la ventana analizada.
export async function GET() {
  try {
    const scores = await prisma.trendScore.findMany({
      orderBy: { computedAt: 'desc' },
      include: {
        product: {
          include: {
            category: true,
            priceHistory: { orderBy: { timestamp: 'asc' } },
          },
        },
      },
    });

    // Quedarse con el score más reciente de cada producto
    const latestByProduct = new Map<string, (typeof scores)[number]>();
    for (const s of scores) {
      if (!latestByProduct.has(s.productId)) latestByProduct.set(s.productId, s);
    }

    const items = [...latestByProduct.values()]
      .map((s) => {
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

        return {
          productId: s.productId,
          name: s.product.name,
          permalink: s.product.permalink,
          price: s.product.price,
          currency: s.product.currency || 'ARS',
          category: s.product.category?.name ?? 'Sin categoría',
          categoryMlId: s.product.category?.mlId ?? null,
          score: s.score,
          period: s.period,
          computedAt: s.computedAt.toISOString(),
          variationPct:
            variationPct === null ? null : Math.round(variationPct * 10) / 10,
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

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      kpis: { detected: items.length, avgScore, topCategory },
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching trend scores', details: error.message },
      { status: 500 }
    );
  }
}
