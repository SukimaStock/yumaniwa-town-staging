// Independent hypotheses. Nothing in the player game imports this module.
import {previewDistillation} from '../../model.mjs';
import {mixSeed} from '../../character.mjs';
import {spiritProfile} from '../../spirit-view.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../../economy-parameters.mjs';
export const CONTRACT='ambertime-distillation-comparison/1';
export const MODELS=Object.freeze([
 Object.freeze({id:'current',label:'現行',detail:'量・香り・刺激が増える基準'}),
 Object.freeze({id:'a',label:'案A',detail:'集めた香りに山がある'}),
 Object.freeze({id:'b',label:'案B',detail:'軽さ・果実・穀物が重なる'})
]);
export const FAMILY_KEYS=Object.freeze(['light','fruit','grain']);
export const INITIAL=Object.freeze({a:Object.freeze({aroma:.24}),b:Object.freeze({light:.24,fruit:.04,grain:.005})});
// Concentrations are arbitrary aroma-load units per litre, not fractions or
// percentages. A fraction can carry >1 unit; the collected strength stays 0..1.
export const HYPOTHESES=Object.freeze({a:Object.freeze({floor:.10,amplitude:3,center:.28,width:.18}),b:Object.freeze({light:.15,lightDecay:4,fruit:2.1,fruitCenter:.32,fruitWidth:.22,grain:2.6,grainStart:.35,grainEnd:.95}),substeps:16});
const assert=(ok,msg)=>{if(!ok)throw Error(msg);},clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),round=n=>Math.round(n*100)/100;
function next(state){let x=state.value;x^=x<<13;x^=x>>>17;x^=x<<5;state.value=x>>>0;return state.value/4294967296;}
export function createConditions(seed=20261015,batch=0){
 assert(Number.isInteger(seed)&&seed>=1&&seed<=4294967295,'シードは1〜4294967295で指定します。');
 assert(Number.isInteger(batch)&&batch>=0&&batch<=99,'仕込み番号は0〜99で指定します。');
 const state={value:mixSeed(seed)};for(let i=0;i<batch*4;i++)next(state);
 const variation=(.22*(.96+next(state)*.08))/.22;
 const caskVariation={soften:.86+next(state)*.28,wood:.86+next(state)*.28,evaporation:.92+next(state)*.16};
 return Object.freeze({contract:CONTRACT,seed,batch,variation,caskVariation:Object.freeze(caskVariation),rngStateAfterCask:state.value});
}
export function fractionAt(modelId,cut){
 assert(MODELS.some(m=>m.id===modelId)&&Number.isFinite(cut)&&cut>=0&&cut<=1,'留分の条件が不正です。');
 if(modelId==='current')return null; // The control defines a cumulative profile.
 if(modelId==='a'){const a=HYPOTHESES.a;return {aroma:a.floor+a.amplitude*Math.exp(-(((cut-a.center)/a.width)**2))};}
 const b=HYPOTHESES.b,t=clamp((cut-b.grainStart)/(b.grainEnd-b.grainStart));
 return {light:b.light*Math.exp(-b.lightDecay*cut),fruit:b.fruit*Math.exp(-(((cut-b.fruitCenter)/b.fruitWidth)**2)),grain:b.grain*t*t*(3-2*t)};
}
export function proportions(components){const sum=Object.values(components).reduce((n,v)=>n+v,0);return Object.fromEntries(Object.entries(components).map(([k,v])=>[k,sum?v/sum:0]));}
export function compositionPhrase(p){
 if(p.light>.55)return '軽い香りに、果実が少し重なる。';
 if(p.grain>=p.fruit)return '果実を残して、穀物の厚みが前に出る。';
 if(p.grain>.15)return '果実の香りに、穀物の厚みが重なる。';
 if(p.fruit>.6)return '果実が前に出る、ふくらみのある香り。';
 return '軽い香りと果実が重なる。';
}
export function fractionPhrase(components){
 if(!components)return null;if('aroma' in components)return '香りを含む留分。';
 const p=proportions(components);return p.grain>=p.fruit&&p.grain>=p.light?'穀物の厚みが中心。':p.fruit>=p.light?'果実の香りが中心。':'軽い香りが中心。';
}
// Fixed midpoint grid is shared across every prefix. Include the first 24 L;
// later fractions add delta-L, never one equal weight per elapsed timer tick.
export function collectedLoads(modelId,progress,substeps=HYPOTHESES.substeps){
 assert(['a','b'].includes(modelId)&&Number.isInteger(progress)&&progress>=0&&progress<100,'混合の条件が不正です。');
 assert(Number.isInteger(substeps)&&substeps>=1&&substeps<=1024,'混合の細分数が不正です。');
 const litres=progress<=P.minimumStop?round(C.baseLitres*progress/P.minimumStop):previewDistillation((progress-P.minimumStop)/(P.distillMax-P.minimumStop)).litres;
 const initial=INITIAL[modelId],mass=Object.fromEntries(Object.entries(initial).map(([k,v])=>[k,v*Math.min(litres,C.baseLitres)]));
 // Stop at the same rounded litres as the real collection, so mass and volume
 // agree exactly even though previewDistillation rounds volume to 0.01 L.
 for(let p=P.minimumStop;p<progress;p++){
  const v0=previewDistillation((p-P.minimumStop)/(P.distillMax-P.minimumStop)).litres,v1=previewDistillation((p+1-P.minimumStop)/(P.distillMax-P.minimumStop)).litres;
  for(let j=0;j<substeps;j++){
   const x=(p-P.minimumStop+(j+.5)/substeps)/(P.distillMax-P.minimumStop),f=fractionAt(modelId,x),d=(v1-v0)/substeps;
   for(const k of Object.keys(mass))mass[k]+=f[k]*d;
  }
 }
 return {litres,mass,concentration:Object.fromEntries(Object.entries(mass).map(([k,v])=>[k,litres?v/litres:0]))};
}
// Precompute only deterministic shape data. No session, seed or player state.
const shapes=Object.fromEntries(['a','b'].map(id=>[id,Array.from({length:100},(_,p)=>collectedLoads(id,p))]));
export function profileAt(modelId,progress,seed=20261015,batch=0){
 assert(MODELS.some(m=>m.id===modelId),'比較するモデルを選びます。');
 assert(Number.isInteger(progress)&&progress>=0&&progress<P.distillMax,'抽出位置は0〜99で指定します。');
 const conditions=createConditions(seed,batch),litres=progress<=P.minimumStop?round(C.baseLitres*progress/P.minimumStop):previewDistillation((progress-P.minimumStop)/(P.distillMax-P.minimumStop)).litres;
 if(progress<P.minimumStop)return {contract:CONTRACT,modelId,seed,batch,progress,phase:'collecting',litres,cut:null,roughness:null,character:null,components:null,composition:null,componentMass:null,instant:null,phrase:'原酒を集めています。'};
 const cut=(progress-P.minimumStop)/(P.distillMax-P.minimumStop),base=previewDistillation(cut),roughness=Math.min(1,base.roughness*conditions.variation),shape=modelId==='current'?null:shapes[modelId][progress];
 const concentrations=shape?.concentration,baseAroma=modelId==='current'?base.character:Object.values(concentrations).reduce((n,v)=>n+v,0),character=clamp(baseAroma*conditions.variation);
 const components=modelId==='b'?Object.fromEntries(FAMILY_KEYS.map(k=>[k,concentrations[k]*conditions.variation])):null;
 const composition=components?proportions(components):null,instant=fractionAt(modelId,cut);
 const phrase=modelId==='b'?compositionPhrase(composition):spiritProfile({roughness,character,litres}).phrase;
 return {contract:CONTRACT,modelId,seed,batch,progress,phase:'forecast',cut,litres,roughness,character,wood:0,components,composition,componentMass:shape?Object.fromEntries(Object.entries(shape.mass).map(([k,v])=>[k,v*conditions.variation])):null,instant:instant?{components:instant,composition:modelId==='b'?proportions(instant):null,phrase:fractionPhrase(instant)}:null,phrase};
}
export function createRecipe({modelId,seed=20261015,stopAt,type='bourbon'}){
 assert(Number.isInteger(stopAt)&&stopAt>=P.minimumStop&&stopAt<P.distillMax&&Object.hasOwn(C.casks,type),'製法の抽出位置と樽を選びます。');
 profileAt(modelId,stopAt,seed);return Object.freeze({contract:CONTRACT,modelId,seed,stopAt,type});
}
export const repeatRecipe=(recipe,batch=0)=>{assert(recipe?.contract===CONTRACT,'比較実験の製法を選びます。');const r=createRecipe(recipe);return profileAt(r.modelId,r.stopAt,r.seed,batch);};
