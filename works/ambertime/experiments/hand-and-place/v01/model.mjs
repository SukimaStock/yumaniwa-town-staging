import * as F from '../../../../ambertime-flavor-lab-v02/model.mjs';
import {FLAVORS, SHOPS, fitDetails, comment, checksum} from '../../shop-expansion/v01/model.mjs';
export {F};
export const VERSION='ambertime-hand-and-place/0.1';
const clone=x=>structuredClone(x), assert=(ok,text)=>{if(!ok)throw Error(text);};
const hints={diner:'食事に合わせる果実香。樽の香りは控えめ。',bar:'煙の香りと、力強い口当たり。',specialist:'原酒の個性がはっきりした一本。樽香はほどほど。'};
export const STORES=SHOPS.filter(x=>Object.hasOwn(hints,x.id)).map(x=>({id:x.id,name:x.name,hint:hints[x.id]}));
const store=id=>STORES.find(x=>x.id===id),lot=(s,id)=>s.lots.find(x=>x.id===id);
const key=r=>JSON.stringify([r.malt,r.ferment,r.start,r.end,r.cask]);
const record=(s,type,text,fields={})=>s.events.push({id:s.events.length+1,month:s.month,type,text,...fields});
function fromBarrel(b){const profile=F.profileFor(b);return {label:b.label,profile,product:{roughness:profile.rough,character:Math.max(profile.fruit,profile.grain,profile.smoke,profile.body),wood:Math.max(profile.wood,profile.vanilla),age:b.months,price:30,aromaFamily:F.summaryFor(b)[0].key,label:b.label}};}
export function create({seed=42,mode='cards',gate='try'}={}){
 assert(Number.isInteger(seed)&&seed>0&&seed<=4294967295&&['cards','list'].includes(mode)&&['try','block'].includes(gate),'実験条件を確認してください。');
 const lots=['fruit','smoke','wood'].map((id,i)=>{const f=FLAVORS.find(x=>x.id===id);return {id:i+1,recipeId:id,recipe:clone(f.recipe),ageMonths:f.ageMonths,label:f.label,profile:clone(f.profile),product:clone(f.product),stock:12,count:12,bottledMonth:-1,sourceId:null};});
 return {seed,mode,gate,initialMode:mode,initialGate:gate,month:0,lots,jobs:[],relations:{},events:[],actions:[]};
}
export const fit=(shopId,release)=>fitDetails(shopId,release);
export const reaction=(s,shopId,release)=>comment({options:{seed:s.seed}},shopId,release,`hand:${s.month}:${s.actions.length}:${release.id}`).text;
export function candidates(s,shopId){const r=s.relations[shopId];if(!r)return [];const a=lot(s,r.anchorId);return s.lots.filter(l=>l.id!==r.selectedId&&l.stock>0&&key(l.recipe)===key(a.recipe));}
export function recipeText(item){const r=item.recipe;return [F.CARDS.malt.find(x=>x.id===r.malt)?.name,F.CARDS.ferment.find(x=>x.id===r.ferment)?.name,`採取 ${Math.round(r.start*99)}–${Math.round(r.end*99)}`,F.CARDS.cask.find(x=>x.id===r.cask)?.name,`熟成 ${item.targetAge??item.ageMonths}か月`].join('・');}
function step(s){
 assert(s.month<1200,'このLabは100年までです。');s.month++;
 // Each shop requests two bottles. Shared stock is allocated in the displayed order.
 for(const n of STORES){const r=s.relations[n.id];if(!r||r.openedMonth>=s.month)continue;let l=lot(s,r.selectedId);const a=lot(s,r.anchorId);
  if(l.stock===0&&r.autoContinue){const next=candidates(s,n.id).find(x=>x.bottledMonth<s.month&&x.ageMonths===a.ageMonths&&fit(n.id,x).liked);if(next){r.selectedId=next.id;l=next;record(s,'continue',`${n.name}で発売#${l.id}の取扱いを続けます。`,{shopId:n.id,lotId:l.id,anchorId:r.anchorId});}}
  const count=l.bottledMonth<s.month?Math.min(2,l.stock):0;
  if(count){l.stock-=count;record(s,'shipment',`${n.name}へ発売#${l.id}を${count}本届けました。`,{shopId:n.id,lotId:l.id,count,anchorId:r.anchorId});}
  else record(s,'shortage',`${n.name}は発売#${l.id}の補充待ちです。`,{shopId:n.id,lotId:l.id});
 }
 for(const j of s.jobs){if(j.stage==='preparing'){j.stage='aging';record(s,'prepared',`仕込み#${j.id}が終わり、熟成を始めました。`,{jobId:j.id});}else{j.flavorState=F.advance(j.flavorState,1);j.ageMonths++;}}
 record(s,'month',`${s.month}か月目になりました。`);
}
export function dispatch(s,action){
 assert(action&&typeof action.type==='string','操作を確認してください。');const a=clone(action);let text;
 switch(a.type){
 case 'place': {const l=lot(s,a.lotId),n=store(a.shopId);assert(l&&n&&l.stock>0,'在庫のあるカードと店を選んでください。');assert(a.autoContinue===undefined||typeof a.autoContinue==='boolean','継続方針を確認してください。');const d=fit(n.id,l);text=reaction(s,n.id,l);if(d.liked){const old=s.relations[n.id];s.relations[n.id]={anchorId:l.id,selectedId:l.id,autoContinue:a.autoContinue??true,openedMonth:old?.openedMonth??s.month};record(s,'place',`${n.name}で発売#${l.id}の取扱いが始まります。`,{shopId:n.id,lotId:l.id});}else record(s,s.gate==='block'?'blocked':'rejected',text,{shopId:n.id,lotId:l.id});break;}
 case 'rebrew': {const l=lot(s,a.lotId);assert(l,'元のカードを選んでください。');assert(s.jobs.length<4,'仕込みと熟成は合わせて4樽までです。');const id=1+Math.max(0,...s.events.filter(e=>e.type==='rebrew').map(e=>e.jobId));s.jobs.push({id,sourceId:l.id,recipeId:l.recipeId,recipe:clone(l.recipe),targetAge:l.ageMonths,stage:'preparing',ageMonths:0,flavorState:F.fill(F.initial(),l.recipe)});text=`発売#${l.id}の製法で、もう一度造ります。仕込みに1か月、その後に熟成します。`;record(s,'rebrew',text,{jobId:id,lotId:l.id});break;}
 case 'bottle': {const j=s.jobs.find(x=>x.id===a.jobId);assert(j&&j.stage==='aging'&&j.ageMonths>=1,'1か月以上熟成した樽を選んでください。');const id=s.lots.length+1,b=j.flavorState.barrels[0];s.lots.push({id,recipeId:j.recipeId,recipe:clone(j.recipe),ageMonths:j.ageMonths,...fromBarrel(b),stock:12,count:12,bottledMonth:s.month,sourceId:j.sourceId});s.jobs.splice(s.jobs.indexOf(j),1);text=`発売#${id}を12本、瓶詰めしました。納品は翌月からです。`;record(s,'bottle',text,{jobId:j.id,lotId:id,sourceId:j.sourceId});break;}
 case 'step': assert(a.months===undefined||a.months===1,'1か月ずつ進めてください。');step(s);text='1か月進めました。';break;
 case 'continuation': {const r=s.relations[a.shopId],l=lot(s,a.lotId);assert(r&&l&&candidates(s,a.shopId).some(x=>x.id===l.id),'同じ製法の補充候補を選んでください。');text=reaction(s,a.shopId,l);if(fit(a.shopId,l).liked){r.anchorId=l.id;r.selectedId=l.id;record(s,'continuation',`${store(a.shopId).name}へ発売#${l.id}を選びました。`,{shopId:a.shopId,lotId:l.id});}else record(s,'rejected',text,{shopId:a.shopId,lotId:l.id});break;}
 case 'policy': {const r=s.relations[a.shopId];assert(r&&typeof a.autoContinue==='boolean','取扱中の店と継続方針を選んでください。');r.autoContinue=a.autoContinue;text=a.autoContinue?'同じ製法・同じ熟成年数の次回も任せます。':'次の発売回は自分で選びます。';record(s,'policy',text,{shopId:a.shopId,autoContinue:a.autoContinue});break;}
 case 'mode': assert(['cards','list'].includes(a.value),'表示を選んでください。');s.mode=a.value;text='表示を切り替えました。';break;
 case 'gate': assert(['try','block'].includes(a.value),'提案方式を選んでください。');s.gate=a.value;text='提案方式を切り替えました。';break;
 case 'inspect': assert(lot(s,a.lotId),'カードを選んでください。');text=recipeText(lot(s,a.lotId));break;
 case 'browse': assert(typeof a.kind==='string'&&a.kind.length<=80,'操作記録を確認してください。');text='表示を開きました。';break;
 default: throw Error('この操作には対応していません。');
 }
 s.actions.push({...a,month:s.month});return {text};
}
export function validate(s){const errors=[],shipped=s.events.filter(e=>e.type==='shipment');for(const l of s.lots){if(l.stock<0||l.stock+shipped.filter(e=>e.lotId===l.id).reduce((n,e)=>n+e.count,0)!==l.count)errors.push('stock');if(!F.valid(l.recipe)||!Number.isInteger(l.ageMonths)||l.ageMonths<1)errors.push('recipe');if(l.sourceId!==null&&(!lot(s,l.sourceId)||key(l.recipe)!==key(lot(s,l.sourceId).recipe)))errors.push('lineage');}for(const e of shipped){const l=lot(s,e.lotId);if(!l||l.bottledMonth>=e.month||e.count<1||e.count>2||!fit(e.shopId,l).liked)errors.push('shipment');}if(s.jobs.length>4||s.jobs.some(j=>!lot(s,j.sourceId)||j.ageMonths!==j.flavorState.barrels[0].months))errors.push('jobs');for(const [id,r]of Object.entries(s.relations))if(!store(id)||!lot(s,r.anchorId)||!lot(s,r.selectedId)||key(lot(s,r.anchorId).recipe)!==key(lot(s,r.selectedId).recipe))errors.push('relation');return {ok:errors.length===0,errors:[...new Set(errors)]};}
export function exportLog(s){const data={schema:VERSION,initial:{seed:s.seed,mode:s.initialMode??'cards',gate:s.initialGate??'try'},state:clone(s),validation:validate(s)};return {...data,checksum:checksum(data)};}
export function replay(log){assert(log?.schema===VERSION,'このLabの操作ログを選んでください。');const {checksum:hash,...data}=log;assert(checksum(data)===hash,'ログが変更されています。');const s=create(log.initial);for(const a of log.state.actions){const {month,...action}=a;dispatch(s,action);assert(s.month===month,'操作の月が一致しません。');}assert(checksum(exportLog(s))===checksum(log),'再現結果が一致しません。');return s;}
