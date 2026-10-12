import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parsePushSubscription } from '@/lib/push';

// Guarda la suscripción push del navegador del cliente logueado. Si el mismo
// navegador ya estaba suscripto con otra cuenta, pasa a la cuenta actual.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const sub = parsePushSubscription(await req.json().catch(() => null));
  if (!sub) {
    return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: session.userId, ...sub },
    update: { userId: session.userId, p256dh: sub.p256dh, auth: sub.auth },
  });
  return NextResponse.json({ subscribed: true });
}

// Borra la suscripción de este navegador (el cliente desactivó las notificaciones).
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== 'string' || !endpoint) {
    return NextResponse.json({ error: 'Falta endpoint.' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.userId } });
  return NextResponse.json({ subscribed: false });
}
