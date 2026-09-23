import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Faltan email o contraseña.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
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
