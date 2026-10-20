// Focused phone verification: current saved monthly operation, existing ledger and reload.
// Fixtures use ordinary public operations in an isolated browser context.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=path.resolve(new URL('../../../',import.meta.url).pathname);
const output=path.join(root,'works/ambertime/design/shop-demand/browser-results.json');
const KEY='sukimastock.ambertime.wholesale.v20',OTHER='ambertime.phone-test.unrelated';
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://localhost').pathname;if(rel.endsWith('/'))rel+='index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json'})[path.extname(rel)]??'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE??'/tmp/chromium',args:['--no-sandbox']});
const errors=[],checks=[];let p;
const read=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function settled(){await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');await p.waitForFunction(()=>!document.querySelector('#game').hidden);}
async function fit(){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await p.locator('#action-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&n.scrollWidth<=n.clientWidth;}));}
try{
 p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
 await p.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/`);await settled();
 let s=(await read()).game;assert.equal(s.core.month,0);assert.equal(s.core.cash,1600);assert.equal(s.shopDemand.version,1);assert.equal(s.staff.hired,false);assert.equal(s.staffProgression.bottling.hired,false);
 await p.locator('#start-distill').click();await p.clock.runFor(1000);s=(await read()).game;assert.equal(s.still.phase,'distilling');assert(s.still.distillation.progress>0);checks.push('fresh paid manual extraction starts on phone, new demand boundary active, staff remains un-hired');
 // The old v20 game is generated lawfully, then the UI upgrades it exactly once.
 const old=await p.evaluate(async({KEY,OTHER})=>{
  const D=await import('./partner-orders.mjs?v=0.45-shop-demand');let s=D.newMonthlyTimingDistillery(42);
  function settle(){for(let i=0;s.decisions.length;i++){if(i>20)throw Error('fixture decision loop');const d=s.decisions[0],o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');if(!o)throw Error('fixture unexpected '+d.eventId);s=D.chooseDistillery(s,d.caskId,o.id);}if(s.trade.offer)s=D.declineOffer(s);for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);}
  function advance(n){for(let i=0;i<n;i++){settle();const before=s.core.month;s=D.tickDistillery(s);if(s.core.month!==before+1)throw Error('fixture clock');}settle();}
  function fill(){settle();s=D.startDistillation(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');settle();}
  fill();advance(12);const cid=s.core.casks[0].id;for(let i=0;i<3;i++){s=D.bottleBranded(s,cid,{},14);s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);advance(1);}advance(1);
  if(s.shop.offer?.shopId!=='town-liquor')throw Error('fixture missing lawful liquor offer');s=D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);
  fill();advance(12);const second=s.core.casks.at(-1).id;s=D.bottleBranded(s,second,{});s=D.listBottles(s,s.result.productId);settle();
  if(s.shopDemand)throw Error('old factory unexpectedly enabled new rules');
  localStorage.setItem(OTHER,'keep this exact value');localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0}));return s;
 },{KEY,OTHER});
 await p.reload();await settled();s=(await read()).game;assert.equal(s.core.cash,old.core.cash);assert.deepEqual(s.core.products,old.core.products);assert.equal(s.shopDemand.version,1);assert.equal(s.operations.filter(o=>o.key==='enable-shop-demand').length,1);
 const migrated=await p.evaluate(k=>localStorage.getItem(k),KEY);await p.reload();await settled();assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),migrated);assert(await p.locator('#automatic-news').isHidden());checks.push('lawful old v20 fixture upgrades once without inventory/cash change; repeated reload leaves saved bytes exact and no stale news');
 const expected=await p.evaluate(async KEY=>{const D=await import('./partner-orders.mjs?v=0.45-shop-demand');const s=JSON.parse(localStorage.getItem(KEY)).game,next=D.tickDistillery(D.restoreDistillery(JSON.stringify(s)));return JSON.parse(D.serializeDistillery(next));},KEY);
 const before=s.core.month;await p.locator('#toggle-time').click();await p.clock.runFor(6000);await p.locator('#toggle-time').click();s=(await read()).game;assert.equal(s.core.month,before+1);assert.deepEqual(s,expected);
 const orders=s.shopDemand.lastOrders;assert(orders.length>0);for(const o of orders){assert.equal(o.requested,o.shipped+o.unmet);assert(o.requested>=0);}
 const total=k=>orders.reduce((n,o)=>n+(o[k]??0),0),news=await p.locator('#automatic-news').innerText();assert.match(news,/注文/);assert.match(news,new RegExp(String(total('requested'))));
 await p.locator('#open-ledger').click();await p.locator('#dialog-body summary').filter({hasText:'商店'}).click();await fit();const ledger=await p.locator('#dialog-body').innerText();assert.match(ledger,/注文/);assert.match(ledger,/発送/);assert.match(ledger,new RegExp(String(total('requested'))));
 const shot='/tmp/ambertime-shop-demand-phone.png';await p.screenshot({path:shot,fullPage:true});await p.locator('#close-dialog').click();
 const saved=await p.evaluate(k=>localStorage.getItem(k),KEY);await p.reload();await settled();assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),saved);assert.equal(await p.evaluate(k=>localStorage.getItem(k),OTHER),'keep this exact value');assert(await p.locator('#automatic-news').isHidden());assert.deepEqual(errors,[]);
 checks.push('one ordinary monthly phone step equals model including orders, shipments, cash and inventory; existing news/ledger show request and fulfillment; save/reload exact, unrelated key intact, no page errors');
 const result={passed:true,harnessCorrections:['Use direct scene ledger entry, not background button behind aux modal.','Expand the existing 商店 ledger details before reading its rows.'],viewport:{width:390,height:844,touch:true},checks,month:s.core.month,orders,totals:{requested:total('requested'),shipped:total('shipped'),unmet:total('unmet')},news,ledgerExcerpt:ledger.slice(0,1200),errors,physicalSafari:false,screenshotForLocalReview:shot};await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
