// Font-only fault injection. No gameplay fixtures or game-wide E2E.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const root=path.resolve(new URL('../../../',import.meta.url).pathname),KEY='sukimastock.ambertime.wholesale.v18',out='/tmp/ambertime-font-recovery';await fs.mkdir(out,{recursive:true});
// Invoke an already-queued timeout even after success has cleared it.
const source=await fs.readFile(path.join(root,'works/ambertime/font-loader.mjs'),'utf8');
for(const fallbackFirst of [false,true]){
 const timers=new Map(),events=[],face={family:'AmberMisaki',status:'loading'};let id=0,resolveLoad;
 const doc={documentElement:{dataset:{}},fonts:{[Symbol.iterator]:function*(){yield face;},load:()=>new Promise(r=>{resolveLoad=r;}),addEventListener(){}},addEventListener(){},dispatchEvent(){events.push(doc.documentElement.dataset.fontState);}};
 const scope={document:doc,window:{addEventListener(){}},Event,URL,CSSRule:{FONT_FACE_RULE:5},setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key)};
 vm.runInNewContext(source.replaceAll('export const ','const ').replaceAll('import.meta.url',JSON.stringify('http://local/works/ambertime/font-loader.mjs')),scope);
 const timeout=[...timers.values()][0];if(fallbackFirst)timeout();face.status='loaded';resolveLoad([face]);await new Promise(r=>setImmediate(r));assert.equal(doc.documentElement.dataset.fontState,'ready');timeout();assert.equal(doc.documentElement.dataset.fontState,'ready');assert.deepEqual(events,fallbackFirst?['fallback','ready']:['ready']);
}
let fontRequests=0;
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://local').pathname;if(rel.endsWith('/'))rel+='index.html';const file=path.join(root,rel);res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf'})[path.extname(file)]??'application/octet-stream');if(rel.endsWith('misaki_gothic_2nd.ttf')){fontRequests++;res.setHeader('Cache-Control','public,max-age=31536000');}res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const{chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),url=`http://127.0.0.1:${server.address().port}/works/ambertime/`,results=[];
try{
 for(const mode of ['normal','delayed','network','http','decode','load-rejection','permanent']){
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));let requests=0;
  await p.addInitScript(({mode})=>{
   window.fontTrace={events:[],draws:{},measures:{},numberMeasures:{}};document.addEventListener('amber-font-change',()=>fontTrace.events.push(document.documentElement.dataset.fontState));
   const proto=CanvasRenderingContext2D.prototype,draw=proto.fillText,measure=proto.measureText;
   proto.fillText=function(...args){if(this.canvas.id==='scene-canvas'){const state=document.documentElement.dataset.fontState;fontTrace.draws[state]=(fontTrace.draws[state]??0)+1;}return draw.apply(this,args);};
   proto.measureText=function(text){const m=measure.call(this,text);if(this.canvas.id==='scene-canvas'&&text==='蒸留室')fontTrace.measures[document.documentElement.dataset.fontState]={width:m.width,font:this.font};if(this.canvas.id==='scene-canvas'&&text==='2026')fontTrace.numberMeasures[document.documentElement.dataset.fontState]={width:m.width,font:this.font};return m;};
   if(mode==='load-rejection'){const original=FontFaceSet.prototype.load;let first=true;FontFaceSet.prototype.load=function(...args){if(first){first=false;return Promise.reject(new Error('injected FontFaceSet.load rejection'));}return original.apply(this,args);};}
  },{mode});
  if(!['normal','load-rejection'].includes(mode))await p.route('**/fonts/misaki_gothic_2nd.ttf*',async route=>{requests++;if(mode==='delayed'){await new Promise(r=>setTimeout(r,2600));return route.continue();}if(mode==='permanent'||mode==='network'&&requests===1)return route.abort('failed');if(mode==='http'&&requests===1)return route.fulfill({status:503,body:'temporary font failure'});if(mode==='decode'&&requests===1)return route.fulfill({status:200,contentType:'font/ttf',body:'invalid font bytes'});return route.continue();});
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.dataset.fontState!=='loading');
  const saved=await p.evaluate(k=>localStorage.getItem(k),KEY);await p.locator('#open-aux-menu').click();
  if(mode==='delayed'){assert.equal(await p.locator('html').getAttribute('data-font-state'),'fallback');await p.screenshot({path:out+'/delayed-fallback.png',scale:'css'});}
  if(mode!=='permanent')await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
  else{await p.waitForFunction(()=>[...document.fonts].some(f=>f.family.replaceAll('"','')==='AmberMisaki'&&f.status==='error'));await p.waitForTimeout(6400);assert.equal(requests,3);await p.evaluate(()=>{for(let i=0;i<4;i++){dispatchEvent(new Event('online'));dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));}});await p.waitForTimeout(1600);assert.equal(requests,3);}
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const info=await p.evaluate(()=>{const state=document.documentElement.dataset.fontState,faces=[...document.fonts].filter(f=>f.family.replaceAll('"','')==='AmberMisaki');return{state,faces:faces.map(f=>f.status),body:getComputedStyle(document.body).fontFamily,modal:getComputedStyle(document.getElementById('action-dialog')).fontFamily,trace:fontTrace,overflow:document.getElementById('dialog-body').scrollWidth>document.getElementById('dialog-body').clientWidth};});
  assert.equal(info.faces.length,1);assert.equal(info.state,mode==='permanent'?'fallback':'ready');assert.equal(info.body.includes('AmberMisaki'),info.state==='ready');assert.equal(info.modal.includes('AmberMisaki'),info.state==='ready');assert(info.trace.draws[info.state]>0);assert(info.trace.measures[info.state]);assert.equal(info.overflow,false);assert(!info.trace.events.includes('loading'));assert.equal(info.trace.events.filter(x=>x==='ready').length,mode==='permanent'?0:1);
  if(mode==='delayed'){assert.deepEqual(info.trace.events,['fallback','ready']);assert(info.trace.draws.fallback>0);assert.notEqual(info.trace.numberMeasures.fallback.width,info.trace.numberMeasures.ready.width);await p.screenshot({path:out+'/delayed-ready.png',scale:'css'});}
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),saved);assert.equal(errors.length,0,errors.join('\n'));
  const coverage=await p.evaluate(async()=>{const{hasMisakiGlyph}=await import('./font-coverage.mjs');const input=document.createElement('input');input.value='𠮷髙😀é';document.getElementById('dialog-body').append(input);return{present:hasMisakiGlyph('蒸'),missing:!hasMisakiGlyph('𠮷'),value:input.value};});assert.deepEqual(coverage,{present:true,missing:true,value:'𠮷髙😀é'});
  if(mode==='normal'){
   const before=fontRequests;await p.goto(url+'?warm=1',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');assert.equal(fontRequests,before);await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
   await p.setViewportSize({width:1280,height:900});await p.locator('#open-aux-menu').click();assert(await p.locator('#action-dialog').isVisible());assert(await p.locator('#dialog-body').evaluate(e=>e.scrollWidth<=e.clientWidth));
  }
  results.push({mode,requests,...info});await p.close();
 }
 console.log(JSON.stringify({checks:['ready wins queued timeout (both orders)','normal, real warm cache and reload','late success, first network/HTTP/decode/load rejection recovery','permanent failure capped3 attempts and menu remains usable','one registered face; Canvas redraw/remeasure and HTML state agree','font-only saved bytes unchanged; missing glyph/input fallback preserved','minimalPC; no page errors'],results,limits:['Chromium390x844 touch emulation, synthetic lifecycle events only','Physical iPhone Safari/VoiceOver and real OS background/BFCache not tested','No gameplay E2E, long play or whole-game simulation']},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
