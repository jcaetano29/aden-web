// Run against an isolated in-memory server (2584) and Vite client (5174).
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader'] });
  const errors=[];
  fs.mkdirSync('artifacts/trade',{recursive:true});
  try {
    const pages=[];
    for (let index=0;index<2;index++) {
      const page=await browser.newPage({viewport:{width:1440,height:960}});pages.push(page);
      page.on('pageerror',error=>errors.push(error.message));
      // Test-only access to this local game's network client; no production hooks.
      await page.route('**/src/main.ts*',async route=>{
        const response=await route.fetch(),body=await response.text();
        if(!body.includes('const net = new NetworkClient();'))throw Error('Network client test hook changed');
        await route.fulfill({response,body:body.replace('const net = new NetworkClient();','const net = new NetworkClient(); window.__tradeNet = net;')});
      });
      await page.goto('http://127.0.0.1:5174');
      await page.getByText('Crear personaje',{exact:true}).first().click({timeout:60000});
      await page.locator('[data-class=ranger]').click();
      await page.locator('input[type=text]').first().fill(`Trade${index}${Date.now().toString().slice(-7)}`);
      await page.locator('input[type=password]').first().fill('LocalTradeOnly');
      await page.getByRole('button',{name:'Crear personaje',exact:true}).last().click();
      await page.getByRole('button',{name:'Comenzar la travesía'}).click({timeout:20000});
      await page.locator('.trade-toggle').waitFor({state:'visible'});
      await page.evaluate(()=>window.__tradeNet.sendMove({x:0,z:8}));
    }
    const [a,b]=pages;
    await a.waitForFunction(()=>window.__tradeNet.getTradePanelData().candidates.length>0);
    await a.locator('.trade-toggle').click();
    await a.locator('[data-trade-invite]').first().click();
    await b.locator('[data-trade-accept]').click();
    const item=await a.locator('[data-trade-item-qty]').first().getAttribute('data-trade-item-qty');
    const initialA=await a.evaluate(()=>window.__tradeNet.getTradePanelData().gold);
    await a.locator('[data-trade-item-qty]').first().fill('5');await a.locator('[data-trade-save]').click();
    await a.waitForFunction(()=>!document.querySelector('[data-trade-confirm]').disabled);
    await b.locator('[data-trade-gold]').fill('10');await b.locator('[data-trade-save]').click();
    await b.waitForFunction(()=>!document.querySelector('[data-trade-confirm]').disabled);
    await a.screenshot({path:'artifacts/trade/desktop.png'});
    await b.setViewportSize({width:390,height:844});await b.screenshot({path:'artifacts/trade/mobile.png'});
    const fits=await b.locator('.trade-panel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth;});
    if(!fits)throw Error('Trade panel overflows mobile viewport');
    await a.locator('[data-trade-confirm]').click();await b.locator('[data-trade-confirm]').click();
    await a.waitForFunction(()=>window.__tradeNet.getTradePanelData().trade===null);
    if(await a.evaluate(()=>window.__tradeNet.getTradePanelData().gold)!==initialA+10)throw Error('Gold transfer failed');
    await a.locator('[data-trade-close]').click();await a.keyboard.press('i');
    await a.locator('[data-inventory-item]').filter({has: a.locator('img')}).first().click();
    await a.locator('[data-drop-qty]').fill('2');
    const selected=await a.locator('[data-inventory-item][aria-pressed=true]').getAttribute('data-inventory-item');
    const before=await a.evaluate(id=>window.__tradeNet.getInventory().find(i=>i.itemTemplateId===id).qty,selected);
    await a.locator('[data-drop-item]').click();await a.screenshot({path:'artifacts/trade/drop-confirmation.png'});
    await a.locator('[data-drop-confirm]').click();
    await a.waitForFunction(({id,qty})=>window.__tradeNet.getInventory().find(i=>i.itemTemplateId===id)?.qty===qty,{id:selected,qty:before-2});
    const report={success:true,item,goldTransfer:10,dropQuantity:2,mobileFits:fits,errors};
    fs.writeFileSync('artifacts/trade/report.json',JSON.stringify(report,null,2));
    if(errors.length)throw Error(errors.join('\n'));
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
