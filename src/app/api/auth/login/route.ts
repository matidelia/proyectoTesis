import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.ML_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/callback`);
  
  console.log('[AUTH/LOGIN] Redirigiendo a Mercado Libre para autorización...');
  
  // URL de autorización de Mercado Libre (Argentina)
  // Nota: Cambiar .com.ar por el dominio correspondiente si se usa en otro país (MLA = Argentina)
  const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}`;
  
  return NextResponse.redirect(authUrl);
}
