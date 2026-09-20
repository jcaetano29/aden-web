// Usage: node scripts/verify-materials.cjs [playwright module path] [preview URL]
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  const resourceWarnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if(m.type()!=='error') return;
    const url=m.location().url;
    if(url.includes('fonts.googleapis.com') || url.endsWith('/favicon.ico')) resourceWarnings.push({url,message:m.text()});
    else errors.push({url,message:m.text()});
  });
  fs.mkdirSync('artifacts/materials', { recursive: true });
  const origin = process.argv[3] || 'http://127.0.0.1:5174';
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.getByRole('button',{name:'Entrar a Aden',exact:true}).waitFor();
  await page.screenshot({ path: 'artifacts/materials/login.png' });
  await page.goto(origin+'/material-preview.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-ready=true]', { timeout: 60000 });
  for(const location of ['Pueblo','Bosque','Ruinas','Yermo','Trono','Personajes']) {
    await page.getByRole('button',{name:location, exact:true}).click();
    const start = await page.locator('body').getAttribute('data-frames');
    await page.waitForFunction(n => Number(document.body.dataset.frames) > Number(n)+20, start);
    await page.screenshot({path: `artifacts/materials/${location.toLowerCase()}.png`});
  }
  const report = { errors, resourceWarnings, scenes: 6, viewport: '1440x960', renderer: await page.evaluate(()=>{
    const gl=document.querySelector('canvas').getContext('webgl2');return gl?.getParameter(gl.VERSION);
  }) };
  fs.writeFileSync('artifacts/materials/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  await browser.close();
  if(errors.length) process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
