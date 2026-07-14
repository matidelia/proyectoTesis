require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseHygiene() {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { startsWith: 'MLA' } },
          { name: { startsWith: 'MLAU' } }
        ]
      },
      include: {
        _count: {
          select: { priceHistory: true }
        }
      }
    });

    console.log(`=== Diagnóstico de Higiene de Base de Datos ===`);
    console.log(`Total de productos sin nombre descriptivo (con ID en el nombre): ${products.length}`);
    
    let withHistory = 0;
    let zeroHistory = 0;

    products.forEach(p => {
      if (p._count.priceHistory > 0) {
        withHistory++;
        console.log(`- [CON HISTORIAL] ID: ${p.mlId}, Historial: ${p._count.priceHistory} puntos, Creado: ${p.lastSeen}`);
      } else {
        zeroHistory++;
      }
    });

    console.log(`\nResumen:`);
    console.log(`- Productos sin historial de precios (basura histórica): ${zeroHistory}`);
    console.log(`- Productos con historial de precios: ${withHistory}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseHygiene();
