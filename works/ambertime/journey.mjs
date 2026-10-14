import * as V03 from './journey-v03.mjs';
import { restore,serialize,tasting } from './model.mjs';
import { CHARACTER_PARAMETERS,createCharacter,caskOf,profile,sampleOf,tickCharacter,sampleCharacter,endCharacterTasting,comparisons,chooseCharacter,finishCharacter } from './character.mjs';
export const JOURNEY_PARAMETERS=CHARACTER_PARAMETERS;
const copy=s=>structuredClone(s),assert=(ok,t)=>{if(!ok)throw new Error(t);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const currentCask=caskOf;
export const newJourney=createCharacter;
function wrapLegacy(old) {
  const actions=old.choices.map(c=>({age:c.age,key:c.key}));
  return {...copy(old),version:2,rules:'legacy',legacy:copy(old),view:'watching',samples:[],actions};
}
function syncLegacy(j,old) {
  const s={...copy(j),...copy(old),version:2,rules:'legacy',legacy:copy(old)};
  if(old.phase==='finished'&&j.samples.length) {
    const comp=comparisons(s.samples);
    s.result={...copy(old.result),recordVersion:2,rules:'legacy',samples:copy(s.samples),actions:copy(s.actions),memory:[`${s.samples[0].age}か月目に初めて試飲した。`,...(comp.previous?[`${comp.previous.age}か月目から${comp.current.age}か月目：${comp.lines.join('')}`]:[])],description:`${old.result.age}か月の熟成を、${s.samples.length}度の試飲で確かめた。`};s.records=[...old.records.slice(0,-1),s.result];
  }
  if(s.phase==='finished')s.view='watching';return s;
}
export function tick(j) {
  if(j.phase!=='watching'||j.view==='tasting')return j;
  return j.rules==='legacy'?syncLegacy(j,V03.tick(j.legacy)):tickCharacter(j);
}
export function choose(j,key) {
  if(j.rules!=='legacy')return chooseCharacter(j,key);
  const s=copy(j);s.actions.push({age:currentCask(j).age,key});s.view='watching';return syncLegacy(s,V03.choose(j.legacy,key));
}
export function sampleJourney(j) {
  // Same snapshot contract for new and frozen legacy physics.
  return sampleCharacter(j);
}
export const endTasting=endCharacterTasting;
export function finishJourney(j) {
  const s=finishCharacter(j);s.result.rules=j.rules;
  s.records[s.records.length-1]=s.result;return s;
}
export function nextJourney(j) {
  assert(j.phase==='finished','この樽を瓶詰めしてから、次を預かれます。');
  return createCharacter((j.seed+1)>>>0||1,j.records,j.round+1);
}
export const comparison=j=>comparisons(j.samples);
export const choiceView=j=>j.pending;
export function observation(j) {
  const c=currentCask(j);if(!c)return null;
  return {age:c.age,litres:c.litres,initialLitres:c.initialLitres,roughness:c.roughness,character:c.character,wood:c.wood,text:tasting(c).split('。').filter(Boolean),change:c.wood>0.66?'琥珀色が、深くなっています。':c.wood>0.36?'前より、色が濃くなっています。':c.wood>0.13?'淡い色が、少しずつ移っています。':'若い、淡い色合いです。'};
}
export const formatRecord=r=>r;
function checkedActions(actions) {
  assert(Array.isArray(actions)&&actions.length<=100,'一樽の操作記録が大きすぎます。');
  let last=-1;for(const a of actions){assert(a&&Number.isInteger(a.age)&&a.age>=last&&a.age>=0&&a.age<=87&&['sample','wait','cool','bottle','last','finish','soft','wood'].includes(a.key)&&Object.keys(a).length===2,'一樽の操作記録が不正です。');last=a.age;}
}
function replay(seed,round,rules,actions,records=[]) {
  let j=rules==='legacy'?wrapLegacy(V03.newJourney(seed,records)):createCharacter(seed,records,round);j.round=round;if(j.legacy)j.legacy.round=round;
  for(const a of actions) {
    j=endTasting(j);
    for(let n=0;n<88&&j.phase==='watching'&&currentCask(j).age<a.age;n++)j=tick(j);
    assert(j.phase!=='finished'&&currentCask(j).age===a.age,'操作した時期と樽の状態が一致しません。');
    if(a.key==='sample')j=sampleJourney(j);else if(a.key==='finish')j=finishJourney(j);else j=choose(j,a.key);
  }
  return j;
}
function validateRecordUncached(r) {
  if(r?.recordVersion!==2){
    // Frozen 0.3 validates its original records by deterministic replay.
    const old=V03.newJourney(r?.seed,[r]);old.round=r?.round;V03.validateJourney(old);return;
  }
  assert(r&&(r.rules===undefined||['character','legacy'].includes(r.rules))&&Number.isInteger(r.seed)&&r.seed>0&&r.seed<=4294967295&&Number.isInteger(r.round)&&r.round>0&&r.round<=1e6,'一本の由来が不正です。');
  checkedActions(r.actions);let j=replay(r.seed,r.round,r.rules??'character',r.actions);
  for(let n=0;n<88&&j.phase==='watching';n++)j=tick(endTasting(j));
  assert(j.phase==='finished'&&equal(j.result,r),'一本の記録と操作が一致しません。');
}
// Cache validated immutable *contents*, never mutable object identities. A
// changed field changes the complete JSON key and must pass replay again.
const validatedRecords=new Map();
const MAX_VALIDATED_RECORDS=24;
function validateRecord(r) {
  const key=JSON.stringify(r);
  if(validatedRecords.has(key)){validatedRecords.delete(key);validatedRecords.set(key,true);return;}
  validateRecordUncached(r);
  validatedRecords.set(key,true);
  if(validatedRecords.size>MAX_VALIDATED_RECORDS)validatedRecords.delete(validatedRecords.keys().next().value);
}
export function validateJourney(j) {
  assert(j?.version===2&&['character','legacy'].includes(j.rules)&&Number.isInteger(j.seed)&&j.seed>0&&j.seed<=4294967295&&Number.isInteger(j.round)&&j.round>0&&j.round<=1e6&&['watching','tasting'].includes(j.view),'対応していない一樽の保存です。');
  restore(serialize(j.core));checkedActions(j.actions);
  assert(Array.isArray(j.records)&&j.records.length<=12,'記録の棚が不正です。');
  j.records.forEach(validateRecord);
  // Historical records are already checked above. Replaying the current barrel
  // without them avoids copying twelve complete tasting histories every month.
  let legacyPrior=null;
  if(j.rules==='legacy'){
    assert(j.legacy&&Array.isArray(j.legacy.records)&&j.legacy.records.length<=12,'以前の記録の棚が不正です。');
    assert(j.legacy.records.every(r=>r?.recordVersion!==2),'以前の保存に新しい記録は混在できません。');
    j.legacy.records.forEach(validateRecord);
    legacyPrior=j.legacy.phase==='finished'?j.legacy.records.slice(0,-1):j.legacy.records;
  }
  const prior=j.phase==='finished'?j.records.slice(0,-1):j.records;
  let r=replay(j.seed,j.round,j.rules,j.actions);
  for(let n=0;n<88&&r.phase==='watching'&&r.core.month<j.core.month;n++)r=tick(endTasting(r));
  // Graft only independently validated history after current-state replay. For
  // legacy free bottling the frozen snapshot may still retain all twelve older
  // records, whereas the new finished shelf has evicted its oldest record.
  const history=j.rules==='legacy'?legacyPrior:prior;
  r.records=r.phase==='finished'?[...history,r.result].slice(-12):history;
  if(r.legacy)r.legacy.records=r.legacy.phase==='finished'?[...legacyPrior,r.legacy.result].slice(-12):legacyPrior;
  // A restored glass is deliberately paused; closing/reopening is not chemistry.
  r.view=j.view;
  assert(j.view!=='tasting'||j.phase!=='finished'&&j.samples.at(-1)?.age===currentCask(j)?.age,'試飲の停止状態が不正です。');
  assert(equal(r,j),'一樽の進行と操作が一致しません。');return true;
}
export function serializeJourney(j){validateJourney(j);return JSON.stringify(j);}
export function restoreJourney(text) {
  assert(typeof text==='string'&&text.length<500000,'一樽の保存が大きすぎます。');let j;try{j=JSON.parse(text);}catch{throw new Error('一樽の保存を読み取れません。');}
  if(j?.version===1){V03.validateJourney(j);return wrapLegacy(j);}
  validateJourney(j);return j;
}
