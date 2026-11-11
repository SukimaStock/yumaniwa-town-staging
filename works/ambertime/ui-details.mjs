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
// Staff controls only. Manual bottling and all formal model values stay unchanged.
export function bottlingPolicyCountChoices(current,max){
 if(!Number.isInteger(max)||max<1)return [];
 const choices=[];for(let n=5;n<=max;n+=5)choices.push(n);
 if(!choices.includes(max))choices.push(max);
 if(Number.isInteger(current)&&current>=1&&current<=max&&!choices.includes(current))choices.push(current);
 return choices.sort((a,b)=>a-b);
}
export function stepBottlingPolicyCount(current,direction,max){
 if(!Number.isInteger(current)||current<1||current>max)return null;
 const choices=bottlingPolicyCountChoices(null,max);
 return direction==='more'?choices.find(n=>n>current)??null:choices.filter(n=>n<current).at(-1)??null;
}
export function stepBottlingCondition(current,direction,max){
 if(!Number.isInteger(current)||current<0||current>max)return null;
 const next=current+(direction==='more'?1:-1);return next>=0&&next<=max?next:null;
}
export function policyNumber(value){return typeof value==='string'&&value.trim()!==''?Number(value):null;}
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
