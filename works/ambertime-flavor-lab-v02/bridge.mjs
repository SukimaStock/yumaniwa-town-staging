// Versioned, one-way specimen transfer. No storage, mutable shared state, or name parsing.
import {profileFor,summaryFor,valid} from './model.mjs';
export const SNAPSHOT_SCHEMA='ambertime-bottled-specimen/1';
export const AXES=['fruit','grain','smoke','body','rough','spice','wood','vanilla'];
export const PRIMARY={fruit:'果実の香り',grain:'麦の香り',smoke:'煙の香り',body:'味の厚み'};
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
function fingerprint(s){
 const raw=JSON.stringify([s.source.bottleId,s.source.bottledAt,s.ageMonths,s.recipe.malt,s.recipe.ferment,s.recipe.cask,s.recipe.start,s.recipe.end,...AXES.map(k=>s.profile[k])]);
 let a=2166136261,b=3339675911;for(let i=0;i<raw.length;i++){a=Math.imul(a^raw.charCodeAt(i),16777619)>>>0;b=Math.imul(b^raw.charCodeAt(i),2246822519)>>>0;}
 return 'flavor-v02-'+s.source.bottleId+'-'+a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');
}
const freeze=s=>{for(const value of Object.values(s))if(value&&typeof value==='object')freeze(value);return Object.freeze(s)};
export function validateSnapshot(s){
 if(s?.schema!==SNAPSHOT_SCHEMA||typeof s.label!=='string'||!s.label.trim()||s.label.length>80||/[\u0000-\u001f]/.test(s.label)||!Object.hasOwn(PRIMARY,s.primary)||!integer(s.ageMonths,0,1200)||!valid(s.recipe??{})||!integer(s.source?.bottleId,1,Number.MAX_SAFE_INTEGER)||!integer(s.source?.bottledAt,0,Number.MAX_SAFE_INTEGER)||s.quantity!==24||s.releaseMonth!==0||!AXES.every(k=>Number.isFinite(s.profile?.[k])&&s.profile[k]>=0&&s.profile[k]<=1))throw Error('瓶詰め情報を読み込めません。名前Labから送り直してください。');
 if(s.id!==fingerprint(s))throw Error('瓶詰め情報が変わっています。名前Labから送り直してください。');
 return true;
}
export function createSnapshot(b){
 if(!integer(b?.bottledAt,0,Number.MAX_SAFE_INTEGER))throw Error('瓶詰めしたものを選んでください。');
 const s={schema:SNAPSHOT_SCHEMA,id:'',label:b.label,profile:profileFor(b),primary:summaryFor(b)[0].key,ageMonths:b.months,recipe:{...b.choice},source:{bottleId:b.id,bottledAt:b.bottledAt},quantity:24,releaseMonth:0};
 s.id=fingerprint(s);validateSnapshot(s);return freeze(s);
}
export function copySnapshot(s){validateSnapshot(s);return freeze({schema:s.schema,id:s.id,label:s.label,profile:Object.fromEntries(AXES.map(k=>[k,s.profile[k]])),primary:s.primary,ageMonths:s.ageMonths,recipe:{malt:s.recipe.malt,ferment:s.recipe.ferment,cask:s.recipe.cask,start:s.recipe.start,end:s.recipe.end},source:{bottleId:s.source.bottleId,bottledAt:s.source.bottledAt},quantity:s.quantity,releaseMonth:s.releaseMonth});}
export function projectSnapshot(snapshot){
 const s=copySnapshot(snapshot),p=s.profile;
 return {roughness:p.rough,character:Math.max(p.fruit,p.grain,p.smoke,p.body),wood:Math.max(p.wood,p.vanilla),age:24,price:30,label:s.label,specimenId:s.id,primaryLabel:PRIMARY[s.primary]};
}
export function encodeSnapshot(s){return '#bottle='+encodeURIComponent(JSON.stringify(copySnapshot(s)))}
export function decodeSnapshot(hash){
 if(!hash||!hash.startsWith('#bottle='))return null;
 if(hash.length>12000)throw Error('瓶詰め情報が長すぎます。名前Labから送り直してください。');
 try{return copySnapshot(JSON.parse(decodeURIComponent(hash.slice(8))))}catch{throw Error('瓶詰め情報を読み込めません。名前Labから送り直してください。');}
}
