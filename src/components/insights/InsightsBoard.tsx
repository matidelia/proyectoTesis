'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { mlLevel, sellerTrend, type Signal } from '@/lib/insights';

interface Item {
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  permalink: string | null;
  category: string;
  score: number;
  computedAt: string;
  delta72h: number | null;
  probability: number | null;
  sellers: number | null;
  sellersStart: number | null;
  sellersAt: string | null;
  components: Record<ComponentKey, number | null>;
  series: number[];
  active: boolean;
  lastSeen: string;
  signal: Signal;
}

type ComponentKey = 'frecuencia' | 'permanencia' | 'ranking' | 'estabilidad' | 'saturacion';

const SIGNALS: Record<Signal, { label: string; color: string; hint: string }> = {
  entrar: { label: 'Entrar ya', color: '#00a650', hint: 'Score ≥ 70 y menos de 4 vendedores compitiendo' },
  vigilar: { label: 'Vigilar', color: '#ffe600', hint: 'Score entre 50 y 70, o score bajo que viene subiendo y tiene índice ML alto' },
  saturado: { label: 'Saturado', color: '#f97316', hint: '4 o más vendedores compitiendo por el mismo producto' },
  debil: { label: 'Señal débil', color: '#71717a', hint: 'Score bajo y sin respaldo del modelo' },
  inactivo: { label: 'Sin señal reciente', color: '#64748b', hint: 'Dejó de aparecer en las búsquedas de la minería: su score ya no se actualiza' },
};

const MAP_SIGNALS: Signal[] = ['entrar', 'vigilar', 'saturado', 'debil'];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR');

const COMPONENTS: { key: ComponentKey; label: string }[] = [
  { key: 'frecuencia', label: 'Frecuencia de aparición' },
  { key: 'permanencia', label: 'Permanencia' },
  { key: 'ranking', label: 'Posición en catálogo' },
  { key: 'estabilidad', label: 'Estabilidad de precio' },
  { key: 'saturacion', label: 'Poca competencia (promedio de 7 días)' },
];

const card: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 16,
  padding: '1.25rem',
  minWidth: 0,
};

const fmtPrice = (p: number | null) => (p == null ? '—' : `$${Math.round(p).toLocaleString('es-AR')}`);
const fmtDelta = (d: number | null) => (d == null ? '—' : `${d > 0 ? '+' : ''}${d.toLocaleString('es-AR')}`);
const deltaColor = (d: number | null) => (d == null || d === 0 ? 'var(--text-secondary)' : d > 0 ? '#00a650' : '#ef4444');
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);
const fmtSellers = (n: number | null) => {
  if (n == null) return 'vendedores s/d';
  return n === 1 ? '1 vendedor' : `${n} vendedores`;
};

// Menos vendedores = menos competencia, por eso "saliendo" va en verde.
const SELLER_TREND_STYLE = {
  saliendo: { arrow: '▼', color: '#00a650' },
  entrando: { arrow: '▲', color: '#f97316' },
  estable: { arrow: '', color: 'var(--text-secondary)' },
};

function SellersInline({ item }: { item: Item }) {
  const trend = sellerTrend(item.sellers, item.sellersStart);
  const style = trend ? SELLER_TREND_STYLE[trend] : null;
  return (
    <span title={trend && trend !== 'estable' ? `Hace 7 días: ${fmtSellers(item.sellersStart)}` : undefined}>
      {fmtSellers(item.sellers)}
      {style?.arrow && <span style={{ color: style.color, marginLeft: 3 }}>{style.arrow}</span>}
    </span>
  );
}

function sellersChangeText(item: Item): string | undefined {
  const trend = sellerTrend(item.sellers, item.sellersStart);
  if (trend === 'saliendo') return `bajó desde ${item.sellersStart} en 7 días: la competencia se está yendo`;
  if (trend === 'entrando') return `subió desde ${item.sellersStart} en 7 días: están entrando competidores`;
  if (trend === 'estable') return 'sin cambios en los últimos 7 días';
  if (item.sellers != null && item.sellersAt) {
    return `sin capturas recientes: dato del ${new Date(item.sellersAt).toLocaleDateString('es-AR')}`;
  }
  return undefined;
}

export default function InsightsBoard({ loggedIn }: { loggedIn: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.details || d.error);
        setItems(d.items);
        setHistoricalCount(d.historicalCount ?? 0);
        setModelVersion(d.modelVersion ?? null);
        setUpdatedAt(d.latestCaptureAt ?? d.timestamp);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((d) => setWatched(new Set<string>(d.productIds || [])))
      .catch(() => {});
  }, [loggedIn]);

  const toggleWatch = async (productId: string) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) return;
    const { watching } = await res.json();
    setWatched((prev) => {
      const next = new Set(prev);
      if (watching) next.add(productId); else next.delete(productId);
      return next;
    });
  };

  const visible = useMemo(
    () => (items ?? []).filter((i) => !category || i.category === category),
    [items, category]
  );
  const active = useMemo(() => visible.filter((i) => i.active), [visible]);
  const inactive = useMemo(() => visible.filter((i) => !i.active), [visible]);
  const allActive = useMemo(() => (items ?? []).filter((i) => i.active), [items]);

  if (error) {
    return <div style={{ ...card, color: '#ef4444', marginTop: '2rem' }}>No se pudo cargar el tablero: {error}</div>;
  }
  if (!items) {
    return (
      <div style={{ ...card, marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Armando el tablero...
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <CategoryChips items={items} value={category} onChange={setCategory} />
      <Kpis items={active} inactiveCount={inactive.length} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
        <Opportunities items={active} onSelect={setSelected} />
        <OpportunityMap items={active} onSelect={setSelected} />
        <Categories items={allActive} value={category} onChange={setCategory} />
        <Movements items={active} onSelect={setSelected} loggedIn={loggedIn} />
        <Inactive items={inactive} onSelect={setSelected} historicalCount={historicalCount} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>
          Última captura: {updatedAt ? new Date(updatedAt).toLocaleString('es-AR', { hourCycle: 'h23' }) : '—'}.
          {modelVersion && <> Índice ML: modelo <code style={{ fontSize: '0.75rem' }}>{modelVersion}</code>.</>}
          {' '}Hacé clic en cualquier producto para ver su detalle.
        </span>
        <Link href="/dashboard" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
          Ver ranking completo en tabla →
        </Link>
      </div>

      {selected && (
        <ProductDrawer
          item={selected}
          loggedIn={loggedIn}
          watching={watched.has(selected.productId)}
          onToggleWatch={() => toggleWatch(selected.productId)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Filtro global por categoría ─────────────────────────────────────────────
function CategoryChips({ items, value, onChange }: { items: Item[]; value: string | null; onChange: (c: string | null) => void }) {
  const cats = [...new Set(items.map((i) => i.category))].sort();
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 0.85rem', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
    background: active ? 'rgba(255,230,0,0.12)' : 'rgba(255,255,255,0.04)',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
  });
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button style={chip(value === null)} onClick={() => onChange(null)}>Todas</button>
      {cats.map((c) => (
        <button key={c} style={chip(value === c)} onClick={() => onChange(value === c ? null : c)}>{c}</button>
      ))}
    </div>
  );
}

// ── KPIs ────────────────────────────────────────────────────────────────────
function Kpis({ items, inactiveCount }: { items: Item[]; inactiveCount: number }) {
  const count = (s: Signal) => items.filter((i) => i.signal === s).length;
  const rising = items.filter((i) => (i.delta72h ?? 0) >= 5).length;
  const kpis = [
    { label: 'Productos activos', value: items.length, color: '#a1a1aa' },
    { label: 'Oportunidades para entrar', value: count('entrar'), color: SIGNALS.entrar.color },
    { label: 'Subiendo (+5 pts en 72 h)', value: rising, color: '#60a5fa' },
    { label: 'Mercados saturados', value: count('saturado'), color: SIGNALS.saturado.color },
    { label: 'Dejaron de aparecer (7 días)', value: inactiveCount, color: SIGNALS.inactivo.color },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
      {kpis.map((k) => (
        <div key={k.label} style={{ ...card, padding: '0.9rem 1rem', borderLeft: `3px solid ${k.color}` }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{k.value}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>{subtitle}</p>
    </div>
  );
}

function SignalBadge({ signal }: { signal: Signal }) {
  const s = SIGNALS[signal];
  return (
    <span title={s.hint} style={{
      padding: '0.12rem 0.55rem', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
      color: s.color, background: `${s.color}1a`, border: `1px solid ${s.color}55`, cursor: 'help',
    }}>
      {s.label}
    </span>
  );
}

// La escala mínima evita que una variación de 2-3 puntos se vea como un derrumbe.
const SPARK_MIN_SPAN = 20;

function Sparkline({ values, color, width = 90, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>sin historial</span>;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, SPARK_MIN_SPAN);
  const min = Math.max(0, Math.min(lo - (span - (hi - lo)) / 2, 100 - span));
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ScoreChart({ values, color }: { values: number[]; color: string }) {
  const W = 400, H = 140, L = 28, R = 6, T = 8, B = 8;
  const x = (i: number) => L + (i / Math.max(1, values.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Evolución del score en escala de 0 a 100">
      {[0, 50, 70, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke={g === 70 ? 'rgba(0,166,80,0.35)' : 'rgba(255,255,255,0.07)'} strokeDasharray={g === 70 ? '4 3' : undefined} />
          <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize={10} fill="#a1a1aa">{g}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(0)} ${line} ${x(values.length - 1)},${y(0)}`} fill={color} fillOpacity={0.1} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Panel 1: oportunidades ahora ────────────────────────────────────────────
function Opportunities({ items, onSelect }: { items: Item[]; onSelect: (i: Item) => void }) {
  const enter = items.filter((i) => i.signal === 'entrar');
  const list = (enter.length ? enter : items.filter((i) => i.signal === 'vigilar')).slice(0, 5);
  return (
    <section style={card}>
      <PanelTitle
        title="Oportunidades ahora"
        subtitle={enter.length
          ? 'Productos con tendencia fuerte y poca competencia: los mejores candidatos para salir a vender.'
          : 'No hay productos que cumplan todos los criterios de entrada; se muestran los mejores para vigilar.'}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {list.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin productos para mostrar.</p>}
        {list.map((i) => (
          <button key={i.productId} onClick={() => onSelect(i)} style={{
            display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: '0.75rem', alignItems: 'center', textAlign: 'left',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12,
            padding: '0.6rem 0.75rem', cursor: 'pointer', color: '#fff', width: '100%',
          }}>
            <Thumb src={i.imageUrl} category={i.category} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{i.name}</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <SignalBadge signal={i.signal} />
                <span>{i.category}</span>
                <span>· <SellersInline item={i} /></span>
                <span style={{ color: deltaColor(i.delta72h) }}>· {fmtDelta(i.delta72h)} en 72 h</span>
                {i.signal === 'vigilar' && mlLevel(i.probability) === 'alto' && <span>· índice ML alto</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: SIGNALS[i.signal].color }}>{i.score.toLocaleString('es-AR')}</div>
              <Sparkline values={i.series} color={SIGNALS[i.signal].color} width={70} height={22} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_HUES = ['#60a5fa', '#a78bfa', '#f59e0b', '#ec4899', '#10b981', '#6ee7b7', '#f87171'];

function categoryColor(category: string) {
  let h = 0;
  for (let k = 0; k < category.length; k++) h = (h * 31 + category.charCodeAt(k)) | 0;
  return CATEGORY_HUES[Math.abs(h) % CATEGORY_HUES.length];
}

function Thumb({ src, category }: { src: string | null; category: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={44} height={44} style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff', borderRadius: 8 }} />;
  }
  const c = categoryColor(category);
  return (
    <div title={category} style={{
      width: 44, height: 44, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${c}1f`, border: `1px solid ${c}55`, color: c, fontWeight: 800, fontSize: '1.05rem',
    }}>
      {category.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Panel 2: mapa de oportunidad (score vs. competencia) ────────────────────
function OpportunityMap({ items, onSelect }: { items: Item[]; onSelect: (i: Item) => void }) {
  const [hover, setHover] = useState<Item | null>(null);
  const W = 520, H = 300, L = 40, R = 12, T = 30, B = 44;
  const withSellers = items.filter((i) => i.sellers != null);
  const x = (score: number) => L + (score / 100) * (W - L - R);
  const y = (sellers: number) => T + ((5 - Math.min(5, Math.max(1, sellers))) / 4) * (H - T - B);
  const zoneTop = y(3) - 12;
  const zoneBottom = y(1) + 12;
  const jitter = (id: string) => {
    let h = 0;
    for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
    return ((h % 100) / 100) * 6;
  };

  return (
    <section style={card}>
      <PanelTitle
        title="Mapa de oportunidad"
        subtitle="Cada punto es un producto: cuanto más a la derecha, más fuerte la tendencia; cuanto más abajo, menos vendedores compiten."
      />
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Score de tendencia contra cantidad de vendedores">
          <rect x={x(70)} y={zoneTop} width={x(100) - x(70)} height={zoneBottom - zoneTop} fill="rgba(0,166,80,0.1)" stroke="rgba(0,166,80,0.35)" strokeDasharray="4 3" rx={6} />
          <text x={(x(70) + x(100)) / 2} y={zoneTop - 6} textAnchor="middle" fontSize={10} fill="#00a650" fontWeight={700}>ZONA DE OPORTUNIDAD</text>
          {[0, 25, 50, 75, 100].map((s) => (
            <g key={s}>
              <line x1={x(s)} x2={x(s)} y1={T - 12} y2={H - B + 12} stroke="rgba(255,255,255,0.06)" />
              <text x={x(s)} y={H - B + 26} textAnchor="middle" fontSize={10} fill="#a1a1aa">{s}</text>
            </g>
          ))}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={L - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#a1a1aa">{v === 5 ? '5+' : v}</text>
            </g>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#a1a1aa">Score de tendencia →</text>
          <text x={10} y={(T + H - B) / 2} textAnchor="middle" fontSize={10} fill="#a1a1aa" transform={`rotate(-90 10 ${(T + H - B) / 2})`}>Vendedores →</text>
          {withSellers.map((i) => (
            <circle
              key={i.productId}
              cx={x(i.score)}
              cy={y(i.sellers!) - 3 + jitter(i.productId)}
              r={hover?.productId === i.productId ? 7 : 5}
              fill={SIGNALS[i.signal].color}
              fillOpacity={0.8}
              stroke="#121214"
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(i)}
            />
          ))}
        </svg>
        {hover && (
          <div style={{
            position: 'absolute', top: 8, left: 48, maxWidth: 260, pointerEvents: 'none',
            background: '#1e1e24', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
            padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#fff', boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ fontWeight: 600 }}>{short(hover.name, 70)}</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
              Score {hover.score.toLocaleString('es-AR')} · {fmtSellers(hover.sellers)} · {SIGNALS[hover.signal].label}
            </div>
          </div>
        )}
      </div>
      <Legend />
      {items.length > withSellers.length && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0' }}>
          {items.length - withSellers.length} productos sin dato de vendedores no se muestran en el mapa.
        </p>
      )}
    </section>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
      {MAP_SIGNALS.map((s) => (
        <span key={s} title={SIGNALS[s].hint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'help' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: SIGNALS[s].color }} />
          {SIGNALS[s].label}
        </span>
      ))}
    </div>
  );
}

// ── Panel 3: categorías ─────────────────────────────────────────────────────
function Categories({ items, value, onChange }: { items: Item[]; value: string | null; onChange: (c: string | null) => void }) {
  const rows = useMemo(() => {
    const by = new Map<string, Item[]>();
    for (const i of items) by.set(i.category, [...(by.get(i.category) ?? []), i]);
    return [...by.entries()]
      .map(([cat, list]) => ({
        cat,
        total: list.length,
        avg: Math.round((list.reduce((a, i) => a + i.score, 0) / list.length) * 10) / 10,
        enter: list.filter((i) => i.signal === 'entrar').length,
        watch: list.filter((i) => i.signal === 'vigilar').length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [items]);

  return (
    <section style={card}>
      <PanelTitle title="Categorías" subtitle="Score promedio por categoría y cuántas oportunidades tiene cada una. Hacé clic para filtrar todo el tablero." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {rows.map((r) => {
          const active = value === r.cat;
          return (
            <button key={r.cat} onClick={() => onChange(active ? null : r.cat)} style={{
              background: active ? 'rgba(255,230,0,0.08)' : 'transparent', border: `1px solid ${active ? 'rgba(255,230,0,0.4)' : 'transparent'}`,
              borderRadius: 10, padding: '0.4rem 0.5rem', cursor: 'pointer', textAlign: 'left', color: '#fff', width: '100%',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5, gap: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>{r.cat}</span>
                <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <b style={{ color: SIGNALS.entrar.color }}>{r.enter}</b> entrar · <b style={{ color: SIGNALS.vigilar.color }}>{r.watch}</b> vigilar · {r.total} prod.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${r.avg}%`, height: '100%', background: 'linear-gradient(90deg, #ffe60088, #ffe600)', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{r.avg.toLocaleString('es-AR')}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Panel 4: movimientos ────────────────────────────────────────────────────
function Movements({ items, onSelect, loggedIn }: { items: Item[]; onSelect: (i: Item) => void; loggedIn: boolean }) {
  const withDelta = items.filter((i) => i.delta72h != null && i.delta72h !== 0);
  const up = [...withDelta].filter((i) => i.delta72h! > 0).sort((a, b) => b.delta72h! - a.delta72h!).slice(0, 5);
  const down = [...withDelta].filter((i) => i.delta72h! < 0).sort((a, b) => a.delta72h! - b.delta72h!).slice(0, 5);

  const list = (title: string, rows: Item[]) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{title}</div>
      {rows.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Sin movimientos.</p>}
      {rows.map((i) => (
        <button key={i.productId} onClick={() => onSelect(i)} style={{
          display: 'flex', justifyContent: 'space-between', gap: '0.5rem', width: '100%', padding: '0.35rem 0',
          background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: deltaColor(i.delta72h), whiteSpace: 'nowrap' }}>{fmtDelta(i.delta72h)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <section style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <PanelTitle title="Movimientos de las últimas 72 h" subtitle="Productos cuyo score más subió y más cayó: dónde se está moviendo el mercado ahora." />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '1rem',
        filter: loggedIn ? 'none' : 'blur(5px)', pointerEvents: loggedIn ? 'auto' : 'none', userSelect: loggedIn ? 'auto' : 'none',
      }}>
        {list('▲ Más subieron', up)}
        {list('▼ Más cayeron', down)}
      </div>
      {!loggedIn && <LockOverlay text="Los movimientos del mercado están disponibles con cuenta gratuita." />}
    </section>
  );
}

// ── Panel 5: productos que dejaron de aparecer ──────────────────────────────
function Inactive({ items, onSelect, historicalCount }: { items: Item[]; onSelect: (i: Item) => void; historicalCount: number }) {
  const rows = [...items].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  return (
    <section style={{ ...card, gridColumn: '1 / -1' }}>
      <PanelTitle
        title="Dejaron de aparecer"
        subtitle="Productos que salieron de las búsquedas en los últimos 7 días. Su score es el último calculado y ya no se actualiza: puede indicar una tendencia que se apagó."
      />
      {rows.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Ningún producto dejó de aparecer en los últimos 7 días.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '0.5rem' }}>
        {rows.map((i) => (
          <button key={i.productId} onClick={() => onSelect(i)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', textAlign: 'left',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 10,
            padding: '0.55rem 0.75rem', cursor: 'pointer', color: '#fff', width: '100%', minWidth: 0,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {i.category} · última aparición {fmtDate(i.lastSeen)}
              </div>
            </div>
            <span title="Último score calculado" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {i.score.toLocaleString('es-AR')}
            </span>
          </button>
        ))}
      </div>
      {historicalCount > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0' }}>
          Otros {historicalCount} productos dejaron de aparecer hace más de 7 días y no se muestran en el tablero (siguen en la vista de tabla).
        </p>
      )}
    </section>
  );
}

function LockOverlay({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '0.6rem', background: 'rgba(18,18,20,0.45)', textAlign: 'center', padding: '1rem',
    }}>
      <span style={{ fontSize: '1.4rem' }}>🔒</span>
      <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, maxWidth: 280 }}>{text}</span>
      <Link href="/register" style={{
        padding: '0.45rem 1.1rem', background: 'var(--accent-primary)', color: '#000', borderRadius: 9999,
        fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
      }}>
        Crear cuenta
      </Link>
    </div>
  );
}

// ── Detalle de producto (drawer lateral) ────────────────────────────────────
function ProductDrawer({ item, loggedIn, watching, onToggleWatch, onClose }: {
  item: Item; loggedIn: boolean; watching: boolean; onToggleWatch: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const color = SIGNALS[item.signal].color;
  const stat = (label: string, value: React.ReactNode, note?: string) => (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.6rem 0.75rem' }}>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</div>
      {note && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.75, marginTop: 2 }}>{note}</div>}
    </div>
  );
  const sellersNote = sellersChangeText(item);
  const trend = sellerTrend(item.sellers, item.sellersStart);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <aside onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle del producto" style={{
        width: 'min(100%, 440px)', height: '100%', overflowY: 'auto', background: '#18181c',
        borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SignalBadge signal={item.signal} />
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', marginTop: '0.9rem' }}>
          <Thumb src={item.imageUrl} category={item.category} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', lineHeight: 1.3 }}>{item.name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{item.category}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
          {stat('Score de tendencia', <span style={{ color }}>{item.score.toLocaleString('es-AR')}</span>)}
          {stat('Cambio en 72 h', <span style={{ color: deltaColor(item.delta72h) }}>{fmtDelta(item.delta72h)}</span>)}
          {stat(
            'Índice ML de subida (0-100)',
            item.probability != null ? `${Math.round(item.probability * 100)} · ${mlLevel(item.probability)}` : '—',
            'prioridad relativa, no es una probabilidad',
          )}
          {stat(
            'Vendedores en la última captura',
            <span>
              {fmtSellers(item.sellers)}
              {trend && trend !== 'estable' && (
                <span style={{ color: SELLER_TREND_STYLE[trend].color, marginLeft: 4 }}>{SELLER_TREND_STYLE[trend].arrow}</span>
              )}
            </span>,
            sellersNote,
          )}
          {stat('Precio actual', fmtPrice(item.price))}
          {stat('Mediciones en la serie', item.series.length)}
        </div>

        {!item.active && (
          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 10, fontSize: '0.75rem', lineHeight: 1.45,
            background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.4)', color: '#cbd5e1',
          }}>
            Dejó de aparecer en las búsquedas el {fmtDate(item.lastSeen)}. Los datos son del último cálculo
            ({fmtDate(item.computedAt)}) y ya no se actualizan.
          </div>
        )}

        {item.active && item.probability != null && item.score >= 70 && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.6rem 0 0' }}>
            El índice ML prioriza productos cuyo score puede subir al menos 5 puntos más en la próxima captura.
            En un producto que ya está arriba un índice bajo es esperable: indica que la tendencia ya está
            madura, no que sea mala.
          </p>
        )}

        <h4 style={{ fontSize: '0.8rem', color: '#fff', margin: '1.25rem 0 0.5rem' }}>Evolución reciente del score</h4>
        {loggedIn ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.6rem' }}>
            {item.series.length >= 2
              ? <ScoreChart values={item.series} color={color} />
              : <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Todavía no hay suficientes mediciones.</span>}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {`Últimas ${item.series.length} mediciones (3 por día). La línea punteada marca el umbral de 70 para "Entrar ya".`}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            🔒 <Link href="/register" style={{ color: 'var(--accent-primary)' }}>Creá una cuenta gratis</Link> para ver la evolución.
          </p>
        )}

        <h4 style={{ fontSize: '0.8rem', color: '#fff', margin: '1.25rem 0 0.5rem' }}>Por qué tiene este score</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {COMPONENTS.map((c) => {
            const v = item.components[c.key];
            return (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                  <span>{c.label}</span>
                  <span>{v == null ? '—' : `${Math.round(v * 100)}%`}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(v ?? 0) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {item.permalink && (
            <a href={item.permalink} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, textAlign: 'center', padding: '0.55rem', borderRadius: 10, background: 'var(--accent-primary)',
              color: '#000', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
            }}>
              Ver en Mercado Libre
            </a>
          )}
          <button
            onClick={onToggleWatch}
            disabled={!loggedIn}
            title={loggedIn ? undefined : 'Iniciá sesión para seguir productos'}
            style={{
              flex: 1, padding: '0.55rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
              cursor: loggedIn ? 'pointer' : 'not-allowed', opacity: loggedIn ? 1 : 0.5,
              background: watching ? 'rgba(255,230,0,0.12)' : 'rgba(255,255,255,0.06)',
              color: watching ? 'var(--accent-primary)' : '#fff', border: '1px solid var(--glass-border)',
            }}
          >
            {watching ? '🔔 Siguiendo' : '🔕 Seguir y recibir alertas'}
          </button>
        </div>
      </aside>
    </div>
  );
}
