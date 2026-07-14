/**
 * BACKUP LOCAL DE LA BASE DE DATOS (RNF04)
 * ========================================
 * Exporta todas las tablas de Supabase a un JSON local con timestamp.
 * Cumple el RNF04 de la tesis ("los datos históricos deben persistirse
 * con respaldo periódico") y protege el dataset ante pausas/pérdidas
 * del proyecto Supabase (plan gratuito).
 *
 * Uso:      node scripts/backup_db.js
 * Salida:   backups/db/backup_YYYY-MM-DD_HHmm.json
 * Retención: conserva los últimos 30 backups, borra los más viejos.
 *
 * Se ejecuta automáticamente al final de cada corrida programada
 * (ver run_mining_task.bat).
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'db');
const KEEP_LAST = 30;

// BigInt (sellerId) no es serializable por JSON.stringify: se convierte a string
const replacer = (_key, value) => (typeof value === 'bigint' ? value.toString() : value);

async function main() {
  console.log('\n💾 BACKUP DE BASE DE DATOS (RNF04)');
  console.log('──────────────────────────────────');

  const [categories, products, priceHistory, trendSnapshots, trendScores, endpointHealth, searchHistory, oauthTokens] =
    await Promise.all([
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.priceHistory.findMany(),
      prisma.trendSnapshot.findMany(),
      prisma.trendScore.findMany(),
      prisma.endpointHealthLog.findMany(),
      prisma.searchHistory.findMany(),
      prisma.oAuthToken.findMany(),
    ]);

  const dump = {
    meta: {
      createdAt: new Date().toISOString(),
      counts: {
        categories: categories.length,
        products: products.length,
        priceHistory: priceHistory.length,
        trendSnapshots: trendSnapshots.length,
        trendScores: trendScores.length,
        endpointHealth: endpointHealth.length,
        searchHistory: searchHistory.length,
        oauthTokens: oauthTokens.length,
      },
    },
    categories,
    products,
    priceHistory,
    trendSnapshots,
    trendScores,
    endpointHealth,
    searchHistory,
    oauthTokens,
  };

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const file = path.join(BACKUP_DIR, `backup_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(dump, replacer, 1));

  const sizeKb = Math.round(fs.statSync(file).size / 1024);
  console.log(`✓ Backup guardado: ${file} (${sizeKb} KB)`);
  console.log('  Registros:', JSON.stringify(dump.meta.counts));

  // Retención: borrar backups viejos
  const all = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort();
  const toDelete = all.slice(0, Math.max(0, all.length - KEEP_LAST));
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`  🗑 Backup viejo eliminado: ${f}`);
  }

  console.log();
}

main()
  .catch(e => console.error('❌ Error en backup:', e.message))
  .finally(() => prisma.$disconnect());
