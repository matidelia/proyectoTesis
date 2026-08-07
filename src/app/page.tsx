'use client';

import React, { useState, useEffect } from 'react';
import TrendScoreTable from '@/components/TrendScoreTable';

export default function Home() {
  // Connection state
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // Check connection on mount
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setConnStatus(data.connected ? 'connected' : 'error');
      } catch (err) {
        setConnStatus('error');
      }
    };
    checkConnection();
  }, []);

  return (
    <>
      <header className="glass-header">
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>

          {/* Connection Status Badge */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: '2rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: connStatus === 'connected' ? 'rgba(0, 166, 80, 0.1)' :
                        connStatus === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.1)',
            color: connStatus === 'connected' ? '#00a650' :
                   connStatus === 'error' ? '#ef4444' : '#a1a1aa',
            border: `1px solid ${
              connStatus === 'connected' ? 'rgba(0, 166, 80, 0.2)' :
              connStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.2)'
            }`
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: connStatus === 'connected' ? '#00a650' :
                               connStatus === 'error' ? '#ef4444' : '#a1a1aa'
            }} />
            {connStatus === 'checking' && 'Verificando API...'}
            {connStatus === 'connected' && 'API Conectada'}
            {connStatus === 'error' && 'Error de API'}
          </div>

          <h1>Productos en Tendencia</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Detección temprana sobre el histórico propio de Mercado Libre
          </p>
        </div>
      </header>

      <main className="container">
        <div style={{ marginTop: '3rem' }}>
          <TrendScoreTable />
        </div>
      </main>
    </>
  );
}
