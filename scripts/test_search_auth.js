async function testSearch() {
    const url = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1648&limit=5';
    
    console.log('1. Probando búsqueda SIN TOKEN...');
    const resNoAuth = await fetch(url);
    console.log('Resultado:', resNoAuth.status, resNoAuth.statusText);

    require('dotenv').config({ path: '.env.local' });
    const appId = process.env.ML_APP_ID;
    const clientSecret = process.env.ML_CLIENT_SECRET;

    console.log('\n2. Probando búsqueda con CLIENT_CREDENTIALS...');
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: appId,
            client_secret: clientSecret
        })
    });
    const tokenData = await tokenRes.json();
    const appToken = tokenData.access_token;

    const resAppAuth = await fetch(url, {
        headers: { 'Authorization': `Bearer ${appToken}` }
    });
    console.log('Resultado:', resAppAuth.status, resAppAuth.statusText);
    if (!resAppAuth.ok) {
        const err = await resAppAuth.json();
        console.log('Detalle error:', JSON.stringify(err));
    }
}

testSearch();
