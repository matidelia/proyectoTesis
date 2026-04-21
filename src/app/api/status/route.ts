import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  console.log('[API/STATUS] Verificando estado de la conexión a Mercado Libre...');

  if (!appId || !clientSecret) {
    console.error('[API/STATUS] Error: Faltan credenciales (ML_APP_ID o ML_CLIENT_SECRET)');
    return NextResponse.json({ 
      connected: false, 
      error: 'Servidor sin credenciales configuradas.' 
    }, { status: 500 });
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: clientSecret
    }).toString();

    console.log('[API/STATUS] Solicitando token de prueba...');

    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body,
      cache: 'no-store'
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[API/STATUS] Falló la obtención de token:', tokenData);
      return NextResponse.json({ 
        connected: false, 
        error: 'No se pudo obtener el token.', 
        details: tokenData 
      }, { status: 500 });
    }

    console.log('[API/STATUS] Token obtenido exitosamente. Conexión OK.');
    return NextResponse.json({ 
      connected: true, 
      message: 'Conexión a Mercado Libre establecida correctamente.',
      scopes: tokenData.scope
    });
  } catch (error: any) {
    console.error('[API/STATUS] Error de red inesperado:', error);
    return NextResponse.json({ 
      connected: false, 
      error: 'Error de red en el servidor.',
      details: error.message
    }, { status: 500 });
  }
}
