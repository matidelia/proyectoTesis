'use client';

import React, { useEffect, useState } from 'react';

interface EndpointStatus {
  endpoint: string;
  label: string;
  currentStatus: 'available' | 'blocked';
  lastHttpStatus: number;
  lastChecked: string | null;
  lastError: string | null;
  uptimePct: number | null;
  totalChecks: number;
  avgLatencyMs: number | null;
  history: { isAvailable: boolean; timestamp: string; httpStatus: number }[];
}

interface HealthData {
  since: string;
  days: number;
  endpoints: EndpointStatus[];
  totalLogs: number;
}

const STATUS_HTTP_COLORS: Record<number, string> = {
  200: '#00a650',
  403: '#ef4444',
  401: '#f59e0b',
  429: '#f97316',
  0:   '#6b7280',
};

export default function EndpointHealthDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/health?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px',
        border: '1px solid var(--glass-border)', padding: '2rem',
        display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: 20, height: 20, border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#60a5fa', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Cargando historial de disponibilidad...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '1.5rem', color: 'var(--text-secondary)' }}>
        Sin datos de disponibilidad aún. Ejecuta <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>node scripts/probe_endpoints.js</code> para registrar el primer snapshot.
      </div>
    );
  }

  if (data.endpoints.length === 0) {
    return (
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '2rem',
      }}>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          📭 Sin registros en los últimos {days} días.
          <br />
          <span style={{ fontSize: '0.8rem' }}>
            El probe se ejecuta automáticamente al correr <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>mine_carril1.js</code>
          </span>
        </p>
      </div>
    );
  }

  const availableCount = data.endpoints.filter(e => e.currentStatus === 'available').length;
  const blockedCount = data.endpoints.filter(e => e.currentStatus === 'blocked').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Resumen rápido */}
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)',
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <StatusPill label={`${availableCount} Disponibles`} color="#00a650" />
          <StatusPill label={`${blockedCount} Bloqueados`} color="#ef4444" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {data.totalLogs} registros totales
          </span>
        </div>
        {/* Selector de periodo */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Período:
          {[1, 3, 7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
              background: days === d ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
              color: days === d ? '#000' : '#fff', fontWeight: days === d ? 700 : 400,
            }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de endpoints */}
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px',
        border: '1px solid var(--glass-border)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left' }}>Endpoint</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Estado Actual</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Uptime ({days}d)</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>HTTP</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Latencia Prom.</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Chequeos</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Historial (reciente →)</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Último Check</th>
            </tr>
          </thead>
          <tbody>
            {data.endpoints.map((ep, idx) => {
              const isAvailable = ep.currentStatus === 'available';
              const statusColor = isAvailable ? '#00a650' : '#ef4444';
              const httpColor = STATUS_HTTP_COLORS[ep.lastHttpStatus] ?? '#a1a1aa';
              const uptimeColor = ep.uptimePct == null ? '#a1a1aa'
                : ep.uptimePct >= 90 ? '#00a650'
                : ep.uptimePct >= 50 ? '#f59e0b' : '#ef4444';

              return (
                <tr key={ep.endpoint} style={{
                  borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  background: isAvailable ? 'transparent' : 'rgba(239,68,68,0.03)',
                }}>
                  {/* Label */}
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{ep.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {ep.endpoint}
                    </div>
                    {ep.lastError && !isAvailable && (
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>
                        → {ep.lastError}
                      </div>
                    )}
                  </td>
                  {/* Estado */}
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.25rem 0.65rem', borderRadius: '9999px',
                      background: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: '0.78rem'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                      {isAvailable ? 'Online' : 'Bloqueado'}
                    </span>
                  </td>
                  {/* Uptime */}
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: uptimeColor }}>
                    {ep.uptimePct != null ? `${ep.uptimePct}%` : '—'}
                  </td>
                  {/* HTTP Status */}
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <code style={{ background: `${httpColor}22`, color: httpColor, padding: '2px 7px', borderRadius: 5, fontSize: '0.8rem', fontWeight: 700 }}>
                      {ep.lastHttpStatus || '?'}
                    </code>
                  </td>
                  {/* Latencia */}
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {ep.avgLatencyMs != null ? `${ep.avgLatencyMs}ms` : '—'}
                  </td>
                  {/* Chequeos */}
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {ep.totalChecks}
                  </td>
                  {/* Mini historial */}
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'nowrap' }}>
                      {[...ep.history].reverse().slice(0, 20).map((h, i) => (
                        <div
                          key={i}
                          title={`${new Date(h.timestamp).toLocaleString('es-AR')} — HTTP ${h.httpStatus}`}
                          style={{
                            width: 8, height: 20, borderRadius: 2,
                            background: h.isAvailable ? '#00a650' : '#ef4444',
                            opacity: 0.8,
                            transition: 'opacity 0.2s',
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  {/* Último check */}
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {ep.lastChecked
                      ? new Date(ep.lastChecked).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.3rem 0.8rem', borderRadius: '9999px',
      background: `${color}18`, border: `1px solid ${color}44`,
      color, fontWeight: 700, fontSize: '0.85rem'
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
