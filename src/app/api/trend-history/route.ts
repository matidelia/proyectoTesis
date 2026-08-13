import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Historial completo de TrendScore de UN producto (no de todo el catálogo),
// para graficar cómo evolucionó su score de tendencia en el tiempo.
// Se consulta filtrando por productId (usa el índice [productId]) para no
// repetir el problema de RNF02 de /api/trend-scores (que trae todo el histórico).
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    const [product, scores] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, category: { select: { name: true } } },
      }),
      prisma.trendScore.findMany({
        where: { productId },
        orderBy: { computedAt: 'asc' },
        select: { score: true, computedAt: true, components: true, period: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      productId,
      name: product.name,
      category: product.category?.name ?? null,
      history: scores.map(s => ({
        score: s.score,
        computedAt: s.computedAt.toISOString(),
        components: s.components,
        period: s.period,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching trend history', details: error.message },
      { status: 500 }
    );
  }
}
