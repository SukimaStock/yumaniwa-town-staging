// Independent game-design experiment; not a scientific flavor simulation.
export const CARDS={
 malt:[{id:"plain",name:"ふつうの麦芽"},{id:"peat",name:"ピート麦芽"}],
 ferment:[{id:"short",name:"短めの発酵"},{id:"long",name:"長めの発酵"}],
 cask:[{id:"refill",name:"リフィル"},{id:"first",name:"1stフィル"}]
};
const clip=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const bell=(x,c,w)=>Math.exp(-((x-c)/w)**2);
const avg=(f,a,b)=>{let v=0;for(let i=0;i<48;i++)v+=f(a+(b-a)*(i+.5)/48);return v/48};
export const valid=choice=>CARDS.malt.some(x=>x.id===choice.malt)&&CARDS.ferment.some(x=>x.id===choice.ferment)&&CARDS.cask.some(x=>x.id===choice.cask)&&Number.isFinite(choice.start)&&Number.isFinite(choice.end)&&choice.start>=0&&choice.end<=1&&choice.end-choice.start>=.12;
export function distill(choice){
 if(!valid(choice))throw Error("仕込みの範囲を確認してください");
 const long=choice.ferment==="long",peat=choice.malt==="peat";
 const a=choice.start,b=choice.end;
 const fruit=avg(x=>.12+(long?.86:.43)*bell(x,.34,.29),a,b);
 const grain=avg(x=>.19+(long?.42:.77)*bell(x,.56,.33),a,b);
 const body=avg(x=>.15+.91*bell(x,.79,.30),a,b);
 const spice=avg(x=>.11+.69*bell(x,.91,.24),a,b);
 const rough=avg(x=>.19+.50*bell(x,.08,.22)+.49*bell(x,.95,.22),a,b);
 const smoke=peat?avg(x=>.56+.18*bell(x,.58,.35),a,b):.055;
 return {fruit:clip(fruit),grain:clip(grain),body:clip(body),spice:clip(spice),rough:clip(rough),smoke:clip(smoke),wood:0,vanilla:0};
}
export function mature(original,years,cask){
 if(!Number.isFinite(years)||years<0||years>100)throw Error("年数が不正です");
 if(!CARDS.cask.some(x=>x.id===cask))throw Error("樽が不正です");
 const first=cask==="first",woodGain=first?.73:.34,vanillaGain=first?.67:.22;
 const wood=woodGain*(1-Math.exp(-years/(first?7:10)));
 const vanilla=vanillaGain*(1-Math.exp(-years/(first?6.5:10)));
 return {
  fruit:clip(original.fruit*(1-.15*(1-Math.exp(-years/16)))),
  grain:clip(original.grain*(1-.12*(1-Math.exp(-years/18)))),
  smoke:clip(original.smoke*(1-.10*(1-Math.exp(-years/19)))),
  body:clip(original.body*(1-.07*(1-Math.exp(-years/15)))),
  spice:clip(original.spice*(1-.17*(1-Math.exp(-years/13)))),
  rough:clip(original.rough*(.31+.69*Math.exp(-years/5.8))),
  wood:clip(wood),vanilla:clip(vanilla)
 };
}
const names={
 fruit:["果実がほんのり香る","果実の香り","果実香が豊か","果実香が強い"],
 grain:["麦がほんのり香る","麦の香り","麦の香りが豊か","力強い麦の香り"],
 smoke:["ほのかな煙の香り","スモーキー","煙の香りが豊か","煙の香りが際立つ"],
 body:["軽やかな口当たり","ほどよい厚み","厚みのある味わい","どっしりした味"]
};
function identity(p){
 // Smoke, grain, fruit and body remain distinguishable; wood is an aging influence, not a new species.
 const candidates=[["fruit",p.fruit*1.05],["grain",p.grain*.92],["smoke",p.smoke*1.18],["body",p.body*.89]];
 candidates.sort((a,b)=>b[1]-a[1]);
 return candidates[0][0];
}
export function expression(profile,origin){
 const kind=identity(origin),p=profile;
 const power=p[kind],tier=power<.29?0:power<.48?1:power<.69?2:3;
 // Only curated, complete Japanese phrases. No concatenation of arbitrary nouns or connectors.
 const woody=p.wood>.42&&p.vanilla>.36;
 if(woody){
  if(kind==="fruit")return "果実香に樽の甘い香り";
  if(kind==="grain")return "麦と樽の甘い香り";
  if(kind==="smoke")return "煙と木の香り";
  return "厚みのある樽の香り";
 }
 if(p.rough<.28&&p.wood>.12){
  if(kind==="fruit")return "穏やかな果実香";
  if(kind==="grain")return "丸みのある麦の香り";
  if(kind==="smoke")return "落ち着いた煙の香り";
  return "まろやかな口当たり";
 }
 return names[kind][tier];
}
export const initial=()=>({version:2,months:0,nextId:1,barrels:[],bottles:[],draft:{malt:"plain",ferment:"long",cask:"refill"},excluded:[]});
export function fill(state,choice){
 if(state.barrels.length>=4)throw Error("たるは4つまでです");
 const spirit=distill(choice),s=structuredClone(state),id=s.nextId++;
 const label=expression(spirit,spirit);
 s.barrels.push({id,choice:{...choice},spirit,months:0,label,history:[{months:0,label}],pending:null,held:0});
 return s;
}
export function advance(state,months){
 if(!Number.isInteger(months)||months<1||months>120)throw Error("期間が不正です");
 const s=structuredClone(state);
 for(let n=0;n<months;n++){
  s.months++;
  for(const b of s.barrels){
   b.months++;
   const p=mature(b.spirit,b.months/12,b.choice.cask);
   const candidate=expression(p,b.spirit);
   if(candidate===b.label){b.pending=null;b.held=0;continue;}
   if(candidate===b.pending)b.held++;else{b.pending=candidate;b.held=1;}
   if(b.held>=3){b.label=candidate;b.history.push({months:b.months,label:candidate});b.pending=null;b.held=0;}
  }
 }
 return s;
}
export function bottle(state,id){
 const s=structuredClone(state),i=s.barrels.findIndex(x=>x.id===id);
 if(i<0)throw Error("たるがありません");
 const b=s.barrels.splice(i,1)[0];s.bottles.push({...b,bottledAt:s.months});
 return s;
}
export function profileFor(b){return mature(b.spirit,b.months/12,b.choice.cask)}
export function validateState(s){
 if(s?.version!==2||!Array.isArray(s.barrels)||s.barrels.length>4||!Array.isArray(s.bottles)||!Number.isInteger(s.months)||s.months<0)throw Error("保存データが不正です");
 for(const b of [...s.barrels,...s.bottles]){if(!valid(b.choice)||!Number.isInteger(b.months)||typeof b.label!=="string")throw Error("たるのデータが不正です")}
 return true;
}
