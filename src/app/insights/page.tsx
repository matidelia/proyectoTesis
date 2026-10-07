import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import InsightsBoard from '@/components/insights/InsightsBoard';
import LogoutButton from '@/components/LogoutButton';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tablero de oportunidades — Tendar',
};

export default async function InsightsPage() {
  const session = await getSession();
  const loggedIn = !!session;
  const unreadAlerts = loggedIn
    ? await prisma.alert.count({ where: { userId: session!.userId, read: false } })
    : 0;

  const pill: React.CSSProperties = {
    position: 'relative', padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)', borderRadius: 9999, fontSize: '0.8rem',
    border: '1px solid var(--glass-border)', textDecoration: 'none', fontWeight: 600,
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)',
        padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '1.5rem' }}>←</Link>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: 0 }}>Tablero de oportunidades</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              Qué productos conviene vender ahora — Mercado Libre Argentina
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={pill}>Vista de tabla</Link>
          {loggedIn ? (
            <>
              <Link href="/alerts" style={pill}>
                🔔 Alertas
                {unreadAlerts > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 9999,
                    fontSize: '0.65rem', fontWeight: 800, minWidth: 16, height: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>
                    {unreadAlerts}
                  </span>
                )}
              </Link>
              <Link href="/account" style={pill}>Mi cuenta</Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login?next=/insights" style={{
              padding: '0.4rem 1rem', background: 'var(--accent-primary)', color: '#000', borderRadius: 9999,
              fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            }}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      <div className="container">
        <InsightsBoard loggedIn={loggedIn} />
      </div>
    </div>
  );
}
