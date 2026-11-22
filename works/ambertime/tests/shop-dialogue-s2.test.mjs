import {extractFunction} from './formal-idb-runtime-harness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SHOP_DIALOGUE_TEXT} from '../shop-dialogue-text.mjs';
import {dialogueCandidates,shopDialogueHistory,dialogueShopName,DIALOGUE_POLICY,createDialogueProjection} from '../shop-dialogue.mjs';
import {dialogueMarkup} from '../shop-dialogue-view.mjs';
const fixture=(month=120)=>{
 const release={id:1,brandId:1,productId:3,bottledMonth:1,profile:{flavor:{version:1,profile:{fruit:1,grain:0,smoke:0,body:0,rough:0,spice:0,wood:0,vanilla:0}}}};
 const ids=['town-liquor','supermarket','bar','department'];
 const deliveries=ids.map((shopId,i)=>({id:i+1,shopId,month:2,brandId:1,releaseId:1,productId:3,count:shopId==='department'?5:1,...(shopId==='department'?{selectionId:'selection-1',projectId:'project-1',sourceReleaseId:1}:{})}));
 const d=deliveries.at(-1),{productId,shopId,id,...adoption}=d;
 return {seed:42,core:{month},storeMarket:{version:1,startedMonth:0},alleyBar:{version:1,boundaryMonth:0},operations:[{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:60,progress:null,tastingId:null}}],releases:[release],brands:[{id:1,bottle:'round',label:'cream'}],shop:{relations:ids.map(shopId=>({shopId,brandId:1,startedMonth:0})),deliveries},department:{adoptions:[{...adoption,deliveryId:id}]}};
};
test('fourteen revised author lines are exact and frozen; headings distinguish all shops',()=>{
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.supermarket.daily),['晩酌用に買ってもらえるといいですね。','家で気軽に飲めるお酒もあるといいですよね。','このお酒、少しずつ売れてますよ。','お久しぶりです。また置きたいお酒があればどうぞ。']);
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.supermarket.memory),['このお酒、前売ってましたね。','この箱覚えてます！もう何年か前ですね。','このお酒、久しぶりに売れましたね！']);
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.department.daily),['贈り物としてもご紹介したいですね。','味の特徴を広めてみたいですね。','次のお酒も楽しみにしております。','今回お預かりした5本、大切にご紹介します。']);
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.department.memory),['以前お預かりしたお酒ですね。','このお酒をご紹介してから、もう何年か経つのですね。','この箱は覚えております。以前、当店でも扱いましたね。']);
 for(const id of ['supermarket','department'])for(const kind of ['daily','memory'])assert(Object.isFrozen(SHOP_DIALOGUE_TEXT[id][kind]));
 assert.equal(dialogueShopName('supermarket'),'町のスーパー');assert.equal(dialogueShopName('department'),'町のデパート');
});
test('new voices require saved boundary and its following month',()=>{
 const s=fixture();for(const id of ['supermarket','department']){assert.deepEqual(dialogueCandidates(s,60,id),{daily:[],memory:[]});assert(dialogueCandidates(s,61,id).daily.length>0);}
 s.operations=[];for(const id of ['supermarket','department'])assert.deepEqual(dialogueCandidates(s,120,id),{daily:[],memory:[]});
});
test('supermarket sold/gap/memory require own proven shelf sales, not allocation, legacy delivery or offer',()=>{
 const s=fixture();s.shop.deliveries=s.shop.deliveries.filter(d=>d.shopId!=='supermarket');s.storeMarket.byShop={supermarket:{3:50}};s.shop.offer={shopId:'supermarket'};
 let c=dialogueCandidates(s,120,'supermarket');assert.deepEqual(c.daily.map(x=>x.key),['evening','home']);assert.equal(c.memory.length,0);
 s.shop.relations=s.shop.relations.filter(r=>r.shopId!=='supermarket');assert.deepEqual(dialogueCandidates(s,120,'supermarket'),{daily:[],memory:[]});
 const actual=fixture();actual.storeMarket.startedMonth=2;assert.equal(dialogueCandidates(actual,120,'supermarket').memory.length,0);assert(!dialogueCandidates(actual,120,'supermarket').daily.some(x=>x.key==='gap'));
 actual.storeMarket.startedMonth=1;assert(dialogueCandidates(actual,120,'supermarket').memory.length>0);assert(dialogueCandidates(actual,120,'supermarket').daily.some(x=>x.key==='gap'));
 for(const key of ['releaseId','brandId','productId']){const bad=fixture();bad.shop.deliveries[1][key]=999;assert.equal(dialogueCandidates(bad,120,'supermarket').memory.length,0);}
});
test('supermarket recent/return excludes same month and requires a real repeat sale after gap',()=>{
 const s=fixture();s.shop.deliveries.push({...s.shop.deliveries[1],id:5,month:120});assert(!dialogueCandidates(s,120,'supermarket').daily.some(x=>x.key==='sold'));assert(!dialogueCandidates(s,120,'supermarket').memory.some(x=>x.key==='return'));
 s.core.month=121;let c=dialogueCandidates(s,121,'supermarket');assert(c.daily.some(x=>x.key==='sold'));assert(c.memory.some(x=>x.key==='return'));
 s.shop.deliveries.push({...s.shop.deliveries[1],id:6,month:119});assert(!dialogueCandidates(s,121,'supermarket').memory.some(x=>x.key==='return'));
});
test('department requires exact adoption and delivery join, five means recent five delivered',()=>{
 const s=fixture();assert(dialogueCandidates(s,120,'department').memory.length===3);assert(!dialogueCandidates(s,120,'department').daily.some(x=>x.key==='five'));
 for(const field of ['deliveryId','selectionId','projectId','sourceReleaseId','brandId','releaseId','month','count']){const bad=fixture();bad.department.adoptions[0][field]='wrong';assert.deepEqual(dialogueCandidates(bad,120,'department'),{daily:[],memory:[]},field);}
 s.shop.deliveries[3].month=119;s.department.adoptions[0].month=119;assert(dialogueCandidates(s,120,'department').daily.some(x=>x.key==='five'));assert.equal(dialogueCandidates(s,120,'department').memory.length,0);
 s.core.month=119;assert.deepEqual(dialogueCandidates(s,119,'department'),{daily:[],memory:[]});
 const pending=fixture();pending.department.adoptions=[];pending.department.interests=[{pendingDelivery:{count:5}}];assert.deepEqual(dialogueCandidates(pending,120,'department'),{daily:[],memory:[]});
});
test('v1 prefix stays exact; advancing current time or adding future receipts cannot rewrite it',()=>{
 const s=fixture(60),old=structuredClone(s);old.operations=[];const prefix=shopDialogueHistory(old);assert.deepEqual(shopDialogueHistory(s),prefix);
 s.core.month=240;const future=shopDialogueHistory(s);assert.deepEqual(future.filter(e=>e.month<=60),prefix);assert(future.some(e=>e.id.startsWith('shop-dialogue-v2:')));
 const frozen=shopDialogueHistory(s);s.core.month=400;s.shop.deliveries.push({...s.shop.deliveries[1],id:7,month:250});assert.deepEqual(shopDialogueHistory(s).filter(e=>e.month<=240),frozen);
});
test('all four voices share one opportunity stream and cooldown, bar remains quieter',()=>{
 const counts={'town-liquor':0,supermarket:0,bar:0,department:0};
 for(let seed=1;seed<=60;seed++){
  const s=fixture(480);s.seed=seed;const raw=JSON.stringify(s),rows=shopDialogueHistory(s),lastText=new Map();let memory=-Infinity;
  for(let i=0;i<rows.length;i++){const e=rows[i];if(i)assert(e.month-rows[i-1].month>=DIALOGUE_POLICY.minGap);const k=e.shopId+':'+e.key;assert(e.month-(lastText.get(k)??-Infinity)>=DIALOGUE_POLICY.sameTextGap);lastText.set(k,e.month);if(e.kind==='memory'){assert(e.month-memory>=DIALOGUE_POLICY.memoryGap);memory=e.month;}if(e.month>60)counts[e.shopId]++;assert.equal(e.text,SHOP_DIALOGUE_TEXT[e.shopId][e.kind][e.key]);}
  assert.equal(JSON.stringify(s),raw);assert(rows.length<=Math.ceil(480/DIALOGUE_POLICY.minGap));
 }
 assert(Object.values(counts).every(n=>n>0));assert(counts.bar<counts['town-liquor']);assert(counts.bar<counts.supermarket);assert(counts.department<counts.supermarket);
});
test('daily text has no image, memories keep real package after stock disappears, latest is per shop',()=>{
 const s=fixture(480),cache=createDialogueProjection();for(const id of ['supermarket','department']){
  const c=dialogueCandidates(s,480,id),entry={...c.memory[0],id:'test-'+id,shopId:id,kind:'memory',text:SHOP_DIALOGUE_TEXT[id].memory.remember};const markup=dialogueMarkup(entry,s,{heading:true});assert(markup.includes(dialogueShopName(id)));assert(markup.includes('package-box'));s.core.products=[];assert.equal(dialogueMarkup(entry,s,{heading:true}),markup);assert(!dialogueMarkup({...entry,kind:'daily'},s).includes('<svg'));
  assert.deepEqual(cache.read(s,id),shopDialogueHistory(s).filter(e=>e.shopId===id).at(-1)??null);
 }
});
test('install publishes S2 only after save, leaves old policy and recovery on failure',async()=>{
 const app=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),install=extractFunction('installSession',app);
 for(const succeeds of [false,true]){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id);};const no=()=>{},reset={reset:no},old={core:{casks:[]},still:{phase:'ready'},operations:[],tastingId:null};
  const context={session:{game:old,caskSlots:[],userPaused:true,elapsed:0},dialogueNotice:reset,dialogueProjection:reset,countdown:{cancel:no},stopClock:no,manualDistilling:()=>false,preview:false,distillRoom:reset,scene:{resetMotion:no},marketUI:reset,placementUI:reset,feedbackComments:reset,automaticNews:reset,mapNoticeLoad:no,warehouseRoom:{select:no,selectedId:null},D:{marketRulesMode:()=>true,alleyBarMode:()=>true,shopDialogueMode:s=>s.operations.some(o=>o.key==='enable-shop-dialogue'),enableShopDialogue:s=>({...s,operations:[...s.operations,{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:60}}]})},$:node,storageNotice:text=>node('storage-notice').textContent=text,render:no,schedule:no};
  context.m0=reset;context.prepareGame=fn=>fn(context.game);
  context.saveCandidate=next=>{if(succeeds){context.committedSession={game:next};return true;}node('recovery').hidden=false;node('save-status').textContent='未保存';context.canSave=false;return false;};
  await vm.runInNewContext(install+'\ninstallSession(session);',context);assert.equal(context.D.shopDialogueMode(context.game),succeeds);assert.equal(context.D.shopDialogueMode(context.committedSession.game),succeeds);assert.equal(node('recovery').hidden,succeeds);
 }
});
