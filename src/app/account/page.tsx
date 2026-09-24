import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/account');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '4rem' }}>
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)', padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <Link href={session!.role === 'admin' ? '/admin' : '/dashboard'} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '1.5rem' }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: 0 }}>Mi cuenta</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{session!.email}</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem', maxWidth: 420 }}>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
