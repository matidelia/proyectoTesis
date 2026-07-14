require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCatalogSearchFlow() {
  try {
    const token = await prisma.oAuthToken.findUnique({
      where: { id: 'mercado_libre' }
    });

    const accessToken = token ? token.accessToken : null;
    if (!accessToken) {
      console.log('No access token found in database.');
      return;
    }

    const query = 'iphone';
    console.log(`Searching catalog for: "${query}"...`);
    const searchUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    const searchData = await searchRes.json();
    if (!searchRes.ok) {
      console.error('Catalog Search Error:', searchRes.status, searchData);
      return;
    }

    const results = searchData.results || [];
    console.log(`Success! Found ${results.length} catalog products.`);

    if (results.length === 0) {
      console.log('No catalog products found for this query.');
      return;
    }

    for (const product of results) {
      console.log(`\nAnalyzing product:`);
      console.log(`- ID: ${product.id}`);
      console.log(`- Name: ${product.name}`);

      console.log(`Fetching real seller publications for catalog product ${product.id}...`);
      const itemsUrl = `https://api.mercadolibre.com/products/${product.id}/items?limit=5`;
      const itemsRes = await fetch(itemsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });

      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) {
        console.log(`   ↷ No active listings for this product: ${itemsData.message || 'unknown'}`);
        continue;
      }

      const listings = itemsData.results || [];
      if (listings.length === 0) {
        console.log(`   ↷ No listings found in results.`);
        continue;
      }

      console.log(`\n🎉 Success! Found ${listings.length} active listings for "${product.name}":\n`);

      listings.forEach((item, idx) => {
        console.log(`${idx + 1}. Item ID: ${item.item_id}`);
        console.log(`   Price: $${item.price} ${item.currency_id}`);
        console.log(`   Seller ID: ${item.seller_id}`);
        console.log(`   Link: https://articulo.mercadolibre.com.ar/${item.item_id.replace('MLA', 'MLA-')}`);
        console.log(`   --------------------------------------------------`);
      });
      break; // Exit after displaying the first product that actually has listings
    }

  } catch (e) {
    console.error('Error during catalog search flow:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testCatalogSearchFlow();
