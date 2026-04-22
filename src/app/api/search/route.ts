import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  console.log(`\n[API/SEARCH] === Nueva búsqueda iniciada ===`);
  console.log(`[API/SEARCH] Query recibido: "${query}"`);

  if (!query) {
    console.warn('[API/SEARCH] Error: Query vacío.');
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!appId || !clientSecret) {
    console.error('[API/SEARCH] Error crítico: Faltan credenciales en el entorno.');
    return NextResponse.json({ error: 'Server misconfiguration: missing credentials' }, { status: 500 });
  }

  try {
    // 1. Obtener Token de Acceso
    console.log('[API/SEARCH] Generando token de acceso...');
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
      console.error('[API/SEARCH] Error de autenticación en ML. Detalles:', JSON.stringify(tokenData, null, 2));
      return NextResponse.json({ 
        error: 'Failed to authenticate with Mercado Libre',
        details: tokenData 
      }, { status: 500 });
    }

    console.log('[API/SEARCH] Token generado. Ejecutando búsqueda...');

    // 2. Buscar Productos de Catálogo
    const searchUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      cache: 'no-store'
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error(`[API/SEARCH] La API de ML rechazó la búsqueda (Status ${searchRes.status}).`);
      console.error(`[API/SEARCH] Respuesta detallada:`, JSON.stringify(searchData, null, 2));
      return NextResponse.json({ 
        error: searchData.message || 'Error en la búsqueda de Mercado Libre', 
        details: searchData 
      }, { status: searchRes.status });
    }

    const results = searchData.results || [];
    console.log(`[API/SEARCH] Búsqueda exitosa. Resultados devueltos: ${results.length}`);

    // 3. Persistencia en Base de Datos (Seguimiento de Tesis)
    try {
      console.log('[API/SEARCH] Guardando datos en Supabase...');
      
      // Guardar en el historial de búsquedas
      await prisma.searchHistory.create({
        data: {
          query: query,
          resultsCount: results.length
        }
      });

      // Guardar/Actualizar productos encontrados (Upsert)
      for (const p of results.slice(0, 5)) { // Guardamos los top 5 para estadísticas
        await prisma.product.upsert({
          where: { mlId: p.id },
          update: { lastSeen: new Date() },
          create: {
            mlId: p.id,
            name: p.name,
            imageUrl: p.pictures?.[0]?.url || null
          }
        });
      }
      console.log('[API/SEARCH] Persistencia completada.');
    } catch (dbError) {
      // No bloqueamos la respuesta si falla la DB, solo logueamos
      console.error('[API/SEARCH] Error al persistir en DB:', dbError);
    }

    console.log(`[API/SEARCH] === Fin de la búsqueda ===\n`);
    
    return NextResponse.json(searchData);
  } catch (error: any) {
    console.error('[API/SEARCH] Excepción inesperada atrapada:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
