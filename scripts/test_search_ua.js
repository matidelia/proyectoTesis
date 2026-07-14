async function testSearchWithUA() {
    const url = 'https://api.mercadolibre.com/sites/MLA/search?q=iphone&limit=5';
    
    console.log('Probando búsqueda con User-Agent...');
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
    });
    
    console.log('Resultado:', res.status, res.statusText);
    if (res.ok) {
        const data = await res.json();
        console.log('✓ Éxito! Encontrados:', data.results?.length);
    } else {
        const err = await res.json();
        console.log('Detalle error:', JSON.stringify(err));
    }
}

testSearchWithUA();
