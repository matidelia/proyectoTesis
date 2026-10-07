import { describe, it, expect, vi, beforeEach } from 'vitest';

// `next/headers` solo funciona dentro del runtime de un Server
// Component/Route Handler; se mockea un store de cookies en memoria para
// poder probar createSession/getSession/clearSession de forma aislada.
const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { value } : undefined;
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

describe('sesiones (src/lib/auth.ts)', () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.resetModules();
    process.env.SESSION_SECRET = 'test-secret-no-usar-en-produccion-1234567890';
  });

  it('crea una sesion y la misma puede leerse de vuelta con los mismos datos', async () => {
    const { createSession, getSession } = await import('@/lib/auth');

    await createSession({ userId: 'u1', email: 'matias@example.com', role: 'customer' });
    const session = await getSession();

    expect(session).toMatchObject({
      userId: 'u1',
      email: 'matias@example.com',
      role: 'customer',
    });
  });

  it('devuelve null si no hay ninguna cookie de sesion', async () => {
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });

  it('devuelve null si SESSION_SECRET no esta configurado (en vez de lanzar)', async () => {
    delete process.env.SESSION_SECRET;
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });

  it('createSession falla explicitamente si falta SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    const { createSession } = await import('@/lib/auth');
    await expect(
      createSession({ userId: 'u1', email: 'a@b.com', role: 'customer' })
    ).rejects.toThrow('SESSION_SECRET');
  });

  it('clearSession borra la cookie de sesion', async () => {
    const { createSession, getSession, clearSession } = await import('@/lib/auth');

    await createSession({ userId: 'u1', email: 'matias@example.com', role: 'admin' });
    expect(await getSession()).not.toBeNull();

    await clearSession();
    expect(await getSession()).toBeNull();
  });

  it('getSession devuelve null ante un token firmado con otro secret (manipulado)', async () => {
    const { createSession } = await import('@/lib/auth');
    await createSession({ userId: 'u1', email: 'matias@example.com', role: 'customer' });

    // Simula que la cookie fue alterada / firmada con otra clave.
    cookieStore.set('session', 'token-invalido-o-manipulado');

    vi.resetModules();
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });
});
