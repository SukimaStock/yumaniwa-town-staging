import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('../../../../',import.meta.url).pathname),output=new URL('./',import.meta.url);
const server=createServer(async(req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.AMBERTIME_CHROME??'/tmp/audit-chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[1280,900],[390,844],[390,667]]){
  const context=await browser.newContext({viewport:{width:width+30,height:height+180},hasTouch:width===390,isMobile:width===390}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-17T12:00:01Z'));
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/design/spirit/browser-check.html`);
  await page.locator('#game').evaluate((el,{width,height})=>{el.style.width=width+'px';el.style.height=height+'px';},{width,height});await page.locator('#new').click();
  const f=page.frameLocator('#game'),state=()=>page.evaluate(()=>JSON.parse(window.qaStorage.getItem('sukimastock.ambertime.wholesale.v10')));
  const read=()=>f.locator('#spirit-readout').evaluate(el=>({kind:el.querySelector('#spirit-kind').textContent,phrase:el.querySelector('#spirit-phrase').textContent,litres:el.querySelector('#spirit-volume').textContent,values:[...el.querySelectorAll('[role=meter]')].map(x=>Number(x.getAttribute('aria-valuenow'))),gaugesHidden:el.querySelector('#spirit-gauges').hidden}));
  const expected=progress=>f.locator('body').evaluate(async (el,progress)=>{const v=await import('./spirit-view.mjs?v=1');const s=JSON.parse(localStorage.getItem('sukimastock.ambertime.wholesale.v10')).game;s.still.distillation.progress=progress;return v.distillationView(s);},progress);
  await f.locator('#game').waitFor({state:'visible'});assert.equal(await f.locator('#spirit-readout').isVisible(),false);await f.locator('#start-distill').click();await page.clock.runFor(2000);
  assert.equal((await read()).gaugesHidden,true);assert.equal((await read()).kind,'採取中');assert.equal((await state()).game.still.distillation.progress,20);
  await page.clock.runFor(900);const stopAt29=await f.locator('#stop-distill').evaluate(el=>el.getBoundingClientRect().top);const positions=[];let current=29;
  for(const progress of [30,50,70,90,99]){
   await page.clock.runFor((progress-current)*100);current=progress;const view=await read(),model=await expected(progress);assert.equal(view.kind,'今止めた場合の見込み');assert.equal(view.gaugesHidden,false);assert.deepEqual(view.values,[model.roughness,model.character]);assert.equal(view.litres,model.litres.toFixed(1)+' L');assert.equal(view.phrase,model.phrase);positions.push({progress,stopTop:await f.locator(progress===99?'#open-fill':'#stop-distill').evaluate(el=>el.getBoundingClientRect().top),...view});if(progress===30){const stopAt30=await f.locator('#stop-distill').evaluate(el=>el.getBoundingClientRect().top);console.log(JSON.stringify({width,height,stopAt29,stopAt30}));assert.ok(Math.abs(stopAt29-stopAt30)<1,'Stop button stays still when forecast becomes available');}
   if(progress===70){
    await f.locator('#toggle-time').click();const saved=await state(),before=await read();await page.clock.runFor(500);assert.deepEqual(await state(),saved);await page.locator('#reload').click();await f.locator('#game').waitFor({state:'visible'});assert.deepEqual(await state(),saved);assert.deepEqual(await read(),before);
    const bounds=await f.locator('body').evaluate(()=>Object.fromEntries(['still','spirit-readout','stop-distill'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{top:r.top,bottom:r.bottom}]})));
    let inView=Object.values(bounds).every(r=>r.top>=0&&r.bottom<=height);const initiallyInView=inView;if(!inView){await f.locator('body').evaluate(()=>scrollBy(0,document.getElementById('still').getBoundingClientRect().top-12));inView=await f.locator('body').evaluate(()=>['still','spirit-readout','stop-distill'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));}console.log(JSON.stringify({width,height,bounds,initiallyInView,inView}));
    if(height!==667)await page.locator('#game').screenshot({path:new URL(`manual-${width}.png`,output).pathname});
    // Save natural-layout evidence even when an assertion below reports clipping.
    assert.equal(inView,true,`${width}×${height}: still, gauges and stop must all be in view`);
    await f.locator('#toggle-time').click();
   }
  }
  console.log(JSON.stringify({width,height,stopPositions:positions.map(p=>({progress:p.progress,y:p.stopTop}))}));
  assert.ok(Math.max(stopAt29,...positions.filter(p=>p.progress<99).map(p=>p.stopTop))-Math.min(stopAt29,...positions.filter(p=>p.progress<99).map(p=>p.stopTop))<1,'Stop stays stable across extraction phrases');
  assert.ok(new Set(positions.map(p=>p.phrase)).size>=2);assert.ok(positions[4].values[0]>positions[0].values[0]);assert.ok(positions[4].values[1]>positions[0].values[1]);
  await f.locator('#open-fill').click();await f.locator('#close-dialog').click();let actual=(await state()).game.core.spirit,confirmed=await read();assert.equal(confirmed.kind,'できた原酒');assert.deepEqual(confirmed.values,[actual.roughness,actual.character]);assert.equal(confirmed.litres,actual.litres.toFixed(1)+' L');
  if(width===390&&height===844){await f.locator('body').evaluate(()=>scrollTo(0,0));await page.locator('#game').screenshot({path:new URL('confirmed-phone.png',output).pathname});}
  const beforeRender=await state();await f.locator('#room-nav [data-room="sales"]').click();await f.locator('#room-nav [data-room="distill"]').click();assert.deepEqual(await state(),beforeRender);assert.deepEqual(await read(),confirmed);
  await f.locator('#open-fill').click();assert.equal(await f.locator('dialog[open]').count(),1);assert.match(await f.locator('#dialog-title').innerText(),/樽/);await f.locator('[data-action="fill"][data-id="refill"]').click();assert.equal(await f.locator('dialog[open]').count(),0);assert.equal((await state()).game.usual.recipe.stopAt,99);
  await f.locator('#room-nav [data-room="distill"]').click();await f.locator('#reserve-usual').click();await page.clock.runFor(12100);const finished=await state();assert.equal(finished.game.usual.reservation,null);assert.equal(finished.game.core.casks.length,2);const newborn=finished.game.core.casks.at(-1),auto=await read();assert.equal(newborn.age,0);assert.equal(auto.kind,'樽詰めした原酒');assert.deepEqual(auto.values,[newborn.roughness,newborn.character]);assert.equal(auto.litres,newborn.litres.toFixed(1)+' L');
  if(width===390&&height===844){await f.locator('body').evaluate(()=>scrollTo(0,0));await page.locator('#game').screenshot({path:new URL('automatic-phone.png',output).pathname});}
  await page.clock.runFor(6000);assert.ok((await state()).game.core.casks.at(-1).age>0);assert.deepEqual(await read(),auto,'Completed automatic readout keeps newborn values while cask ages');
  assert.equal(await f.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.locator('#new').click();await f.locator('#game').waitFor({state:'visible'});await f.locator('#start-distill').click();await page.clock.runFor(3000);await f.locator('#stop-distill').click();const earlySpirit=(await state()).game.core.spirit,earlyView=await read();assert.equal(earlyView.kind,'できた原酒');assert.deepEqual(earlyView.values,[earlySpirit.roughness,earlySpirit.character]);assert.equal(await f.locator('dialog[open]').count(),0);
  let monthlyBoundaryAutoNewborn=null;
  if(width===1280){
   await page.locator('#new').click();await f.locator('#usual-recipe').filter({hasText:'自分で蒸留し'}).waitFor();await f.locator('#start-distill').click();await page.clock.runFor(4000);await f.locator('#stop-distill').click();await f.locator('#open-fill').click();await f.locator('[data-action="fill"][data-id="refill"]').click();await page.clock.runFor(4000);await f.locator('#room-nav [data-room="distill"]').click();await f.locator('#reserve-usual').click();assert.equal((await state()).elapsed,2000);await page.clock.runFor(3900);const birth=await expected(40);await page.clock.runFor(100);const boundary=await state(),aged=boundary.game.core.casks.at(-1),readout=await read();assert.equal(boundary.game.usual.reservation,null);assert.equal(boundary.game.core.month,2);assert.equal(aged.age,1);assert.equal(readout.kind,'樽詰めした原酒');assert.deepEqual(readout.values,[birth.roughness,birth.character]);assert.equal(readout.litres,birth.litres.toFixed(1)+' L');assert.notDeepEqual(readout.values,[aged.roughness,aged.character]);monthlyBoundaryAutoNewborn=true;
  }
  checks.push({width,height,monthlyBoundaryAutoNewborn,positions,belowMinimumNoGauges:true,forecastMatchesModel:true,confirmedMatchesSpirit:true,manualStopAt30WithoutModal:true,pauseAndPartialReload:true,renderPure:true,noExtraConfirmation:true,automaticMatchesNewborn:true,automaticReadoutRetainsUnagedValues:true,minimumThresholdDoesNotMoveStop:true,noHorizontalOverflow:true,stillGaugesAndStopFitTogether:true,pageErrors:errors});await context.close();
 }
 await fs.writeFile(new URL('browser-results.json',output),JSON.stringify({browser:'Chromium',clock:'Real application 100 ms timers with Playwright controlled time',physicalIPhone:false,checks},null,2)+'\n');console.log('PASS '+checks.length+' viewports');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
