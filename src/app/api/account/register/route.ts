import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

// Registro de cuentas de cliente (nivel pago del modelo freemium, Seccion
// 5.4 de la tesis). Las cuentas de administrador no se autorregistran por
// aca: se crean con scripts/create_admin_user.js.
export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`register:ip:${clientIp(req)}`, MAX_REGISTRATIONS, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Demasiados registros desde este origen. Probá de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Faltan email o contraseña.' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || password.length < 8) {
      return NextResponse.json(
        { error: 'Email inválido o contraseña muy corta (mínimo 8 caracteres).' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, role: 'customer' },
    });

    await createSession({ userId: user.id, email: user.email, role: 'customer' });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error('[ACCOUNT/REGISTER] Error:', err);
    return NextResponse.json({ error: 'Error interno al registrar la cuenta.' }, { status: 500 });
  }
}
