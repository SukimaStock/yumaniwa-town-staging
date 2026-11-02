// Focused saved native fixtures: proportional symbolic fill, real Canvas, one input smoke.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as D from '../partner-orders.mjs';
const root=path.resolve(new URL('../../../',import.meta.url).pathname);
const engine=process.env.AMBER_TOOL_ENGINE??'chromium';
const out=path.resolve(new URL('../design/gradual-glass/',import.meta.url).pathname,engine);
const KEY='sukimastock.ambertime.main.v1';
fs.mkdirSync(out,{recursive:true});
const baselineView=execFileSync('git',['show','d69ebf42:works/ambertime/distill-tools-view.mjs'],{cwd:root,encoding:'utf8'});
for(const name of ['partner-orders.mjs','model.mjs','economy.mjs','parameters.mjs'])assert.equal(fs.readFileSync(path.join(root,'works/ambertime',name),'utf8'),execFileSync('git',['show','d69ebf42:works/ambertime/'+name],{cwd:root,encoding:'utf8'}),'formal source unchanged '+name);
const fixtures={};
for(const end of [0,12,42,84]){let s=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));for(let n=0;n<end;n++)s=D.distillStep(s);fixtures['collect-'+end]=s;if(end>=12)fixtures['end-'+end]=D.stopDistillation(s);}
const serve=async old=>{const s=createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname;let f=path.join(root,name);if(name.endsWith('/'))f+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.json':'application/json','.svg':'image/svg+xml'})[path.extname(f)]??'application/octet-stream');res.end(old&&name==='/works/ambertime/distill-tools-view.mjs'?baselineView:fs.readFileSync(f));}catch{res.writeHead(404).end();}});await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;};
const servers={before:await serve(true),after:await serve(false)};
const {chromium,webkit}=await import(pathToFileURL(process.env.AMBER_BROWSER_MODULE).href);
const browser=engine==='webkit'?await webkit.launch({headless:true,executablePath:process.env.AMBER_WEBKIT_EXECUTABLE??'/tmp/count-webkit-run.sh'}):await chromium.launch({headless:true,executablePath:process.env.AMBER_BROWSER_EXECUTABLE??'/tmp/count-headless/chrome-linux/headless_shell',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];
try{
 for(const [width,height,reduced] of [[375,620,false],[360,568,true],[390,680,true]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const inject=async s=>page.evaluate(({KEY,envelope})=>localStorage.setItem(KEY,envelope),{KEY,envelope:JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0})});
  const capture=async(tag,s,{old=false,screenshot=true}={})=>{
   await inject(s);await page.reload({waitUntil:'load'});await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready'&&document.querySelector('#scene-root').dataset.distillTools);
   for(let n=0;n<8&&await page.locator('#action-dialog').isVisible();n++)await page.locator('#close-dialog').click();
   const g=await page.evaluate(()=>{const r=document.querySelector('#scene-root'),v=JSON.parse(r.dataset.viewport),tools=JSON.parse(r.dataset.distillTools),c=document.querySelector('#scene-canvas'),ctx=c.getContext('2d');const pixel=(x,y)=>{const p=ctx.getImageData(Math.floor((v.offsetX+x*v.scale)*v.dpr),Math.floor((v.offsetY+y*v.scale)*v.dpr),1,1).data;return '#'+[...p].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('');};const bands=Array.from({length:8},(_,i)=>pixel(tools.glassX+18,349.5+i*3)),palette=[tools.liquidColor??'#b8aa7c',tools.liquidHighlight??'#e7ddb6'];return {tools,bands,paintedRows:bands.filter(c=>palette.includes(c)).length,page:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},viewport:v};});
   const end=s.still.distillation.progress,start=s.still.distillation.collectStart??0,fill=old?.7:Math.min(1,(end-start)/84),expectedRows=fill>0?Math.max(1,Math.round(8*fill)):0;
   assert(Math.abs(g.tools.fill-(old?(end>0?.7:0):fill))<1e-12);assert.equal(g.paintedRows,old&&end===0?0:expectedRows,'actual 3px liquid rows');assert(g.page.w===width&&g.page.h===height,'no added page scrolling');assert.deepEqual(await page.evaluate(()=>window.amberPlacement.snapshot()),s);assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).game,KEY),JSON.parse(D.serializeDistillery(s)));
   if(screenshot)await page.screenshot({path:`${out}/${width}-${tag}.png`,scale:'css'});checks.push({width,height,reduced,tag,...g,formalSaveExact:true});return g;
  };
  await context.addInitScript(({KEY,envelope})=>{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,envelope);},{KEY,envelope:JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(fixtures['collect-0'])),userPaused:true,elapsed:0})});
  await page.goto(`http://127.0.0.1:${servers.after.address().port}/works/ambertime/`,{waitUntil:'load'});
  for(const key of ['collect-0','collect-12','collect-42','collect-84','end-12','end-84'])await capture(key,fixtures[key],{screenshot:width===375||['collect-42','end-12','collect-84'].includes(key)});
  if(width===375){
   // Real pointer tap calls the existing native stop once, preserving cut and save.
   await capture('tap-stop-before',fixtures['collect-12'],{screenshot:false});const box=await page.locator('#distill-glass').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForFunction(()=>window.amberPlacement.snapshot().still.phase==='filling');await page.waitForTimeout(160);assert.deepEqual(await page.evaluate(()=>window.amberPlacement.snapshot()),fixtures['end-12']);const short=await page.locator('#scene-root').evaluate(e=>JSON.parse(e.dataset.distillTools));assert.equal(short.fill,12/84);checks.push({tag:'real-touch-native-stop',fill:short.fill,formalSaveExact:true});
   const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
   await page.goto(`http://127.0.0.1:${servers.before.address().port}/works/ambertime/`,{waitUntil:'load'});await capture('before-collect-12',fixtures['collect-12'],{old:true});await capture('before-end-12',fixtures['end-12'],{old:true});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({engine,checks,errors,physicalSafari:false}));console.log(JSON.stringify({engine,checks:checks.length,errors}));
}finally{await browser.close();await Promise.all(Object.values(servers).map(s=>new Promise(r=>s.close(r))));}
