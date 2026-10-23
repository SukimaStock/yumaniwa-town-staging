// Targeted feedback checks only. Legal public-operation fixtures reuse618.
// No injected game fields or comprehensive E2E.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('../../../',import.meta.url).pathname),KEY='sukimastock.ambertime.wholesale.v20';
const output=process.env.AMBERTIME_OUTPUT??path.join(root,'works/ambertime/design/flavor-feedback-0254/browser-results.json');
const server=createServer(async(req,res)=>{try{let file=path.join(root,new URL(req.url,'http://localhost').pathname);if(file.endsWith('/'))file+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.woff2':'font/woff2','.json':'application/json'})[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=process.env.AMBERTIME_URL??`http://127.0.0.1:${server.address().port}/works/ambertime/`;
const browser=await chromium.launch({headless:true,executablePath:process.env.AMBERTIME_CHROME??'/tmp/amber-chromium/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[],fixtures={},publishedHashes={};const push=checks.push.bind(checks);checks.push=(...rows)=>{for(const row of rows)console.log('check',JSON.stringify(row));return push(...rows);};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});const p=await context.newPage();p.setDefaultTimeout(30000);p.setDefaultNavigationTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'?feedback0254='+Date.now());await p.evaluate(()=>document.fonts.ready);
 if(process.env.AMBERTIME_URL)await Promise.all(['index.html','shop-app.mjs','flavor-feedback-view.mjs','canvas-layout.mjs','player-news.mjs','shop-order-view.mjs','partner-orders.mjs','shop-demand.mjs','runtime-clock.mjs','canvas-scene.mjs'].map(async f=>{const response=await p.request.get(new URL(f+'?verify='+Date.now(),url).href);assert.equal(response.status(),200,f);const actual=createHash('sha256').update(await response.body()).digest('hex'),expected=createHash('sha256').update(await fs.readFile(path.join(root,'works/ambertime',f))).digest('hex');assert.equal(actual,expected,'published source '+f);publishedHashes[f]=actual;}));
 if(process.env.AMBERTIME_FIXTURES)Object.assign(fixtures,JSON.parse(await fs.readFile(process.env.AMBERTIME_FIXTURES,'utf8')));
 else{const {warehouseFixtures}=await import('./flavor-feedback-0254-fixtures.mjs'),{feedbackFixtures}=await import('./flavor-feedback-0253-fixtures.mjs');Object.assign(fixtures,warehouseFixtures(),{sales:feedbackFixtures().sales});}
 const read=()=>p.evaluate(k=>localStorage.getItem(k),KEY);
 async function load(raw){await p.evaluate(({raw,KEY})=>{localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(raw),userPaused:true,elapsed:0}));localStorage.setItem(KEY+'.map-reveal.v1',JSON.stringify({version:1,shown:6}));},{raw,KEY});await p.reload();await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>!document.getElementById('game').hidden&&document.getElementById('scene-root').dataset.hitRegions);}
 async function tap(s){await p.locator(s).waitFor({state:'visible'});await p.locator(s).scrollIntoViewIfNeeded();assert(await p.locator(s).isEnabled(),s);await p.locator(s).tap();}
 async function fit(){assert(await p.evaluate(()=>{const b=document.getElementById('dialog-body'),d=document.getElementById('action-dialog');return document.documentElement.scrollWidth<=innerWidth&&(!d.open||b.scrollWidth<=b.clientWidth+1);}), 'horizontal overflow');}
 async function fact(){const raw=await read();return p.evaluate(async raw=>{const V=await import('./flavor-feedback-view.mjs?v=0.25.4');return V.warehouseFeedback(JSON.parse(raw).game);},raw);}
 for(const width of [375,390]){
  await p.setViewportSize({width,height:844});
  for(const key of ['initial','expired','sampled']){await load(fixtures[key]);await tap('button[data-room="warehouse"]');assert.equal(await fact(),null);assert(await p.locator('#room-feedback').isHidden());await fit();checks.push({name:'no new fact / expired / already tasted stays quiet after restore',fixture:key,width});}
  for(const key of ['fresh','named','next']){
   await load(fixtures[key]);await tap('button[data-room="warehouse"]');const expected=await fact();assert(expected);if(key==='named')assert.equal(expected.kind,'name');await p.waitForFunction(()=>document.getElementById('room-feedback').dataset.sceneVisible==='true');assert((await p.locator('#room-feedback').textContent()).includes(expected.text));const raw=await read();await fit();await p.screenshot({path:'/tmp/ambertime-0254-'+width+'-'+key+'.png',scale:'css'});await tap('#room-feedback');assert.equal(await p.locator('#cask-feedback').textContent(),expected.text);assert.equal(await read(),raw);await fit();await tap('#taste-button');await tap('#end-tasting');await tap('#close-dialog');assert(await p.locator('#room-feedback').isHidden());checks.push({name:'recent fact / changed name / next fact opens existing optional tasting',fixture:key,width,fact:expected});
  }
  if(!process.env.AMBERTIME_SMOKE){
   await load(fixtures.fresh);await tap('button[data-room="warehouse"]');await tap('#open-aux-menu');await tap('#toggle-speed');await tap('#toggle-time');await p.waitForFunction(KEY=>JSON.parse(localStorage.getItem(KEY)).game.core.month>=8,KEY);assert(await p.locator('#room-feedback').isVisible());await p.waitForFunction(KEY=>JSON.parse(localStorage.getItem(KEY)).game.core.month>=9,KEY);await tap('#toggle-time');assert(await p.locator('#room-feedback').isHidden());const paused=await read();await p.waitForTimeout(150);assert.equal(await read(),paused);checks.push({name:'native2x expiry at month9 without popup or cue-induced pause',width});
  }
  await load(fixtures.sales);await tap('button[data-room="sales"]');const raw=await read(),game=JSON.parse(raw).game,comments=await p.evaluate(async game=>(await import('./player-news.mjs?v=0.25.4')).customerComments(game),game),latest=comments.at(-1);assert(latest);await tap('#room-feedback');assert((await p.locator('.release-comments').innerText()).includes(latest.text));await fit();assert.equal(await read(),raw);checks.push({name:'sales cue and release ledger share deterministic factual comment, read-only',width,comment:latest});
  await tap('[data-action="ledger-cask-open"]');await p.waitForSelector('[data-action="ledger-recipe-open"]');await tap('[data-action="ledger-recipe-open"]');const text=await p.locator('#dialog-body').innerText();assert.match(text,/ふつうの麦芽|ピート麦芽/);assert.match(text,/採取/);await fit();assert.equal(await read(),raw);for(let i=0;i<3;i++)await tap('[data-action="comparison-back"]');await p.reload();await tap('button[data-room="sales"]');await tap('#room-feedback');assert((await p.locator('.release-comments').innerText()).includes(latest.text));assert(await p.locator('#automatic-news').isHidden());checks.push({name:'original recipe navigation and restored comment unchanged; no repeat toast',width});
 }
 assert.deepEqual(errors,[]);const sourceHashes={};for(const f of ['shop-app.mjs','flavor-feedback-view.mjs','player-news.mjs','index.html','monthly.mjs','runtime-clock.mjs','canvas-scene.mjs','shop-order-view.mjs'])sourceHashes[f]=createHash('sha256').update(await fs.readFile(path.join(root,'works/ambertime',f))).digest('hex');
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({url:process.env.AMBERTIME_URL??'local',browser:await browser.version(),physicalIPhone:false,widths:[375,390],checks,errors,sourceHashes,publishedHashes},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors,output}));await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
