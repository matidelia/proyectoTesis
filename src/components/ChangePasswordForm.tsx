'use client';

import React, { useState } from 'react';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo cambiar la contraseña.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setLoading(false);
    } catch {
      setError('Error de conexión. Probá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{
      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
      borderRadius: '16px', padding: '2rem',
    }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
        Cambiar contraseña
      </h2>

      {success && (
        <div style={{
          background: 'rgba(0,166,80,0.1)', color: '#00a650', border: '1px solid rgba(0,166,80,0.3)',
          borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          ✅ Contraseña actualizada.
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
        Contraseña actual
      </label>
      <input
        type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
        style={inputStyle}
      />

      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.9rem 0 0.3rem' }}>
        Contraseña nueva (mínimo 8 caracteres)
      </label>
      <input
        type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
        style={inputStyle}
      />

      <button type="submit" disabled={loading} style={{
        width: '100%', marginTop: '1.5rem', padding: '0.7rem', borderRadius: '8px', border: 'none',
        background: 'var(--accent-primary)', color: '#000', fontWeight: 700, fontSize: '0.9rem',
        cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
      }}>
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.06)',
  color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box',
};
