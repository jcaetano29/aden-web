// Requires an isolated in-memory game server on 2571 and Vite on 5174.
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Redirect only this test browser to the disposable server; never touch live accounts.
    await page.route('**/src/net/NetworkClient.ts', async route => {
      const response = await route.fetch(), body = await response.text();
      if (!body.includes('ws://localhost:2567')) throw Error('Game server fallback changed; update test routing');
      await route.fulfill({ response, body: body.replace('ws://localhost:2567', 'ws://127.0.0.1:2571') });
    });
    await page.addInitScript(() => {
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.__gameAudio = this; }
      };
    });
    await page.goto('http://127.0.0.1:5174');
    await page.getByText('Crear personaje', { exact: true }).first().click({ timeout: 60000 });
    await page.locator('[data-class=knight]').click();
    await page.locator('input[type=text]').first().fill(`Audio${Date.now().toString().slice(-8)}`);
    await page.locator('input[type=password]').first().fill('AudioTestOnly');
    await page.getByRole('button', { name: 'Crear personaje', exact: true }).last().click();
    await page.getByRole('button', { name: 'Comenzar la travesía' }).click({ timeout: 20000 });
    await page.locator('[data-audio-toggle]').click();
    await page.getByText('Lumbre del hogar', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('body').click({ position: { x: 800, y: 80 } });
    await page.keyboard.press('m');
    const forestRow = page.locator('.aden-panel').filter({ hasText: 'Viajar a un mapa' }).locator('div').filter({ hasText: /^Bosque de UmbraLos huesos/ });
    await forestRow.getByRole('button', { name: 'Viajar', exact: true }).click();
    await page.locator('[data-audio-toggle]').click();
    await page.getByText('Susurros de Umbra', { exact: true }).waitFor();
    await page.waitForTimeout(4500);
    const state = await page.evaluate(() => window.__gameAudio.state);
    if (state !== 'running') throw Error(`Game audio is ${state}`);
    await page.keyboard.press('n');
    if (await page.locator('[data-audio-mute]').getAttribute('aria-pressed') !== 'true') throw Error('N did not mute in the game');
    await page.keyboard.press('n');
    fs.mkdirSync('artifacts/audio', { recursive: true });
    await page.screenshot({ path: 'artifacts/audio/in-game-forest.png' });
    fs.writeFileSync('artifacts/audio/game-report.json', JSON.stringify({ state, maps: ['pueblo', 'bosque'], muteHotkey: true, errors }, null, 2));
    if (errors.length) throw Error(errors.join('\n'));
    console.log(JSON.stringify({ success: true, state, maps: ['pueblo', 'bosque'], muteHotkey: true, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
