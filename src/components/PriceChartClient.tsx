'use client';

import React, { useState, useMemo } from 'react';

interface PricePoint {
  id: string;
  price: number;
  timestamp: string;
}

interface ProductWithHistory {
  id: string;
  mlId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  priceHistory: PricePoint[];
}

interface PriceChartClientProps {
  products: ProductWithHistory[];
}

export default function PriceChartClient({ products }: PriceChartClientProps) {
  // Solo consideramos productos que tengan al menos un registro en su historial
  const chartableProducts = useMemo(() => {
    return products.filter(p => p.priceHistory && p.priceHistory.length > 0);
  }, [products]);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    chartableProducts[0]?.id || ''
  );
  
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const selectedProduct = useMemo(() => {
    return chartableProducts.find(p => p.id === selectedProductId);
  }, [chartableProducts, selectedProductId]);

  // Historial ordenado por fecha de forma ascendente para el gráfico
  const sortedHistory = useMemo(() => {
    if (!selectedProduct) return [];
    return [...selectedProduct.priceHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedProduct]);

  // Dimensiones del gráfico SVG
  const width = 600;
  const height = 300;
  const paddingX = 50;
  const paddingY = 40;

  // Cálculos de coordenadas SVG
  const chartData = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const prices = sortedHistory.map(h => h.price);
    const minPrice = Math.min(...prices) * 0.98; // Pequeño margen inferior
    const maxPrice = Math.max(...prices) * 1.02; // Pequeño margen superior
    const priceRange = maxPrice - minPrice || 100; // Evitar división por cero

    const points = sortedHistory.map((h, i) => {
      const x = sortedHistory.length > 1
        ? paddingX + (i / (sortedHistory.length - 1)) * (width - 2 * paddingX)
        : width / 2;
      
      const y = height - paddingY - ((h.price - minPrice) / priceRange) * (height - 2 * paddingY);
      
      return { x, y, price: h.price, date: new Date(h.timestamp) };
    });

    // Generar path de línea
    let linePath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + 
        points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    // Generar path de área degradada
    let areaPath = '';
    if (points.length > 0) {
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
    }

    return { points, linePath, areaPath, minPrice, maxPrice };
  }, [sortedHistory]);

  // Estadísticas del producto seleccionado
  const stats = useMemo(() => {
    if (sortedHistory.length === 0) return null;
    const prices = sortedHistory.map(h => h.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const initial = prices[0];
    const current = prices[prices.length - 1];
    const diff = current - initial;
    const pct = initial > 0 ? (diff / initial) * 100 : 0;

    return { max, min, current, diff, pct };
  }, [sortedHistory]);

  if (chartableProducts.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)'
      }}>
        📉 Aún no hay suficiente historial para generar gráficos de tendencias. El robot de minería recolectará los puntos históricos periódicamente.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Selector de Producto */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
            📉 Tendencia de Precios en Vivo
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Selecciona un producto para visualizar sus fluctuaciones históricas.
          </p>
        </div>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            maxWidth: '300px'
          }}
        >
          {chartableProducts.map(p => (
            <option key={p.id} value={p.id} style={{ background: '#121214', color: '#fff' }}>
              {p.name.substring(0, 40)}...
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && stats && chartData && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Gráfico SVG */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            {/* Tooltip Overlay */}
            {hoveredPointIndex !== null && chartData.points[hoveredPointIndex] && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(18, 18, 20, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                pointerEvents: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                zIndex: 10
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {chartData.points[hoveredPointIndex].date.toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00a650' }}>
                  ${chartData.points[hoveredPointIndex].price.toLocaleString('es-AR')} ARS
                </span>
              </div>
            )}

            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              <defs>
                {/* Degradado para el área bajo la curva */}
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a650" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00a650" stopOpacity="0.0" />
                </linearGradient>
                {/* Filtro de brillo de neón */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grillas Horizontales */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = paddingY + p * (height - 2 * paddingY);
                const price = chartData.maxPrice - p * (chartData.maxPrice - chartData.minPrice);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      fill="var(--text-secondary)"
                      fontSize="9"
                      textAnchor="end"
                    >
                      ${Math.round(price).toLocaleString('es-AR')}
                    </text>
                  </g>
                );
              })}

              {/* Área del Gráfico */}
              {chartData.areaPath && (
                <path d={chartData.areaPath} fill="url(#chartGradient)" />
              )}

              {/* Línea del Gráfico */}
              {chartData.linePath && (
                <path
                  d={chartData.linePath}
                  fill="none"
                  stroke="#00a650"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                />
              )}

              {/* Puntos Interactivos */}
              {chartData.points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPointIndex === idx ? 8 : 4}
                    fill={hoveredPointIndex === idx ? '#fff' : '#00a650'}
                    stroke="#121214"
                    strokeWidth={hoveredPointIndex === idx ? 3 : 1.5}
                    style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  />
                  {/* Círculo invisible gigante para facilitar hover en dispositivos táctiles */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="20"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Estadísticas de Variación */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Card de Variación Pct */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Variación del Periodo
              </span>
              <span style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                color: stats.diff < 0 ? '#ef4444' : stats.diff > 0 ? '#00a650' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {stats.diff < 0 ? '↓' : stats.diff > 0 ? '↑' : ''}
                {stats.pct.toFixed(2)}%
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {stats.diff < 0 ? 'Ahorro' : stats.diff > 0 ? 'Aumento' : 'Sin cambios'} de ${Math.abs(stats.diff).toLocaleString('es-AR')} ARS
              </span>
            </div>

            {/* Precios Extremos */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Precio Máximo</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  ${stats.max.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Precio Mínimo</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  ${stats.min.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Puntos Muestreados</span>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#a1a1aa' }}>
                  {sortedHistory.length} lecturas
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
