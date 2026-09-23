import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Protege /admin: requiere una sesion valida con role="admin". Usa jose
// (en vez de jsonwebtoken) porque tambien debe poder correr en runtimes
// sin las APIs de Node completas, y no puede leer Prisma/la base de datos
// directamente aca.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  let role: string | null = null;

  if (token && process.env.SESSION_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
      const { payload } = await jwtVerify(token, secret);
      role = (payload as { role?: string }).role ?? null;
    } catch {
      role = null;
    }
  }

  if (role !== 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', '/admin');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
