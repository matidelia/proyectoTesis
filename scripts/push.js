/**
 * Envio de notificaciones push (Web Push) a los navegadores suscriptos de un
 * cliente. Lo usan generate_alerts.js (alertas reales) y send_test_push.js
 * (prueba manual). Requiere VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY; si faltan,
 * no envia nada y la alerta igual queda en /alerts.
 */
const webpush = require('web-push');

const APP_URL = 'https://proyectotesis-e4et.onrender.com';
const VAPID_SUBJECT = 'mailto:deliamati580@gmail.com';

let configured = null;
function configure() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
  return configured;
}

function buildAlertPayload({ productName, score, previousScore, scoreDelta, trendScoreId }) {
  const name = productName.length > 80 ? productName.slice(0, 79) + '…' : productName;
  return {
    title: `📈 ${name} está creciendo`,
    body: `Su score subió de ${previousScore} a ${score} (+${scoreDelta}). Tocá para ver el detalle.`,
    url: '/alerts',
    tag: trendScoreId ? `alerta-${trendScoreId}` : undefined,
  };
}

// Envia el payload a todas las suscripciones del usuario. Las que el servicio
// de push declara vencidas (404/410) se borran para no reintentarlas.
async function sendPushToUser(prisma, userId, payload) {
  if (!configure()) return { sent: 0, removed: 0, skipped: true };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 24 * 3600 }
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        removed++;
      } else {
        console.error(`  ⚠ Push fallido (${e.statusCode || 'sin codigo'}): ${e.body || e.message}`);
      }
    }
  }
  return { sent, removed, skipped: false };
}

module.exports = { buildAlertPayload, sendPushToUser, APP_URL };
