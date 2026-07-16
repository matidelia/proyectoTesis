'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface ScoreItem {
  productId: string;
  name: string;
  permalink: string | null;
  price: number | null;
  currency: string;
  category: string;
  categoryMlId: string | null;
  score: number;
  period: string;
  computedAt: string;
  variationPct: number | null;
}

interface ScoresData {
  timestamp: string;
  kpis: { detected: number; avgScore: number; topCategory: string };
  items: ScoreItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  MLA1648: '#60a5fa',   // Computación - azul
  MLA1051: '#a78bfa',   // Celulares - violeta
  MLA1000: '#f59e0b',   // Electrónica - naranja
  MLA1430: '#ec4899',   // Ropa - rosa
  MLA1403: '#10b981',   // Alimentos - verde
  MLA436069: '#6ee7b7', // Limpieza - verde claro
};

function scoreColor(score: number): string {
  if (score >= 70) return '#00a650';
  if (score >= 50) return '#ffe600';
  return '#9ca3af';
}

export default function TrendScoreTable() {
  const [data, setData] = useState<ScoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'variation'>('score');

  useEffect(() => {
    fetch('/api/trend-scores')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.details || d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.items.map(i => i.category))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = categoryFilter === 'all'
      ? data.items
      : data.items.filter(i => i.category === categoryFilter);
    if (sortBy === 'variation') {
      items = [...items].sort(
        (a, b) => Math.abs(b.variationPct ?? 0) - Math.abs(a.variationPct ?? 0)
      );
    }
    return items;
  }, [data, categoryFilter, sortBy]);

  // Export CSV (RF06): genera el archivo en el cliente y lo descarga
  const exportCsv = () => {
    if (!filtered.length) return;
    const header = 'producto,categoria,precio,moneda,variacion_pct,score,periodo,calculado,link';
    const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const rows = filtered.map(i => [
      esc(i.name), esc(i.category), i.price ?? '', i.currency,
      i.variationPct ?? '', i.score, i.period, i.computedAt, i.permalink ?? '',
    ].join(','));
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_tendencia_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px',
        border: '1px solid var(--glass-border)', padding: '2rem',
        display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: 20, height: 20, border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Calculando ranking de tendencias...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.07)', borderRadius: '16px',
        border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', color: '#ef4444'
      }}>
        ⚠️ No se pudo cargar el ranking de scores: {error}
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div style={{
        background: 'var(--glass-bg)', borderRadius: '16px',
        border: '1px solid var(--glass-border)', padding: '2rem', color: 'var(--text-secondary)'
      }}>
        Aún no hay scores calculados. Corré <code>node scripts/compute_trend_scores.js</code> después de una sesión de minería.
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--glass-bg)', borderRadius: '16px',
      border: '1px solid var(--glass-border)', padding: '1.5rem'
    }}>

      {/* KPIs (del wireframe: detectados / promedio / categoría top) */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { label: 'Productos con score', value: String(data.kpis.detected), color: '#00a650' },
          { label: 'Score promedio', value: String(data.kpis.avgScore), color: '#ffe600' },
          { label: 'Categoría top', value: data.kpis.topCategory, color: '#60a5fa' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            flex: '1 1 150px', padding: '0.75rem 1rem',
            background: `${kpi.color}10`, border: `1px solid ${kpi.color}33`,
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Controles: filtro por categoría, orden y export (RF03 + RF06) */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            border: '1px solid var(--glass-border)', borderRadius: '8px',
            padding: '0.4rem 0.75rem', fontSize: '0.85rem',
          }}
        >
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'score' | 'variation')}
          style={{
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            border: '1px solid var(--glass-border)', borderRadius: '8px',
            padding: '0.4rem 0.75rem', fontSize: '0.85rem',
          }}
        >
          <option value="score">Ordenar por score</option>
          <option value="variation">Ordenar por variación de precio</option>
        </select>

        <button
          onClick={exportCsv}
          style={{
            marginLeft: 'auto', padding: '0.4rem 1rem',
            background: 'rgba(0,166,80,0.12)', color: '#00a650',
            border: '1px solid rgba(0,166,80,0.35)', borderRadius: '8px',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          ⬇ Exportar CSV
        </button>
      </div>

      {/* Tabla de productos (wireframe: Nombre | Categoría | Score | Variación %) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>#</th>
              <th style={{ padding: '0.5rem' }}>Producto</th>
              <th style={{ padding: '0.5rem' }}>Categoría</th>
              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Precio</th>
              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Variación</th>
              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const catColor = (item.categoryMlId && CATEGORY_COLORS[item.categoryMlId]) || '#9ca3af';
              return (
                <tr key={item.productId} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem', maxWidth: 320 }}>
                    {item.permalink ? (
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer"
                         style={{ color: '#fff', textDecoration: 'none' }}>
                        {item.name.length > 60 ? item.name.slice(0, 60) + '…' : item.name}
                      </a>
                    ) : (
                      item.name.length > 60 ? item.name.slice(0, 60) + '…' : item.name
                    )}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem',
                      background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}44`,
                      whiteSpace: 'nowrap',
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {item.price != null ? `$${item.price.toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td style={{
                    padding: '0.5rem', textAlign: 'right', fontWeight: 600,
                    color: item.variationPct == null ? 'var(--text-secondary)'
                      : item.variationPct > 0 ? '#ef4444'
                      : item.variationPct < 0 ? '#00a650'
                      : 'var(--text-secondary)',
                  }}>
                    {item.variationPct == null ? 'estable'
                      : `${item.variationPct > 0 ? '+' : ''}${item.variationPct}%`}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 60, height: 6, background: 'rgba(255,255,255,0.08)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(100, item.score)}%`, height: '100%',
                          background: scoreColor(item.score), borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontWeight: 800, color: scoreColor(item.score), minWidth: 38, textAlign: 'right' }}>
                        {item.score}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: 0 }}>
        Score de tendencia (0-100) = 35% frecuencia de aparición + 25% permanencia + 20% ranking de catálogo
        + 20% estabilidad de precio, sobre ventana de {data.items[0]?.period ?? '7d'}. Actualizado: {new Date(data.timestamp).toLocaleString('es-AR')}.
      </p>
    </div>
  );
}
