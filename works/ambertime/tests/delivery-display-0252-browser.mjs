// Targeted existing-modal checks. Legal model fixtures are built in this browser;
// minimum-stock edge displays reuse614 component data and never become save data.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('../../../',import.meta.url).pathname),KEY='sukimastock.ambertime.wholesale.v20';
const output=process.env.AMBERTIME_OUTPUT??path.join(root,'works/ambertime/design/delivery-display-0252/browser-results.json');
const server=createServer(async(req,res)=>{try{let file=path.join(root,new URL(req.url,'http://localhost').pathname);if(file.endsWith('/'))file+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.woff2':'font/woff2','.json':'application/json'})[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=process.env.AMBERTIME_URL??`http://127.0.0.1:${server.address().port}/works/ambertime/`;
const browser=await chromium.launch({headless:true,executablePath:process.env.AMBERTIME_CHROME??'/tmp/amber-chromium/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[],fixtures={},publishedHashes={};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'?delivery0252='+Date.now());await p.evaluate(()=>document.fonts.ready);
 if(process.env.AMBERTIME_URL)await Promise.all(['index.html','shop-app.mjs','shop-order-view.mjs','partner-orders.mjs','shop-demand.mjs','runtime-clock.mjs','canvas-scene.mjs'].map(async f=>{const response=await p.request.get(new URL(f+'?verify='+Date.now(),url).href);assert.equal(response.status(),200,f);const actual=createHash('sha256').update(await response.body()).digest('hex'),expected=createHash('sha256').update(await fs.readFile(path.join(root,'works/ambertime',f))).digest('hex');assert.equal(actual,expected,'published source '+f);publishedHashes[f]=actual;}));
 Object.assign(fixtures,await p.evaluate(async()=>{
  const D=await import('./partner-orders.mjs?v=0.25.1-performance'),H=await import('./tests/brands-helpers.mjs');const old=await(await fetch('./tests/fixtures/shop-demand-legacy.json')).json();
  const quiet=s=>{s=D.enableStage4(s);for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);return s;};
  const raw=s=>D.serializeDistillery(quiet(s));
  const base=quiet(D.enableShopDemand(D.restoreDistillery(old.before))),shipped=quiet(D.tickDistillery(base));let zero=shipped,shortage=shipped;
  for(let i=0;i<18&&!zero.shopDemand.lastOrders.some(o=>o.shopId==='town-liquor'&&o.reason==='zero-demand');i++)zero=quiet(D.tickDistillery(zero));
  for(let i=0;i<18&&!shortage.shopDemand.lastOrders.some(o=>o.shopId==='town-liquor'&&o.unmet>0);i++)shortage=quiet(D.tickDistillery(shortage));
  let offer=H.advance(H.fill(D.newShopDemandDistillery(42),{progress:65}),12),id=offer.core.casks[0].id;
  for(let i=0;i<3;i++){offer=D.bottleBranded(offer,id,{},14);offer=D.listBottles(D.setSalePrice(offer,'low',offer.result.productId),offer.result.productId);offer=H.advance(offer,1);}const offerUnconnected=H.advance(offer,1);offer=quiet(offerUnconnected);if(offer.shop.offer?.shopId!=='town-liquor')throw Error('natural offer');
  let same=D.bottleBranded(base,base.core.casks.at(-1).id,{},5);same=D.listBottles(same,same.result.productId);const following=quiet(D.tickDistillery(same));
  // Reuse the existing shop-demand integration's paid department-promise path.
  let dept=D.acceptShop(offerUnconnected,offerUnconnected.shop.offer.shopId,offerUnconnected.shop.offer.id);dept=D.bottleBranded(dept,dept.core.casks[0].id,{});dept=H.advance(H.fill(dept,{progress:65,type:'bourbon'}),24);dept=D.bottleBranded(dept,dept.core.casks.at(-1).id,{},15);const pid=dept.result.productId;dept=H.advance(dept,1);if(dept.shop.offer?.shopId!=='department')throw Error('natural department offer');dept=D.listBottles(D.setSalePrice(dept,'low',pid),pid);dept=quiet(D.acceptShopDelivery(dept,pid,5,'department',dept.shop.offer.id));
  return {base:raw(base),shipped:raw(shipped),zero:raw(zero),shortage:raw(shortage),offer:raw(offer),same:raw(same),following:raw(following),department:raw(dept)};
 }));
 const read=()=>p.evaluate(k=>localStorage.getItem(k),KEY);
 async function load(raw){await p.evaluate(({raw,KEY})=>{localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(raw),userPaused:true,elapsed:0}));localStorage.setItem(KEY+'.map-reveal.v1',JSON.stringify({version:1,shown:6}));},{raw,KEY});await p.reload();await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>!document.getElementById('game').hidden&&!!document.getElementById('scene-root').dataset.hitRegions);await p.waitForTimeout(50);}
 async function tap(selector){const n=p.locator(selector).first();await n.waitFor({state:'visible'});assert(await n.isEnabled(),selector+' enabled');await n.scrollIntoViewIfNeeded();const b=await n.boundingBox();assert(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=p.viewportSize().width+1&&b.y+b.height<=845,selector+' fits');await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
 async function fit(){const d=await p.evaluate(()=>{const dialog=document.getElementById('action-dialog'),body=document.getElementById('dialog-body');return{page:document.documentElement.scrollWidth<=innerWidth,body:body.scrollWidth<=body.clientWidth+1,dialog:dialog.getBoundingClientRect().width<=innerWidth};});assert(d.page&&d.body&&d.dialog,JSON.stringify(d));await p.locator('[data-action="stockists-back"]').scrollIntoViewIfNeeded();}
 async function open(shop='town-liquor'){await tap('[data-room="sales"]');await tap('#shop-offer');const label=await p.locator('[data-action="stockist-open"][data-id="'+shop+'"]').innerText();await tap('[data-action="stockist-open"][data-id="'+shop+'"]');return label;}
 async function inspect(name,raw,shop='town-liquor'){
  await load(raw);const before=await read(),label=await open(shop),game=JSON.parse(before).game;
  const expected=await p.evaluate(async({game,shop})=>{const V=await import('./shop-order-view.mjs?v=0.25.2'),M=await import('./model.mjs'),S=await import('./shop-model.mjs');const node=document.createElement('div');node.innerHTML=V.shopOrderMarkup(game,shop,{monthLabel:M.monthLabel,minQuantity:S.SHOPS.find(s=>s.id===shop).minQuantity});return{text:node.textContent.replace(/\s/g,''),row:V.latestShopOrder(game,shop),label:V.shopRelationshipLabel(game,shop)};},{game,shop});
  if(name==='zero')assert.equal(expected.row?.reason,'zero-demand');if(name==='shortage')assert(expected.row?.unmet>0);
  if(shop!=='department'){assert(label.includes(expected.label));assert.equal((await p.locator('.shop-order-result').textContent()).replace(/\s/g,''),expected.text);assert(!label.includes('納品不可'));}else{assert(label.includes('翌月5本納品'));assert.equal(await p.locator('.shop-order-result').count(),0);}
  assert.equal(await p.locator('.shop-remark').count(),1);await fit();if(name==='shortage')await p.screenshot({path:'/tmp/ambertime-0252-'+p.viewportSize().width+'-shortage.png',scale:'css'});await p.waitForTimeout(200);assert.equal(await read(),before,'modal is read-only');checks.push({scope:'legal browser-native model',name,shop,label,order:expected.row});return{before,game};
 }
 for(const width of [375,390]){
  await p.setViewportSize({width,height:844});
  for(const name of ['base','shipped','zero','shortage','same','following'])await inspect(name,fixtures[name]);
  // Same store list retains relation status even when last order was unshipped.
  await inspect('department pending selected five',fixtures.department,'department');
  await load(fixtures.offer);assert.match(await open(),/申し出あり/);assert.match(await p.locator('#dialog-body').innerText(),/取扱開始後は自動発送/);assert.match(await p.locator('#dialog-body').innerText(),/申し出を見る/);await tap('[data-action="stockist-offer"]');const beforeAcceptance=JSON.parse(await read()).game;await tap('[data-action="shop-accept"]');const afterAcceptance=JSON.parse(await read()).game;assert.equal(afterAcceptance.core.cash,beforeAcceptance.core.cash);assert.equal(afterAcceptance.shop.deliveries.length,beforeAcceptance.shop.deliveries.length);assert.match(await p.locator('.shop-order-result').innerText(),/注文記録はありません/);assert.match(await p.locator('.shop-remark').innerText(),/これからよろしく/);await fit();checks.push({scope:'legal browser-native model',name:'actual offer acceptance creates no same-month order/shipment',width});
  await load(fixtures.offer);await open();await tap('[data-action="stockist-offer"]');await tap('[data-action="shop-decline"]');await tap('[data-action="stockists-back"]');assert.match(await p.locator('[data-action="stockist-open"][data-id="town-liquor"]').innerText(),/取扱前/);checks.push({scope:'legal browser-native model',name:'declined store list stays before handling',width});
  await inspect('reload saved receipt',fixtures.shipped);const saved=await read();await p.reload();assert.equal(await read(),saved);await open();assert.match(await p.locator('.shop-order-result').innerText(),/2本発送/);await fit();
  // Pure component rows from614: no injected stock/model/operations or save writes.
  const data=await(await p.request.get(new URL('./design/gameplay-audit-20261023/delivery-results.json',url).href)).json();
  const componentRows=data.edges.map(e=>({name:'stock '+e.stocks.join('+')+(e.held?' held'+e.held:''),shopId:'supermarket',month:17,requested:e.requested,shipped:e.planned,unmet:e.unmet,reason:e.reason}));
  for(const code of ['delivery-ledger-full','stock-or-capacity','no-eligible-release'])componentRows.push({name:'recorded code '+code,shopId:'supermarket',month:17,requested:code==='no-eligible-release'?0:20,shipped:0,unmet:code==='no-eligible-release'?0:20,reason:code});
  for(const row of componentRows){const before=await read();const text=await p.evaluate(async row=>{const {shopOrderMarkup}=await import('./shop-order-view.mjs?v=0.25.2'),{monthLabel}=await import('./model.mjs');const s={core:{month:17},shopDemand:{lastOrders:[row]}};document.querySelector('.shop-order-result').outerHTML=shopOrderMarkup(s,'supermarket',{monthLabel,minQuantity:10});return document.querySelector('.shop-order-result').textContent;},row);await fit();assert.equal(await read(),before);checks.push({scope:'614 component rows, never save data',name:row.name,width,order:row,text});}
  if(width===390)await p.screenshot({path:'/tmp/ambertime-0252-minimum.png',scale:'css'});
 }
 assert.deepEqual(errors,[]);const hashes={};for(const f of ['shop-app.mjs','shop-order-view.mjs','index.html','partner-orders.mjs','shop-demand.mjs','runtime-clock.mjs','canvas-scene.mjs'])hashes[f]=createHash('sha256').update(await fs.readFile(path.join(root,'works/ambertime',f))).digest('hex');
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({url:process.env.AMBERTIME_URL??'local',browser:await browser.version(),widths:[375,390],physicalIPhone:false,checks,errors,sourceHashes:hashes,publishedHashes},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors,output}));await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
