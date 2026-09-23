import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Lista los productId que el cliente logueado sigue (HU02).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }
  const watches = await prisma.watch.findMany({
    where: { userId: session.userId },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: watches.map((w) => w.productId) });
}

// Sigue/deja de seguir un producto (toggle). Requiere sesion de cliente.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { productId } = await req.json();
  if (typeof productId !== 'string' || !productId) {
    return NextResponse.json({ error: 'Falta productId.' }, { status: 400 });
  }

  const existing = await prisma.watch.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });

  if (existing) {
    await prisma.watch.delete({ where: { id: existing.id } });
    return NextResponse.json({ watching: false });
  }

  await prisma.watch.create({ data: { userId: session.userId, productId } });
  return NextResponse.json({ watching: true });
}
