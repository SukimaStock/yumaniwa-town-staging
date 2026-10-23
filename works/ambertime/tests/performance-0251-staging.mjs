// Targeted deployed smoke, native timers and actual touch controls; no fake clock.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const url=process.env.AMBERTIME_URL??'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const out=process.env.AMBERTIME_OUTPUT??'/tmp/ambertime-0251-staging',KEY='sukimastock.ambertime.wholesale.v20';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.AMBERTIME_CHROME??'/tmp/amber-chromium/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[],hashes={};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'?perf0251='+Date.now());await p.evaluate(()=>document.fonts.ready);
 const sha=b=>createHash('sha256').update(b).digest('hex');
 for(const f of ['index.html','shop-app.mjs','partner-orders.mjs','canvas-scene.mjs','runtime-clock.mjs']){const response=await p.request.get(new URL(f+'?verify='+Date.now(),url).href);assert.equal(response.status(),200);const remote=sha(await response.body()),local=sha(await fs.readFile(new URL('../'+f,import.meta.url)));assert.equal(remote,local,'published '+f);hashes[f]=remote;}
 async function tap(selector){const n=p.locator(selector).first();assert(await n.isVisible(),selector+' visible');assert(await n.isEnabled(),selector+' enabled');const b=await n.boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845,selector+' fits');await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
 const read=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 await tap('#start-distill');await tap('[data-action="flavor-start"]');await p.waitForFunction(()=>document.getElementById('scene-root').dataset.countdown==='3');const before=await read(),bar=await p.locator('#scene-root').getAttribute('data-collection-bar');
 for(const digit of ['2','1']){await p.waitForFunction(d=>document.getElementById('scene-root').dataset.countdown===d,digit);assert.deepEqual(await read(),before);assert.equal(await p.locator('#scene-root').getAttribute('data-collection-bar'),bar);}
 await p.waitForFunction(()=>JSON.parse(document.getElementById('scene-root').dataset.collectionBar).current>=.12);await tap('#stop-distill');const start=(await read()).game.still.distillation.collectStart;assert(Number.isInteger(start));
 await p.waitForFunction(s=>JSON.parse(document.getElementById('scene-root').dataset.collectionBar).current>=(s+14)/99,start);await tap('#stop-distill');const filled=await read();assert.equal(filled.game.still.phase,'filling');assert.equal(filled.game.still.distillation.collectStart,start);assert(filled.game.core.spirit.litres>0);checks.push({name:'native 3-2-1 and manual start/end collection',start,end:filled.game.still.distillation.progress,litres:filled.game.core.spirit.litres});
 await p.screenshot({path:path.join(out,'390-spirit.png'),scale:'css'});
 await tap('#open-aux-menu');await tap('#toggle-speed');assert.equal(await p.locator('#toggle-speed').getAttribute('aria-pressed'),'true');checks.push({name:'actual speed menu switches to2x'});
 await tap('[data-room="warehouse"]');await tap('[data-room="sales"]');await tap('[data-room="distill"]');await p.reload();assert.equal((await read()).game.still.phase,'filling');checks.push({name:'room controls and save reload'});
 for(const width of [375,390]){await p.setViewportSize({width,height:844});await p.waitForTimeout(100);const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);const buttons=await p.locator('#scene-controls button:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{id:n.id,x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));assert(buttons.every(b=>b.x>=-1&&b.right<=width+1&&b.y>=-1&&b.bottom<=845));checks.push({name:'viewport controls fit',width});}
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({url,browser:await browser.version(),nativeTimers:true,physicalIPhone:false,checks,errors,sourceHashes:hashes},null,2)+'\n');console.log(JSON.stringify({checks,errors,output:out}));await context.close();
}finally{await browser.close();}
