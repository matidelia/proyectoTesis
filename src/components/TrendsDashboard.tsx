'use client';

import React, { useEffect, useState } from 'react';

interface CategoryTrends {
  categoryId: string;
  categoryName: string;
  available: boolean;
  httpStatus: number;
  trends: string[];
}

interface TrendsData {
  timestamp: string;
  general: { keyword: string; url: string }[];
  byCategory: CategoryTrends[];
}

const CATEGORY_COLORS: Record<string, string> = {
  MLA1648: '#60a5fa',   // Computación - azul
  MLA1051: '#a78bfa',   // Celulares - violeta
  MLA1000: '#f59e0b',   // Electrónica - naranja
  MLA1430: '#ec4899',   // Ropa - rosa
  MLA1403: '#10b981',   // Alimentos - verde
  MLA436069: '#6ee7b7', // Limpieza - verde claro
};

export default function TrendsDashboard() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('general');

  useEffect(() => {
    fetch('/api/trends')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

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
        Cargando tendencias en tiempo real...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.07)', borderRadius: '16px',
        border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', color: '#ef4444'
      }}>
        ⚠️ No se pudieron cargar las tendencias: {error}
      </div>
    );
  }

  const currentCatData = selectedCat === 'general'
    ? null
    : data.byCategory.find(c => c.categoryId === selectedCat);

  const displayKeywords = selectedCat === 'general'
    ? data.general.map(t => t.keyword)
    : currentCatData?.trends ?? [];

  const catColor = selectedCat === 'general' ? 'var(--accent-primary)' : (CATEGORY_COLORS[selectedCat] ?? '#fff');

  return (
    <div style={{
      background: 'var(--glass-bg)', borderRadius: '16px',
      border: '1px solid var(--glass-border)', padding: '1.5rem'
    }}>
      {/* Tabs de categorías */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <TabButton
          label="🌎 General"
          active={selectedCat === 'general'}
          color="var(--accent-primary)"
          onClick={() => setSelectedCat('general')}
        />
        {data.byCategory.map(cat => (
          <TabButton
            key={cat.categoryId}
            label={cat.categoryName}
            active={selectedCat === cat.categoryId}
            color={CATEGORY_COLORS[cat.categoryId] ?? '#fff'}
            available={cat.available}
            onClick={() => setSelectedCat(cat.categoryId)}
          />
        ))}
      </div>

      {/* Keywords en ranking */}
      {displayKeywords.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
          {displayKeywords.map((kw, idx) => (
            <div
              key={kw}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: `${catColor}10`,
                border: `1px solid ${catColor}30`,
                borderRadius: '10px', padding: '0.6rem 0.9rem',
                transition: 'all 0.2s',
              }}
            >
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: catColor, minWidth: 22, textAlign: 'center',
                background: `${catColor}20`, borderRadius: '6px', padding: '2px 5px'
              }}>
                #{idx + 1}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kw}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '1rem' }}>
          {currentCatData?.available === false
            ? `⚠️ El endpoint de tendencias para esta categoría respondió con HTTP ${currentCatData.httpStatus}`
            : 'Sin datos de tendencias'}
        </div>
      )}

      {/* Footer con timestamp */}
      <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
        Actualizado: {new Date(data.timestamp).toLocaleString('es-AR')}
      </p>
    </div>
  );
}

function TabButton({
  label, active, color, available = true, onClick
}: {
  label: string; active: boolean; color: string; available?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem',
        fontWeight: active ? 700 : 400, cursor: 'pointer', border: 'none',
        background: active ? color : 'rgba(255,255,255,0.06)',
        color: active ? '#000' : (available ? '#fff' : 'var(--text-secondary)'),
        transition: 'all 0.2s',
        opacity: available ? 1 : 0.6,
      }}
    >
      {label}
      {!available && ' ⚠️'}
    </button>
  );
}
