// Only changed current-play copy and adjacent modal actions; no full game suite.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),root=path.resolve(new URL('../../../',import.meta.url).pathname),out=path.join(root,'works/ambertime/design/copy-cleanup'),KEY='sukimastock.ambertime.wholesale.v18';
await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://localhost').pathname;if(rel.endsWith('/'))rel+='index.html';res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.ttf':'font/ttf'})[path.extname(rel)]??'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),url=`http://127.0.0.1:${server.address().port}/works/ambertime/`,checks=[];
const raw=p=>p.evaluate(k=>localStorage.getItem(k),KEY),state=async p=>JSON.parse(await raw(p)).game;
async function load(p,kind){
 await p.evaluate(async({KEY,kind})=>{
  const D=await import('./partner-orders.mjs'),B=await import('./tests/brands-helpers.mjs');let s;
  if(kind.startsWith('partners-')){const {replayCheckpoint}=await import('./design/partners/replay.mjs');s=replayCheckpoint(await(await fetch('./tests/fixtures/'+kind+'.json')).json(),D);}
  else if(kind==='generation'){const G=await import('./tests/generation-helpers.mjs');s=G.generationAtMonth(360);if(s.shop.offer)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);}
  else if(kind==='extract'){s=D.startDistillation(D.newStaffDistillery(42));}
  else if(kind==='complete'){s=D.startDistillation(D.newStaffDistillery(42));while(s.still.distillation.progress<98)s=D.distillStep(s);}
  else{s=B.fill(D.newStaffDistillery(42),{progress:65});s=B.advance(s,1);s=D.sampleDistillery(s,s.core.casks[0].id);s=D.endTasting(s);s=B.advance(s,1);if(kind==='staff'){s=D.saveRecipe(s,s.core.casks[0].id,'銘柄・生成り 試飲 原文');s=D.hireStaff(s);s=D.reserveStaff(s,s.core.casks[0].id);}}
  s=D.enableStaff(s);D.restoreDistillery(D.serializeDistillery(s));localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0}));
 },{KEY,kind});await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
}
const body=p=>p.locator('#dialog-body').innerText(),action=(p,a)=>p.locator('#dialog-actions [data-action="'+a+'"]');
async function fit(p,label){const metrics=await p.locator('#action-dialog').evaluate(d=>({dialogOverflow:d.scrollWidth>d.clientWidth,bodyOverflow:document.querySelector('#dialog-body').scrollWidth>document.querySelector('#dialog-body').clientWidth,actionsOverflow:document.querySelector('#dialog-actions').scrollWidth>document.querySelector('#dialog-actions').clientWidth,bottom:d.getBoundingClientRect().bottom,viewport:innerHeight}));assert(!metrics.dialogOverflow&&!metrics.bodyOverflow&&!metrics.actionsOverflow,label+JSON.stringify(metrics));assert(metrics.bottom<=metrics.viewport,label);checks.push({label,metrics});}
async function exactAction(p,method,args,act){const expected=await p.evaluate(async({KEY,method,args})=>{const D=await import('./partner-orders.mjs'),s=D.restoreDistillery(JSON.stringify(JSON.parse(localStorage.getItem(KEY)).game));return JSON.parse(D.serializeDistillery(D[method](s,...args)));},{KEY,method,args});await act();assert.equal(JSON.stringify(await state(p)),JSON.stringify(expected),'exact public action '+method);}
try{
 let text;const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.setDefaultTimeout(7000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
 if(!process.env.COPY_FROM){
 await load(p,'extract');assert.equal(await p.locator('#spirit-kind').textContent(),'採取待ち');assert.equal(await p.locator('#spirit-phrase').textContent(),'');const before=await raw(p);await p.locator('#open-aux-menu').tap();await p.locator('#close-dialog').tap();assert.equal(await raw(p),before);checks.push({label:'collecting: one status, redundant sentence removed, menu close pure'});
 await load(p,'complete');await p.clock.install();await p.locator('#toggle-time').tap();await p.clock.runFor(250);assert.equal(await p.locator('#scene-notice').textContent(),'抽出完了');await p.locator('#toggle-time').tap();checks.push({label:'extraction completion notice'});
 await load(p,'cask');await p.locator('[data-cask-id]').first().tap();await p.locator('#cask-details summary').tap();assert.match(await p.locator('#last-taste').innerText(),/^前回 /);await fit(p,'cask previous sample');await p.locator('#close-dialog').tap();
 }else checks.push({label:'Reused completed collecting/completion/cask checks from initial run; unchanged runtime'});
 if(!['partners','generation'].includes(process.env.COPY_FROM)){
 await load(p,'staff');await p.locator('[data-room=distill]').tap();assert.match(await p.locator('#usual-status').textContent(),/依頼済み/);await p.locator('#open-staff-panel').tap();await p.locator('#cancel-usual').tap();await p.locator('#reserve-usual').tap();assert.doesNotMatch(await body(p),/空きと資金を待って/);assert((await state(p)).recipeBook.entries.some(e=>e.name==='銘柄・生成り 試飲 原文'));await fit(p,'staff reserved and original recipe name');await action(p,'staff-back').tap();await p.locator('#close-dialog').tap();
 }else checks.push({label:'Reused completed staff status/request/name-preservation check'});
 if(process.env.COPY_FROM!=='generation'){
 await load(p,'partners-offer');assert.equal(await p.locator('#action-dialog').getAttribute('data-kind'),'offer');text=await body(p);assert.match(text,/条件達成で自動出荷/);assert.match(text,/未達なら販売方法を選択/);assert.match(text,/代金から差引/);assert.doesNotMatch(text,/扱いたいそう|果実のかおり豊かな原酒を1たる/);await fit(p,'special offer retains unmet caveat and deducted fee');await exactAction(p,'acceptOffer',[null,(await state(p)).trade.offer.terms[0].id],()=>action(p,'contract').tap());
 await p.locator('[data-room=sales]').tap();await p.locator('#trade-info').tap();await action(p,'cancel-order-confirm').tap();text=await body(p);assert.match(text,/違約金なし/);assert.match(text,/通常の取引と熟成は継続/);await fit(p,'cancel order');await action(p,'trade-back').tap();await action(p,'end-trade-confirm').tap();assert.match(await body(p),/出荷指定・特別注文も解除/);assert.match(await body(p),/熟成は継続/);await action(p,'trade-back').tap();await action(p,'cancel-order-confirm').tap();await exactAction(p,'cancelOrder',[],()=>action(p,'cancel-order').tap());
 await load(p,'partners-accepted');await p.locator('[data-cask-id]').first().tap();await p.locator('#contract-info').tap();assert.match(await body(p),/解除は無料/);await fit(p,'existing wholesale contract');await action(p,'cancel-contract').tap();await p.locator('[data-cask-id]').first().tap();await p.locator('#assign-wholesale').tap();text=await body(p);for(const term of ['買取','ビン詰め','代金から差引','維持費は継続','出荷前の解除は無料','本数','売上','入金'])assert(text.includes(term),term);await fit(p,'wholesale assignment');await p.screenshot({path:path.join(out,'390-wholesale.png'),scale:'css'});const id=Number(await action(p,'assign').getAttribute('data-id')),term=await p.locator('[data-action=assign-term][aria-pressed=true]').getAttribute('data-id');await exactAction(p,'assignCask',[id,term],()=>action(p,'assign').tap());
 }else checks.push({label:'Reused completed special offer/acceptance, cancellation effects/cancel, contract and wholesale assignment exact-action checks; unchanged runtime'});
 await load(p,'generation');assert.equal(await p.locator('#action-dialog').getAttribute('data-kind'),'generation-notice');text=await body(p);assert.match(text,/たる詰め期限/);assert.match(text,/未完成の原酒も引継ぎ/);await fit(p,'generation final-batch notice');await p.screenshot({path:path.join(out,'390-generation.png'),scale:'css'});const gBefore=await raw(p);await action(p,'generation-continue').tap();assert.equal(await raw(p),gBefore);assert.deepEqual(errors,[]);await p.close();
 const pc=await browser.newPage({viewport:{width:1280,height:900}});await pc.goto(url);await load(pc,'partners-offer');await fit(pc,'PC special conditions');await pc.close();
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,checks,pageErrors:errors,physicalSafari:false,scope:'Changed text and basic adjacent actions only'},null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
