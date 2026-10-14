import { newGame, distill, fillCask, advanceMonth, bottle, bottleQuote, tasting, serialize, restore, ageLabel } from './model.mjs';
export const JOURNEY_PARAMETERS=Object.freeze({monthMs:1100,maxAge:84,finalWait:3,maxRecords:12,softGoal:0.30,woodGoal:0.36});
const clone=s=>structuredClone(s);
const assert=(ok,text)=>{if(!ok)throw new Error(text);};
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export const currentCask=j=>j.core.casks[0]??null;
const profile=c=>({roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres});
export function newJourney(seed=20261014,records=[]) {
  // Vary batches deterministically; all costs and aging remain ordinary core actions.
  const cut=[0.45,0.65,0.85][seed%3],type=seed%2?'refill':'bourbon';
  const core=fillCask(distill(newGame(seed),cut),type);
  return {version:1,seed,round:1,core,phase:'watching',stage:0,intent:null,targetAge:null,choices:[],pending:null,records:clone(records).slice(-12),result:null};
}
function pending(j,id,title,text,options) {j.phase='choice';j.pending={id,title,text,options};}
const bottleOption={id:'bottle',label:'今の風味で瓶詰めする'};
function detect(j) {
  const c=currentCask(j);if(!c)return;
  if(j.targetAge!==null&&c.age>=j.targetAge&&j.stage===4){finish(j);return;}
  if(j.stage===0&&c.age>=4&&(c.roughness<=0.6||c.age>=10)) {
    j.stage=1;pending(j,'direction','最初の変化',tasting(c).split('。')[0]+'。次は、どちらの変化を待ちますか。',[
      {id:'soft',label:'口当たりが丸くなるのを待つ'},
      {id:'wood',label:'樽の香りが重なるのを待つ'},bottleOption]);
  } else if(j.stage===1&&((j.intent==='soft'&&c.roughness<=0.30)||(j.intent==='wood'&&c.wood>=0.36)||c.age>=48)) {
    j.stage=2;pending(j,'arrival',j.intent==='soft'?'口当たりに丸さが出てきた':'樽香が重なってきた',tasting(c).split('。').filter(Boolean).slice(0,2).join('。')+'。',[
      bottleOption,{id:'wait',label:'もう少し深まりを待つ',hint:'香りと残量を見守る'}]);
  } else if(j.stage===2&&(c.age>=j.targetAge||c.wood>=0.66||c.character<j.choices.at(-1).profile.character-0.025)) {
    j.stage=3;pending(j,'deepening','前の印象から、少し先へ',c.wood>=0.66?'木の渋みが長く残り始めました。':tasting(c).split('。').filter(Boolean).slice(1).join('。')+'。',[
      bottleOption,{id:'wait',label:'さらに変化を見届ける',hint:'軽やかさが薄れることもある'}]);
  } else if(j.stage===3&&(c.age>=j.targetAge||c.age>=84)) {
    j.stage=4;pending(j,'last','この樽を手放すとき',tasting(c).split('。').filter(Boolean).slice(1).join('。')+'。',[
      bottleOption,{id:'last',label:'あと3か月だけ待って瓶詰めする'}]);
  }
}
export function tick(j) {
  if(j.phase!=='watching')return j;
  const s=clone(j);s.core=advanceMonth(s.core);detect(s);return s;
}
function finish(j) {
  const c=clone(currentCask(j)),q=bottleQuote(j.core,c.id);
  j.core=bottle(j.core,c.id,q.count);const p=j.core.products.at(-1);
  // The shelf sells once at its existing standard price; no invented price/quality.
  j.core=advanceMonth(j.core);
  const name=c.wood>=0.66?'木の余韻':c.roughness>0.30?'若い穀物':c.character>=0.80?'熟した果実':c.wood>=0.36?'果実とバニラ':'淡い樽香';
  const r={name,seed:j.seed,round:j.round,age:c.age,litres:c.litres,bottles:q.count,taste:tasting(c).split('。').filter(Boolean),choices:clone(j.choices),type:c.type,cut:c.cut,
    sold:p.lastSold,revenue:p.lastRevenue,upkeep:j.core.totals.upkeep,cash:j.core.cash,evaporated:j.core.totals.evaporated,profile:profile(c)};
  // advanceMonth clones products, so the sales summary must use the updated product.
  const sold=j.core.products.find(x=>x.id===p.id);r.sold=sold.lastSold;r.revenue=sold.lastRevenue;
  j.result=r;j.records=[...j.records,r].slice(-12);j.phase='finished';j.pending=null;j.targetAge=null;
}
export function choose(j,key) {
  assert(j.phase==='choice'&&j.pending?.options.some(o=>o.id===key),'今はその選択をできません。');
  const s=clone(j),c=currentCask(s),option=s.pending.options.find(o=>o.id===key);
  s.choices.push({age:c.age,key,text:option.label,profile:profile(c)});
  s.pending=null;s.phase='watching';
  if(key==='bottle')finish(s);
  else if(key==='soft'||key==='wood'){s.intent=key;s.targetAge=null;}
  else if(key==='last'){s.targetAge=c.age+3;}
  else if(key==='wait')s.targetAge=Math.min(84,c.age+(s.stage===2?12:18));
  return s;
}
export function nextJourney(j) {
  assert(j.phase==='finished','この樽を瓶詰めしてから、次を預かれます。');
  const seed=(j.seed+1)>>>0||1,s=newJourney(seed,j.records);s.round=j.round+1;return s;
}
export const choiceView=j=>j.pending;
export function observation(j) {
  const c=currentCask(j);if(!c)return null;
  const previous=j.choices.at(-1);
  const text=tasting(c).split('。').filter(Boolean);
  const change=previous?c.wood>=0.66&&previous.profile.wood<0.66?'木の渋みが残り始めました。':c.roughness<=0.30&&previous.profile.roughness>0.30?'刺激がほどけてきました。':c.character<previous.profile.character-0.025?'前の香りより、少し静かになりました。':`前の選択から ${c.age-previous.age}か月。`:'樽の中で、少しずつ変わっています。';
  return {age:c.age,litres:c.litres,initialLitres:c.initialLitres,roughness:c.roughness,character:c.character,wood:c.wood,text,change};
}
export const formatRecord=r=>r;
function validateRecord(r) {
  assert(r&&typeof r.name==='string'&&r.name.length<=60&&Number.isInteger(r.age)&&r.age>=0&&r.age<=87&&Number.isInteger(r.bottles)&&r.bottles>=1&&r.bottles<=58&&Array.isArray(r.taste)&&r.taste.length===3&&r.taste.every(x=>typeof x==='string'&&x.length<=100),'一本の記録が不正です。');
  assert(Number.isInteger(r.seed)&&r.seed>=1&&r.seed<=4294967295&&Number.isInteger(r.round)&&r.round>=1&&r.round<=1e6&&r.profile&&finite(r.profile.roughness,0,1)&&finite(r.profile.character,0,1)&&finite(r.profile.wood,0,1.35)&&finite(r.profile.litres,0,40),'一本の由来が不正です。');
  validateChoices(r.choices);
  assert(['bourbon','refill'].includes(r.type)&&finite(r.cut,0,1)&&finite(r.litres,0,40)&&finite(r.evaporated,0,40)&&finite(r.cash,-1e6,1e6)&&finite(r.upkeep,0,1e6)&&finite(r.revenue,0,1e6)&&Number.isInteger(r.sold)&&r.sold>=0&&r.sold<=r.bottles,'一本の数値が不正です。');
  let replay=newJourney(r.seed);replay.round=r.round;
  for(const choice of r.choices) {
    for(let i=0;i<88&&replay.phase==='watching'&&currentCask(replay).age<choice.age;i++)replay=tick(replay);
    assert(replay.phase==='choice'&&currentCask(replay).age===choice.age,'一本の選択時期が不正です。');
    replay=choose(replay,choice.key);
  }
  for(let i=0;i<88&&replay.phase==='watching';i++)replay=tick(replay);
  assert(replay.phase==='finished'&&JSON.stringify(replay.result)===JSON.stringify(r),'一本の記録と選択が一致しません。');
}
function validateChoices(a) {
  assert(Array.isArray(a)&&a.length<=4&&a.every((v,i)=>v&&Number.isInteger(v.age)&&v.age>=0&&v.age<=84&&(!i||v.age>=a[i-1].age)&&['soft','wood','wait','bottle','last'].includes(v.key)&&typeof v.text==='string'&&v.text.length<=100&&v.profile&&finite(v.profile.roughness,0,1)&&finite(v.profile.character,0,1)&&finite(v.profile.wood,0,1.35)&&finite(v.profile.litres,0,40)),'選択の記録が不正です。');
}
export function validateJourney(j) {
  assert(j?.version===1&&Number.isInteger(j.seed)&&j.seed>=1&&j.seed<=4294967295&&Number.isInteger(j.round)&&j.round>=1&&j.round<=1e6,'対応していない一樽の保存です。');
  restore(serialize(j.core));
  assert(j.core.seed===j.seed&&j.core.casks.length<=(j.phase==='finished'?0:1)&&j.core.spirit===null&&['watching','choice','finished'].includes(j.phase)&&Number.isInteger(j.stage)&&j.stage>=0&&j.stage<=4&&[null,'soft','wood'].includes(j.intent)&&(j.targetAge===null||(Number.isInteger(j.targetAge)&&j.targetAge>=0&&j.targetAge<=87)),'一樽の進行が不正です。');
  validateChoices(j.choices);
  assert(Array.isArray(j.records)&&j.records.length<=12,'記録の棚が不正です。');j.records.forEach(validateRecord);
  if(j.phase==='finished') {validateRecord(j.result);assert(j.pending===null&&j.records.length>0&&JSON.stringify(j.result)===JSON.stringify(j.records.at(-1)),'完成した記録が不正です。');}
  else {
    const c=currentCask(j);assert(c&&c.age<=87&&j.core.products.length===0&&j.result===null,'熟成中の樽が不正です。');
    if(j.phase==='choice')assert(j.pending&&['direction','arrival','deepening','last'].includes(j.pending.id)&&typeof j.pending.title==='string'&&j.pending.title.length<100&&typeof j.pending.text==='string'&&j.pending.text.length<300&&Array.isArray(j.pending.options)&&j.pending.options.length>=2&&j.pending.options.length<=3&&j.pending.options.every(o=>['soft','wood','wait','last','bottle'].includes(o.id)&&typeof o.label==='string'&&o.label.length<100),'選択肢が不正です。');
    else assert(j.pending===null,'停止状態が不正です。');
    assert(j.stage===0||j.stage===1&&j.choices.length===0&&j.phase==='choice'||j.intent!==null||j.phase==='finished','熟成方針が不正です。');
  }
  // Only accept states reachable by the saved seed and choices. Pending choices
  // are authoritative model data, not arbitrary restored button definitions.
  assert(j.core.month<=88,'一樽の時間が不正です。');
  let replay=newJourney(j.seed,j.phase==='finished'?j.records.slice(0,-1):j.records);replay.round=j.round;
  for(const choice of j.choices) {
    for(let i=0;i<88&&replay.phase==='watching'&&currentCask(replay).age<choice.age;i++)replay=tick(replay);
    assert(replay.phase==='choice'&&currentCask(replay).age===choice.age,'選択した時期が不正です。');
    replay=choose(replay,choice.key);
  }
  for(let i=0;i<88&&replay.phase==='watching'&&replay.core.month<j.core.month;i++)replay=tick(replay);
  assert(JSON.stringify(replay)===JSON.stringify(j),'一樽の進行と選択が一致しません。');
  return true;
}
export function serializeJourney(j){validateJourney(j);return JSON.stringify(j);}
export function restoreJourney(text){assert(typeof text==='string'&&text.length<500000,'一樽の保存が大きすぎます。');let j;try{j=JSON.parse(text);}catch{throw new Error('一樽の保存を読み取れません。');}validateJourney(j);return j;}
