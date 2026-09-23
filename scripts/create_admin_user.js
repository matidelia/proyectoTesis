/**
 * Crea (o actualiza la contraseña de) la cuenta de administrador que protege
 * /admin. Las cuentas admin no se autorregistran por la web a propósito.
 *
 * Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create_admin_user.js
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !email.includes('@')) {
    console.error('❌ Definí ADMIN_EMAIL (variable de entorno) con un email válido.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌ Definí ADMIN_PASSWORD (variable de entorno) con al menos 8 caracteres.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'admin' },
    create: { email, passwordHash, role: 'admin' },
  });

  console.log(`✅ Cuenta admin lista: ${user.email} (id ${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
