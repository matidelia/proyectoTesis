'use client';

import React, { useEffect, useState } from 'react';
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '@/lib/push';

type State = 'cargando' | 'sin-soporte' | 'ios-sin-instalar' | 'bloqueado' | 'apagado' | 'activo';

async function registration() {
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
}

export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('cargando');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState(isIOS && !standalone ? 'ios-sin-instalar' : 'sin-soporte');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('bloqueado');
        return;
      }
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'activo' : 'apagado');
    })().catch(() => setState('sin-soporte'));
  }, []);

  const activar = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'bloqueado' : 'apagado');
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('No se pudo guardar la suscripción.');
      setState('activo');
    } catch (e) {
      // Si el navegador no puede conectarse a su servicio de push (Brave con los
      // servicios push de Google desactivados, modo incógnito, un antivirus o la
      // red), subscribe() falla con AbortError y un mensaje técnico en inglés.
      setError(e instanceof DOMException && e.name === 'AbortError'
        ? 'Este navegador no pudo conectarse a su servicio de notificaciones. Probá con Chrome o Edge fuera del modo incógnito; en Brave, activá "Usar los servicios de Google para mensajería push" en la configuración de privacidad.'
        : e instanceof Error ? e.message : 'No se pudieron activar las notificaciones.');
    } finally {
      setBusy(false);
    }
  };

  const desactivar = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('apagado');
    } finally {
      setBusy(false);
    }
  };

  const message: Record<State, string> = {
    cargando: 'Verificando notificaciones…',
    'sin-soporte': 'Este navegador no admite notificaciones push.',
    'ios-sin-instalar': 'En iPhone, agregá Tendar a la pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí para activar las notificaciones.',
    bloqueado: 'Bloqueaste las notificaciones para este sitio. Habilitalas desde el candado de la barra de direcciones y recargá la página.',
    apagado: 'Recibí un aviso en este dispositivo cuando un producto que seguís empiece a crecer, aunque no tengas la página abierta.',
    activo: 'Notificaciones activadas en este dispositivo: te avisamos cuando un producto que seguís empiece a crecer.',
  };

  const canToggle = state === 'apagado' || state === 'activo';
  const on = state === 'activo';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      background: compact ? 'transparent' : 'var(--glass-bg)',
      border: compact ? 'none' : '1px solid var(--glass-border)',
      borderRadius: 12, padding: compact ? 0 : '0.9rem 1.1rem',
    }}>
      <span style={{ fontSize: compact ? '0.72rem' : '0.85rem', color: 'var(--text-secondary)', flex: '1 1 220px' }}>
        {message[state]}
        {error && <span style={{ color: '#ef4444', display: 'block' }}>{error}</span>}
      </span>
      {canToggle && (
        <button
          onClick={on ? desactivar : activar}
          disabled={busy}
          style={{
            padding: compact ? '0.35rem 0.8rem' : '0.45rem 1rem', borderRadius: 9999, fontWeight: 700,
            fontSize: compact ? '0.75rem' : '0.8rem', cursor: busy ? 'wait' : 'pointer',
            background: on ? 'rgba(255,255,255,0.06)' : 'var(--accent-primary)',
            color: on ? 'var(--text-secondary)' : '#000',
            border: on ? '1px solid var(--glass-border)' : 'none',
          }}
        >
          {busy ? '…' : on ? 'Desactivar notificaciones' : '🔔 Activar notificaciones'}
        </button>
      )}
    </div>
  );
}
