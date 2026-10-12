/**
 * Envia una notificacion push de prueba a todos los navegadores suscriptos
 * de una cuenta, para verificar que el circuito funciona de punta a punta.
 *
 * Uso: node scripts/send_test_push.js <email>
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const { PrismaClient } = require('@prisma/client');
const { sendPushToUser } = require('./push');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Uso: node scripts/send_test_push.js <email>');
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`No existe una cuenta con el email ${email}.`);
  const res = await sendPushToUser(prisma, user.id, {
    title: '🔔 Notificaciones de Tendar activadas',
    body: 'Así vas a ver el aviso cuando un producto que seguís empiece a crecer.',
    url: '/alerts',
  });
  if (res.skipped) throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.');
  console.log(`Enviadas: ${res.sent}. Suscripciones vencidas borradas: ${res.removed}.`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
