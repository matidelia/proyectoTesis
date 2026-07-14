import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  console.log('[AUTH/CALLBACK] Recibido código de autorización de Mercado Libre.');

  if (!code) {
    console.error('[AUTH/CALLBACK] Error: No se recibió el código.');
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/callback`;

  try {
    console.log('[AUTH/CALLBACK] Intercambiando código por tokens...');
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appId || '',
        client_secret: clientSecret || '',
        code: code,
        redirect_uri: redirectUri
      }),
      cache: 'no-store'
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[AUTH/CALLBACK] Error en intercambio de tokens:', data);
      throw new Error(`Auth failed: ${JSON.stringify(data)}`);
    }

    console.log('[AUTH/CALLBACK] Tokens obtenidos. Guardando en base de datos...');

    // Guardar token en la base de datos (Supabase via Prisma)
    // Usamos el ID fijo "mercado_libre" para que solo haya una sesión activa global
    await (prisma as any).oAuthToken.upsert({
      where: { id: 'mercado_libre' },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000)
      },
      create: {
        id: 'mercado_libre',
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000)
      }
    });

    console.log('[AUTH/CALLBACK] Autenticación completada con éxito.');

    // Redirigir al dashboard con un parámetro de éxito
    return NextResponse.redirect(new URL('/dashboard?auth=success', request.url));

  } catch (error: any) {
    console.error('[AUTH/CALLBACK] Error crítico:', error);
    // Redirigir al dashboard con error para feedback visual
    return NextResponse.redirect(new URL(`/dashboard?auth=error&msg=${encodeURIComponent(error.message)}`, request.url));
  }
}
