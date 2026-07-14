import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getValidToken() {
  try {
    const token = await (prisma as any).oAuthToken.findUnique({
      where: { id: 'mercado_libre' }
    });

    if (!token) return null;

    // Si expira en menos de 5 minutos, refrescar
    if (new Date(token.expiresAt).getTime() - Date.now() < 300000) {
      console.log('[API/SEARCH] Token de usuario por expirar. Refrescando...');
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_APP_ID || '',
          client_secret: process.env.ML_CLIENT_SECRET || '',
          refresh_token: token.refreshToken
        }),
        cache: 'no-store'
      });

      const data = await res.json();
      if (res.ok) {
        await (prisma as any).oAuthToken.update({
          where: { id: 'mercado_libre' },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000)
          }
        });
        return data.access_token;
      } else {
        console.error('[API/SEARCH] Error al refrescar token:', data);
        return null;
      }
    }

    return token.accessToken;
  } catch (e) {
    console.error('[API/SEARCH] Error al consultar DB para tokens:', e);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  console.log(`\n[API/SEARCH] === Nueva búsqueda de Inteligencia de Mercado ===`);
  console.log(`[API/SEARCH] Query recibido: "${query}"`);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  try {
    // 1. Obtención de Access Token (Prioridad: Usuario > App)
    let accessToken = await getValidToken();
    let isUserToken = !!accessToken;

    if (!accessToken) {
      console.log('[API/SEARCH] No hay token de usuario válido. Usando Client Credentials (Modo Catálogo)...');
      const authRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: appId || '',
          client_secret: clientSecret || ''
        }),
        cache: 'no-store'
      });

      const authData = await authRes.json();
      if (!authRes.ok) throw new Error('No se pudo autenticar con Mercado Libre');
      accessToken = authData.access_token;
    } else {
      console.log('[API/SEARCH] Usando Token de Usuario (Modo Listados Reales)');
    }

    // 2. Búsqueda de Catálogo Oficial (Totalmente inmune a bloqueos)
    const searchUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}&limit=12`;
    
    console.log(`[API/SEARCH] Buscando en catálogo oficial: ${searchUrl}`);
    const searchRes = await fetch(searchUrl, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      cache: 'no-store'
    });

    const searchData = await searchRes.json();
    if (!searchRes.ok) {
      throw new Error(`Mercado Libre catálogo respondió con error: ${searchRes.status}`);
    }

    const catalogProducts = searchData.results || [];
    console.log(`[API/SEARCH] Encontrados ${catalogProducts.length} productos en catálogo. Obteniendo publicaciones reales en paralelo...`);

    // 3. Resolución en paralelo de publicaciones reales (items) para cada producto
    const results = await Promise.all(
      catalogProducts.map(async (p: any) => {
        // Obtenemos imagen de mayor resolución
        const imageUrl = p.pictures?.[0]?.url || p.thumbnail;
        let highResImage = imageUrl;
        if (imageUrl && imageUrl.includes('-I.jpg')) {
          highResImage = imageUrl.replace('-I.jpg', '-O.jpg');
        }

        const fallbackPrice = p.buy_box_winner?.price || p.price || 0;
        const fallbackCurrency = p.buy_box_winner?.currency_id || p.currency_id || 'ARS';
        const fallbackPermalink = p.permalink || `https://www.mercadolibre.com.ar/p/${p.id}`;

        try {
          // Buscamos las publicaciones de vendedores activos
          const itemsUrl = `https://api.mercadolibre.com/products/${p.id}/items?limit=3`;
          const itemsRes = await fetch(itemsUrl, {
            headers: { 
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            cache: 'no-store'
          });

          if (!itemsRes.ok) {
            // Si falla la búsqueda de items específicos, retornamos el producto de catálogo
            return {
              id: p.id,
              name: p.name,
              price: fallbackPrice,
              currency: fallbackCurrency,
              imageUrl: highResImage,
              permalink: fallbackPermalink,
              isCatalog: true
            };
          }

          const itemsData = await itemsRes.json();
          const listings = itemsData.results || [];

          if (listings.length === 0) {
            return {
              id: p.id,
              name: p.name,
              price: fallbackPrice,
              currency: fallbackCurrency,
              imageUrl: highResImage,
              permalink: fallbackPermalink,
              isCatalog: true
            };
          }

          // Seleccionamos la publicación más económica
          const cheapestListing = listings.reduce(
            (min: any, item: any) => (item.price < min.price ? item : min),
            listings[0]
          );

          const mlId = cheapestListing.item_id || cheapestListing.id;
          const permalink = `https://articulo.mercadolibre.com.ar/MLA-${mlId.replace('MLA', '')}`;

          return {
            id: mlId,
            name: p.name,
            price: cheapestListing.price,
            currency: cheapestListing.currency_id || 'ARS',
            imageUrl: highResImage,
            permalink: permalink,
            isCatalog: false
          };

        } catch (itemError) {
          console.error(`[API/SEARCH] Error resolviendo items para ${p.id}:`, itemError);
          return {
            id: p.id,
            name: p.name,
            price: fallbackPrice,
            currency: fallbackCurrency,
            imageUrl: highResImage,
            permalink: fallbackPermalink,
            isCatalog: true
          };
        }
      })
    );

    // Filtramos posibles nulos (aunque nuestro catch asegura que siempre retorne el fallback)
    const validResults = results.filter((r: any) => r.price > 0);

    console.log(`[API/SEARCH] Mapeo de publicaciones completado. Retornando ${validResults.length} resultados.`);

    // 4. Persistencia en Base de Datos (Top 5)
    try {
      await prisma.searchHistory.create({
        data: { query, resultsCount: validResults.length }
      });

      for (const p of validResults.slice(0, 5)) {
        const product = await prisma.product.upsert({
          where: { mlId: p.id },
          update: { 
            lastSeen: new Date(),
            price: p.price,
            name: p.name,
            imageUrl: p.imageUrl
          },
          create: {
            mlId: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            price: p.price,
            currency: p.currency
          }
        });

        if (p.price > 0 && (prisma as any).priceHistory) {
          await (prisma as any).priceHistory.create({
            data: { productId: product.id, price: p.price }
          });
        }
      }
    } catch (dbError) {
      console.error('[API/SEARCH] Error de persistencia en DB:', dbError);
    }

    return NextResponse.json({ results: validResults });

  } catch (error: any) {
    console.error('[API/SEARCH] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
