import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Alertas del cliente logueado (HU02), mas recientes primero.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { name: true, permalink: true } } },
    take: 50,
  });

  return NextResponse.json({
    unreadCount: alerts.filter((a) => !a.read).length,
    alerts: alerts.map((a) => ({
      id: a.id,
      productId: a.productId,
      productName: a.product.name,
      permalink: a.product.permalink,
      score: a.score,
      previousScore: a.previousScore,
      scoreDelta: a.scoreDelta,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

// Marca una alerta (o todas, con {"all": true}) como leida.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await req.json();

  if (body.all) {
    await prisma.alert.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.id === 'string') {
    await prisma.alert.updateMany({
      where: { id: body.id, userId: session.userId },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Falta id o all.' }, { status: 400 });
}
