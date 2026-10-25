// Transient bottle placement only. The native model owns every committed fact.
const keys=['retail','shop'],copy=a=>({...a}),same=(a,b)=>keys.every(k=>a[k]===b[k]);
export function createDraft({available,retail}){if(!Number.isInteger(available)||!Number.isInteger(retail)||retail<0||retail>available)throw Error('在庫を確認してください。');const initial={retail,shop:0};return {total:available,initial,allocation:copy(initial),history:[]};}
export const remaining=d=>d.total-d.allocation.retail-d.allocation.shop;
export function portion(d,choice){const n=remaining(d);return choice==='1'?Math.min(1,n):choice==='2'?Math.min(2,n):choice==='half'?Math.ceil(n/2):choice==='all'?n:0;}
function change(d,a){if(!keys.every(k=>Number.isInteger(a[k])&&a[k]>=0)||a.retail+a.shop>d.total||same(a,d.allocation))return {changed:false};d.history.push(copy(d.allocation));d.allocation=copy(a);return {changed:true};}
export function place(d,target,choice,maxShop=0){if(!keys.includes(target))return {changed:false};const count=Math.min(portion(d,choice),target==='shop'?Math.max(0,maxShop-d.allocation.shop):Infinity);if(!Number.isInteger(count)||count<=0)return {changed:false};const result=change(d,{...d.allocation,[target]:d.allocation[target]+count});return {...result,count,target};}
export function undo(d){if(!d.history.length)return {changed:false};d.allocation=d.history.pop();return {changed:true};}
export const reset=d=>change(d,d.initial);
export const redistribute=d=>change(d,{retail:0,shop:0});
