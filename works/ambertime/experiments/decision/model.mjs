// Transient decision experiment. No player saves, replay or main rules are changed.
import * as D from '../../partner-orders.mjs';
import * as M from '../../model.mjs';
import * as E from '../../economy.mjs';
import {createCaskNotes} from '../../monthly.mjs';
import {PARAMETERS as P} from '../../parameters.mjs';
import {ECONOMY_PARAMETERS as C} from '../../economy-parameters.mjs';
export const DEFAULT_SEED=20261020;
export const CONDITIONS=Object.freeze([{id:'baseline',name:'現行',finance:false,season:false},{id:'finance',name:'費用を強める',finance:true,season:false},{id:'season',name:'季節で売れ方が変わる',finance:false,season:true},{id:'combined',name:'費用と季節',finance:true,season:true}].map(Object.freeze));
export const FIXTURES=Object.freeze([{id:'mixed',name:'3樽・£1600',cash:1600,recipes:[[99,'refill',6],[66,'refill',18],[50,'bourbon',30]]},{id:'full',name:'4樽・£1600',cash:1600,recipes:[[99,'refill',0],[66,'refill',12],[50,'bourbon',24],[30,'bourbon',36]]},{id:'lean',name:'3樽・£620',cash:620,recipes:[[99,'refill',6],[66,'refill',18],[50,'bourbon',30]]}].map(Object.freeze));
const clone=structuredClone,round=n=>Math.round(n*100)/100;
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const conditionOf=s=>CONDITIONS.find(c=>c.id===s.condition);
const validSeed=n=>Number.isInteger(n)&&n>=1&&n<=4294967295;
export function costs(s){const c=conditionOf(s);check(c,'実験条件を確認してください。');const f=c.finance?1.25:1;return {distill:C.distillationCost*f,casks:{bourbon:C.casks.bourbon.cost*f,refill:C.casks.refill.cost*f},bottle:P.bottlingCost*f,upkeep:round(E.upkeep(s.game)*(c.finance?1.75:1))};}
const reserve=s=>round(s.game.core.casks.reduce((n,c)=>n+M.bottleQuote(s.game.core,c.id).count*costs(s).bottle,0));
const inventory=s=>s.game.core.products.filter(p=>p.stock>0).map(p=>({id:p.id,stock:p.stock,listed:!!s.game.productsById[p.id]?.listed,price:p.price}));
function rawCask(seed,stop,type,months=0){
 let g=D.startDistillation(D.newStaffDistillery(seed));while(g.still.distillation.progress<stop)g=D.distillStep(g);g=D.fillBarrel(D.stopDistillation(g),type);let c=g.core.casks[0];for(let i=0;i<months;i++)c=M.ageCask(c);return c;
}
function addCask(s,c){
 const g=s.game,batchId=g.core.nextId++,id=g.core.nextId++,month=g.core.month;
 c={...c,id,batchId,batchMonth:month-c.age,filledMonth:month-c.age,history:[{month:month-c.age,text:M.tasting(c)}]};g.core.casks.push(c);g.notesById[id]=createCaskNotes(c);g.batchesById[id]={id:batchId,startedMonth:c.batchMonth,initialLitres:c.initialLitres,type:c.type,upkeep:0};s.serials[id]=s.nextSerial++;return c;
}
export function createSession({seed=DEFAULT_SEED,condition='baseline',fixture='mixed'}={}){
 const f=FIXTURES.find(f=>f.id===fixture);check(validSeed(seed)&&f&&CONDITIONS.some(c=>c.id===condition),'シード・実験条件を確認してください。');
 const game=E.newDistillery(seed);game.core.month=36;game.core.cash=f.cash;
 const s={version:'ambertime-decision/0.1',seed,condition,fixture,game,elapsed:0,history:[],samples:[],serials:{},nextSerial:1,batchSerial:0,tasting:null,notice:''};
 f.recipes.forEach(([stop,type,months],i)=>addCask(s,rawCask((seed+i*104729)>>>0||1,stop,type,months)));return s;
}
export function season(s){
 const month=s.game.core.month%12;
 const identify=m=>m===11||m<=1?'winter':m<=4?'spring':m<=7?'summer':'autumn',id=identify(month);
 const catalog={winter:{name:'冬',base:1.2,hint:'売れ方は多め。木のかおりがあるビンを好む。'},spring:{name:'春',base:1,hint:'売れ方はふつう。原酒のかおりがあるビンを好む。'},summer:{name:'夏',base:.8,hint:'売れ方は少なめ。軽い口当たりと控えめな木を好む。'},autumn:{name:'秋',base:1,hint:'売れ方はふつう。原酒と木の重なりを好む。'}};
 let months=1;while(identify((month+months)%12)===id)months++;const nextId=identify((month+months)%12),enabled=conditionOf(s).season;
 return {id,...catalog[id],...(!enabled?{hint:'季節による売れ方の変化なし。'}:{}),next:{id:nextId,name:catalog[nextId].name,hint:enabled?catalog[nextId].hint:'季節による売れ方の変化なし。',months}};
}
export function retailFactors(s){
 if(!conditionOf(s).season)return null;const q=season(s);
 return new Map(s.game.core.products.map(p=>{const r=p.roughness,c=p.character,w=p.wood/1.35;const preference=q.id==='winter'?2*w-1:q.id==='spring'?2*c-1:q.id==='summer'?1-r-w:1-2*Math.abs(c-w);return [p.id,q.base*(1+.1*Math.max(-1,Math.min(1,preference)))];}));
}
export function view(s){
 const g=s.game;return {month:s.elapsed,date:M.monthLabel(g.core.month),season:season(s),cash:g.core.cash,upkeep:costs(s).upkeep,reserve:reserve(s),freeSlots:P.maxCasks-g.core.casks.length,casks:g.core.casks.map(c=>({...c,serial:s.serials[c.id],bottles:M.bottleQuote(g.core,c.id).count})),products:g.core.products.filter(p=>p.stock>0).map(p=>({...p,sourceSerial:s.serials[p.sourceId],listed:!!g.productsById[p.id]?.listed})),lastMonth:g.core.lastMonth,notice:s.notice};
}
export function quote(s,id,count=null){
 const c=s.game.core.casks.find(c=>c.id===id);if(!c)return {count:0,maxCount:0,cost:0,ok:false,reason:'たるを選んでください。'};
 const maxCount=M.bottleQuote(s.game.core,id).count,n=count??maxCount,cost=round(n*costs(s).bottle);let reason='';
 if(!Number.isInteger(n)||n<1||n>maxCount)reason='ビン詰め本数を確認してください。';else if(s.game.core.products.filter(p=>p.stock>0).length>=P.maxProducts)reason='ビンの棚が8商品で埋まっています。';else if(s.game.core.cash<cost)reason='ビン詰めの費用が足りません。';
 return {count:n,maxCount,cost,ok:!reason,reason};
}
export function bottle(s,id,count=null,notes={why:'',wait:'',next:''}){
 const q=quote(s,id,count);check(q.ok,q.reason);const next=clone(s),c=next.game.core.casks.find(c=>c.id===id),serial=next.serials[id],before={cash:next.game.core.cash,freeSlots:P.maxCasks-next.game.core.casks.length,profile:{roughness:c.roughness,character:c.character,wood:c.wood},litres:c.litres,inventory:inventory(next)};
 next.game.core=M.bottle(next.game.core,id,q.count);const delta=round(q.cost-q.count*P.bottlingCost);next.game.core.cash=round(next.game.core.cash-delta);next.game.core.totals.costs=round(next.game.core.totals.costs+delta);
 const p=next.game.core.products.at(-1);next.game.productsById[p.id]={listed:false,selectedPrice:'standard'};next.game.core=M.setPrice(next.game.core,p.id,E.salePrices(next.game,p.id).standard);
 if(!next.game.core.casks.some(c=>c.id===id)){delete next.game.notesById[id];delete next.game.batchesById[id];}
 next.game.decisions=[];next.tasting=null;next.notice='';
 next.history.push({kind:'bottle',month:next.elapsed,caskId:id,serial,season:season(next).name,before,after:{cash:next.game.core.cash,inventory:inventory(next)},count:q.count,cost:q.cost,notes:Object.fromEntries(['why','wait','next'].map(k=>[k,String(notes?.[k]??'').slice(0,2000)]))});return next;
}
export function canStart(s,{stop=66,type='refill'}={}){
 const c=costs(s),cost=c.distill+(c.casks[type]??0),minimum=round(cost+Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)*c.bottle+reserve(s));
 let reason='';if(!Number.isInteger(stop)||stop<30||stop>99||!Object.hasOwn(c.casks,type))reason='抽出位置・たるを確認してください。';else {const original=E.canStart({...s.game,core:{...s.game.core,cash:Math.max(s.game.core.cash,minimum,E.canStart(s.game).minimum)}});if(!original.ok)reason=original.reason;else if(s.game.core.cash<minimum)reason=`次の仕込みとビン詰め予約に £${minimum.toFixed(2)} 必要です。`;}
 return {ok:!reason,reason,minimum,cost};
}
export function start(s,{stop=66,type='refill'}={}){
 const q=canStart(s,{stop,type});check(q.ok,q.reason);const next=clone(s),batchSeed=(s.seed+Math.imul(++next.batchSerial,104729))>>>0||1,c=addCask(next,rawCask(batchSeed,stop,type));
 next.game.core.lastDistillation=next.game.core.month;next.game.core.cash=round(next.game.core.cash-q.cost);next.game.core.totals.costs=round(next.game.core.totals.costs+q.cost);next.history.push({kind:'start',month:next.elapsed,caskId:c.id,serial:next.serials[c.id],stop,type,cost:q.cost,seed:batchSeed});next.notice='';return next;
}
function neutralize(game){game.tastingId=null;game.decisions=[];for(const n of Object.values(game.notesById)){n.phase='watching';n.view='watching';n.pending=null;n.targetAge=null;}}
export function advance(s,months=1){
 check(Number.isInteger(months)&&months>=1&&months<=120,'進める月数は1〜120です。');let next=clone(s);next.notice='';next.tasting=null;
 for(let i=0;i<months;i++){
  const prepared=clone(next);neutralize(prepared.game);
  const listed=prepared.game.core.products.some(p=>p.stock>0&&prepared.game.productsById[p.id]?.listed);
  if(!prepared.game.core.casks.length&&!listed&&prepared.game.core.cash-costs(prepared).upkeep<canStart(prepared).minimum){next.notice='次の仕込みの費用を残して停止しています。ビンを販売することもできます。';break;}
  // E uses the new month's retail demand; season factors describe that same month.
  const seasonalProjection={...prepared,game:{...prepared.game,core:{...prepared.game.core,month:prepared.game.core.month+1}}};
  const g=E.economicMonthly(prepared.game,prepared.game.core.month,retailFactors(seasonalProjection));check(g.core.month===prepared.game.core.month+1,'月次処理が進まなかったため停止しました。');
  const originalUpkeep=g.core.lastMonth.upkeep,newUpkeep=round(originalUpkeep*(conditionOf(prepared).finance?1.75:1)),delta=round(newUpkeep-originalUpkeep);g.core.cash=round(g.core.cash-delta);g.core.totals.upkeep=round(g.core.totals.upkeep+delta);g.core.lastMonth.upkeep=newUpkeep;if(g.core.journal[0])g.core.journal[0].message=g.core.journal[0].message.replace(/維持費[0-9.]+/u,`維持費${newUpkeep}`);
  neutralize(g);const candidate={...prepared,game:g,elapsed:prepared.elapsed+1};
  if(g.core.cash<reserve(candidate)){next.notice='ビン詰めの費用を残して停止しています。販売中のビン、または今のたるを確認してください。';break;}
  next=candidate;next.history.push({kind:'month',...clone(g.core.lastMonth),month:next.elapsed,season:season(next).name,cash:g.core.cash,calendarMonth:g.core.month});
 }
 return next;
}
export function sample(s,id){const c=s.game.core.casks.find(c=>c.id===id);check(c,'たるを選んでください。');const next=clone(s),tasting={caskId:id,serial:s.serials[id],month:s.elapsed,age:c.age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,text:M.tasting(c)};next.tasting=tasting;next.samples.push(clone(tasting));return next;}
export function setListed(s,id,listed=true){check(typeof listed==='boolean'&&s.game.core.products.some(p=>p.id===id&&p.stock>0),'販売するビンを選んでください。');const next=clone(s);next.game.productsById[id].listed=listed;next.notice='';next.history.push({kind:listed?'list':'store',month:next.elapsed,productId:id});return next;}
