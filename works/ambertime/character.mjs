// One barrel, ordinary AmberTime chemistry. Event logic observes state rather
// than stepping through a fixed questionnaire. All public transitions are pure.
import { newGame, distill, fillCask, advanceMonth, bottle, bottleQuote, tasting } from './model.mjs';
export const CHARACTER_PARAMETERS=Object.freeze({monthMs:1100,maxAge:84,finalWait:3,maxRecords:12,minEventGap:6,firstEventAge:6,finalObservationMonths:12,maxDecisions:4,softGoal:0.30,woodGoal:0.36,roughGoal:0.55,fruitGoal:0.80,aromaLoss:0.035,sampleAromaLoss:0.025,remainingGoal:0.90,woodThreat:0.62,comparisonRough:0.025,comparisonAroma:0.025,comparisonWood:0.035,cool:Object.freeze({soften:0.88,wood:0.83,evaporation:0.86})});
const copy=s=>structuredClone(s);
const assert=(ok,text)=>{if(!ok)throw new Error(text);};
export const caskOf=j=>j.core.casks[0]??null;
export const profile=c=>({roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres});
export const sampleOf=c=>({age:c.age,type:c.type,cut:c.cut,profile:profile(c),text:tasting(c).split('。').filter(Boolean)});
export function mixSeed(seed) {let x=seed>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return (x^(x>>>16))>>>0||1;}
export function createCharacter(seed=20261014,records=[],round=1) {
  let core=newGame(seed);core.rngState=mixSeed(seed);
  const cut=0.35+(mixSeed(seed^0xa53c2f1b)/4294967296)*0.55;
  const type=mixSeed(seed^0x91e10da5)%2?'refill':'bourbon';
  core=fillCask(distill(core,cut),type);
  return {version:2,rules:'character',seed,round,core,phase:'watching',view:'watching',stage:0,intent:null,targetAge:null,choices:[],pending:null,records:copy(records).slice(-CHARACTER_PARAMETERS.maxRecords),result:null,samples:[],actions:[],seen:[],lastEventAge:-CHARACTER_PARAMETERS.minEventGap,cooled:false,peakCharacter:caskOf({core}).character};
}
const bottleOption={id:'bottle',label:'今の状態で瓶詰めする'};
const coolOption={id:'cool',label:'涼しい棚へ移す',hint:'木の移りと蒸発を抑える。口当たりはゆっくり変わる'};
function prompt(j,id,title,text,waitLabel,cool=false) {
  j.phase='choice';j.pending={id,title,text,options:[bottleOption,{id:'wait',label:waitLabel},...(cool&&!j.cooled?[coolOption]:[])]};j.seen.push(id);j.lastEventAge=caskOf(j).age;
}
function detect(j,onFinish=finishCharacterMutable) {
  const c=caskOf(j),decisionCount=j.withdrawnLitres===undefined?j.choices.length:j.choices.filter(x=>x.key!=='bottle').length;
  if(j.targetAge!==null&&c.age>=j.targetAge){onFinish(j);return;}
  // Finite ending is a safety boundary, never a projected optimum age.
  if(c.age>=CHARACTER_PARAMETERS.maxAge||decisionCount>=CHARACTER_PARAMETERS.maxDecisions-1&&c.age>=j.lastEventAge+CHARACTER_PARAMETERS.finalObservationMonths) {
    j.phase='choice';j.pending={id:'last',title:'この樽を手放すとき',text:`残量 ${c.litres.toFixed(1)} L。ここまでの変化を、一本に残せます。`,options:[bottleOption,{id:'last',label:'あと3か月だけ見守って瓶詰めする'}]};j.seen.push('last');j.lastEventAge=c.age;return;
  }
  if(decisionCount>=CHARACTER_PARAMETERS.maxDecisions-1||c.age<CHARACTER_PARAMETERS.firstEventAge||c.age-j.lastEventAge<CHARACTER_PARAMETERS.minEventGap)return;
  const unseen=id=>!j.seen.includes(id);
  const recent=j.samples.at(-1);
  if(unseen('wood')&&c.wood>=CHARACTER_PARAMETERS.woodGoal)prompt(j,'wood','原酒の色が深くなってきた',recent?`前の試飲は ${recent.age}か月目。色は、その頃より濃くなっています。`:'グラスに取ると、以前より深い琥珀色です。','木の変化をもう少し見守る',true);
  else if(unseen('fading')&&(j.peakCharacter-c.character>=CHARACTER_PARAMETERS.aromaLoss||recent&&recent.profile.character-c.character>=CHARACTER_PARAMETERS.sampleAromaLoss))prompt(j,'fading','香りの移り変わり',recent?`${recent.age}か月目の試飲から時間が経ちました。今の香りを確かめられます。`:'色が深まり、香りの移り変わりが気になる頃です。','軽やかさの変化を見届ける',true);
  else if(unseen('rough')&&c.roughness>CHARACTER_PARAMETERS.roughGoal)prompt(j,'rough','若い原酒のまま、少し先へ','色はまだ淡く、若い原酒が、ゆっくり変わっています。試飲して、刺激の変化を確かめられます。','口当たりの変化を待つ',true);
  else if(unseen('fruit')&&unseen('rough')&&unseen('rounded')&&c.character>CHARACTER_PARAMETERS.fruitGoal)prompt(j,'fruit','原酒の香りが広がる頃','若い色合いのまま、原酒の香りが育つ時期に入りました。','原酒と木の重なりを待つ');
  else if(unseen('rounded')&&unseen('fruit')&&c.roughness<=CHARACTER_PARAMETERS.softGoal)prompt(j,'rounded','口当たりが変わる頃','仕込みから時間が経ちました。今の口当たりを、試飲で確かめられます。','丸さがどう変わるか見守る');
  else if(unseen('loss')&&(c.litres+(j.withdrawnLitres??0))/c.initialLitres<=CHARACTER_PARAMETERS.remainingGoal&&c.wood<CHARACTER_PARAMETERS.woodThreat)prompt(j,'loss','少しずつ、減っていく','樽詰めした量から、1割ほど減りました。これからも時間とともに減っていきます。','減少を承知で、もう少し待つ');
}
export function tickCharacter(j,onFinish=finishCharacterMutable) {
  if(j.phase!=='watching'||j.view==='tasting')return j;
  const s=copy(j);s.core=advanceMonth(s.core);return observeCharacterMonth(s,onFinish);
}
// Observe an already-aged barrel. This does not advance the shared clock.
// Multi-barrel callers must supply a decision-only onFinish callback: the
// legacy default deliberately preserves its original bottling/month behavior.
export function observeCharacterMonth(j,onFinish=finishCharacterMutable) {
  if(j.phase!=='watching'||j.view==='tasting')return j;
  const s=copy(j);s.peakCharacter=Math.max(s.peakCharacter,caskOf(s).character);detect(s,onFinish);return s;
}
export function sampleCharacter(j) {
  assert(j.phase!=='finished','完成した一本は記録から見返せます。');
  const s=copy(j),sample=sampleOf(caskOf(s));
  // Reopening the same month's glass keeps the earlier month's comparison.
  if(s.samples.at(-1)?.age!==sample.age){s.samples.push(sample);s.actions.push({age:sample.age,key:'sample'});}
  s.view='tasting';return s;
}
export const endCharacterTasting=j=>({...copy(j),view:'watching'});
export function comparisons(samples) {
  const current=samples.at(-1)??null,previous=samples.at(-2)??null,lines=[];
  if(current&&previous) {
    const a=previous.profile,b=current.profile;
    lines.push(b.roughness<a.roughness-CHARACTER_PARAMETERS.comparisonRough?'前より刺激がほどけています。':'口当たりの変化は、まだ小さめです。');
    lines.push(b.character>a.character+CHARACTER_PARAMETERS.comparisonAroma?'原酒の香りが、前より広がっています。':b.character<a.character-CHARACTER_PARAMETERS.comparisonAroma?'原酒の香りは、前より控えめです。':'原酒の香りは、前の印象に近いままです。');
    lines.push(b.wood>a.wood+CHARACTER_PARAMETERS.comparisonWood?'木の余韻が、前より重なっています。':'木の余韻の変化は、まだ小さめです。');
  }
  return {current,previous,lines};
}
export function chooseCharacter(j,key) {
  assert(j.phase==='choice'&&j.pending?.options.some(o=>o.id===key),'今はその選択をできません。');
  const s=copy(j),c=caskOf(s),option=s.pending.options.find(o=>o.id===key),event=s.pending.id;
  s.choices.push({age:c.age,key,text:option.label,event,profile:profile(c)});s.actions.push({age:c.age,key});s.pending=null;s.phase='watching';s.view='watching';
  if(key==='bottle')finishCharacterMutable(s);
  else if(key==='cool') {
    for(const k of ['soften','wood','evaporation'])c.variation[k]=Math.max(0.8,Math.min(1.2,c.variation[k]*CHARACTER_PARAMETERS.cool[k]));
    s.cooled=true;s.intent='cool';
  } else if(key==='last')s.targetAge=c.age+CHARACTER_PARAMETERS.finalWait;
  return s;
}
export function finishCharacter(j) {
  assert(j.phase!=='finished','この樽は瓶詰め済みです。');
  const s=copy(j),c=caskOf(s);s.actions.push({age:c.age,key:'finish'});
  s.choices.push({age:c.age,key:'bottle',text:'自分で瓶詰めを決めた',event:'free',profile:profile(c)});finishCharacterMutable(s);return s;
}
export function finishCharacterMutable(j) {
  const c=copy(caskOf(j)),q=bottleQuote(j.core,c.id);j.core=bottle(j.core,c.id,q.count);const productId=j.core.products.at(-1).id;j.core=advanceMonth(j.core);const p=j.core.products.find(p=>p.id===productId);
  const name=c.wood>0.85?'木の苦み':c.wood>0.66?'木の余韻':c.roughness>0.30?'若い穀物':c.character>0.80?'熟した果実':c.wood>0.36?'果実とバニラ':'淡い樽香';
  const comp=comparisons(j.samples),memory=[];
  if(j.samples.length){memory.push(`${j.samples[0].age}か月目に初めて試飲した。`);if(comp.previous)memory.push(`${comp.previous.age}か月目から${comp.current.age}か月目：${comp.lines.filter(x=>!x.includes('まだ小さめ')&&!x.includes('近いまま')).join('')||'前の印象に近い味わいだった。'}`);}
  if(j.cooled)memory.push(`${j.choices.find(x=>x.key==='cool').age}か月目に涼しい棚へ移した。木の移りと蒸発を抑え、口当たりの変化をゆっくり待った。`);
  const r={recordVersion:2,name,seed:j.seed,round:j.round,age:c.age,litres:c.litres,bottles:q.count,taste:tasting(c).split('。').filter(Boolean),choices:copy(j.choices),type:c.type,cut:c.cut,sold:p.lastSold,revenue:p.lastRevenue,upkeep:j.core.totals.upkeep,cash:j.core.cash,evaporated:j.core.totals.evaporated,profile:profile(c),samples:copy(j.samples),memory,description:`${c.type==='bourbon'?'バーボン樽':'リフィル樽'}で${c.age}か月。${j.cooled?'涼しい棚で変化を待った。':''}${j.samples.length?`${j.samples.length}度、試飲で確かめた。`:'試飲せず、見守った。'}`,actions:copy(j.actions)};
  j.result=r;j.records=[...j.records,r].slice(-CHARACTER_PARAMETERS.maxRecords);j.phase='finished';j.view='watching';j.pending=null;j.targetAge=null;
}
