'use client';

import React, { useEffect, useState } from 'react';

interface AlertItem {
  id: string;
  productId: string;
  productName: string;
  permalink: string | null;
  score: number;
  previousScore: number;
  scoreDelta: number;
  read: boolean;
  createdAt: string;
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setAlerts(d.alerts);
      })
      .catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    load();
  };

  const markRead = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (error) {
    return <p style={{ color: '#ef4444' }}>⚠️ No se pudieron cargar las alertas: {error}</p>;
  }

  if (!alerts) {
    return <p style={{ color: 'var(--text-secondary)' }}>Cargando…</p>;
  }

  if (alerts.length === 0) {
    return (
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)',
        padding: '2.5rem', textAlign: 'center',
      }}>
        <p style={{ fontSize: '1.5rem', margin: 0 }}>🔕</p>
        <p style={{ color: '#fff', fontWeight: 600, marginTop: '0.5rem' }}>Todavía no tenés alertas</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Seguí productos desde el botón 🔔 del ranking para que te avisemos cuando empiecen a crecer.
        </p>
      </div>
    );
  }

  const unread = alerts.some(a => !a.read);

  return (
    <div>
      {unread && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button onClick={markAllRead} style={{
            padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
            borderRadius: '9999px', fontSize: '0.8rem', border: '1px solid var(--glass-border)',
            fontWeight: 600, cursor: 'pointer',
          }}>
            Marcar todas como leídas
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map(a => (
          <div key={a.id} onClick={() => !a.read && markRead(a.id)} style={{
            background: a.read ? 'var(--glass-bg)' : 'rgba(0,166,80,0.08)',
            border: `1px solid ${a.read ? 'var(--glass-border)' : 'rgba(0,166,80,0.3)'}`,
            borderRadius: '12px', padding: '1rem 1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            cursor: a.read ? 'default' : 'pointer',
          }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>
                {!a.read && <span style={{ color: '#00a650' }}>● </span>}
                {a.permalink ? (
                  <a href={a.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}>
                    {a.productName}
                  </a>
                ) : a.productName}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                Score subió de {a.previousScore} a {a.score} (+{a.scoreDelta} pts) —{' '}
                {new Date(a.createdAt).toLocaleString('es-AR')}
              </p>
            </div>
            <span style={{ color: '#00a650', fontWeight: 800, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              🔥 +{a.scoreDelta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
