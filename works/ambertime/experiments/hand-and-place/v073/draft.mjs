// Presentation-only choices. This module never dispatches a game action or owns inventory.
const TARGETS=['retail','restaurant','liquor'];
const same=(a,b)=>TARGETS.every(k=>a[k]===b[k]);
const copy=a=>({retail:a.retail,restaurant:a.restaurant,liquor:a.liquor});
const valid=d=>d&&Number.isInteger(d.total)&&d.total>=0&&TARGETS.every(k=>Number.isInteger(d.allocation?.[k])&&d.allocation[k]>=0)&&TARGETS.reduce((n,k)=>n+d.allocation[k],0)<=d.total;
export function createDraft(lot){
 const retail=lot?.retail??0,stock=lot?.stock;
 if(!Number.isInteger(stock)||stock<0||!Number.isInteger(retail)||retail<0)throw Error('使える本数を確認してください。');
 const initial={retail,restaurant:0,liquor:0};return {total:stock+retail,initial,allocation:copy(initial),history:[]};
}
export function remaining(d){return valid(d)?d.total-TARGETS.reduce((n,k)=>n+d.allocation[k],0):0;}
export function portion(d,choice){const n=remaining(d);return choice==='1'?Math.min(1,n):choice==='2'?Math.min(2,n):choice==='half'?Math.ceil(n/2):choice==='all'?n:0;}
function commit(d,next){if(!valid(d)||!Array.isArray(d.history)||same(d.allocation,next))return {changed:false};d.history.push(copy(d.allocation));d.allocation=copy(next);return {changed:true};}
export function place(d,target,choice){
 const count=portion(d,choice);if(!valid(d)||!TARGETS.includes(target)||!count)return {changed:false,count:0,target};
 const result=commit(d,{...d.allocation,[target]:d.allocation[target]+count});return {...result,count:result.changed?count:0,target};
}
export function undo(d){if(!valid(d)||!Array.isArray(d.history)||!d.history.length)return {changed:false};d.allocation=copy(d.history.pop());return {changed:true};}
export function reset(d){if(!valid(d)||!d.initial||!TARGETS.every(k=>Number.isInteger(d.initial[k])&&d.initial[k]>=0)||TARGETS.reduce((n,k)=>n+d.initial[k],0)>d.total)return {changed:false};return commit(d,d.initial);}
export function redistribute(d){return commit(d,{retail:0,restaurant:0,liquor:0});}
export function setAllocation(d,values){
 if(!valid(d)||!values||Object.keys(values).length!==TARGETS.length||!TARGETS.every(k=>Object.hasOwn(values,k)&&Number.isInteger(values[k])&&values[k]>=0))return {changed:false};
 if(TARGETS.reduce((n,k)=>n+values[k],0)>d.total)return {changed:false};
 return commit(d,values);
}
export function setCount(d,target,value){
 if(!valid(d)||!TARGETS.includes(target)||!Number.isInteger(value)||value<0)return {changed:false};
 if(TARGETS.reduce((n,k)=>n+(k===target?value:d.allocation[k]),0)>d.total)return {changed:false};
 return commit(d,{...d.allocation,[target]:value});
}
export function makeAction(d,lotId,shops={}){
 if(!valid(d))throw Error('仮置きの本数を確認してください。');
 return {type:'allocate-all',lotId,retail:d.allocation.retail,deliveries:TARGETS.slice(1).map(shopId=>({shopId,count:d.allocation[shopId],orderId:d.allocation[shopId]>0?(shops[shopId]?.orderId??null):null}))};
}
