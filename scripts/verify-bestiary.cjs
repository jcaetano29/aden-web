const {chromium}=require(process.argv[2]||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];const models=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('favicon.ico'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/bestiary-preview.html');await page.waitForSelector('body[data-ready=true]',{timeout:60000});
 fs.mkdirSync('artifacts/bestiary',{recursive:true});
 for(const name of await page.evaluate(()=>window.bestiaryReview.names)){
  await page.evaluate(n=>window.bestiaryReview.select(n),name);await page.waitForTimeout(350);
  const idle=await page.evaluate(()=>window.bestiaryReview.inspect());
  if(idle.size.some(n=>!Number.isFinite(n)||n<=0)||idle.size[1]>7||idle.size[1]<1)errors.push({name,idle});
  await page.screenshot({path:`artifacts/bestiary/${name}.png`});
  for(const action of ['walk','attack']){await page.evaluate(a=>window.bestiaryReview.act(a),action);await page.waitForTimeout(150);const state=await page.evaluate(()=>window.bestiaryReview.inspect());if(!state.actions.length||state.actions.some(n=>/death/i.test(n)))errors.push({name,action,state});}
  await page.evaluate(()=>{window.bestiaryReview.act('death');});await page.waitForTimeout(180);
  await page.evaluate(()=>window.bestiaryReview.act('respawn'));const respawn=await page.evaluate(()=>window.bestiaryReview.inspect());
  if(respawn.position.some(n=>n!==0)||respawn.actions.some(n=>/death|attack|hit/i.test(n))||!respawn.actions.some(n=>/idle/i.test(n)))errors.push({name,respawn});
  models.push({name,idle,respawn});
 }
 fs.writeFileSync('artifacts/bestiary/report.json',JSON.stringify({errors,models},null,2));console.log(JSON.stringify({errors,models:models.length}));if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
