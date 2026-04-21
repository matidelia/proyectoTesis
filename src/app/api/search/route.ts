import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!appId || !clientSecret) {
    return NextResponse.json({ error: 'Server misconfiguration: missing credentials' }, { status: 500 });
  }

  try {
    // 1. Obtener Token de Acceso
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: clientSecret
    }).toString();

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
      console.error('Error obtaining token:', tokenData);
      return NextResponse.json({ error: 'Failed to authenticate with Mercado Libre' }, { status: 500 });
    }

    // 2. Buscar Productos
    const searchRes = await fetch(`https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      // Next.js config to cache or not cache. For now, no-store
      cache: 'no-store'
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error('Error searching products:', searchData);
      // We still return the data to the frontend so it can see if it's forbidden etc.
      return NextResponse.json({ error: searchData.message || 'Failed to search products', details: searchData }, { status: searchRes.status });
    }

    return NextResponse.json(searchData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
