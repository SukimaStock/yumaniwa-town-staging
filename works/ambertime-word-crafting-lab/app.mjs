import {CARDS,fresh,addBarrel,tick,bottle,exclude,inspect,updateDraft,validate,createProfile} from "./model.mjs";
const KEY="sukimastock.ambertime.word-crafting-lab.v1";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let state,selected=null,displayMode="mixed",saveAvailable=true;
try{
 const stored=localStorage.getItem(KEY);
 if(stored){const parsed=JSON.parse(stored);validate(parsed);state=parsed;}
 else state=fresh();
}catch(e){state=fresh();saveAvailable=false;$("notice").textContent="保存を読み取れません。安全のため、この画面では保存せず試します。";}
function persist(){
 if(!saveAvailable)return;
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch{saveAvailable=false;$("notice").textContent="端末へ保存できません。今の画面では試せます。";}
}
function transact(fn){
 try{const next=fn(state);validate(next);state=next;persist();render();}
 catch(e){$("notice").textContent=e.message||"操作できませんでした。";}
}
function ages(month){return Math.floor(month/12)+"年"+month%12+"か月"}
function choiceButton(kind,c,icon){
 const pressed=state.draft[kind]===c.id;
 return '<button type="button" class="choice" data-kind="'+kind+'" data-choice="'+c.id+'" aria-pressed="'+pressed+'">'+
 '<span class="choice-symbol" aria-hidden="true">'+icon+'</span><strong>'+esc(c.name)+'</strong><small>'+esc(c.note)+'</small></button>';
}
function renderChoices(){
 $("malt-pair").innerHTML=CARDS.malt.map((c,i)=>choiceButton("malt",c,["♧","♨"][i])).join("");
 $("fermentation-pair").innerHTML=CARDS.fermentation.map((c,i)=>choiceButton("fermentation",c,["◷","◴"][i])).join("");
 $("cask-pair").innerHTML=CARDS.cask.map((c,i)=>choiceButton("cask",c,["▤","▥"][i])).join("");
 for(const btn of document.querySelectorAll("[data-kind][data-choice]")){
  btn.addEventListener("click",()=>transact(s=>updateDraft(s,{[btn.dataset.kind]:btn.dataset.choice})));
 }
 $("cut").value=state.draft.stop;$("cut-number").textContent=state.draft.stop+"%";
 const p=createProfile(state.draft);
 $("recipe-summary").textContent=(state.draft.malt==="peat"?"煙あり":"穀物中心")+"・"+(state.draft.fermentation==="long"?"果実寄り":"麦の香り")+"・"+(state.draft.cask==="bourbon"?"甘い木の影響":"穏やかな木の影響")+"。抽出時の刺激 "+(p.rough>.70?"強め":p.rough>.48?"中ほど":"軽め");
 $("make").disabled=state.barrels.length>=4;
 $("room-count").textContent=state.barrels.length+" / 4 たる";
 const el=$("flow-art");el.style.opacity=String(.25+state.draft.stop/150);
}
function rackButton(b){
 const current=selected===b.id,show=displayMode==="mixed"?b.word:inspect(b,state.excluded,displayMode).text;
 return '<button type="button" class="barrel-card'+(current?" active":"")+'" aria-pressed="'+current+'" data-barrel="'+b.id+'">'+
 '<span class="barrel-no">No.'+String(b.id).padStart(2,"0")+'</span>'+
 '<span class="barrel-icon" aria-hidden="true">▥</span>'+
 '<strong>'+esc(show)+'</strong><small>'+esc(ages(b.age))+' ・ '+(b.choices.cask==="bourbon"?"バーボン":"リフィル")+'</small></button>';
}
function renderRack(){
 $("month-label").textContent=ages(state.month);
 $("rack").innerHTML=Array.from({length:4},(_,i)=>state.barrels[i]?rackButton(state.barrels[i]):'<div class="empty">空き</div>').join("");
 for(const el of document.querySelectorAll("[data-barrel]"))el.addEventListener("click",()=>{selected=Number(el.dataset.barrel);render()});
 const has=state.barrels.length>0;
 $("plus-month").disabled=$("plus-year").disabled=$("plus-five").disabled=!has;
 const chosen=state.barrels.find(b=>b.id===selected)??state.barrels[0];
 if(chosen)selected=chosen.id;
 const detail=$("cask-detail");
 if(!chosen){detail.innerHTML='<p class="muted">たるを仕込むと、ここで試せます。</p>';return;}
 const words=chosen.history.slice().reverse().slice(0,16);
 const labels=[["rough","刺激"],["fruit","果実"],["sweet","甘さ"],["smoke","煙"],["toast","香ばしさ"],["wood","木"],["spice","辛さ"],["body","厚み"]];
 detail.innerHTML='<div class="detail-heading"><strong>たる No.'+String(chosen.id).padStart(2,"0")+'</strong><span class="muted">'+ages(chosen.age)+'</span></div>'+
 '<div class="word">'+esc(chosen.word)+'</div>'+
 '<p class="muted">'+(chosen.choices.malt==="peat"?"ピート麦芽":"ふつうの麦芽")+' / '+(chosen.choices.fermentation==="long"?"長めの発酵":"短めの発酵")+' / '+chosen.choices.stop+'% / '+(chosen.choices.cask==="bourbon"?"バーボン":"リフィル")+'</p>'+
 '<div class="detail-actions"><button id="bottle-current" class="primary">今の言葉でビン詰め</button><button id="exclude-current">この言葉を除外</button></div>'+
 '<details><summary class="muted">風味の中身（検証用）</summary><div class="meters">'+labels.map(([key,label])=>'<div class="meter">'+label+'<div><i style="width:'+Math.round(Math.min(1,chosen.profile[key])*100)+'%"></i></div></div>').join("")+'</div></details>'+
 '<details open><summary class="muted">言葉の変化</summary><ol class="history">'+words.map(h=>'<li><span>'+ages(h.age)+'：</span>'+esc(h.word)+'</li>').join("")+'</ol></details>';
 $("bottle-current").onclick=()=>transact(s=>{const next=bottle(s,chosen.id);selected=null;return next});
 $("exclude-current").onclick=()=>transact(s=>exclude(s,chosen.word));
}
function renderBottles(){
 $("bottle-count").textContent=state.bottles.length+"本";
 $("bottles").innerHTML=state.bottles.length?'<div class="bottle-grid">'+state.bottles.slice().reverse().map(b=>'<div class="bottle"><small>No.'+String(b.id).padStart(2,"0")+' ・ '+ages(b.age)+'</small><strong>'+esc(b.word)+'</strong><small>'+(b.choices.cask==="bourbon"?"バーボン":"リフィル")+' / 抽出 '+b.choices.stop+'%</small></div>').join("")+'</div>':'<p class="muted">まだビン詰めしていません。</p>';
}
function renderOptions(){
 document.querySelectorAll('input[name="mode"]').forEach(n=>n.checked=n.value===displayMode);
 const chosen=state.barrels.find(b=>b.id===selected)??state.barrels[0];
 $("word-comparison").innerHTML=chosen?'<div class="contrast"><div><span class="muted">固定表現</span><strong>'+esc(inspect(chosen,state.excluded,"fixed").text)+'</strong></div><div><span class="muted">組み合わせ</span><strong>'+esc(inspect(chosen,state.excluded,"composed").text)+'</strong></div></div>':'';
 $("excluded").innerHTML=state.excluded.length?'<div class="excluded-list">'+state.excluded.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>':'<p class="muted">除外なし</p>';
 $("reset-exclusions").disabled=state.excluded.length===0;
}
function render(){renderChoices();renderRack();renderBottles();renderOptions();}
$("cut").addEventListener("input",e=>{const stop=Number(e.target.value);transact(s=>updateDraft(s,{stop}));});
$("make").addEventListener("click",()=>transact(s=>{const next=addBarrel(s);selected=next.barrels.at(-1).id;return next}));
for(const [id,months] of [["plus-month",1],["plus-year",12],["plus-five",60]])$(id).addEventListener("click",()=>transact(s=>tick(s,months)));
$("reset-exclusions").onclick=()=>transact(s=>{const next=structuredClone(s);next.excluded=[];for(const b of next.barrels){if(b.history.at(-1)?.reason==="表現を除外"){const w=inspect(b,[],next.mode);b.word=w.text;b.signature=w.key;b.pending=null;b.held=0;b.history.push({age:b.age,word:w.text,reason:"除外を戻す"})}}return next});
document.querySelectorAll('input[name="mode"]').forEach(el=>el.onchange=e=>{displayMode=e.target.value;render()});
$("reset").onclick=()=>{if(!window.confirm("このLabの仕込み・瓶詰め・除外の記録を消しますか？"))return;state=fresh();selected=null;displayMode="mixed";saveAvailable=true;try{localStorage.removeItem(KEY)}catch{saveAvailable=false;}render();};
render();