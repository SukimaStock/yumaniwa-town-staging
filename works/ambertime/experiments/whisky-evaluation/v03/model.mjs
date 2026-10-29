import * as Base from '../v02/model.mjs';
import {POLICIES,rebuild,view} from './memory.mjs';
export {POLICIES};
export const VERSION='whisky-reputation/0.3';
export const {SHOPS,SAMPLES,AGES,PRICE_TIERS,MAX_LOG_BYTES}=Base;
const copy=x=>structuredClone(x),assert=(x,t)=>{if(!x)throw Error(t);};
export function create({seed=20261029,policy='support'}={}){assert(Object.hasOwn(POLICIES,policy),'記憶モデルを確認してください。');const sales=Base.create({seed});return {version:VERSION,policy,sales,receipts:[],relations:rebuild(sales,[],policy),actions:[]};}
export const allocation=s=>Base.allocation(s.sales),freeHand=(s,id)=>Base.freeHand(s.sales,id),productSummary=(s,id)=>Base.productSummary(s.sales,id),shopView=view;
export function validate(s){assert(s?.version===VERSION&&Object.hasOwn(POLICIES,s.policy)&&Array.isArray(s.receipts)&&Array.isArray(s.actions)&&s.actions.length<=5000,'このLabの記録を選んでください。');Base.validate(s.sales);assert(JSON.stringify(s.relations)===JSON.stringify(rebuild(s.sales,s.receipts,s.policy)),'店の記録と計算が一致しません。');return true;}
export function transact(s,action,saveFn=()=>{}){
 validate(s);const next=copy(s),a=copy(action),before=s.sales;
 if(a.type==='wait'){assert(Number.isInteger(a.months)&&a.months>=1&&a.months<=120,'待つ月数を確認してください。');for(let left=a.months;left>0;left-=12)next.sales=Base.transact(next.sales,{type:'advance',months:Math.min(12,left)});}
 else next.sales=Base.transact(before,a);
 if(a.type==='confirm'){for(const d of SHOPS){const count=Base.allocation(before)[d.id];if(count)next.receipts.push({kind:'delivery',shopId:d.id,productId:before.selectedId,count,month:before.month});}}
 if(a.type==='recall'){const old=before.products.find(p=>p.id===a.productId);next.receipts.push({kind:'recall',shopId:a.shopId,productId:a.productId,count:a.count??old.shops[a.shopId],month:before.month});}
 next.relations=rebuild(next.sales,next.receipts,next.policy);next.actions.push(a);const text=serialize(next),saved=saveFn(text);assert(saved!==false&&!(saved&&typeof saved.then==='function'),'記録できなかったため変更していません。');return next;
}
export function serialize(s){validate(s);const text=JSON.stringify(s);assert(new TextEncoder().encode(text).length<MAX_LOG_BYTES,'記録が大きいため、別の試遊として始めてください。');return text;}
export function restore(text){assert(typeof text==='string'&&new TextEncoder().encode(text).length<MAX_LOG_BYTES,'記録の大きさを確認してください。');const input=JSON.parse(text);validate(input);let s=create({seed:input.sales.seed,policy:input.policy});for(const a of input.actions)s=transact(s,a);assert(JSON.stringify(s)===JSON.stringify(input),'操作履歴と店の記録が一致しません。');return s;}
export const csv=s=>{validate(s);return Base.csv(s.sales);};
export function csvMemory(s){validate(s);const q=x=>'"'+String(x??'').replaceAll('"','""')+'"';const rows=[['version','policy','seed','month','shop','productId','received','sold','supportCount','strongCount','missCount','lastSale','currentSupport','recognition','expectationWeight','contextIntrinsic','contextBonus','contextValue','priorProductId']];for(const d of SHOPS){const v=shopView(s,d.id);for(const r of v.archive){const c=r.contexts.at(-1);rows.push([VERSION,s.policy,s.sales.seed,s.sales.month,d.id,r.productId,r.received,r.sold,r.supportCount,r.strongCount,r.missCount,r.lastSale,v.support,v.recognition,v.expectations.find(e=>e.productId===r.productId)?.weight??0,c?.intrinsic,c?.bonus,c?.value,c?.priorProductId]);}}return '\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n');}
