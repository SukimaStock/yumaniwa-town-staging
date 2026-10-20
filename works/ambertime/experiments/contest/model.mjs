// Contest-only decisions. Production chemistry remains in the imported modules.
import * as D from '../../partner-orders.mjs';
import {ageCask} from '../../model.mjs';
import {PARAMETERS as P} from '../../parameters.mjs';
export const DEFAULT_SEED=20261020;
export const STRATEGIES=Object.freeze([
 {id:'diverse',name:'違う個性を4樽'}, {id:'repeat',name:'同じ製法を4樽'},
 {id:'long',name:'1樽だけ長く育てる'}, {id:'turnover',name:'若いうちに売る'}
]);
export const CONDITIONS=Object.freeze({consumption:Object.freeze({none:0,small:0.07,large:0.7}),evaporation:Object.freeze({current:1,strong:1.3,cool:0.8,warm:1.2})});
export const JUDGES=Object.freeze([
 {id:'mature',name:'熟成派',hint:'丸い口当たりと木のかおり。木が強すぎると苦手。',target:[.08,.70,.58],width:[.20,.35,.26],weight:[.25,.15,.60]},
 {id:'aroma',name:'かおり派',hint:'原酒のかおりを中心に、木との重なりも見る。',target:[.25,.94,.20],width:[.35,.23,.28],weight:[.10,.65,.25]},
 {id:'bold',name:'力強さ派',hint:'はっきりしたシゲキと若い原酒の個性。強すぎても苦手。',target:[.65,.65,.08],width:[.28,.30,.25],weight:[.60,.25,.15]}
]);
const clone=structuredClone,round=n=>Math.round(n*10)/10;
function check(ok,message){if(!ok)throw Error(message);}
const validSeed=seed=>Number.isInteger(seed)&&seed>=1&&seed<=4294967295;
export function generateCask({seed=DEFAULT_SEED,stop=66,type='refill',months=0,id=1}={}){
 check(validSeed(seed)&&Number.isInteger(stop)&&stop>=30&&stop<=99&&Object.hasOwn(P.casks,type)&&Number.isInteger(months)&&months>=0&&months<=120,'製法・シード・月齢を確認してください。');
 let state=D.startDistillation(D.newStaffDistillery(seed));
 while(state.still.distillation.progress<stop)state=D.distillStep(state);
 state=D.fillBarrel(D.stopDistillation(state),type);
 let c=state.core.casks[0];
 for(let n=0;n<months;n++)c=ageCask(c);
 // id is an experiment serial only, never an internal production identifier.
 return {...c,id,recipe:{seed,stop,type,months},sampled:0};
}
export const bottles=c=>Math.floor((c.litres+1e-9)/P.bottleLitres);
export function judge(cask){
 const values=[cask.roughness,cask.character,cask.wood];
 check(values.every(Number.isFinite),'風味の値が不正です。');
 const judges=JUDGES.map(j=>{
  const distances=values.map((v,i)=>j.weight[i]*((v-j.target[i])/j.width[i])**2);
  const score=round(100*Math.exp(-distances.reduce((a,b)=>a+b,0)/2));
  const i=distances.indexOf(Math.max(...distances)),axis=['シゲキ','原酒のかおり','木のかおり'][i];
  let comment=score>=85?({mature:'丸さと木のかおりが好みに合う。',aroma:'原酒のかおりがよく残っている。',bold:'シゲキと若いかおりが好みに合う。'})[j.id]:`${axis}が好みより${values[i]>j.target[i]?'強い':'控えめ'}。`;
  return {id:j.id,name:j.name,score,comment};
 });
 return {judges,total:round(judges.reduce((sum,j)=>sum+j.score,0)/judges.length)};
}
export const rival=()=>generateCask({seed:7181,stop:50,type:'refill',months:18,id:0});
export function createSession({seed=DEFAULT_SEED,strategy='diverse',consumption='small',evaporation='current'}={}){
 check(validSeed(seed)&&STRATEGIES.some(x=>x.id===strategy)&&Object.hasOwn(CONDITIONS.consumption,consumption)&&Object.hasOwn(CONDITIONS.evaporation,evaporation),'実験条件を確認してください。');
 const presets={diverse:[[99,'refill',0],[66,'refill',30],[30,'bourbon',30],[66,'bourbon',72]],repeat:Array.from({length:4},()=>[66,'refill',30]),long:[[50,'bourbon',12],[66,'refill',12],[99,'refill',0],[66,'refill',72]],turnover:[[99,'refill',0],[66,'refill',6],[50,'bourbon',6],[30,'bourbon',6]]};
 // Same recipe/age has exactly the same original batch in the repeated preset.
 const casks=presets[strategy].map(([stop,type,months],i)=>generateCask({seed,stop,type,months,id:i+1}));
 // Existing initial histories use baseline evaporation; recompute only losses for variants.
 if(evaporation!=='current')for(const c of casks){const factor=CONDITIONS.evaporation[evaporation],rate=P.casks[c.type].evaporation*c.variation.evaporation;c.litres=c.initialLitres*(1-rate*factor)**c.age;}
 return {version:'ambertime-contest/0.1',seed,strategy,consumption,evaporation,month:0,casks,history:[],sold:[],nextSerial:5};
}
export function submit(session,id){
 const s=clone(session),c=s.casks.find(x=>x.id===id),used=CONDITIONS.consumption[s.consumption];
 check(c&&Number.isFinite(used)&&c.litres>0&&c.litres+1e-12>=used,'出品する原酒が足りません。');
 const evaluation=judge(c),opponent=judge(rival()),profile=clone(c),beforeLitres=c.litres;
 c.litres=Math.max(0,c.litres-used);c.sampled+=used;
 s.history.push({round:s.history.length+1,month:s.month,caskId:id,age:c.age,profile,evaluation,rival:opponent,outcome:evaluation.total>opponent.total?'勝ち':evaluation.total<opponent.total?'負け':'引き分け',consumed:used,beforeLitres,afterLitres:c.litres,recommendations:evaluation.judges.filter((j,i)=>j.score>opponent.judges[i].score).map(j=>j.name)});
 return s;
}
export function advance(session,months){
 check(Number.isInteger(months)&&months>=1&&months<=120,'進める月数を確認してください。');
 check(session.casks.every(c=>c.age+months<=120),'この比較は月齢120か月までです。');
 const s=clone(session),factor=CONDITIONS.evaporation[s.evaporation];
 for(let n=0;n<months;n++)s.casks=s.casks.map(c=>{
  const aged=ageCask(c);
  // Taste is byte-for-byte ageCask. Only volume changes in hypothetical environments.
  if(factor!==1)aged.litres=Math.max(0,c.litres*(1-P.casks[c.type].evaporation*c.variation.evaporation*factor));
  return aged;
 });
 s.month+=months;return s;
}
export function replace(session,id,{stop=66,type='refill'}={}){
 const s=clone(session),index=s.casks.findIndex(c=>c.id===id);check(index>=0,'たるを選んでください。');
 const old=s.casks[index],fresh=generateCask({seed:s.seed,stop,type,id:s.nextSerial++});
 s.sold.push({month:s.month,cask:clone(old),bottles:bottles(old)});s.casks[index]=fresh;return s;
}
