// Presentation contracts exercise the real controls and public-model save replay.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../../../',import.meta.url)),out=path.join(root,'works/ambertime/design/readable-copy/contracts');
const {chromium}=createRequire(import.meta.url)('playwright');
const KEY='sukimastock.ambertime.wholesale.v18',results=[];
await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let f=path.join(root,new URL(req.url,'http://localhost').pathname);if(f.endsWith('/'))f+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf'})[path.extname(f)]??'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/tmp/chromium',args:['--no-sandbox']});
const base=`http://127.0.0.1:${server.address().port}/works/ambertime/`;
const cases=[[360,740,1,false],[390,844,3,false],[768,1024,1,false],[1280,900,1,false],[360,740,1,true]];
async function fixture(page){await page.evaluate(async KEY=>{const {roomFixture}=await import('./tests/room-fixtures.mjs');localStorage.setItem(KEY,await roomFixture('ready'));},KEY);await page.reload();await page.waitForFunction(()=>['ready','fallback'].includes(document.documentElement.dataset.fontState));await page.waitForTimeout(60);}
async function pixelMask(page,kind){return page.evaluate(async kind=>{const{SYMBOLS}=await import('./pixel-symbols.mjs?v=0.23-readable-1'),root=document.querySelector('#scene-root'),v=JSON.parse(root.dataset.viewport),a=JSON.parse(root.dataset.hitRegions).find(a=>a.key==='toggle-time'),c=document.querySelector('#scene-canvas').getContext('2d'),cell=Math.max(1,Math.round(3*v.scale*v.dpr)),x=Math.round((v.offsetX+(a.x+a.w/2)*v.scale)*v.dpr-3.5*cell),y=Math.round((v.offsetY+(a.y+a.h/2)*v.scale)*v.dpr-3.5*cell);const actual=SYMBOLS[kind].map((row,dy)=>[...row].map((_,dx)=>{const p=c.getImageData(x+dx*cell+Math.floor(cell/2),y+dy*cell+Math.floor(cell/2),1,1).data;return p[0]===240&&p[1]===230&&p[2]===200?'1':'0';}).join(''));return {actual,expected:SYMBOLS[kind],cell,kind};},kind);}
try{
 for(const[width,height,dpr,failed]of cases){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.canvasCalls=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(this.canvas.id==='scene-canvas'){window.canvasCalls.push({text:String(text),x,y,font:this.font});if(window.canvasCalls.length>1500)window.canvasCalls.splice(0,500);}return original.call(this,text,x,y,...args);};});
  if(failed)await page.route('**/fonts/misaki_gothic.ttf',r=>r.abort());
  await page.goto(base);await fixture(page);await page.locator('button[data-room="distill"]').click();
  const checks={};checks.font=await page.evaluate(()=>document.documentElement.dataset.fontState);assert.equal(checks.font,failed?'fallback':'ready');
  const play=await pixelMask(page,'play');assert.deepEqual(play.actual,play.expected);checks.play=play;
  assert.equal(await page.locator('#toggle-time').getAttribute('aria-label'),'時間を進める');
  const originalMonth=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game.core.month,KEY);
  await page.locator('#start-distill').click();await page.waitForTimeout(40);assert.equal(await page.locator('#stop-distill').textContent(),'おわる');
  assert.equal(await page.locator('#toggle-time').getAttribute('aria-label'),'蒸留を再開する');
  await page.locator('#toggle-time').click();await page.waitForTimeout(35);assert.equal(await page.locator('#toggle-time').getAttribute('aria-label'),'時間を止める');
  const pause=await pixelMask(page,'pause');assert.deepEqual(pause.actual,pause.expected);checks.pause=pause;
  await page.locator('#toggle-time').click();const paused=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);await page.waitForTimeout(160);const stable=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);assert.equal(stable.game.core.month,originalMonth);assert.equal(stable.game.still.distillation.progress,paused.game.still.distillation.progress);assert.equal(stable.userPaused,true);checks.realStartPause={phase:stable.game.still.phase,month:stable.game.core.month,stableProgress:stable.game.still.distillation.progress};if(width===360&&!failed)await page.screenshot({path:path.join(out,'room-paused-dpr1.png'),scale:'css'});
  const calls=await page.evaluate(()=>window.canvasCalls);assert(calls.length>10);assert(!calls.some(c=>/[▶‖×]/u.test(c.text)));for(const c of calls){assert(Number.isInteger(c.x)&&Number.isInteger(c.y),JSON.stringify(c));assert(/^(?:400 )?\d+px /u.test(c.font),c.font);}checks.canvasDrawCalls=calls.length;
  if(!failed){const metrics=await page.evaluate(()=>{const c=document.createElement('canvas').getContext('2d'),calls=window.canvasCalls,jp=calls.findLast(c=>/蒸留室/u.test(c.text)),number=calls.findLast(c=>/^\d/u.test(c.text));const box=(text,font)=>{c.font=font;const m=c.measureText(text);return{font,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,width:m.width};};return{jp:box('蒸',jp.font),number:box('8',number.font)};});assert(metrics.number.height>=metrics.jp.height*.8&&metrics.number.height<=metrics.jp.height*1.2,JSON.stringify(metrics));assert(Number(metrics.number.font.match(/(\d+)px/u)[1])>Number(metrics.jp.font.match(/(\d+)px/u)[1]));checks.glyphBounds=metrics;}
  await fixture(page);await page.locator('button[data-room="warehouse"]').click();await page.locator('[data-cask-id]').first().click();await page.locator('#open-bottle').click();
  assert.equal(await page.locator('#dialog-title').textContent(),'ビン詰め');assert.match(await page.locator('#dialog-body').textContent(),/リフィルたる/u);assert(!/木の移り/u.test(await page.locator('#dialog-body').textContent()));
  const close=await page.locator('#close-dialog').evaluate(el=>({label:el.getAttribute('aria-label'),rects:[...el.querySelectorAll('svg rect')].map(r=>[r.getAttribute('x'),r.getAttribute('y')].join(','))}));assert.equal(close.label,'閉じる');assert.deepEqual(close.rects,['0,0','6,0','1,1','5,1','2,2','4,2','3,3','2,4','4,4','1,5','5,5','0,6','6,6']);checks.close=close;
  const name='樽と瓶2026𠮷・長い銘柄名の試作';await page.locator('#brand-name').fill(name);assert.equal(await page.locator('#brand-name').inputValue(),name);
  const nativeNumbers=await page.locator('#dialog-body .ui-number').evaluateAll(nodes=>nodes.slice(0,5).map(n=>({text:n.textContent,font:getComputedStyle(n).fontSize,base:getComputedStyle(n.parentElement).fontSize})));assert(nativeNumbers.length>0);for(const n of nativeNumbers)assert(failed?parseFloat(n.font)===parseFloat(n.base):parseFloat(n.font)>parseFloat(n.base),JSON.stringify({failed,n}));checks.nativeNumbers=nativeNumbers;
  if(width===390&&!failed)await page.screenshot({path:path.join(out,'quote-name-dpr3.png'),scale:'css'});
  await page.locator('[data-action="bottle"]').click();assert((await page.locator('#dialog-title').textContent()).startsWith(name));const saved=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY),description=saved.game.records.at(-1).description;assert.equal(saved.game.brands.at(-1).name,name);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.fontState!=='loading');await page.locator('button[data-room="sales"]').click();await page.locator('[data-product-id]').first().click();assert((await page.locator('#dialog-title').textContent()).startsWith(name));await page.locator('#close-dialog').click();await page.locator('#open-ledger').click();assert((await page.locator('#dialog-body').textContent()).includes(description));const reopened=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);assert.equal(reopened.game.records.at(-1).description,description);assert.equal(reopened.game.brands.at(-1).name,name);checks.savedText={name,description,unchanged:true};
  if(width===390&&!failed)await page.screenshot({path:path.join(out,'ledger-original-text-dpr3.png'),scale:'css'});
  if(width===360&&!failed){await page.evaluate(async KEY=>{const D=await import('./partner-orders.mjs'),B=await import('./tests/brands-helpers.mjs');let s=B.fill(D.newStaffDistillery(42),{progress:99,type:'bourbon'});for(let i=0;i<10&&!s.decisions.length;i++)s=D.tickDistillery(s);D.restoreDistillery(D.serializeDistillery(s));localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0}));},KEY);await page.reload();await page.waitForFunction(()=>document.querySelector('#action-dialog').dataset.kind==='decision');const decision=await page.locator('#action-dialog').textContent();assert(!decision.includes('木の移り'));assert.equal(await page.locator('[data-action="choose"][data-choice="wait"]').textContent(),'待つ');assert.equal(await page.locator('[data-action="choose"][data-choice="cool"] small').count(),0);checks.roughDecision={wait:'待つ',coolHintRemoved:true};}
  assert.deepEqual(errors,[]);results.push({width,height,dpr,failed,checks,errors});await page.close();
 }
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({cases:results.length,results},null,2));console.log(JSON.stringify({cases:results.length,passed:true}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
