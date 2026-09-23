import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AlertsList from '@/components/AlertsList';

export const dynamic = 'force-dynamic';

// Bandeja de alertas del cliente (HU02): productos seguidos que empezaron
// a crecer. Requiere cuenta -- sin eso no hay a quien mostrarle nada.
export default async function AlertsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/alerts');
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)', padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <Link href="/dashboard" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '1.5rem' }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            🔔 Mis alertas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
            Productos que seguís y que empezaron a crecer (HU02).
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        <AlertsList />
      </div>
    </div>
  );
}
