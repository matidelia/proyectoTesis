/**
 * Guarda en MLPrediction las predicciones generadas por ml/predict.py
 * (ml/predictions.json). Se corre despues de export_latest_features.js +
 * predict.py. El API siempre lee la prediccion mas reciente por producto,
 * igual que ya hace con TrendScore, asi que alcanza con insertar filas
 * nuevas en cada corrida.
 *
 * Uso: node scripts/import_ml_predictions.js
 */
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '..', 'ml', 'predictions.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ No existe ml/predictions.json. Corré antes: python ml/predict.py');
    process.exit(1);
  }

  const predictions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(predictions) || predictions.length === 0) {
    console.log('Sin predicciones para importar.');
    return;
  }

  let saved = 0;
  for (const p of predictions) {
    await prisma.mLPrediction.create({
      data: {
        productId: p.productId,
        probability: p.probability,
        modelVersion: p.modelVersion,
      },
    });
    saved++;
  }

  console.log(`✅ ${saved} predicciones guardadas (modelo ${predictions[0].modelVersion}).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
