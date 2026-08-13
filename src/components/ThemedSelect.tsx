'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  minWidth?: number | string;
  maxWidth?: number | string;
}

// Reemplaza al <select> nativo: algunos navegadores (Chromium en Windows,
// sobre todo) no respetan `color-scheme: dark` en el popup de opciones y
// muestran texto claro sobre fondo claro del sistema, invisible salvo la
// fila resaltada. Este componente dibuja su propia lista, así el estilo
// oscuro se ve garantizado en cualquier navegador.
export default function ThemedSelect({ value, onChange, options, minWidth = 180, maxWidth }: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth, maxWidth }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '0.4rem 0.75rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : 'Seleccionar…'}
        </span>
        <span style={{ opacity: 0.6, fontSize: '0.65rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          minWidth: '100%',
          background: '#1a1a1f',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          maxHeight: 300,
          overflowY: 'auto',
          zIndex: 200,
          boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: isSelected ? '#00a650' : '#fff',
                  background: isSelected ? 'rgba(0,166,80,0.12)' : 'transparent',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
