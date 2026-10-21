// AmberTime word-crafting experiment. Independent of the production model and save.
export const VERSION=1;
export const CARDS={
 malt:[{id:"plain",name:"ふつうの麦芽",note:"穀物の香り"},{id:"peat",name:"ピート麦芽",note:"煙の香り"}],
 fermentation:[{id:"short",name:"短めの発酵",note:"麦の輪郭"},{id:"long",name:"長めの発酵",note:"果実の香り"}],
 cask:[{id:"bourbon",name:"バーボン樽",note:"甘みと木"},{id:"refill",name:"リフィル樽",note:"原酒の個性"}]
};
const clamp=(v,max=1)=>Math.max(0,Math.min(max,v));
const round=v=>Math.round(v*10000)/10000;
export function fresh(){return {version:VERSION,month:0,nextId:1,barrels:[],bottles:[],excluded:[],draft:{malt:"plain",fermentation:"long",cask:"refill",stop:50},mode:"mixed",log:[]};}
export const validCard=(kind,id)=>CARDS[kind]?.some(c=>c.id===id)??false;
export function signatureOf(choices){return choices.malt+"/"+choices.fermentation+"/"+choices.cask+"/"+choices.stop;}
function hash(input){let h=2166136261;for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function createProfile(choices){
 if(!validCard("malt",choices.malt)||!validCard("fermentation",choices.fermentation)||!validCard("cask",choices.cask)||!Number.isInteger(choices.stop)||choices.stop<0||choices.stop>100)throw Error("カードか抽出位置が不正です");
 const s=choices.stop/100,peat=choices.malt==="peat",long=choices.fermentation==="long";
 return {
  rough:round(clamp(.28+.55*s+(peat?.08:0))),
  fruit:round(clamp(.23+(long?.44:.10)+.12*Math.sin(Math.PI*s))),
  sweet:round(clamp(.18+(long?.17:.09)+(1-s)*.10)),
  smoke:round(clamp(peat?.74+.10*s:.035)),
  toast:round(clamp((peat?.17:.31)+.08*s)),
  wood:0,
  spice:round(clamp(.20+.43*s+(peat?.06:0))),
  body:round(clamp(.26+.48*s+(long?.06:0)))
 };
}
function stepProfile(profile,barrel){
 const p={...profile},bourbon=barrel.choices.cask==="bourbon";
 p.rough=round(clamp(p.rough*Math.exp(bourbon?-.052:-.035)));
 p.wood=round(clamp(p.wood+(bourbon?.018:.009)*(1-.30*p.wood),1.35));
 p.fruit=round(clamp(p.fruit+.004*Math.exp(-barrel.age/25)-.0010*Math.max(0,p.wood-.4)));
 p.sweet=round(clamp(p.sweet+(bourbon?.008:.0035)*(1-p.sweet)));
 p.toast=round(clamp(p.toast+(bourbon?.007:.0026)*(1-p.toast)));
 p.smoke=round(clamp(p.smoke*(bourbon?.9985:.999)));
 p.spice=round(clamp(p.spice*.995));
 p.body=round(clamp(p.body+.002*(1-p.body)-.0009*p.wood));
 return p;
}
function featureList(p){return [
 {id:"fruit",value:p.fruit,threshold:.33},
 {id:"sweet",value:p.sweet,threshold:.33},
 {id:"smoke",value:p.smoke,threshold:.29},
 {id:"wood",value:p.wood,threshold:.23},
 {id:"toast",value:p.toast,threshold:.34},
 {id:"spice",value:p.spice,threshold:.32},
 {id:"body",value:p.body,threshold:.37}
].map(a=>({...a,power:round((a.value-a.threshold)/(.90-a.threshold))})).filter(a=>a.power>0).sort((a,b)=>b.power-a.power||a.id.localeCompare(b.id));}
const WORDS={
 fruit:{things:["青りんご","洋梨","熟した桃","マーマレード","果物屋の裏口"],plain:["果実のかおり","フルーティ","さわやかな果実味"]},
 sweet:{things:["はちみつ","黒糖","カラメル","焼きプリン","角砂糖"],plain:["やわらかな甘み","甘さがあとから来る","ほっとする甘さ"]},
 smoke:{things:["消えかけの炭","焚き火","薪の煙","ストーブを消したあと","花火のあと"],plain:["スモーキー","煙の余韻","焚き火のような香り"]},
 wood:{things:["古い本棚","削った鉛筆","新しい板","ひのきの箱","使い込んだ木箱"],plain:["木の香り","乾いた木の余韻","樽の香りが豊か"]},
 toast:{things:["焼き栗","パンの耳","炒ったナッツ","炙ったベーコン","焦がし砂糖"],plain:["香ばしさが残る","香ばしい麦","ローストした香り"]},
 spice:{things:["黒胡椒","生姜","ひと口目の辛さ","ピリッとした刺激","胡椒の粒"],plain:["スパイシー","ピリッとした刺激","舌に残る辛さ"]},
 body:{things:["とろりとした口当たり","厚みのある舌触り","ずしっとした一口","丸みのある口当たり","なめらかな口当たり"],plain:["どっしりした味","まんまる","やわらかな口当たり"]}
};
function choose(arr,n){return arr[(n>>>0)%arr.length];}
function candidates(b){
 const top=featureList(b.profile),key=signatureOf(b.choices),n=hash(key+"/"+b.id),primary=top[0]??{id:"body",power:.2},secondary=top.find(t=>t.id!==primary.id&&t.power>=.08);
 const w=WORDS[primary.id],noun=choose(w.things,n>>>2),plain=choose(w.plain,n>>>4);
 const selected=[{text:plain,kind:"fixed",key:primary.id,reason:primary.id+"が目立つ"}];
 if(secondary){
  const other=WORDS[secondary.id],noun2=choose(other.things,n>>>7);
  const templates=[
   noun+"と"+noun2,
   noun+"の奥に"+noun2,
   noun+"、それから"+noun2,
   noun+"に"+noun2+"が重なる"
  ];
  selected.push({text:choose(templates,n>>>9),kind:"composed",key:primary.id+"+"+secondary.id,reason:primary.id+"と"+secondary.id+"が重なる"});
 }
 const simile=primary.id==="body"?noun:primary.id==="sweet"?noun+"のような甘み":primary.id==="spice"?noun+"のような刺激":primary.id==="wood"?noun+"を思わせる香り":primary.id==="smoke"?noun+"の香り":noun+"のような香り";
 selected.push({text:simile,kind:"composed",key:primary.id,reason:primary.id+"が目立つ"});
 const alt=top[1]&&WORDS[top[1].id];
 if(alt)selected.push({text:choose(alt.plain,n>>>12),kind:"fixed",key:top[1].id,reason:top[1].id+"が目立つ"});
 // Signature-bound diversity. No year-based name tables, no quality rankings.
 const unique=[];const seen=new Set();for(const t of selected){if(!seen.has(t.text)){seen.add(t.text);unique.push(t)}}
 return unique;
}
function wordFor(b,excluded,mode,epoch=0){
 const options=candidates(b).filter(x=>!excluded.includes(x.text)&&(mode==="mixed"||x.kind===mode));
 if(!options.length)return {text:"かおりは控えめ",kind:"fallback",key:"none",reason:"候補がありません"};
 const base=(hash(signatureOf(b.choices)+"/"+b.id)%options.length);
 return options[base];
}
export function inspect(b,excluded=[],mode="mixed"){return wordFor(b,excluded,mode,b.epoch??0)}
export function addBarrel(state,selection=state.draft){
 if(state.barrels.length>=4)throw Error("貯蔵庫は4樽で満杯です");
 const s=structuredClone(state),choices={...selection},profile=createProfile(choices),id=s.nextId++;
 const b={id,choices,profile,age:0,word:null,epoch:0,history:[],pending:null,held:0,signature:null,distilledMonth:s.month};
 const w=wordFor(b,s.excluded,s.mode);b.word=w.text;b.signature=w.key;b.history.push({age:0,word:w.text,reason:w.reason});
 s.barrels.push(b);s.log.push({month:s.month,action:"fill",cask:id,choices});
 return s;
}
export function tick(state,months=12){
 if(!Number.isInteger(months)||months<1||months>120)throw Error("期間が不正です");
 const s=structuredClone(state);
 for(let m=0;m<months;m++){
  s.month++;
  for(const b of s.barrels){
   b.age++;b.profile=stepProfile(b.profile,b);
   // The same candidate must persist for 4 months to prevent chatter at a boundary.
   const next=wordFor(b,s.excluded,s.mode,b.epoch);
   if(next.text!==b.word){
    const code=next.key+"|"+next.text;
    if(b.pending===code)b.held++;else{b.pending=code;b.held=1}
    if(b.held>=4){b.word=next.text;b.signature=next.key;b.epoch++;b.history.push({age:b.age,word:next.text,reason:next.reason});b.pending=null;b.held=0}
   }else{b.pending=null;b.held=0}
  }
 }
 s.log.push({month:s.month,action:"age",months});
 return s;
}
export function bottle(state,id){
 const s=structuredClone(state),i=s.barrels.findIndex(b=>b.id===id);if(i<0)throw Error("樽がありません");
 const b=s.barrels.splice(i,1)[0];
 s.bottles.push({id:b.id,word:b.word,age:b.age,choices:b.choices,profile:b.profile,history:b.history,bottledMonth:s.month});
 s.log.push({month:s.month,action:"bottle",cask:id,word:b.word});
 return s;
}
export function exclude(state,text){
 const s=structuredClone(state);if(!text||s.excluded.includes(text))return s;
 s.excluded.push(text);s.log.push({month:s.month,action:"exclude",text});
 for(const b of s.barrels){
  if(b.word===text){const w=wordFor(b,s.excluded,s.mode,b.epoch);b.word=w.text;b.signature=w.key;b.pending=null;b.held=0;b.history.push({age:b.age,word:w.text,reason:"表現を除外"})}
 }
 return s;
}
export function changeMode(state,mode){
 if(!["mixed","fixed","composed"].includes(mode))throw Error("方式が不正です");
 const s=structuredClone(state);s.mode=mode;
 for(const b of s.barrels){const w=wordFor(b,s.excluded,mode,b.epoch);if(w.text!==b.word){b.word=w.text;b.history.push({age:b.age,word:w.text,reason:"表示方式を変更"})}b.pending=null;b.held=0}
 return s;
}
export function updateDraft(state,patch){
 const s=structuredClone(state),draft={...s.draft,...patch};createProfile(draft);s.draft=draft;return s;
}
export function validate(state){
 if(state?.version!==VERSION||!Number.isInteger(state.month)||state.month<0||!Array.isArray(state.barrels)||state.barrels.length>4||!Array.isArray(state.bottles)||!Array.isArray(state.excluded)||!Array.isArray(state.log))throw Error("この試作の保存ではありません");
 for(const b of state.barrels){createProfile(b.choices);if(!Number.isInteger(b.id)||!Number.isInteger(b.age)||b.age<0||!b.profile||typeof b.word!=="string")throw Error("樽の記録が不正です")}
 return true;
}
