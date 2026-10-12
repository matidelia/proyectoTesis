import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parsePushSubscription, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '@/lib/push';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildAlertPayload } = require('../scripts/push.js');

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'tBHItJI5svbpez7KI4CCXg' },
};

describe('parsePushSubscription', () => {
  it('acepta una suscripción válida del navegador', () => {
    expect(parsePushSubscription(valid)).toEqual({
      endpoint: valid.endpoint, p256dh: valid.keys.p256dh, auth: valid.keys.auth,
    });
  });

  it('rechaza endpoints que no son https', () => {
    expect(parsePushSubscription({ ...valid, endpoint: 'http://ejemplo.com/push' })).toBeNull();
    expect(parsePushSubscription({ ...valid, endpoint: 'no es una url' })).toBeNull();
  });

  it('rechaza claves faltantes o demasiado largas', () => {
    expect(parsePushSubscription({ endpoint: valid.endpoint, keys: { p256dh: 'x' } })).toBeNull();
    expect(parsePushSubscription({ ...valid, keys: { p256dh: 'x'.repeat(300), auth: 'y' } })).toBeNull();
    expect(parsePushSubscription({ ...valid, endpoint: 'https://a.com/' + 'x'.repeat(3000) })).toBeNull();
  });

  it('rechaza cuerpos que no son objetos', () => {
    expect(parsePushSubscription(null)).toBeNull();
    expect(parsePushSubscription('texto')).toBeNull();
  });
});

describe('clave pública VAPID', () => {
  it('decodifica a una clave de curva elíptica sin comprimir (65 bytes, prefijo 0x04)', () => {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(key.length).toBe(65);
    expect(key[0]).toBe(4);
  });

  it('es la misma que usa el workflow que envía las notificaciones', () => {
    const yml = readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'mineria.yml'), 'utf-8');
    expect(yml).toContain(`VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}`);
  });
});

describe('buildAlertPayload', () => {
  it('arma el texto de la notificación con la subida del score', () => {
    const p = buildAlertPayload({
      productName: 'Aromatizador', score: 82.4, previousScore: 74, scoreDelta: 8.4, trendScoreId: 'ts1',
    });
    expect(p.title).toBe('📈 Aromatizador está creciendo');
    expect(p.body).toContain('de 74 a 82.4 (+8.4)');
    expect(p.url).toBe('/alerts');
    expect(p.tag).toBe('alerta-ts1');
  });

  it('acorta nombres muy largos', () => {
    const p = buildAlertPayload({ productName: 'x'.repeat(200), score: 1, previousScore: 0, scoreDelta: 1 });
    expect(p.title.length).toBeLessThan(100);
    expect(p.tag).toBeUndefined();
  });
});
