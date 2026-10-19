// Six maturation display paths only; no whole-game regression run.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as D from '../partner-orders.mjs';
import * as B from './brands-helpers.mjs';
import {agingEventText,uiText} from '../ui-text.mjs';
import {CHARACTER_PARAMETERS as C,observeCharacterMonth,createCharacter} from '../character.mjs';
const fixtures=new Map(),root=path.resolve(new URL('../../../',import.meta.url).pathname),KEY='sukimastock.ambertime.wholesale.v18',out='/tmp/ambertime-aging-copy';
await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://localhost').pathname;if(rel.endsWith('/'))rel+='index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(rel)]??'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),errors=[];
try{
 const seedPage=await browser.newPage();await seedPage.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/`);
 const generated=await seedPage.evaluate(async()=>{const D=await import('./partner-orders.mjs?v=0.19staff'),B=await import('./tests/brands-helpers.mjs');const fixtures=new Map();
// Three bounded, single-cask paths stop as soon as the required event appears.
for(const [progress,type,targets,sampleMonths] of [[35,'refill',['rounded','wood','loss'],[0]],[65,'bourbon',['fruit','fading'],[0,40]],[95,'refill',['rough'],[]]]){
 let s=B.fill(D.newStaffDistillery(42),{progress,type}),remaining=new Set(targets);
 for(let guard=0;guard<=60&&remaining.size;guard++){
  if(sampleMonths.includes(s.core.month))s=D.endTasting(D.sampleDistillery(s,s.core.casks[0].id));
  if(s.decisions.length){const id=s.decisions[0].eventId;if(remaining.delete(id)){D.restoreDistillery(D.serializeDistillery(s));fixtures.set(id,s);}if(!remaining.size)break;s=B.resolve(s);}
  s=D.tickDistillery(s);
 }
 if(remaining.size)throw Error('fixture did not reach '+[...remaining]);
}

 return [...fixtures];});await seedPage.close();for(const [id,s] of generated)fixtures.set(id,s);
assert.equal(fixtures.size,6);
const expected={wood:['色が深くなった','前に試したときより色が濃い'],fading:['かおりが弱くなった','前に試したときよりかおりが弱い'],rough:['若い原酒','まだシゲキが残る'],fruit:['かおりが強い','果実とこくもつのかおり'],rounded:['口当たりが丸くなった','']},changes=[];
for(const [id,s] of fixtures){const c=s.core.casks[0],n=s.notesById[c.id],event=s.decisions[0].pending,before=JSON.stringify(s),view=agingEventText(event,c,n);
 if(id==='loss')expected.loss=['量が減った','たる詰めから'+Number(((1-c.litres/c.initialLitres)*100).toFixed(1))+'％減った'];
 assert.deepEqual([view.title,view.text],expected[id]);assert.equal(JSON.stringify(s),before);
 if(id==='wood'){assert(c.wood>=C.woodGoal);assert.equal(agingEventText(event,c,{samples:[]}).text,'');assert.equal(agingEventText(event,c,{samples:[{age:c.age,profile:{wood:0}}]}).text,'');assert.equal(agingEventText(event,c,{samples:[{age:c.age-1,profile:{wood:c.wood-C.comparisonWood/2}}]}).text,'');}
 if(id==='fading'){assert(n.peakCharacter-c.character>=C.aromaLoss||n.samples.at(-1).profile.character-c.character>=C.sampleAromaLoss);assert.equal(agingEventText(event,c,{samples:[]}).text,'');assert.equal(agingEventText(event,c,{samples:[{age:c.age-1,profile:{character:c.character-.1}}]}).text,'');assert.equal(agingEventText(event,c,{samples:[{age:c.age-1,profile:{character:c.character+C.sampleAromaLoss/2}}]}).text,'');}
 if(id==='rough')assert(c.roughness>C.roughGoal);if(id==='fruit')assert(c.character>C.fruitGoal);if(id==='rounded')assert(c.roughness<=C.softGoal);if(id==='loss')assert(c.litres/c.initialLitres<=C.remainingGoal);
 changes.push({id,month:s.core.month,before:{title:uiText(event.title),text:uiText(event.text)},after:view});
}
// The detector can call a >.55 spirit young even when tasting's strong band is >.6.
const j=createCharacter(42);j.peakCharacter=.5;Object.assign(j.core.casks[0],{age:6,wood:0,roughness:.56,character:.5});const young=observeCharacterMonth(j);assert.equal(young.pending.id,'rough');assert.equal(agingEventText(young.pending,young.core.casks[0],young).text,'まだシゲキが残る');
const other={id:'order-unmet',title:'特別注文',text:'条件を確認します。'};assert.deepEqual(agingEventText(other,fixtures.get('rough').core.casks[0]),{title:other.title,text:other.text});

 let p;
 const stored=()=>p.evaluate(k=>localStorage.getItem(k),KEY);
 async function load(s){if(p)await p.close();p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify({version:2,game:s,userPaused:true,elapsed:0})),{KEY,s});await p.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/`);await p.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');try{await p.locator('#action-dialog').waitFor({state:'visible'});}catch(e){console.error(JSON.stringify({event:s.decisions[0]?.eventId,errors,screen:await p.locator('body').innerText(),restore:await p.evaluate(async s=>{try{const D=await import('./partner-orders.mjs?v=0.19staff');D.restoreDistillery(JSON.stringify(s));return 'ok';}catch(e){return e.message;}},s)}));throw e;}}

 for(const [id,s] of fixtures){await load(s);const before=await stored(),c=s.core.casks[0],event=s.decisions[0].pending,body=p.locator('#dialog-body'),view=agingEventText(event,c,s.notesById[c.id]);
  assert((await p.locator('#dialog-title').innerText()).endsWith(view.title));assert.deepEqual(await body.locator(':scope > p').allTextContents(),[uiText(({bourbon:'バーボン',refill:'リフィル'})[c.type])+' '+(c.age<12?c.age+'か月':Math.floor(c.age/12)+'年'+(c.age%12?c.age%12+'か月':'')),...(view.text?[view.text]:[])]);
  const buttons=await p.locator('#dialog-actions [data-choice]').evaluateAll(es=>es.map(e=>({text:e.textContent,action:e.dataset.action,choice:e.dataset.choice,event:e.dataset.event,id:e.dataset.id})));
  assert.deepEqual(buttons,event.options.map(o=>({text:o.id==='bottle'?'ビン詰め':uiText(o.label),action:o.id==='bottle'?'quote':'choose',choice:o.id,event:id,id:String(c.id)})));
  assert.equal(await body.locator('p:empty').count(),0);assert(await body.evaluate(e=>e.scrollWidth<=e.clientWidth));assert(await p.locator('#dialog-actions').evaluate(e=>e.scrollWidth<=e.clientWidth));assert.equal(await stored(),before);
  if(id==='rounded'||id==='fading')await p.screenshot({path:path.join(out,id+'.png'),scale:'css'});
  await p.locator('#dialog-actions [data-choice="wait"]').click();assert.deepEqual(JSON.parse(await stored()).game,JSON.parse(JSON.stringify(D.chooseDistillery(s,c.id,'wait'))));
 }
 // Trial keeps the pending decision; returning resolves no choice.
 const rough=fixtures.get('rough'),cid=rough.core.casks[0].id;await load(rough);await p.locator('#dialog-actions [data-action="trial"]').click();await p.locator('#end-tasting').click();const sampled=D.endTasting(D.sampleDistillery(rough,cid));assert.deepEqual(JSON.parse(await stored()).game,JSON.parse(JSON.stringify(sampled)));
 await p.setViewportSize({width:1280,height:900});assert(await p.locator('#dialog-body').evaluate(e=>e.scrollWidth<=e.clientWidth));assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({changes,checks:['six actual event fixtures, threshold and prior-sample boundary checks','390x844 title/body/actions/overflow; empty-body case','wait choice exact existing API result, saved raw strings intact','trial and return preserve pending decision','minimal PC; no page errors'],limits:['Chromium touch emulation only; physical Safari/VoiceOver not tested','No whole-game E2E, long play or game-wide simulation']},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
