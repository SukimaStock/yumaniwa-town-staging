// Targeted ledger reading only, using public-operation fixtures.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),root=path.resolve(new URL('../../../',import.meta.url).pathname),out=path.join(root,'works/ambertime/design/ledger-view'),KEY='sukimastock.ambertime.wholesale.v18';
await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://localhost').pathname;if(rel.endsWith('/'))rel+='index.html';res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.ttf':'font/ttf'})[path.extname(rel)]??'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),url=`http://127.0.0.1:${server.address().port}/works/ambertime/`,checks=[];
const raw=p=>p.evaluate(k=>localStorage.getItem(k),KEY),state=async p=>JSON.parse(await raw(p)).game;
async function load(p,type='notes'){
 await p.evaluate(async({KEY,type})=>{const D=await import('./partner-orders.mjs'),B=await import('./tests/brands-helpers.mjs');let s;
 if(type==='trade'){const {replayCheckpoint}=await import('./design/partners/replay.mjs');s=D.enableStaff(replayCheckpoint(await(await fetch('./tests/fixtures/partners-accepted.json')).json(),D));}
 else{s=D.newStaffDistillery(42);for(let i=0;i<2;i++){s=B.fill(s,{progress:i?85:65});const id=s.core.casks.at(-1).id;s=B.advance(s,6);s=D.endTasting(D.sampleDistillery(s,id));if(!i){s=B.advance(s,6);s=D.endTasting(D.sampleDistillery(s,id));}s=D.bottleBranded(s,id,i?{brandId:1}:{name:'川霧・保存 · 原文'});s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=B.advance(s,1);}s=B.fill(s,{progress:65});const id=s.core.casks.at(-1).id;s=B.advance(s,6);s=D.endTasting(D.sampleDistillery(s,id));s=B.advance(s,6);s=D.endTasting(D.sampleDistillery(s,id));}
 if(s.shop.offer)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);D.restoreDistillery(D.serializeDistillery(s));localStorage.setItem(KEY,JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0}));
 },{KEY,type});await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');await p.locator('#open-ledger').click();
}
try{
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.setDefaultTimeout(6000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await load(p);
 if(process.env.LEDGER_BASELINE){await p.screenshot({path:path.join(out,'390-before.png'),scale:'css'});console.log(JSON.stringify({baseline:true,text:(await p.locator('#dialog-body').innerText()).slice(0,500)}));}
 else {
 const saved=await raw(p),g=await state(p),body=p.locator('#dialog-body');
 const totals=await body.locator('.ledger-totals').innerText();for(const [key,label] of [['revenue','売上累計'],['upkeep','維持費累計']])assert(totals.includes(label+' £'+Math.round(g.core.totals[key]).toLocaleString('en-GB')));
 assert.deepEqual(await body.locator(':scope > details > summary').allTextContents(),['熟成の記録','取引の記録','ブランドと発売','これまでの一本']);assert.equal(await body.locator('details[open]').count(),0);
 await p.screenshot({path:path.join(out,'390-summary.png'),scale:'css'});
 const open=async(label)=>body.locator('summary').filter({hasText:new RegExp('^'+label+'$')}).first().click();
 await open('熟成の記録');
 for(const c of g.core.casks){const n=g.notesById[c.id],a=body.locator(`[data-cask-record="${c.id}"]`);const strings=[...n.samples.flatMap(x=>x.text),...(n.observations??[]).flatMap(o=>[o.title,o.text]).filter(Boolean)];if(!strings.length){assert.equal(await a.count(),0);continue;}const actual=await a.locator('.record-text').allTextContents();for(const text of strings)assert(actual.includes(text));const ages=await a.locator('[data-age]').evaluateAll(es=>es.map(e=>e.dataset.age));assert.equal(new Set(ages).size,ages.length);}
 await open('熟成の記録');await open('ブランドと発売');assert.equal(await body.locator('[data-release-record]').count(),g.releases.length);
 assert((await body.innerText()).includes('川霧・保存 · 原文'));
 for(const r of g.releases){const a=body.locator(`[data-release-record="${r.id}"]`);await a.locator('summary').click();assert((await a.innerText()).includes('たる No.'+r.caskId));const values=await a.locator('.copy-value').allTextContents();assert(values.includes(r.sold+'本 / '+r.bottles+'本'));assert(values.includes('£'+Math.round(r.revenue).toLocaleString('en-GB')));await a.locator('summary').click();}
 const compare=body.locator('[data-action="compare-release"]').first();assert(await compare.count());await compare.click();assert((await p.locator('#dialog-title').innerText()).includes('比'));const recordButton=body.getByRole('button',{name:'記録',exact:true});if(await recordButton.count()){await recordButton.click();await p.locator('[data-action="comparison-back"]').click();}await p.locator('[data-action="comparison-back"]').click();assert.equal(await p.locator('#dialog-title').innerText(),'帳面');
 await open('これまでの一本');
 for(const r of g.records){const a=body.locator(`[data-bottle-record="${r.productId}"]`);assert.equal(await a.count(),1);assert.equal(await a.locator('h3').innerText(),r.name);await a.locator(':scope > details > summary').click();const texts=await a.locator('.record-text').allTextContents();for(const text of [r.description,...r.taste,...r.samples.flatMap(x=>x.text),...r.choices.map(x=>x.text),...(r.observations??[]).flatMap(x=>[x.title,x.text])].filter(x=>typeof x==='string'&&x.trim()))assert(texts.includes(text),text);const ages=await a.locator('[data-age]').evaluateAll(es=>es.map(e=>e.dataset.age));assert.equal(new Set(ages).size,ages.length);const values=await a.locator(':scope > .copy-facts .copy-value').allTextContents();assert(values.includes(r.sold+'本'));assert(values.includes('£'+Math.round(r.revenue).toLocaleString('en-GB')));assert((await a.innerText()).includes('抽出 '+(r.caskId===2?65:85)+' / 100'));}
 await p.screenshot({path:path.join(out,'390-records.png'),scale:'css'});
 assert.equal(await raw(p),saved);assert(await body.evaluate(e=>e.scrollWidth<=e.clientWidth));checks.push('totals/categories/exact stored prose and names/grouped ages/release basics/details/comparison return/save bytes');
 await p.setViewportSize({width:1280,height:900});assert(await body.evaluate(e=>e.scrollWidth<=e.clientWidth));checks.push('minimal PC ledger overflow');
 await p.setViewportSize({width:390,height:844});await load(p,'trade');const tg=await state(p),ts=await raw(p);await open('取引の記録');assert.equal(await body.locator('[data-trade-kind]').count(),tg.trade.history.length);
 const seen=new Map();for(const x of tg.trade.history){const k=x.month+':'+x.kind,index=seen.get(k)??0;seen.set(k,index+1);const item=body.locator(`[data-trade-month="${x.month}"] [data-trade-kind="${x.kind}"]`).nth(index);assert.equal(await item.count(),1);if(x.partner)assert((await item.innerText()).includes(x.partner));const income=Number.isFinite(x.net)?x.net:Number.isFinite(x.revenue)?x.revenue:null;assert.equal(await item.locator('[data-income]').count(),income===null?0:1);}
 assert.equal(await raw(p),ts);assert.equal(errors.length,0,errors.join('\n'));checks.push('all recorded trade kinds/months exactly once/no inferred income/save bytes/no page errors');
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,limits:['Chromium touch emulation; no physical iPhone/Safari/VoiceOver','No whole-game E2E, long play or game-wide simulation']},null,2)+'\n');console.log(JSON.stringify({checks}));
 }
 await p.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
