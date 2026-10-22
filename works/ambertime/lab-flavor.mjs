// Work-local adapter for the adopted Lab model. Existing three-axis spirits
// have no flavor marker and retain their original chemistry and replay.
import * as Lab from '../ambertime-flavor-lab-v02/model.mjs';
export const FLAVOR_KEYS=Object.freeze(['fruit','grain','smoke','body','rough','spice','wood','vanilla']);
export const FLAVOR_FAMILIES=Object.freeze({fruit:'果実の香り',grain:'麦の香り',smoke:'煙の香り',body:'味の厚み'});
const clone=x=>structuredClone(x);
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const normalized=p=>Object.fromEntries(FLAVOR_KEYS.map(key=>{const n=p?.[key];assert(Number.isFinite(n)&&n>=0&&n<=1,'原酒の個性が不正です。');return [key,Math.round(n*1e12)/1e12]}));
const deeplyFreeze=x=>{for(const v of Object.values(x))if(v&&typeof v==='object')deeplyFreeze(v);return Object.freeze(x)};
export const flavorMode=source=>source?.flavor?.version===1;
export function flavorProfile(source){return flavorMode(source)?clone(source.flavor.profile):null;}
export function flavorName(source){return flavorMode(source)?source.flavor.label:null;}
export function projectFlavor(profile){const p=normalized(profile);return {roughness:p.rough,character:Math.max(p.fruit,p.grain,p.smoke,p.body),wood:Math.max(p.wood,p.vanilla)};}
function projected(source,flavor){return {...source,...projectFlavor(flavor.profile),flavor};}
export function attachFlavor(source,choice){
 assert(source&&Lab.valid(choice),'仕込みの範囲を確認してください。');
 const spirit=normalized(Lab.distill(choice)),label=Lab.expression(spirit,spirit),barrel={id:source.id,choice:clone(choice),spirit,months:0,label,history:[{months:0,label}],pending:null,held:0};
 const primary=Lab.summaryFor(barrel)[0].key;
 return projected(source,{version:1,choice:barrel.choice,spirit,months:0,label,history:barrel.history,pending:null,held:0,profile:clone(spirit),primary});
}
export function setFlavorCask(source,type){
 if(!flavorMode(source))return source;
 assert(['bourbon','refill'].includes(type),'たるの種類が不正です。');
 assert(source.flavor.months===0,'たる詰めした原酒を選びます。');
 const flavor=clone(source.flavor);flavor.choice.cask=type==='bourbon'?'first':'refill';
 return projected(source,flavor);
}
export function ageFlavor(cask){
 if(!flavorMode(cask))return cask;
 const before=cask.flavor;
 assert(Number.isInteger(cask.age)&&cask.age===before.months+1,'個性と熟成年数が一致しません。');
 // The adopted Lab supports 100 years. Later ages retain that last profile,
 // while the existing main-game volume, cost and calendar continue normally.
 if(cask.age>1200)return projected(cask,{...clone(before),months:cask.age});
 const barrel={id:cask.id,choice:clone(before.choice),spirit:normalized(before.spirit),months:before.months,label:before.label,history:clone(before.history),pending:before.pending,held:before.held};
 const state=Lab.advance({months:before.months,barrels:[barrel]},1),grown=state.barrels[0];
 const profile=normalized(Lab.profileFor(grown));
 return projected(cask,{version:1,choice:grown.choice,spirit:grown.spirit,months:grown.months,label:grown.label,history:grown.history,pending:grown.pending,held:grown.held,profile,primary:before.primary});
}
export function freezeFlavor(source){return flavorMode(source)?deeplyFreeze(clone(source.flavor)):null;}
export function flavorSummary(source){
 if(!flavorMode(source))return null;const f=source.flavor;
 return [{key:'character',label:'原酒：'+FLAVOR_FAMILIES[f.primary],value:f.profile[f.primary]},{key:'roughness',label:'刺激・口当たり',value:f.profile.rough},{key:'wood',label:'樽の影響',value:Math.max(f.profile.wood,f.profile.vanilla)}];
}
