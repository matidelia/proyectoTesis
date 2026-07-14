async function testItemFetch() {
  const itemId = 'MLA1836144872'; // Un item ID real
  
  console.log('Testing item details anonymously with browser User-Agent...');
  const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });

  const data = await res.json();
  if (res.ok) {
    console.log('Success! Title:', data.title);
  } else {
    console.log('Error:', res.status, data);
  }

  console.log('\nTesting item details via multiget API anonymously...');
  const res2 = await fetch(`https://api.mercadolibre.com/items?ids=${itemId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });

  const data2 = await res2.json();
  if (res2.ok) {
    console.log('Success! Multi-get body status:', data2[0]?.code, 'Title:', data2[0]?.body?.title);
  } else {
    console.log('Error:', res2.status, data2);
  }
}

testItemFetch();
