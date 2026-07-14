require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enrichNames() {
  try {
    // 1. Obtener Token
    const tokenRecord = await prisma.oAuthToken.findUnique({ where: { id: 'mercado_libre' } });
    let accessToken = tokenRecord?.accessToken;

    if (!accessToken) {
      console.log('No user token found, trying client credentials...');
      const authRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.ML_APP_ID || '',
          client_secret: process.env.ML_CLIENT_SECRET || ''
        })
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        accessToken = authData.access_token;
      }
    }

    if (!accessToken) {
      console.error('No se pudo obtener token de acceso.');
      return;
    }

    console.log('Token de Mercado Libre listo.');

    // 2. Buscar productos que tengan el ID como nombre (comienzan con 'MLA' y no tienen un nombre amigable)
    const productsToEnrich = await prisma.product.findMany({
      where: {
        OR: [
          { name: { startsWith: 'MLA' } },
          { name: { startsWith: 'MLAU' } }
        ]
      }
    });

    console.log(`Encontrados ${productsToEnrich.length} productos históricos en Supabase con nombre genérico (ID).`);

    if (productsToEnrich.length === 0) {
      console.log('No hay productos que requieran enriquecimiento de nombre.');
      return;
    }

    console.log('Iniciando enriquecimiento en lote con delay humano de seguridad...');

    // 3. Recorrer y actualizar con delay para evitar límites
    for (const [idx, p] of productsToEnrich.entries()) {
      console.log(`[${idx + 1}/${productsToEnrich.length}] Procesando: ${p.mlId}...`);
      
      try {
        let name = p.name;
        
        // Primero probamos como Producto de Catálogo (/products/{id})
        const prodUrl = `https://api.mercadolibre.com/products/${p.mlId}`;
        const prodRes = await fetch(prodUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          }
        });

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData && (prodData.name || prodData.title)) {
            name = prodData.name || prodData.title;
          }
        } else {
          // Si falla, probamos como Publicación de Vendedor (/items/{id})
          const itemUrl = `https://api.mercadolibre.com/items/${p.mlId}`;
          const itemRes = await fetch(itemUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
          });
          if (itemRes.ok) {
            const itemData = await itemRes.json();
            if (itemData && itemData.title) {
              name = itemData.title;
            }
          }
        }

        // Si logramos resolver el nombre real, actualizamos en la DB
        if (name !== p.name && name !== p.mlId) {
          await prisma.product.update({
            where: { id: p.id },
            data: { name: name }
          });
          console.log(`   ✓ Actualizado: "${name}"`);
        } else {
          console.log(`   ↷ No se obtuvo nombre descriptivo.`);
        }

      } catch (err) {
        console.error(`   ❌ Error al procesar ${p.mlId}:`, err.message);
      }

      // Esperar 1.5s entre llamadas para cumplir directivas de seguridad de API
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('\n🎉 ¡Enriquecimiento de base de datos finalizado con éxito!');

  } catch (e) {
    console.error('Error crítico en el proceso:', e);
  } finally {
    await prisma.$disconnect();
  }
}

enrichNames();
