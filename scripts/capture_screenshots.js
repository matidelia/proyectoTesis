/**
 * Captura capturas de pantalla reales del sistema en producción para el
 * capítulo de Demo de la tesis. Usa Playwright (instalado temporalmente,
 * no queda en package.json) contra el sitio ya deployado.
 *
 * Uso: node scripts/capture_screenshots.js
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'https://proyectotesis-e4et.onrender.com';
const OUT = path.join(__dirname, '..', 'pfi_latex', 'images', 'demo');

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. Login page (sin sesión)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, 'demo_login.png') });
  console.log('✓ demo_login.png');

  // 2. Dashboard SIN sesión (ranking gratis + candado en evolución)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Exportar CSV', { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'demo_dashboard_anonimo.png') });
  console.log('✓ demo_dashboard_anonimo.png');

  // 3. Login como cliente demo
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'cliente.demo@tendar.test');
  await page.fill('input[type="password"]', 'W6I9Fa15ymdJ');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
  await page.waitForSelector('text=Exportar CSV', { timeout: 30000 });
  await page.waitForTimeout(500);

  // 4. Dashboard CON sesión: ranking con columnas Prob. ML + 🔔 (viewport, sin scrollear)
  await page.screenshot({ path: path.join(OUT, 'demo_dashboard_logueado.png') });
  console.log('✓ demo_dashboard_logueado.png');

  // 5. Scroll hasta la sección de evolución (desbloqueada con sesión) y capturarla
  try {
    await page.locator('text=Evolución de la Tendencia').scrollIntoViewIfNeeded();
    await page.waitForSelector('svg', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, 'demo_dashboard_evolucion_logueado.png') });
    console.log('✓ demo_dashboard_evolucion_logueado.png');
  } catch (e) {
    console.log('⚠ no se pudo capturar la evolución:', e.message);
  }

  // 5. Bandeja de alertas
  await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'demo_alerts.png') });
  console.log('✓ demo_alerts.png');

  await browser.close();
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
