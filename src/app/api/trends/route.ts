import { NextResponse } from 'next/server';

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
    // Obtener tendencias generales primero
    const generalRes = await fetch('https://api.mercadolibre.com/trends/MLA', {
      headers: BROWSER_HEADERS,
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
            headers: BROWSER_HEADERS,
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
