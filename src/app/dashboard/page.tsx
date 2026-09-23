import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import TrendScoreTable from '@/components/TrendScoreTable';
import TrendScoreChart from '@/components/TrendScoreChart';
import LogoutButton from '@/components/LogoutButton';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Panel para clientes: ranking de productos en tendencia + evolución del
// score en el tiempo. No incluye datos técnicos/operativos (estado de APIs,
// historial de minería, catálogo crudo) — esos quedan en /admin.
//
// Nivel gratuito vs. pago (Sección 5.4, modelo de negocio): el ranking es
// visible para todos; la evolución histórica completa y la exportación CSV
// (en TrendScoreTable) requieren sesión iniciada.
export default async function DashboardPage() {
  const totalMonitored = await prisma.product.count({
    where: { trendScores: { some: {} } },
  });
  const session = await getSession();
  const loggedIn = !!session;
  const unreadAlerts = loggedIn
    ? await prisma.alert.count({ where: { userId: session!.userId, read: false } })
    : 0;

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
              Panel de Tendencias
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              Detección temprana de productos en tendencia — Mercado Libre Argentina
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            padding: '0.4rem 0.9rem',
            background: 'rgba(0,166,80,0.1)',
            color: '#00a650',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            border: '1px solid #00a65044',
            fontWeight: 600,
          }}>
            {totalMonitored} productos monitoreados
          </div>

          {loggedIn && (
            <Link href="/alerts" style={{
              position: 'relative', padding: '0.4rem 0.9rem',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
              borderRadius: '9999px', fontSize: '0.85rem', border: '1px solid var(--glass-border)',
              textDecoration: 'none', fontWeight: 600,
            }}>
              🔔 Alertas
              {unreadAlerts > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff',
                  borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 800,
                  minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {unreadAlerts}
                </span>
              )}
            </Link>
          )}

          {loggedIn ? (
            <LogoutButton />
          ) : (
            <Link href="/login?next=/dashboard" style={{
              padding: '0.4rem 1rem', background: 'var(--accent-primary)', color: '#000',
              borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            }}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      <div className="container">

        {/* ── SECCIÓN 1: Ranking por Score de Tendencia (RF02/RF03) ── */}
        <section style={{ marginTop: '2rem' }}>
          <SectionTitle
            icon="🏆"
            title="Productos en Tendencia — Score"
            subtitle="Ranking por indicador compuesto: frecuencia de aparición, permanencia, posición en catálogo y estabilidad de precio."
          />
          <TrendScoreTable loggedIn={loggedIn} />
        </section>

        {/* ── SECCIÓN 2: Evolución del Score (gráficos) ── */}
        {/* Nivel pago del modelo freemium (Sección 5.4): historial completo solo con sesión iniciada. */}
        <section style={{ marginTop: '2.5rem' }}>
          <SectionTitle
            icon="📈"
            title="Evolución de la Tendencia"
            subtitle="Cómo fue cambiando el score de un producto a lo largo del tiempo — así se confirma si una tendencia se sostiene o fue solo un pico pasajero."
          />
          {loggedIn ? (
            <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '2rem' }}>
              <TrendScoreChart />
            </div>
          ) : (
            <div style={{
              background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)',
              padding: '2.5rem', textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.5rem', margin: 0 }}>🔒</p>
              <p style={{ color: '#fff', fontWeight: 600, marginTop: '0.5rem' }}>
                Historial completo disponible con cuenta
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Creá una cuenta gratis para ver la evolución del score y exportar el ranking.
              </p>
              <Link href="/register" style={{
                display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1.2rem',
                background: 'var(--accent-primary)', color: '#000', borderRadius: '9999px',
                fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
              }}>
                Crear cuenta
              </Link>
            </div>
          )}
        </section>

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
