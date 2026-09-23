'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cuenta.');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de conexión. Probá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '1.5rem',
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: 380, background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '2rem',
      }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
          Crear cuenta
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Suscripción de Tendar: alertas, historial completo y exportación sin límites.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
          Email
        </label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.9rem 0 0.3rem' }}>
          Contraseña (mínimo 8 caracteres)
        </label>
        <input
          type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: '1.5rem', padding: '0.7rem', borderRadius: '8px', border: 'none',
          background: 'var(--accent-primary)', color: '#000', fontWeight: 700, fontSize: '0.9rem',
          cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          ¿Ya tenés cuenta? <Link href="/login" style={{ color: 'var(--accent-primary)' }}>Iniciá sesión</Link>
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.06)',
  color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box',
};
