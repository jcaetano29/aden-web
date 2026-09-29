// Local end-to-end check. Run with a disposable local game server (in-memory persistence).
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');
const base = process.argv[3] || 'http://localhost:5173';
const output = path.resolve('artifacts/onboarding');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const screenshot = name => page.screenshot({ path: path.join(output, `${name}.png`) });
  const visible = selector => page.locator(selector).waitFor({ state: 'visible', timeout: 45000 });
  const hidden = selector => page.locator(selector).waitFor({ state: 'hidden', timeout: 45000 });
  const name = `Guide${Date.now().toString(36)}`;
  // Keep the local in-memory room alive across page reloads (production uses persistent storage).
  const observer = await new Client('ws://localhost:2567').joinOrCreate('game', { name: `Watch${Date.now().toString(36)}`, mode: 'create', password: 'local-test-pass' });
  observer.onMessage('*', () => {});
  try {
    await page.goto(base);
    await page.getByText('Personajes listos', { exact: true }).waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await screenshot('home-desktop');
    await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
    assert.equal(await page.locator('.character-guide').getAttribute('open'), '');
    await page.locator('.character-guide summary').click();
    await page.locator('.character-select').evaluate(el => el.scrollTop = 0);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.character-select').evaluate(el => el.scrollTop), 0);
    await screenshot('home-mobile');
    assert.equal(await page.locator('.character-select').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Comenzá tu aventura' }).click();
    await visible('.character-creation');
    await screenshot('create-desktop');
    await page.locator('input[autocomplete="username"]').fill(name);
    await page.locator('input[type="password"]').fill('local-test-pass');
    await page.locator('.character-enter').click();
    await visible('[data-story-card]');
    await screenshot('first-entry');
    await page.getByRole('button', { name: 'Comenzar la travesía' }).click();
    await visible('[data-guide-tip]');
    assert.match(await page.locator('[data-guide-tip]').innerText(), /Rowan/);
    await screenshot('first-steps');
    await page.keyboard.press('h');
    await visible('[data-guide-manual]');
    const lesson = page.locator('[data-guide-manual] details').first();
    await lesson.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await lesson.getAttribute('open'), '');
    await page.keyboard.press('Space');
    assert.equal(await lesson.getAttribute('open'), null);
    await page.keyboard.press('h');
    await hidden('[data-guide-manual]');
    // Walk toward Rowan, then click his model under the visible nameplate.
    let rowan = await page.getByText('Anciano Rowan', { exact: true }).boundingBox();
    await page.mouse.click(rowan.x + rowan.width / 2 + 40, rowan.y + 80);
    await page.waitForTimeout(1800);
    rowan = await page.getByText('Anciano Rowan', { exact: true }).boundingBox();
    await page.mouse.click(rowan.x + rowan.width / 2, rowan.y + 38);
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click({ timeout: 5000 });
    await page.getByRole('heading', { name: 'Salí del pueblo', exact: true }).waitFor();
    await screenshot('mission-accepted');
    await page.locator('[data-guide-hide]').click();
    await hidden('[data-guide-tip]');
    await page.reload();
    await page.getByText('Personajes listos', { exact: true }).waitFor({ timeout: 60000 });
    await page.locator('input[autocomplete="username"]').fill(name);
    await page.locator('input[type="password"]').fill('local-test-pass');
    await page.locator('.character-enter').click();
    await hidden('.character-select');
    await visible('.beginner-guide-toggle');
    await hidden('[data-story-card]');
    await hidden('[data-guide-tip]');
    await page.keyboard.press('h');
    await visible('[data-guide-manual]');
    await page.locator('[data-guide-resume]').click();
    await visible('[data-guide-tip]');
    await screenshot('returning-player');
    await page.keyboard.press('m');
    await page.getByText('Bosque de Umbra', { exact: true }).locator('..').locator('..').getByRole('button', { name: 'Viajar', exact: true }).click();
    await page.getByRole('heading', { name: 'Tu primer combate', exact: true }).waitFor();
    await screenshot('first-combat-guide');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, character: name, errors,
      checks: ['desktop and mobile landing', 'controls disclosure', 'character creation', 'first-entry prologue', 'contextual NPC guidance', 'H manual toggle', 'manual Enter and Space controls', 'walk to Rowan and accept first quest', 'hidden tips survive login', 'returning login skips prologue', 'manual reactivation', 'travel to forest switches to combat lesson'] }, null, 2));
    console.log('Onboarding end-to-end passed. Screenshots in artifacts/onboarding.');
  } catch (error) {
    await screenshot('failure');
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: error.message, errors }, null, 2));
    throw error;
  } finally { await browser.close(); await observer.leave(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
