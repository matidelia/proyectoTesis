'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/account/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <button onClick={logout} style={{
      padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
      borderRadius: '9999px', fontSize: '0.8rem', border: '1px solid var(--glass-border)',
      fontWeight: 600, cursor: 'pointer',
    }}>
      Cerrar sesión
    </button>
  );
}
