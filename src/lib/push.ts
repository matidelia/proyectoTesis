// Clave pública VAPID: identifica a este servidor ante el servicio de push del
// navegador. No es secreta (viaja al cliente); la privada solo la tiene el
// workflow que envía las notificaciones (secret VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC_KEY =
  'BFcx7cnMBB0pEWW1RiF-osCd5ZvvYVur95-bCNy1yvBcqZBjxlopowMR-nxnHSiQu1F5OLN6YT_X1zL9O-jEAuk';

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const MAX_ENDPOINT = 2048;
const MAX_KEY = 256;

// Valida la suscripción que manda el navegador antes de guardarla: solo se
// aceptan endpoints https y claves de tamaño acotado.
export function parsePushSubscription(body: unknown): StoredSubscription | null {
  if (!body || typeof body !== 'object') return null;
  const { endpoint, keys } = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof endpoint !== 'string' || endpoint.length > MAX_ENDPOINT) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (!p256dh || !auth || p256dh.length > MAX_KEY || auth.length > MAX_KEY) return null;
  return { endpoint, p256dh, auth };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
