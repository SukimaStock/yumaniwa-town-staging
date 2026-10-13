#!/usr/bin/env node
// Developer-only measurement. No application imports/changes or synthetic registrations.
// NODE_PATH may point to the existing Playwright installation; no package installation required.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const url=new URL(option('--url','http://127.0.0.1:8765/works/sukima-3d-lab/'));
url.searchParams.set('debug','');
const profile=option('--profile','all');if(!['all','desktop','mobile'].includes(profile))throw Error('--profile must be all, desktop or mobile');
const expected=Number(option('--expected-count','')),trials=Number(option('--trials','3')),out=option('--out','');
if(!Number.isInteger(expected)||expected<99||expected>1000||!Number.isInteger(trials)||trials<1||trials>10||!out)throw Error('Use --expected-count 99..1000 --out /outside-repo/result.json [--trials 3]');
const root=path.resolve(__dirname,'../../..');
if(path.resolve(out).startsWith(root+path.sep))throw Error('Store measurement evidence outside the repository');
const percentile=(a,q)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.ceil(a.length*q)-1)]:null;
const report={schema:'sukima-collection-measurement/1',at:new Date().toISOString(),expected,trials,profile,url:String(url),environment:{platform:os.platform(),cpus:os.cpus().length,source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),renderer:'Chromium SwiftShader; CDP mobile equivalent, not physical iPhone/Safari',network:'unthrottled; record URL/server with comparisons'},samples:[]};
function save(){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
(async()=>{let browser;
try{
 browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.environment.browser=browser.version();
 for(const mobile of (profile==='all'?[false,true]:[profile==='mobile']))for(let trial=1;trial<=trials;trial++){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:900,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await cdp.send('Performance.enable');await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});
 await page.addInitScript(expected=>{
  performance.setResourceTimingBufferSize(4096);
  window.__measurement={longTasks:[],ready:null};
  new PerformanceObserver(list=>{for(const e of list.getEntries())__measurement.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
  new MutationObserver(()=>{if(__measurement.ready===null&&document.querySelectorAll('.specimen-card:enabled').length===expected&&document.querySelector('#collection-status')?.hidden)requestAnimationFrame(()=>requestAnimationFrame(()=>{__measurement.ready??=performance.now();}));}).observe(document,{childList:true,subtree:true,attributes:true});
 },expected);
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','JSEventListeners'].includes(m.name)).map(m=>[m.name,m.value]));
 for(const cache of ['cold','warm']){
 await cdp.send('Network.setCacheDisabled',{cacheDisabled:cache==='cold'});
 if(cache==='cold')await page.goto(String(url));else await page.reload();
 await page.waitForFunction(()=>window.__measurement?.ready!==null,null,{timeout:180000});
 const sample={profile:mobile?'mobile-equivalent':'desktop',trial,cache,cpuThrottle:mobile?4:1,viewport:page.viewportSize(),dpr:mobile?2:1};
 Object.assign(sample,await page.evaluate(()=>{const r=performance.getEntriesByType('resource').filter(e=>/\/objects\/[^/]+\.json(?:\?|$)/.test(e.name)),last=Math.max(...r.map(e=>e.responseEnd));return {cards:document.querySelectorAll('.specimen-card:enabled').length,allCardsTwoRafMs:__measurement.ready,lastObjectResponseMs:last,postFetchValidationPreviewDomMs:__measurement.ready-last,objectFetchCount:r.length,objectTransferBytes:r.reduce((s,e)=>s+e.transferSize,0),loadLongTasks:__measurement.longTasks.slice(),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};}));
 if(sample.cards!==expected||sample.objectFetchCount!==expected||sample.horizontalOverflow)throw Error('Collection integrity/overflow failure');
 sample.heapAfterLoad=await metrics();
 // Measure actual visible scrolling with RAF intervals. No arbitrary performance pass threshold.
 const scrollDistance=await page.evaluate(()=>{const el=document.querySelector('#collection-view');el.scrollTop=0;__measurement.scrollFrames=[];__measurement.maxScrollTop=0;__measurement.scrolling=true;let last=performance.now();function frame(now){if(!__measurement.scrolling)return;__measurement.scrollFrames.push(now-last);__measurement.maxScrollTop=Math.max(__measurement.maxScrollTop,el.scrollTop);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);return el.scrollHeight-el.clientHeight;});
 const viewport=page.viewportSize();
 for(const sign of [-1,1]){
  if(!mobile){await cdp.send('Input.synthesizeScrollGesture',{x:viewport.width/2,y:viewport.height/2,yDistance:sign*(scrollDistance+viewport.height),speed:Math.ceil(Math.max(3000,scrollDistance/2)),gestureSourceType:'mouse'});continue;}
  // Touch gestures must stay inside the viewport; one oversized synthetic drag can be clipped.
  const limit=Math.ceil(scrollDistance/(viewport.height*.45))*2+8;
  for(let step=0;step<limit;step++){
   const top=await page.locator('#collection-view').evaluate(el=>el.scrollTop);
   if(sign<0?top>=scrollDistance-2:top<=2)break;
   const start=viewport.height*(sign<0?.80:.25),end=viewport.height*(sign<0?.25:.80),x=viewport.width/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*i/8}]});await page.waitForTimeout(16);}
   await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(40);
  }
 }

 await page.waitForTimeout(200);
 sample.scroll=await page.evaluate(()=>{__measurement.scrolling=false;const el=document.querySelector('#collection-view');return {frames:__measurement.scrollFrames,maxTop:__measurement.maxScrollTop,finalTop:el.scrollTop,extent:el.scrollHeight-el.clientHeight};});
 if(sample.scroll.maxTop<scrollDistance-2||sample.scroll.finalTop>2){report.failedSample=sample;throw Error('Full collection scroll did not reach bottom and return');}
 sample.scroll.p95FrameMs=percentile(sample.scroll.frames,.95);sample.scroll.maxFrameMs=Math.max(...sample.scroll.frames);
 await cdp.send('HeapProfiler.collectGarbage');sample.heapBeforeSelectionCyclesAfterGc=await metrics();
 const card=page.locator('.specimen-card').filter({hasText:'中庭の丸ハンドル水栓'});if(await card.count()!==1)throw Error('Stable control specimen missing');
 for(let cycle=0;cycle<10;cycle++){
  await card.scrollIntoViewIfNeeded();await page.evaluate(()=>{document.addEventListener('click',()=>{__measurement.selectedAt=performance.now();},{capture:true,once:true});});
  await card.click();await page.waitForFunction(()=>window.touchLab?.manipulation?.controls?.length===1);
  const ready=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-__measurement.selectedAt)))));
  await page.evaluate(()=>{const host=document.querySelector('#debug-host');if(host)host.style.pointerEvents='none';});
  const gesture=await page.evaluate(async()=>{
   const {add,sub,scale,rotate,inverse}=await import('./engine/math.js?v=0.7.0');const {composePartPose}=await import('./engine/parts.js?v=0.7.0');
   const p=touchLab.manipulation,c=p.controls[0],part=p.parts.find(q=>q.id===c.part),rect=document.querySelector('#solid').getBoundingClientRect(),view=touchLab.body.pose(),pose=p.pose(part);let best=null;
   for(let y=rect.top+rect.height*.2;y<Math.min(innerHeight-20,rect.bottom-rect.height*.15);y+=13)for(let x=rect.left+rect.width*.12;x<rect.right-rect.width*.12;x+=13){const hit=touchLab.pick(x,y);if(hit?.part!==c.part)continue;const a=rotate(inverse(pose.orientation),sub(scale(hit.point,1/p.scale),pose.position));const q=composePartPose(part,c,c.value+.12),target=touchLab.camera.project(scale(add(rotate(q.orientation,a),q.position),p.scale),rect,view),score=Math.hypot(target[0]-x,target[1]-y);if(!best||score>best.score)best={start:[x,y],target,score};}
   if(!best)throw Error('No visible stable control');__measurement.before=c.value;document.querySelector('#solid').addEventListener('pointerdown',()=>{__measurement.pointerAt=performance.now();},{once:true});return best;
  });
  if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gesture.start[0],y:gesture.start[1]}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:gesture.target[0],y:gesture.target[1]}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(...gesture.start);await page.mouse.down();await page.mouse.move(...gesture.target);await page.mouse.up();}
  const change=await page.evaluate(()=>({changed:Math.abs(touchLab.manipulation.controls[0].value-__measurement.before)>.02,pointerToObservedChangeMs:performance.now()-__measurement.pointerAt,selectionToObservedChangeMs:performance.now()-__measurement.selectedAt,gl:touchLab.renderer.gl.getError()}));
  if(!change.changed||change.gl!==0)throw Error('First operation or WebGL failed');
  (sample.selectionCycles??=[]).push({selectionToTwoRafMs:ready,...change});await page.locator('#back').click();
 }
 await cdp.send('HeapProfiler.collectGarbage');sample.heapAfterSelectionCyclesAfterGc=await metrics();sample.errors=errors.slice();if(errors.length)throw Error(errors.join('\n'));
 if(trial===1&&cache==='warm')sample.warmPreviewMicrobenchmark=await page.evaluate(async()=>{
  const {previewRaster,previewSvg}=await import('./preview.js?v=0.7.0');const manifest=await fetch('./collection.json').then(r=>r.json()),definitions=[];
  for(const it of manifest.items)definitions.push(await fetch(it.file).then(r=>r.json()));
  const timings=[];for(const d of definitions){const start=performance.now();if(d.schema.endsWith('/2'))previewRaster(d,200);else previewSvg(d);timings.push({id:d.id,ms:performance.now()-start});}
  return {label:'Separate warm CPU preview pass, excludes fetch and DOM; not cold-load preview time',count:timings.length,totalMs:timings.reduce((s,t)=>s+t.ms,0),timings};
 });
 report.samples.push(sample);save();console.log(`${sample.profile} ${trial} ${cache}: ${sample.allCardsTwoRafMs.toFixed(0)}ms, ${sample.cards} cards, scroll p95 ${sample.scroll.p95FrameMs.toFixed(1)}ms`);
 }
 await context.close();
 }
 report.complete=true;save();
}catch(error){report.complete=false;report.failure=String(error.stack||error);save();throw error;}finally{await browser?.close();}
})();
