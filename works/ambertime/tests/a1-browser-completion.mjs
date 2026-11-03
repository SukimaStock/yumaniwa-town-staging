// Actual application + dual-engine completion, save and bounded pixel comparison.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
const root=path.resolve(new URL('../../../',import.meta.url).pathname),KEY='sukimastock.ambertime.main.v1';
const out=path.join(root,'works/ambertime/design/experience-a1-2026-11-03');fs.mkdirSync(out,{recursive:true});
const pw=await import(process.env.AMBER_BROWSER_MODULE??'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const app=fs.readFileSync(path.join(root,'works/ambertime/shop-app.mjs'),'utf8'),specifier=app.match(/from\s*'([^']*canvas-scene[^']*)'/)[1];
let state=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(state.still.distillation.progress<20)state=D.distillStep(state);const expected=D.serializeDistillery(D.stopDistillation(state));
const server=createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname;if(name==='/blank/'){res.end('<html></html>');return;}const rel=decodeURIComponent(name).replace(/^\//,'')+(name.endsWith('/')?'index.html':'');const f=path.join(root,rel);assert(f.startsWith(root+'/'));res.setHeader('Content-Type',f.endsWith('.mjs')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const wkWrapper=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'amber-a1-webkit-')),'webkit-run.sh');fs.copyFileSync(path.join(root,'works/ambertime/design/refactor-r4-2026-11-03/browser/environment/webkit-run.sh'),wkWrapper);fs.chmodSync(wkWrapper,0o700);
const cases=[],natural=[],errors=[],configs=[{w:360,h:568,dpr:1},{w:375,h:620,dpr:2},{w:390,h:680,dpr:3},{w:430,h:740,dpr:2},{w:390,h:680,dpr:2,reduced:true}];
function write(){fs.writeFileSync(path.join(out,'glint-browser-results.json'),JSON.stringify({cases,natural,errors,runnerSHA256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),unverified:['Physical iPhone Safari/touch feel/VoiceOver','Real OS background and BFCache; pagehide/visibility cases are synthetic']},null,2)+'\n');}
try{for(const engine of (process.env.AMBER_A1_ENGINES??'chromium,webkit').split(',')){
 const browser=await pw[engine].launch(engine==='chromium'?{headless:true,executablePath:process.env.AMBER_BROWSER_EXECUTABLE??'/root/.cache/ms-playwright/chromium_headless_shell-1193/chrome-linux/headless_shell',args:['--no-sandbox']}:{headless:true,executablePath:wkWrapper});
 try{for(const cfg of configs){for(const duration of cfg===configs[0]?[250,300,400]:[250]){
 const p=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},deviceScaleFactor:cfg.dpr,hasTouch:true,reducedMotion:cfg.reduced?'reduce':'no-preference'});p.on('pageerror',e=>errors.push({engine,message:e.message}));
 await p.clock.install({time:new Date('2026-11-03T10:00:00Z')});await p.clock.pauseAt(new Date('2026-11-03T10:00:01Z'));await p.addInitScript(()=>{window.glintNow=1000;Object.defineProperty(performance,'now',{configurable:true,value:()=>window.glintNow});});
 await p.goto(origin+'/blank/');await p.evaluate(({key,game})=>{localStorage.setItem(key,JSON.stringify({version:2,game,userPaused:true,elapsed:0}));localStorage.setItem(key+'.map-reveal.v1',JSON.stringify({version:2,shown:6,announced:6}));},{key:KEY,game:JSON.parse(D.serializeDistillery(state))});await p.goto(origin+'/works/ambertime/');await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(40);await p.waitForFunction(()=>window.amberPlacement&&document.documentElement.dataset.fontState==='ready',{},{polling:100});
 await p.evaluate(async({specifier,duration,key})=>{const {CanvasScene}=await import(new URL(specifier,location.href));window.glintEvents=[];const draw=CanvasScene.prototype.draw;CanvasScene.prototype.draw=function(...args){window.glintScene=this;return draw.apply(this,args);};const start=CanvasScene.prototype.startDistillCompletion;CanvasScene.prototype.startDistillCompletion=function(id,cb){window.glintEvents.push({kind:'arm',at:performance.now(),savedPhase:JSON.parse(localStorage.getItem(key)).game.still.phase});return start.call(this,id,x=>{window.glintEvents.push({kind:'complete',at:performance.now()});cb(x);},duration);};document.dispatchEvent(new Event('amber-font-change'));},{specifier,duration,key:KEY});await p.clock.runFor(40);
 await p.locator('#distill-glass').evaluate(n=>n.click());
 const saved=await p.evaluate(k=>localStorage.getItem(k),KEY);assert.equal(D.serializeDistillery(await p.evaluate(()=>window.amberPlacement.snapshot())),expected);assert.equal(JSON.parse(saved).game.still.phase,'filling');
 const phases=[];for(const elapsed of [0,140,150,200,duration-30,duration,duration+100]){
 await p.evaluate(n=>{window.glintNow=1000+n;document.dispatchEvent(new Event('amber-font-change'));},elapsed);await p.clock.runFor(25);
 const sample=await p.evaluate(({key,elapsed})=>{const s=window.glintScene,d=document.getElementById('action-dialog');return {elapsed,step:s.completionStep,active:!!s.distillCompletion,dialog:d.open?d.dataset.kind:null,saved:localStorage.getItem(key),clockPending:window.amberPlacement.diagnostics().clockPending};},{key:KEY,elapsed});assert.equal(sample.saved,saved,'presentation never changes saved bytes');assert.equal(sample.clockPending,false);delete sample.saved;phases.push(sample);
 if(!cfg.reduced&&elapsed===150){
  const pixels=await p.evaluate(()=>{const s=window.glintScene,c=s.worldCtx,a=c.getImageData(0,0,120,214).data,original=s.paintDistillCompletion,controls=document.getElementById('scene-root').dataset.hitRegions;let count=0,outside=0;try{s.paintDistillCompletion=()=>{};s.worldKey=null;s.draw();const b=c.getImageData(0,0,120,214).data,x=Math.round(s.toolPaintX/3),y=345/3;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3]){count++;const px=i/4%120,py=Math.floor(i/4/120);if(!(py===y&&px>=x+3&&px<x+8))outside++;}return {count,outside,controlsUnchanged:controls===document.getElementById('scene-root').dataset.hitRegions};}finally{s.paintDistillCompletion=original;s.worldKey=null;s.draw();}});assert.equal(pixels.count,2);assert.equal(pixels.outside,0);assert(pixels.controlsUnchanged);phases.at(-1).pixels=pixels;
  if(cfg===configs[0])await p.screenshot({path:path.join(out,`glint-${engine}-${duration}-150ms.png`),scale:'css'});
 }
 if(cfg.reduced)assert.equal(sample.dialog,'fill');else assert.equal(sample.dialog,elapsed>=duration?'fill':null);
 }
 const events=await p.evaluate(()=>window.glintEvents);assert.equal(events[0].savedPhase,'filling');assert.equal(events.length,cfg.reduced?1:2);cases.push({engine,version:browser.version(),...cfg,duration,phases,events});await p.close();write();
 }}
 // Uninjected clock: observe the shipped motionTimer/RAF and real pointer input.
 for(const mode of ['normal-1','normal-2','normal-3','hidden','pagehide','room','modal','reload']){
 const p=await browser.newPage({viewport:{width:390,height:680},deviceScaleFactor:2,hasTouch:true});p.on('pageerror',e=>errors.push({engine,mode,message:e.message}));
 await p.goto(origin+'/blank/');await p.evaluate(({key,game})=>{localStorage.setItem(key,JSON.stringify({version:2,game,userPaused:true,elapsed:0}));localStorage.setItem(key+'.map-reveal.v1',JSON.stringify({version:2,shown:6,announced:6}));},{key:KEY,game:JSON.parse(D.serializeDistillery(state))});await p.goto(origin+'/works/ambertime/');await p.waitForFunction(()=>window.amberPlacement&&document.documentElement.dataset.fontState==='ready');
 await p.evaluate(async({specifier,key})=>{
  const {CanvasScene}=await import(new URL(specifier,location.href));window.naturalEvents=[];window.completed=0;
  const mark=(kind,data={})=>window.naturalEvents.push({kind,at:performance.now(),...data}),start=CanvasScene.prototype.startDistillCompletion,paint=CanvasScene.prototype.paintDistillCompletion;
  CanvasScene.prototype.startDistillCompletion=function(id,cb){mark('arm',{savedPhase:JSON.parse(localStorage.getItem(key)).game.still.phase});return start.call(this,id,x=>{window.completed++;mark('complete');cb(x);});};
  CanvasScene.prototype.paintDistillCompletion=function(...args){if(this.completionStep&&this.completionStep!==window.naturalStep){window.naturalStep=this.completionStep;mark('paint',{step:this.completionStep});}return paint.apply(this,args);};
  new MutationObserver(()=>{const d=document.getElementById('action-dialog');if(d.open&&d.dataset.kind==='fill'&&!window.naturalFill){window.naturalFill=true;mark('fill');}}).observe(document.getElementById('action-dialog'),{attributes:true,attributeFilter:['open']});
 },{specifier,key:KEY});
 await p.locator('#distill-glass').click();const saved=await p.evaluate(k=>localStorage.getItem(k),KEY);assert.equal(D.serializeDistillery(await p.evaluate(()=>window.amberPlacement.snapshot())),expected);
 if(mode.startsWith('normal'))await p.waitForFunction(()=>window.completed===1&&document.getElementById('action-dialog').open);
 else if(mode==='reload'){await p.reload();await p.waitForFunction(()=>window.amberPlacement&&document.documentElement.dataset.fontState==='ready');assert.equal(await p.locator('#action-dialog').evaluate(n=>n.open),false);}
 else{
  if(mode==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  if(mode==='pagehide')await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  if(mode==='room')await p.locator('#room-nav [data-room=warehouse]').evaluate(n=>n.click());
  if(mode==='modal')await p.locator('#open-ledger').evaluate(n=>n.click());
  await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.completed),0,mode+' cancels stale transition');
 }
 const events=await p.evaluate(()=>window.naturalEvents??[]),after=await p.evaluate(k=>localStorage.getItem(k),KEY);assert.equal(after,saved,mode+' presentation keeps save');
 if(mode.startsWith('normal')){assert.deepEqual(events.map(x=>x.kind),['arm','paint','paint','complete','fill']);assert.equal(events[0].savedPhase,'filling');const span=events[3].at-events[0].at;assert(span>=250&&span<650,engine+' natural completion '+span);natural.push({engine,version:browser.version(),mode,events,duration:span});}else natural.push({engine,version:browser.version(),mode,events,canceled:true,syntheticLifecycle:mode==='hidden'||mode==='pagehide'});
 await p.close();write();
 }
 }finally{await browser.close();}
}assert.deepEqual(errors,[]);write();console.log(JSON.stringify({passed:true,cases:cases.length}));}catch(e){errors.push({runner:e.stack});write();throw e;}finally{await new Promise(r=>server.close(r));}
