import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import PriceChartClient from '@/components/PriceChartClient';
import TrendsDashboard from '@/components/TrendsDashboard';
import EndpointHealthDashboard from '@/components/EndpointHealthDashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: any }) {
  const { auth, msg } = await searchParams;

  const searchHistory = await prisma.searchHistory.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  const products = await prisma.product.findMany({
    include: { priceHistory: { orderBy: { timestamp: 'asc' } } },
    orderBy: { lastSeen: 'desc' },
    take: 30,
  });

  const token = await (prisma as any).oAuthToken.findUnique({
    where: { id: 'mercado_libre' },
  });

  // Estadísticas generales
  const totalProducts = await prisma.product.count();
  const totalSearches = await prisma.searchHistory.count();
  const totalPricePoints = await prisma.priceHistory.count();

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '4rem' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '1.5rem' }}>
            ←
          </Link>
          <div>
            <h1 style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              Panel de Inteligencia de Mercado
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              Tesis — Análisis de Mercado Libre Argentina
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* KPI Pills */}
          {[
            { label: 'Productos', value: totalProducts, color: '#00a650' },
            { label: 'Búsquedas', value: totalSearches, color: '#ffe600' },
            { label: 'Snapshots', value: totalPricePoints, color: '#60a5fa' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              padding: '0.4rem 0.9rem',
              background: `${kpi.color}18`,
              border: `1px solid ${kpi.color}44`,
              borderRadius: '9999px',
              fontSize: '0.8rem',
              color: kpi.color,
              fontWeight: 600,
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 800 }}>{kpi.value}</span>
              <span style={{ opacity: 0.7 }}>{kpi.label}</span>
            </div>
          ))}

          {token ? (
            <div style={{ padding: '0.4rem 0.9rem', background: 'rgba(0,166,80,0.1)', color: '#00a650', borderRadius: '9999px', fontSize: '0.8rem', border: '1px solid #00a65044', fontWeight: 600 }}>
              ● OAuth2 Activo
            </div>
          ) : (
            <Link href="/api/auth/login" style={{
              padding: '0.5rem 1.2rem',
              background: 'var(--accent-primary)',
              color: '#000',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}>
              Conectar ML
            </Link>
          )}
        </div>
      </div>

      <div className="container">

        {/* Auth alerts */}
        {auth === 'success' && (
          <div style={{ padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '8px', marginTop: '1.5rem' }}>
            ✅ ¡Conexión exitosa! El sistema ya puede acceder a listados reales.
          </div>
        )}
        {auth === 'error' && (
          <div style={{ padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', marginTop: '1.5rem' }}>
            ❌ Error al conectar: {msg}
          </div>
        )}

        {/* ── SECCIÓN 1: Estado de Endpoints (Nuevo) ── */}
        <section style={{ marginTop: '2rem' }}>
          <SectionTitle
            icon="🛡️"
            title="Estado de APIs — Historial de Disponibilidad"
            subtitle="Registrado automáticamente en cada sesión de minería. Permite detectar cuándo ML bloquea o desbloquea endpoints."
          />
          <EndpointHealthDashboard />
        </section>

        {/* ── SECCIÓN 2: Tendencias en Tiempo Real (Nuevo) ── */}
        <section style={{ marginTop: '2.5rem' }}>
          <SectionTitle
            icon="🔥"
            title="Tendencias en Tiempo Real"
            subtitle="Palabras clave más buscadas ahora en Mercado Libre Argentina, por categoría."
          />
          <TrendsDashboard />
        </section>

        {/* ── SECCIÓN 3: Gráfico de Precios ── */}
        <section style={{ marginTop: '2.5rem' }}>
          <SectionTitle
            icon="📉"
            title="Evolución de Precios (Serie Temporal)"
            subtitle="Historial de precios mínimos de mercado registrados por el robot de minería."
          />
          <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '2rem' }}>
            <PriceChartClient products={products as any} />
          </div>
        </section>

        {/* ── SECCIÓN 4: Historial de Minería + Catálogo (grid) ── */}
        <section style={{ marginTop: '2.5rem' }}>
          <SectionTitle icon="🗃️" title="Registros de Minería" subtitle="Últimas sesiones automatizadas y productos guardados." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            {/* Historial de Búsquedas */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>
                Últimas Sesiones ({totalSearches} totales)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Query</th>
                    <th style={{ padding: '0.4rem', textAlign: 'center' }}>Guardados</th>
                    <th style={{ padding: '0.4rem', textAlign: 'right' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {searchHistory.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.4rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.query.replace('MINE_CARRIL1:', '⛏ ')}
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: s.resultsCount > 0 ? '#00a650' : 'var(--text-secondary)' }}>
                        {s.resultsCount}
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {new Date(s.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {searchHistory.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>Sin registros aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Catálogo Reciente */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>
                Catálogo ({totalProducts} productos)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {products.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{p.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {p.priceHistory.length} snapshots
                      </p>
                    </div>
                    {p.price != null && (
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#00a650', whiteSpace: 'nowrap' }}>
                        ${p.price.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>
                ))}
                {products.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin productos aún</p>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ── Nota Tesis ── */}
        <div style={{
          marginTop: '2.5rem',
          padding: '1.5rem',
          background: 'rgba(0,166,80,0.07)',
          border: '1px solid rgba(0,166,80,0.2)',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: '#00a650', marginBottom: '0.5rem', fontSize: '1rem' }}>💡 Metodología — Leading vs Lagging Indicators</h3>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#fff' }}>Capa 1 (Leading):</strong> Las tendencias de búsqueda capturan intención de compra <em>antes</em> de que se convierta en venta.
            &nbsp;<strong style={{ color: '#fff' }}>Capa 2 (Lagging):</strong> Los precios del catálogo confirman el comportamiento del mercado.
            &nbsp;El panel de APIs documenta la disponibilidad histórica de la infraestructura de datos — evidencia científica de las restricciones de acceso durante eventos como el Hot Sale.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Componente auxiliar de título de sección ──────────────────────────────────
function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2 style={{
        fontSize: '1.15rem',
        fontWeight: 700,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: 0,
      }}>
        {icon} {title}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{subtitle}</p>
    </div>
  );
}
