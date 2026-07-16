import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Lee el token OAuth2 de la base y lo refresca si está por vencer.
// ML ahora exige autenticación para /trends; sin token no hay datos.
async function getAccessToken(): Promise<string | null> {
  try {
    const token = await prisma.oAuthToken.findUnique({
      where: { id: 'mercado_libre' },
    });
    if (!token) return null;

    if (new Date(token.expiresAt).getTime() - Date.now() > 300000) {
      return token.accessToken;
    }

    // Refrescar contra ML y persistir
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ML_APP_ID || '',
        client_secret: process.env.ML_CLIENT_SECRET || '',
        refresh_token: token.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) return token.accessToken; // último recurso: token viejo

    await prisma.oAuthToken.update({
      where: { id: 'mercado_libre' },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000),
      },
    });
    return data.access_token;
  } catch {
    return null;
  }
}

// Categorías con sus IDs de ML para buscar tendencias
const CATEGORIES = [
  { id: 'MLA1648', name: 'Computación' },
  { id: 'MLA1051', name: 'Celulares y Smartphones' },
  { id: 'MLA1000', name: 'Electrónica' },
  { id: 'MLA1430', name: 'Ropa y Accesorios' },
  { id: 'MLA1403', name: 'Alimentos y Bebidas' },
  { id: 'MLA436069', name: 'Limpieza del Hogar' },
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9',
  Accept: 'application/json',
};

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    const headers: Record<string, string> = accessToken
      ? { ...BROWSER_HEADERS, Authorization: `Bearer ${accessToken}` }
      : { ...BROWSER_HEADERS };

    // Obtener tendencias generales primero
    const generalRes = await fetch('https://api.mercadolibre.com/trends/MLA', {
      headers,
      next: { revalidate: 300 }, // Cachear 5 min para no spamear la API
    });

    const generalTrends: { keyword: string; url: string }[] = generalRes.ok
      ? await generalRes.json()
      : [];

    // Obtener tendencias por categoría en paralelo
    const categoryTrendsPromises = CATEGORIES.map(async (cat) => {
      try {
        const res = await fetch(
          `https://api.mercadolibre.com/trends/MLA/${cat.id}`,
          {
            headers,
            next: { revalidate: 300 },
          }
        );
        const data: { keyword: string }[] = res.ok ? await res.json() : [];
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          available: res.ok,
          httpStatus: res.status,
          trends: data.slice(0, 10).map((t) => t.keyword),
        };
      } catch {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          available: false,
          httpStatus: 0,
          trends: [],
        };
      }
    });

    const categoryTrends = await Promise.all(categoryTrendsPromises);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      general: generalTrends.slice(0, 15).map((t) => ({
        keyword: t.keyword,
        url: t.url,
      })),
      byCategory: categoryTrends,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching trends', details: error.message },
      { status: 500 }
    );
  }
}
