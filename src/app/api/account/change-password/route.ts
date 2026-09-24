import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  if (!checkRateLimit(`change-password:${session.userId}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' },
      { status: 429 }
    );
  }

  const { currentPassword, newPassword } = await req.json();
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La contraseña nueva debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
