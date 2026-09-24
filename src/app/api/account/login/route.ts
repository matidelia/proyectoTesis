import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Faltan email o contraseña.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Freno por email (protege a UNA cuenta puntual, ej. la de admin, de
    // que la ataquen probando contraseñas) y por IP (frena a quien prueba
    // muchos emails distintos desde el mismo origen).
    const emailKey = `login:email:${normalizedEmail}`;
    const ipKey = `login:ip:${clientIp(req)}`;
    if (!checkRateLimit(emailKey, MAX_ATTEMPTS, WINDOW_MS) || !checkRateLimit(ipKey, MAX_ATTEMPTS * 3, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Mismo mensaje de error para usuario inexistente y contraseña incorrecta
    // (no revelar si el email existe).
    const invalid = () =>
      NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });

    if (!user) return invalid();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return invalid();

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'customer',
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (err) {
    console.error('[ACCOUNT/LOGIN] Error:', err);
    return NextResponse.json({ error: 'Error interno al iniciar sesión.' }, { status: 500 });
  }
}
