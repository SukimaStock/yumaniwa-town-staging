import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
// Instrument only the HTTP test response, never ship test hooks in the app.
const hook=`\nwindow.trafficTest={push:events=>automaticNews.push(events),inspect:()=>automaticNews.inspect(),state:()=>({room,userPaused,blocked:blocked(),month:game.core.month,modal:modal?.kind,map:m0.mode,clock:timer!==null}),map:mode=>m0.setMode(mode),reset:()=>automaticNews.reset(),pause:v=>{userPaused=v;render();schedule();},modal:kind=>openModal(kind),update:()=>{automaticNews.update();render();},hidden:v=>{Object.defineProperty(document,'hidden',{configurable:true,value:v});document.dispatchEvent(new Event('visibilitychange'));},saveText:()=>sessionText(game),generation:()=>generationState()};`;
test('real app notice lane, map/clock/modal/input and phone layouts',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:120000},async()=>{
 const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(name));if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+'/'))throw Error('path');let data=await readFile(file);if(file.endsWith('/shop-app.mjs'))data=Buffer.from(data.toString()+hook);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
 try{const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:680},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1&market-fixture=established`);await page.waitForFunction(()=>window.trafficTest&&window.amberPlacement?.snapshot()?.core);await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
 for(let i=0;i<8&&await page.locator('#action-dialog').evaluate(e=>e.open);i++)await page.locator('#close-dialog').click();await page.locator('[data-room="sales"]').click();
 const t=async(fn,arg)=>page.evaluate(fn,arg);const push=events=>t(events=>trafficTest.push(events),events);const op=n=>({id:'bottle:'+n,kind:'bottled',count:n}),news=n=>({id:'town:'+n,kind:'message',text:'町から連絡が届きました。 '+n}),daily=n=>({id:'daily:'+n,kind:'ambient',text:'今日も蒸留所の窓を開けました。'});
 // Paused intent survives ordinary modal and map observation.
 await t(()=>trafficTest.pause(true));await page.locator('#open-ledger').click();assert.equal((await t(()=>trafficTest.state())).blocked,true);await page.locator('#close-dialog').click();assert.equal((await t(()=>trafficTest.state())).userPaused,true);
 await t(()=>trafficTest.pause(false));await page.locator('#open-ledger').click();await page.locator('#close-dialog').click();assert.equal((await t(()=>trafficTest.state())).userPaused,false);
 for(const mode of ['half','full']){await t(mode=>trafficTest.map(mode),mode);await page.waitForTimeout(300);assert.equal((await t(()=>trafficTest.state())).blocked,false);const month=(await t(()=>trafficTest.state())).month;await page.waitForFunction(m=>trafficTest.state().month>m,month,{timeout:15000});await push([news(mode)]);assert(await page.locator('#automatic-news').isHidden());}
 await t(()=>{trafficTest.pause(true);trafficTest.map('closed');});await page.locator('#automatic-news').waitFor({state:'visible'});assert.match(await page.locator('#automatic-news').innerText(),/full/);
 // Immediate occlusion keeps the latest news; no hidden timer expires it.
 await t(()=>{trafficTest.reset();trafficTest.push([{id:'town:occlusion',kind:'message',text:'遮蔽前の知らせ'}]);trafficTest.map('full');});await page.waitForTimeout(6800);assert(await page.locator('#automatic-news').isHidden());await t(()=>trafficTest.map('closed'));await page.locator('#automatic-news').waitFor({state:'visible'});assert.match(await page.locator('#automatic-news').innerText(),/遮蔽前/);
 await t(()=>trafficTest.reset());await push([op(12)]);await push([news(12),daily(12)]);assert.match(await page.locator('#automatic-news').innerText(),/12本/);await page.waitForTimeout(3650);assert.match(await page.locator('#automatic-news').innerText(),/町から/);assert.equal(await page.locator('#automatic-news').getAttribute('role'),'status');assert.equal(await page.locator('#automatic-news').getAttribute('tabindex'),'0');
 // A notice without a route closes on tap, without moving room or layer.
 const beforeDismiss=await t(()=>trafficTest.state());await page.locator('#automatic-news').dispatchEvent('click');assert(await page.locator('#automatic-news').isHidden());const afterDismiss=await t(()=>trafficTest.state());assert.equal(afterDismiss.room,beforeDismiss.room);assert.equal(afterDismiss.map,beforeDismiss.map);
 const output=process.env.AMBER_BROWSER_OUTPUT??'/tmp/amber-traffic-browser';await mkdir(output,{recursive:true});
 const examples=['お知らせが届きました。','全国の飲食のつながりへ、『AmberTime・第3回』の口コミが届きました。同じきっかけで、別の取引先にも評判が伝わりました。','北の海沿いの町とその周辺にある飲食店のつながりへ、『とても長い名前の蒸留所で造ったウイスキーの最初の発売・第123回』の口コミが届きました。新しい問い合わせを確認できます。'];
 for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){
 await page.setViewportSize({width,height});
 for(const [i,text] of examples.entries()){
 await t(()=>trafficTest.reset());await push([{id:'town:long-'+width+'-'+i,kind:'message',text}]);await page.waitForTimeout(1200);
 const g=await page.locator('#automatic-news').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);return {r:e.getBoundingClientRect().toJSON(),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,lines:[...range.getClientRects()].map(r=>r.toJSON()),text:e.textContent};});
 assert(g.r.left>=-1&&g.r.right<=width+1&&g.r.top>=0&&g.r.bottom<=height,JSON.stringify(g));assert(g.sw<=g.cw+1&&g.sh<=g.ch+1,JSON.stringify(g));
 assert(g.text.endsWith(text));assert(g.lines.every(r=>r.top>=g.r.top-1&&r.bottom<=g.r.bottom+1),JSON.stringify(g));
 const controls=await page.locator('#open-aux-menu').boundingBox();assert(g.r.bottom<controls.y,JSON.stringify({g,controls}));
 }
 // The original queue owns one long event: full text is retained, while only
 // an exceptionally tall native card captures vertical scroll in its bounds.
 const long='長い地域名と商品名を含む口コミの最後まで確認します。'.repeat(24)+'ここが知らせの最後です。';
 await t(()=>trafficTest.reset());await push([{id:'town:extreme-'+width,kind:'message',text:long}]);await page.waitForTimeout(1200);
 const longCard=page.locator('#automatic-news');assert.equal(await longCard.getAttribute('data-overflow'),'true');assert.equal(await longCard.evaluate(e=>getComputedStyle(e).pointerEvents),'auto');assert((await longCard.textContent()).endsWith(long));
 await longCard.evaluate(e=>{e.scrollTop=e.scrollHeight;});assert(await longCard.evaluate(e=>e.scrollTop>0&&e.scrollTop+e.clientHeight>=e.scrollHeight-1));
 const bounds=await longCard.boundingBox(),controls=await page.locator('#open-aux-menu').boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<controls.y);
 assert.equal((await t(()=>trafficTest.inspect())).displayed,1,'scrolling does not redisplay or duplicate the event');
 await page.locator('#automatic-news-close').click();assert(await longCard.isHidden());assert(await page.locator('#automatic-news-close').isHidden());
 const hit=await page.locator('#open-aux-menu').evaluate(e=>{const r=e.getBoundingClientRect(),node=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return node===e||e.contains(node);});assert(hit,'controls remain available after leaving long notice');
 await page.screenshot({path:path.join(output,`news-${width}.png`)});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await t(()=>trafficTest.reset());await push([daily('reduced')]);await page.waitForTimeout(100);assert.equal(await page.locator('#automatic-news').evaluate(e=>getComputedStyle(e).animationName),'none');await page.waitForTimeout(3000);assert(await page.locator('#automatic-news').isVisible());
 await t(()=>trafficTest.hidden(true));assert(await page.locator('#automatic-news').isHidden());assert.equal((await t(()=>trafficTest.state())).clock,false);await t(()=>trafficTest.hidden(false));assert.equal((await t(()=>trafficTest.state())).userPaused,true);
 await page.reload();await page.waitForFunction(()=>window.trafficTest&&window.amberPlacement?.snapshot()?.core);assert.equal((await t(()=>trafficTest.inspect())).pending.length,0);assert(await page.locator('#automatic-news').isHidden());assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
