import {attachFlavor,flavorName} from './lab-flavor.mjs?v=stage4-r2';
import {tasting,previewDistillation} from './model.mjs?v=stage4-r2';
import {previewForDistillation} from './aroma-extraction.mjs?v=stage4-r2';
import {PARALLEL_PARAMETERS as P} from './economy-parameters.mjs';
// Absolute model units, never a batch-relative score. Wood's distinct range is
// reserved for a later aging view; Phase 1 renders only the first two axes.
export const FLAVOR_AXES=Object.freeze([
 Object.freeze({id:'roughness',label:'刺激',maximum:1}),
 Object.freeze({id:'character',label:'原酒の香り',maximum:1}),
 Object.freeze({id:'wood',label:'樽の香り',maximum:1.35})
]);
const aroma=new Map([
 ['香りは控えめ','香りは控えめで、'],
 ['軽い果実、穀物の香り','軽い果実と穀物が香り、'],
 ['果実と穀物の香りが広がる','果実と穀物が香り、'],
 ['熟した果実と厚い穀物の香り','熟した果実と穀物が香り、']
]);
const touch=new Map([
 ['舌に強い刺激が残る','刺激は強い。'],
 ['口当たりにまだ角がある','口当たりに角がある。'],
 ['刺激がほどけ、丸さが出てきた','刺激は穏やか。'],
 ['やわらかい口当たり','口当たりは柔らかい。']
]);
export function spiritProfile(source){
 if(!source||!['roughness','character','litres'].every(k=>Number.isFinite(source[k]))||source.roughness<0||source.roughness>1||source.character<0||source.character>1||source.litres<0)return null;
 const {roughness,character,litres}=source,[r,a]=tasting({...source,wood:0}).split('。');
 return {roughness,character,litres,phrase:source.flavor?flavorName(source):aroma.get(a)+touch.get(r),axes:FLAVOR_AXES.slice(0,2).map(axis=>({...axis,value:source[axis.id],ratio:source[axis.id]/axis.maximum}))};
}
export function distillationView(s){
 const still=s?.still;
 if(still?.phase==='filling'){const profile=spiritProfile(s.core.spirit);return profile?{phase:'confirmed',...profile}:null;}
 if(still?.phase!=='distilling')return null;
 const d=still.distillation;
 if(!d||!Number.isInteger(d.progress)||d.progress<0||d.progress>=P.distillMax)return null;
 if(d.collectionVersion===2){
  if(d.collectStart===null||d.progress-d.collectStart<12)return {phase:'collecting',litres:0,phrase:'',axes:[]};
  const f=attachFlavor(previewDistillation(69/70*d.progress/99),{...d.labChoice,cask:'refill',start:d.collectStart/99,end:d.progress/99});
  return {phase:'forecast',...spiritProfile(f)};
 }
 if(d.progress<P.minimumStop)return {phase:'collecting',litres:d.litres,phrase:'原酒を集めています。',axes:[]};
 if(!Number.isFinite(d.variation)||d.variation<=0)return null;
 let f=previewForDistillation(d);
 if(d.labChoice){if(d.collectStart===null||d.progress-d.collectStart<9)return {phase:'collecting',litres:d.litres,phrase:'採取を始める位置を選びます。',axes:[]};f=attachFlavor(f,{...d.labChoice,cask:'refill',start:(d.collectStart-30)/69,end:(d.progress-30)/69});}
 const profile=spiritProfile({litres:f.litres,roughness:f.flavor?f.roughness:Math.min(1,f.roughness*d.variation),character:f.flavor?f.character:Math.min(1,f.character*d.variation),...(f.flavor?{flavor:f.flavor}:{})});
 return profile?{phase:'forecast',...profile}:null;
}
