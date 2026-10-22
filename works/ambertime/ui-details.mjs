// Presentation only: keep the existing extraction, bottle transaction and release identities.
import {PARALLEL_PARAMETERS as P} from './economy-parameters.mjs';
import {monthLabel} from './model.mjs?v=stage4-r2';
export const extractionMaximum=P.distillMax-1;
export function bottleChoices(max,affordable){
 if(!Number.isFinite(max)||!Number.isFinite(affordable))return [];
 const remaining=Math.max(0,Math.floor(max)),available=Math.max(0,Math.min(remaining,Math.floor(affordable))),choices=[];
 if(available<1)return choices;
 if(available<5)choices.push(available);
 for(let count=5;count<=available;count+=5)choices.push(count);
 if(available===remaining&&!choices.includes(remaining))choices.push(remaining);
 return choices;
}
export function defaultBottleCount(previous,max,affordable){
 const choices=bottleChoices(max,affordable);if(!choices.length)return null;
 if(choices.includes(previous))return previous;
 return Number.isFinite(previous)?choices.filter(count=>count<=previous).at(-1)??choices[0]:choices[0];
}
const validMonth=month=>Number.isInteger(month)&&month>=0;
export function releaseLabel(state,productId,caskSerials=new Map()){
 const releases=state?.releases??[],release=releases.find(r=>r.productId===productId);
 if(!release||!validMonth(release.bottledMonth)){
  const record=state?.records?.find(r=>r.productId===productId&&validMonth(r.bottledMonth));
  return record?monthLabel(record.bottledMonth):'発売日不明';
 }
 let label=monthLabel(release.bottledMonth);
 const monthGroup=releases.filter(r=>r.bottledMonth===release.bottledMonth);
 if(monthGroup.length>1){
  label+=' · たる No.'+(caskSerials.get(release.caskId)??'?');
  const caskGroup=monthGroup.filter(r=>r.caskId===release.caskId).sort((a,b)=>a.id-b.id);
  if(caskGroup.length>1)label+=' · '+(caskGroup.indexOf(release)+1)+'回目';
 }
 return label;
}
