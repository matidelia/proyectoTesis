require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupStaleTestData() {
  try {
    // Buscar productos cuyo nombre comience con "MLA" o "MLAU" (IDs genéricos de pruebas antiguas)
    const productsToDelete = await prisma.product.findMany({
      where: {
        OR: [
          { name: { startsWith: 'MLA' } },
          { name: { startsWith: 'MLAU' } }
        ]
      }
    });

    console.log(`Iniciando limpieza: se encontraron ${productsToDelete.length} productos obsoletos de pruebas iniciales.`);

    if (productsToDelete.length === 0) {
      console.log('La base de datos ya está limpia de registros genéricos.');
      return;
    }

    // Eliminamos los productos (debido a onDelete: Cascade en el esquema de Prisma, 
    // sus respectivos PriceHistory obsoletos se eliminarán en cascada de forma automática e íntegra).
    for (const p of productsToDelete) {
      await prisma.product.delete({
        where: { id: p.id }
      });
      console.log(`✓ Eliminado registro de prueba obsoleto: ${p.mlId}`);
    }

    console.log('\n🎉 ¡Depuración completada! La base de datos está 100% limpia y profesional.');

  } catch (e) {
    console.error('Error durante la depuración de datos:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupStaleTestData();
