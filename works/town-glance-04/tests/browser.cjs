const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true});
 const errors=[],requests=[];
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));});
 const observer=await context.newPage();await observer.goto(url+'observer.html');const popupPromise=context.waitForEvent('page');await observer.locator('#launch').tap();const page=await popupPromise;
 // The popup can be created before the wait; use the known context inventory.
 const subject=page||context.pages().find(p=>p!==observer);await subject.waitForLoadState();
 const phase=async()=>subject.locator('body').getAttribute('data-phase');
 const wait=state=>subject.waitForFunction(state=>document.body.dataset.phase===state,state);
 const shot=async name=>{if(process.env.TOWN04_SCREENSHOTS)await subject.screenshot({path:path.join(process.env.TOWN04_SCREENSHOTS,name+'.png')});};
 const noLeak=async()=>{assert.ok(await subject.locator('#station').isHidden());assert.ok(await subject.locator('#tower').isHidden());const text=await subject.locator('body').innerText();for(const word of ['条件','方向一致','不一致','正解','スコア','XP','ms'])assert.ok(!text.includes(word));};
 await shot('initial');assert.equal(await phase(),'intro');await subject.locator('#action').tap();
 const sequence=['A','B','C','C','B','A'];
 for(let i=0;i<6;i++){
  assert.equal(await phase(),'exposure');assert.equal(await subject.locator('#station').isVisible(),sequence[i]==='B');assert.equal(await subject.locator('#tower').isVisible(),sequence[i]==='C');
  if(i<3)await shot('cue-'+sequence[i]);
  await wait('baseline');await noLeak();
  const before=i===1?'unknown':i<3?'0':'1';await subject.locator(`[data-answer="${before}"]`).tap();assert.equal(await phase(),'turn');await noLeak();assert.equal(await subject.locator('#answers').isVisible(),false);
  if(i===0){await subject.locator('[data-answer="3"]').evaluate(b=>b.click());assert.equal(await phase(),'turn','response ignored during rotation');}
  await wait('answer');await noLeak();if(i===0)await shot('after-turn');
  const heading=await subject.locator('#heading').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return [m.a,m.b,m.c,m.d];});const expected=i<3?[0,1,-1,0]:[0,1,-1,0];for(let k=0;k<4;k++)assert.ok(Math.abs(heading[k]-expected[k])<.01,'self rotates by one fixed-world quarter-turn');
  await subject.locator(`[data-answer="${i===0?'unknown':i===2?'0':i<3?'3':'2'}"]`).tap();
  if(i<5){assert.equal(await phase(),'between');await subject.locator('#action').tap();}else assert.equal(await phase(),'done');
 }
 await observer.bringToFront();await observer.waitForFunction(()=>document.querySelectorAll('#rows tr').length===6);
 assert.match(await observer.locator('#rows').innerText(),/わからない/);assert.match(await observer.locator('#rows').innerText(),/保持を確認できず/);assert.match(await observer.locator('#rows').innerText(),/方向不一致/);
 await observer.locator('textarea').first().fill('<script>not executed</script>');
 const downloadPromise=observer.waitForEvent('download');await observer.locator('#export').click();const downloaded=await downloadPromise;const record=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));
 assert.equal(record.records.length,6);assert.equal(record.records[0].observerNote,'<script>not executed</script>');assert.equal(record.records[0].outcome,'unknown');assert.equal(record.records[1].baselineUnderstood,false);
 for(const r of record.records){assert.ok(r.beforeMs>=0&&r.afterMs>=0);assert.ok(r.exposureActualMs>=2400);assert.ok(r.turnActualMs>=600);}
 const recordPopup=context.waitForEvent('page');await subject.locator('#record').tap();const separate=await recordPopup;await separate.waitForFunction(()=>document.querySelectorAll('#rows tr').length===6);assert.ok(await separate.locator('#export').isEnabled());await separate.close();
 await subject.reload();assert.equal(await phase(),'intro','reload clears participant memory');
 await subject.locator('#action').tap();await wait('baseline');
 await subject.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await phase(),'paused');
 await subject.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await subject.locator('#action').tap();await wait('baseline');await subject.locator('[data-answer="0"]').tap();await wait('answer');await subject.locator('[data-answer="unknown"]').tap();
 await observer.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);assert.match(await observer.locator('#rows').innerText(),/中断: document-hidden/);assert.match(await observer.locator('#rows').innerText(),/1 \/ 2/);
 assert.ok(requests.every(r=>r.startsWith(url)),'no external request');assert.equal(await subject.evaluate(()=>localStorage.length+sessionStorage.length),0);
 console.log('Full phone session: three conditions, six trials, cue concealment, ignored early taps, memory records, export, interruption/retry, reload PASS');
 await context.close();
 for(const viewport of [{width:375,height:667},{width:320,height:568},{width:390,height:600},{width:844,height:390},{width:1280,height:900}]){
  const p=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:true});p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'?order=BAC&mirror=1');await p.locator('#action').tap();await p.waitForFunction(()=>document.body.dataset.phase==='baseline');
  for(const b of await p.locator('#answers button').all()){const bounds=await b.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44);await b.scrollIntoViewIfNeeded();assert.ok(await b.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el;}));}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(viewport.height>=568)assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'phone single screen');
  if(process.env.TOWN04_SCREENSHOTS)await p.screenshot({path:path.join(process.env.TOWN04_SCREENSHOTS,`${viewport.width}-${viewport.height}-answers.png`)});
  await p.locator('[data-answer="0"]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.body.dataset.phase==='answer');await p.locator('[data-answer="1"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('body').getAttribute('data-phase'),'between');
  console.log(`${viewport.width}x${viewport.height}: layout, targets, keyboard and turn PASS`);await p.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
