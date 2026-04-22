import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const searchHistory = await prisma.searchHistory.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10
  });

  const products = await prisma.product.findMany({
    orderBy: { lastSeen: 'desc' },
    take: 10
  });

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
        ← Volver al buscador
      </Link>
      
      <h1 style={{ marginBottom: '2rem' }}>Panel de Estadísticas (Tesis)</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Historial de Búsquedas */}
        <section className="glass-header" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Últimas Búsquedas (Tendencias)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.5rem' }}>Query</th>
                <th style={{ padding: '0.5rem' }}>Resultados</th>
                <th style={{ padding: '0.5rem' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {searchHistory.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '0.5rem' }}>{s.query}</td>
                  <td style={{ padding: '0.5rem' }}>{s.resultsCount}</td>
                  <td style={{ padding: '0.5rem' }}>{new Date(s.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
              {searchHistory.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay búsquedas registradas yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Top Productos Encontrados */}
        <section className="glass-header" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Catálogo Reciente (Inteligencia de Negocios)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {products.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />}
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {p.mlId}</p>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay productos en el catálogo yet.</p>
            )}
          </div>
        </section>

      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(0, 166, 80, 0.1)', border: '1px solid rgba(0, 166, 80, 0.2)', borderRadius: '12px' }}>
        <h3 style={{ color: '#00a650', marginBottom: '0.5rem' }}>💡 Nota para tu Tesis</h3>
        <p style={{ fontSize: '0.9rem' }}>
          Esta base de datos PostgreSQL ahora registra cada interacción. Puedes usar estos datos para calcular:
          <br />• <strong>Volumen de interés:</strong> Cuáles son los términos más buscados.
          <br />• <strong>Disponibilidad de mercado:</strong> Cuántos productos devuelve Mercado Libre para cada categoría.
          <br />• <strong>Análisis temporal:</strong> Cómo varían las búsquedas a lo largo del tiempo.
        </p>
      </div>
    </div>
  );
}
