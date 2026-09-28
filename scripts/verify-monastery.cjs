const { chromium } = require(process.argv[2] || 'playwright');
const sharp = require(process.argv[3] || 'sharp');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[4] || 'http://127.0.0.1:5175';
const output = path.resolve('artifacts/materials/monastery-regression');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const report = { errors: [], images: [], clicks: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) report.errors.push(`${message.text()} ${message.location().url}`);
    });
    await page.goto(base);
    await page.waitForSelector('canvas, button', { timeout: 60000 });
    await page.screenshot({ path: path.join(output, 'game-start.png') });
    await page.route('**/__map_review', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><link rel="icon" href="data:,"><style>body{margin:0}</style><div id="app"></div>' }));
    await page.goto(`${base}/__map_review`);
    await page.evaluate(async () => {
      const source = await fetch('/src/render/Renderer.ts').then(response => response.text());
      const threeUrl = source.match(/from\s+["']([^"']*three[^"']*)["']/)[1];
      const THREE = await import(threeUrl);
      const { Renderer } = await import('/src/render/Renderer.ts');
      const { Environment } = await import('/src/render/Environment.ts');
      const { WorldObjectViews } = await import('/src/render/WorldObjectViews.ts');
      const { CharacterFactory } = await import('/src/render/CharacterFactory.ts');
      const { InputController } = await import('/src/input/InputController.ts');
      const { preloadMaterialAtlas } = await import('/src/render/materialAtlas.ts');
      // The transformed environment module provides the same shared module as the game.
      const envSource = await fetch('/src/render/Environment.ts').then(response => response.text());
      const sharedUrl = envSource.match(/from\s+["']([^"']*shared[^"']*)["']/)[1];
      const { ZONES, WORLD_OBJECTS, getTemplate } = await import(sharedUrl);
      await preloadMaterialAtlas();
      const renderer = new Renderer(document.querySelector('#app'));
      const environment = new Environment(renderer.scene);
      const objects = new WorldObjectViews(renderer.scene);
      for (const object of WORLD_OBJECTS) objects.add(object.id, { ...object, active: true });
      const factory = new CharacterFactory(); await factory.preloadHeroes();
      const template = getTemplate('memory_prior');
      const boss = factory.createMob(template.model, template.id);
      boss.root.scale.setScalar(template.scale); boss.root.position.set(1200, 0, 401);
      boss.play('Idle'); renderer.scene.add(boss.root);
      const clicks = [];
      const empty = () => ({ objects: [], idOf: () => null });
      const views = {
        raycastTargets: () => ({ objects: boss.root.visible ? [boss.root] : [], idOf: object => {
          for (let o = object; o; o = o.parent) if (o === boss.root) return 'prior';
          return null;
        } }), raycastPlayerTargets: empty,
      };
      new InputController(renderer, views, () => {}, id => clicks.push(`mob:${id}`), () => {},
        id => clicks.push(`object:${id}`), () => objects.raycastTargets()).attach(document.body);
      const select = (id, x, z) => {
        const zone = ZONES.find(zone => zone.id === id);
        x ??= zone.center.x; z ??= zone.center.z;
        objects.setCurrentMap(id); boss.root.visible = id === 'monasterio';
        environment.updateMood(x, z, 100);
        renderer.camera.position.set(x, 28, z + 28); renderer.camera.lookAt(x, 0, z);
        renderer.scene.updateMatrixWorld(true); renderer.camera.updateMatrixWorld(true);
        boss.mixer.update(.1); renderer.render(); renderer.css2d.render(renderer.scene, renderer.camera);
      };
      const point = (x, y, z) => {
        const p = new THREE.Vector3(x, y, z).project(renderer.camera);
        return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
      };
      window.review = { select, point, clicks, maps: ZONES.map(zone => zone.id), bossName: template.name,
        animate: () => { boss.mixer.update(.4); renderer.render(); },
        overlap: () => { boss.root.position.set(1188, 0, 405); select('monasterio', 1188, 407); },
      };
      select('monasterio', 1200, 411);
      function frame() {
        renderer.render(); renderer.css2d.render(renderer.scene, renderer.camera);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const size = viewport.width > 1000 ? 'desktop' : 'mobile';
      for (const map of await page.evaluate(() => window.review.maps)) {
        await page.evaluate(map => window.review.select(map), map);
        const name = `${size}-${map}.png`;
        const buffer = await page.screenshot({ path: path.join(output, name) });
        const stats = await sharp(buffer).stats();
        const deviation = Math.max(...stats.channels.slice(0, 3).map(channel => channel.stdev));
        if (deviation < 5) report.errors.push(`Blank or flat canvas: ${name}`);
        report.images.push({ name, deviation });
      }
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    await page.evaluate(() => window.review.select('monasterio', 1200, 409));
    await page.screenshot({ path: path.join(output, 'monastery-arena.png') });
    for (const [id, x] of [['monastery_anchor_1', 1188], ['monastery_anchor_2', 1212]]) {
      const point = await page.evaluate(x => window.review.point(x, 1.7, 407), x);
      await page.mouse.click(point.x, point.y);
      const click = await page.evaluate(() => window.review.clicks.at(-1));
      if (click !== `object:${id}`) report.errors.push(`Anchor click failed: ${click}`);
    }
    const before = await page.screenshot();
    await page.evaluate(() => window.review.animate());
    const after = await page.screenshot();
    if (before.equals(after)) report.errors.push('Boss animation did not change the canvas');
    await page.evaluate(() => window.review.overlap());
    const point = await page.evaluate(() => window.review.point(1188, 1, 407));
    await page.mouse.click(point.x, point.y);
    report.clicks = await page.evaluate(() => window.review.clicks);
    if (report.clicks.at(-1) !== 'object:monastery_anchor_1') report.errors.push('Boss intercepted the foreground anchor');
    await page.screenshot({ path: path.join(output, 'anchor-overlapping-boss.png') });
    report.bossName = await page.evaluate(() => window.review.bossName);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (report.errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
