/**
 * EXPORTACION DE DATASET PARA EL MODELO SUPERVISADO (Seccion "Modelo de ML")
 * ==============================================================================
 * Solo lectura: no modifica la base. Recorre los TrendScore de cada producto en
 * orden cronologico y arma, por cada par consecutivo (t, t+1), un ejemplo:
 *   - features de la ventana t: los componentes ya calculados por
 *     compute_trend_scores.js y su variacion contra la ventana t-1. Todas se
 *     conocen en el instante t (no usan informacion posterior).
 *   - label: 1 si el score sube >= 5 puntos de t a t+1 (mismo umbral que la
 *     alerta HU02), 0 en caso contrario.
 *   - computedAt / nextComputedAt: instante de las features y de la etiqueta,
 *     para que el split temporal pueda purgar filas cuya etiqueta cae del otro
 *     lado del corte.
 *
 * Uso: node scripts/export_ml_training_data.js --hasta=2026-10-09T10:20:00Z > ml/data/dataset.json
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LABEL_THRESHOLD = 5;

// Version de la formula del score: los pesos vigentes se persisten en cada
// calculo (components.weights). Un par cuyos dos scores usan formulas
// distintas no mide un cambio del mercado sino un cambio de metodologia.
function formulaKey(components) {
  const w = components?.weights;
  return w ? Object.keys(w).sort().map((k) => `${k}=${w[k]}`).join(',') : 'sin_pesos';
}

function delta(curr, prev, key) {
  if (!prev || curr[key] == null || prev[key] == null) return 0;
  return curr[key] - prev[key];
}

// --hasta=<ISO>: solo scores calculados hasta ese instante (corte del informe).
function cutoffArg() {
  const a = process.argv.find((x) => x.startsWith('--hasta='));
  return a ? new Date(a.slice('--hasta='.length)) : null;
}

// Horas entre el score y la ultima aparicion real del producto hasta ese
// momento: el score se sigue calculando hasta 7 dias despues de que el
// producto deja de aparecer, y esas filas no representan un producto activo.
function hoursSinceSeen(snapshotTimes, at) {
  let last = null;
  for (const t of snapshotTimes) {
    if (t <= at) last = t;
    else break;
  }
  return last == null ? null : (at - last) / 3600_000;
}

async function main() {
  const hasta = cutoffArg();
  const products = await prisma.product.findMany({
    include: {
      category: true,
      trendScores: {
        where: hasta ? { computedAt: { lte: hasta } } : undefined,
        orderBy: { computedAt: 'asc' },
      },
      trendSnapshots: { select: { capturedAt: true }, orderBy: { capturedAt: 'asc' } },
    },
  });

  const rows = [];

  for (const p of products) {
    const scores = p.trendScores;
    if (scores.length < 2) continue;
    const seen = p.trendSnapshots.map((s) => s.capturedAt.getTime());

    for (let i = 0; i < scores.length - 1; i++) {
      const curr = scores[i];
      const next = scores[i + 1];
      const prev = i > 0 ? scores[i - 1] : null;

      const c = curr.components || {};
      const pv = prev ? (prev.components || {}) : null;

      rows.push({
        horas_desde_aparicion: hoursSinceSeen(seen, curr.computedAt.getTime()),
        productId: p.id,
        catalogProductId: p.catalogProductId,
        categoria: p.category?.name || 'Sin categoria',
        computedAt: curr.computedAt,
        nextComputedAt: next.computedAt,
        score: curr.score,
        score_siguiente: next.score,
        delta_score_prev: prev ? curr.score - prev.score : 0,
        frecuencia: c.frecuencia ?? null,
        permanencia: c.permanencia ?? null,
        ranking: c.ranking ?? null,
        estabilidad: c.estabilidad ?? null,
        saturacion: c.saturacion ?? null,
        vendedores_promedio: c.avgSellerCount ?? null,
        delta_frecuencia: delta(c, pv, 'frecuencia'),
        delta_permanencia: delta(c, pv, 'permanencia'),
        delta_ranking: delta(c, pv, 'ranking'),
        delta_estabilidad: delta(c, pv, 'estabilidad'),
        formula: formulaKey(c),
        formula_siguiente: formulaKey(next.components),
        label: (next.score - curr.score) >= LABEL_THRESHOLD ? 1 : 0,
      });
    }
  }

  console.log(JSON.stringify(rows));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
