'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ScoreItem {
  productId: string;
  name: string;
  category: string;
  price: number | null;
  currency: string;
  score: number;
}

interface HistoryPoint {
  score: number;
  computedAt: string;
  components: any;
  period: string;
}

interface HistoryResponse {
  productId: string;
  name: string | null;
  category: string | null;
  history: HistoryPoint[];
}

const COMPONENT_LABELS: Record<string, string> = {
  frecuencia: 'Frecuencia de aparición',
  permanencia: 'Permanencia',
  ranking: 'Posición en catálogo',
  estabilidad: 'Estabilidad de precio',
};

const COMPONENT_ORDER = ['frecuencia', 'permanencia', 'ranking', 'estabilidad'];

export default function TrendScoreChart() {
  const [items, setItems] = useState<ScoreItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Usa el mismo endpoint y el mismo orden (por score) que la tabla de
  // ranking, para que el selector del gráfico coincida con lo que el
  // usuario ya vio ahí — y para distinguir productos con nombres muy
  // parecidos (distintos vendedores) mostrando precio y score en la opción.
  useEffect(() => {
    fetch('/api/trend-scores')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.details || d.error);
        const list: ScoreItem[] = d.items.map((i: any) => ({
          productId: i.productId,
          name: i.name,
          category: i.category,
          price: i.price,
          currency: i.currency,
          score: i.score,
        }));
        setItems(list);
        setSelectedId(list[0]?.productId || '');
        setItemsLoading(false);
      })
      .catch(e => {
        setItemsError(e.message);
        setItemsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/trend-history?productId=${selectedId}`)
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
  }, [selectedId]);

  const width = 600;
  const height = 280;
  const paddingX = 50;
  const paddingY = 30;

  const chartData = useMemo(() => {
    if (!data || data.history.length === 0) return null;
    const points = data.history.map((h, i) => {
      const x = data.history.length > 1
        ? paddingX + (i / (data.history.length - 1)) * (width - 2 * paddingX)
        : width / 2;
      const y = height - paddingY - (h.score / 100) * (height - 2 * paddingY);
      return { x, y, score: h.score, date: new Date(h.computedAt) };
    });
    let linePath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }
    let areaPath = '';
    if (points.length > 0) {
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
    }
    return { points, linePath, areaPath };
  }, [data]);

  const stats = useMemo(() => {
    if (!data || data.history.length === 0) return null;
    const scores = data.history.map(h => h.score);
    const first = scores[0];
    const current = scores[scores.length - 1];
    const diff = Math.round((current - first) * 10) / 10;
    return { first, current, diff, points: scores.length };
  }, [data]);

  const latestComponents = useMemo(() => {
    if (!data || data.history.length === 0) return null;
    const comp = data.history[data.history.length - 1].components;
    if (!comp || typeof comp !== 'object') return null;
    return COMPONENT_ORDER
      .filter(key => typeof comp[key] === 'number')
      .map(key => ({ key, value: comp[key] as number }));
  }, [data]);

  if (itemsLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Cargando productos…
      </div>
    );
  }

  if (itemsError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        ⚠️ No se pudo cargar la lista de productos: {itemsError}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
      }}>
        📈 Todavía no hay suficiente historial de score para graficar tendencias. A medida que el sistema siga midiendo, este gráfico se va a ir completando.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
            📈 Evolución del Score de Tendencia
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Elegí un producto para ver cómo fue cambiando su puntaje con el tiempo. Ordenados por score, igual que el ranking de arriba.
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem',
            borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.9rem', maxWidth: 340,
          }}
        >
          {items.map(p => {
            const shortName = p.name.length > 32 ? p.name.slice(0, 32) + '…' : p.name;
            const priceLabel = p.price != null ? `$${p.price.toLocaleString('es-AR')}` : 'sin precio';
            return (
              <option key={p.productId} value={p.productId}>
                {shortName} — {priceLabel} — score {p.score}
              </option>
            );
          })}
        </select>
      </div>

      {loading && (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Cargando historial…
        </div>
      )}

      {error && (
        <div style={{ padding: '1.5rem', color: '#ef4444' }}>
          ⚠️ No se pudo cargar el historial: {error}
        </div>
      )}

      {!loading && !error && data && data.history.length < 2 && (
        <div style={{
          padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
        }}>
          📈 Este producto todavía tiene un solo cálculo de score — hace falta más historial para graficar la evolución.
        </div>
      )}

      {!loading && !error && chartData && stats && data && data.history.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '1.5rem', flexWrap: 'wrap' }}>

          {/* Gráfico SVG */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden',
          }}>
            {hoveredIndex !== null && chartData.points[hoveredIndex] && (
              <div style={{
                position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(18,18,20,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem 1rem', borderRadius: '8px', pointerEvents: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)', textAlign: 'center', backdropFilter: 'blur(8px)', zIndex: 10,
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {chartData.points[hoveredIndex].date.toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00a650' }}>
                  Score {chartData.points[hoveredIndex].score}
                </span>
              </div>
            )}

            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              <defs>
                <linearGradient id="scoreChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a650" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00a650" stopOpacity="0" />
                </linearGradient>
                <filter id="scoreGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {[0, 25, 50, 75, 100].map((val, idx) => {
                const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
                return (
                  <g key={idx}>
                    <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <text x={paddingX - 10} y={y + 4} fill="var(--text-secondary)" fontSize="9" textAnchor="end">{val}</text>
                  </g>
                );
              })}

              {chartData.areaPath && <path d={chartData.areaPath} fill="url(#scoreChartGradient)" />}
              {chartData.linePath && (
                <path
                  d={chartData.linePath} fill="none" stroke="#00a650" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" filter="url(#scoreGlow)"
                />
              )}

              {chartData.points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x} cy={p.y} r={hoveredIndex === idx ? 8 : 4}
                    fill={hoveredIndex === idx ? '#fff' : '#00a650'} stroke="#121214"
                    strokeWidth={hoveredIndex === idx ? 3 : 1.5}
                    style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}
                  />
                  <circle
                    cx={p.x} cy={p.y} r="20" fill="transparent" style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Panel lateral: variación + qué explica el score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px', padding: '1.25rem',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
                Variación del score
              </span>
              <span style={{
                fontSize: '1.8rem', fontWeight: 700,
                color: stats.diff > 0 ? '#00a650' : stats.diff < 0 ? '#ef4444' : '#a1a1aa',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}>
                {stats.diff > 0 ? '↑' : stats.diff < 0 ? '↓' : ''}{stats.diff > 0 ? '+' : ''}{stats.diff} pts
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                de {stats.first} a {stats.current}, en {stats.points} mediciones
              </span>
            </div>

            {latestComponents && latestComponents.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Qué explica el score actual</span>
                {latestComponents.map(({ key, value }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                      <span>{COMPONENT_LABELS[key] || key}</span>
                      <span>{Math.round(value * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, value * 100)}%`, height: '100%', background: '#00a650', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
