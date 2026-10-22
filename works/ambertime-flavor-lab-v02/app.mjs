import {CARDS,initial,fill,advance,bottle,profileFor,validateState,distill} from "./model.mjs";
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="sukimastock.ambertime.flavor-lab.v02";
const FEATURES=[["fruit","果実"],["grain","穀物"],["smoke","煙"],["body","厚み"],["rough","刺激"],["spice","スパイス"],["wood","木"],["vanilla","バニラ"]];
let state,selected=null,phase="idle",start=0,end=0,position=0,startedAt=0,frame=0,save=true;
let recentChanges=new Map();
try{const old=localStorage.getItem(KEY);state=old?JSON.parse(old):initial();validateState(state)}catch{state=initial();save=false}
const elapsed=m=>Math.floor(m/12)+"年"+m%12+"か月";
function commit(next){state=next;if(save){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{save=false;$("notice").textContent="保存できません。"}}render()}
function note(msg){$("notice").textContent=msg}
function choice(kind,id){state.draft[kind]=id;commit(state)}
function renderCards(){for(const kind of ["malt","ferment","cask"]){$(kind).innerHTML=CARDS[kind].map(c=>'<button data-kind="'+kind+'" data-id="'+c.id+'" aria-pressed="'+(state.draft[kind]===c.id)+'">'+escape(c.name)+'</button>').join("")}document.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>choice(b.dataset.kind,b.dataset.id))}
function setProgress(){const pct=position*100;$("progress").style.width=pct+"%";if(phase==="selected"){$("selection").style.left=(start*100)+"%";$("selection").style.width=((end-start)*100)+"%"}else{$("selection").style.width="0%"}$("drop").style.opacity=position>.04&&position<.99?1:.25}
function animate(now){if(phase!=="running")return;position=Math.min(.99,(now-startedAt)/9000);setProgress();if(position>=.99){phase="idle";position=0;start=0;end=0;updateTap();return}frame=requestAnimationFrame(animate)}
function updateTap(){const label=$("tap-action"),reset=$("tap-reset");
if(phase==="idle"){label.textContent="蒸留を始める";$("tap-message").textContent="流れてきたら、開始と終了を決めます。"}
if(phase==="running"){label.textContent=start===0?"ここから取る":"ここまで取る";$("tap-message").textContent=start===0?"採取の始まりを決める":"採取の終わりを決める"}
if(phase==="selected"){label.textContent="もう一度";$("tap-message").textContent="採取する範囲が決まりました。"}
$("fill").disabled=phase!=="selected"||state.barrels.length>=4;reset.disabled=phase==="idle";setProgress()}
function resetTap(){cancelAnimationFrame(frame);phase="idle";position=0;start=0;end=0;updateTap()}
$("tap-action").onclick=()=>{
 if(phase==="selected"){resetTap();return}
 if(phase==="idle"){phase="running";start=0;end=0;position=0;startedAt=performance.now();requestAnimationFrame(animate);updateTap();return}
 if(start===0){start=position;if(start>.82){note("もう少し早い位置から始めてください");resetTap();return}}
 else{end=position;if(end-start<.12){note("もう少し長く取ってください");return}phase="selected";cancelAnimationFrame(frame)}
 updateTap();
};
$("tap-reset").onclick=resetTap;
$("fill").onclick=()=>{
 if(phase!=="selected")return;
 try{const choice={...state.draft,start,end};const next=fill(state,choice);selected=next.barrels.at(-1).id;commit(next);resetTap();note("")}
 catch(e){note(e.message)}
};
function renderRack(){
 $("clock").textContent=elapsed(state.months);
 $("rack").innerHTML=Array.from({length:4},(_,i)=>{
 const b=state.barrels[i];if(!b)return '<div class="empty">空き</div>';
 return '<button class="barrel'+(selected===b.id?" selected":"")+'" data-barrel="'+b.id+'" aria-pressed="'+(selected===b.id)+'"><span class="drawing" aria-hidden="true">▥</span><strong>'+escape(b.label)+'</strong><small>No.'+b.id+' ・ '+elapsed(b.months)+'</small></button>';
 }).join("");
 document.querySelectorAll("[data-barrel]").forEach(b=>b.onclick=()=>{selected=Number(b.dataset.barrel);renderRack();renderDetail()});
 for(const id of ["month","year","three"])$(id).disabled=!state.barrels.length;
}
function renderFlavor(b){
 const p=profileFor(b);
 return '<div class="flavor" aria-label="現在の風味">'+FEATURES.map(([key,label])=>{
  const value=Math.round(Math.max(0,Math.min(1,p[key]))*100);
  return '<div class="flavor-item"><span>'+label+'</span><div class="flavor-track" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+value+'"><i style="width:'+value+'%"></i></div></div>';
 }).join("")+'</div>';
}
function renderDetail(){
 const b=state.barrels.find(x=>x.id===selected)||state.barrels[0],el=$("detail");
 if(!b){el.innerHTML='<p class="muted">樽を仕込むと、ここで育てられます。</p>';return}
 selected=b.id;
 const last=b.history.at(-1),previous=b.history.at(-2),changed=recentChanges.get(b.id);
 const changeNotice=changed&&last&&previous&&last.months===changed.months
  ?'<p class="name-change" role="status">'+elapsed(last.months)+'に名前が変わりました<span>前：'+escape(previous.label)+'</span></p>'
  :'';
 el.innerHTML='<div class="muted">たる No.'+b.id+' ・ '+elapsed(b.months)+'</div><div class="word">'+escape(b.label)+'</div>'+changeNotice+
 renderFlavor(b)+
 '<div class="recipe muted">'+escape(CARDS.malt.find(x=>x.id===b.choice.malt).name)+' / '+escape(CARDS.ferment.find(x=>x.id===b.choice.ferment).name)+' / '+escape(CARDS.cask.find(x=>x.id===b.choice.cask).name)+'</div>'+
 '<button id="bottle">今の状態で瓶詰め</button><details><summary class="muted">これまでの変化</summary><ol class="history">'+b.history.map(h=>'<li>'+elapsed(h.months)+'　'+escape(h.label)+'</li>').join("")+'</ol></details>';
 $("bottle").onclick=()=>{try{const next=bottle(state,b.id);recentChanges.delete(b.id);selected=null;commit(next)}catch(e){note(e.message)}};
}
function renderBottles(){
 $("count").textContent=state.bottles.length+"本";
 $("bottles").innerHTML=state.bottles.length?state.bottles.slice().reverse().map(b=>'<div class="bottle"><small>No.'+b.id+' / '+elapsed(b.months)+'</small><strong>'+escape(b.label)+'</strong><small>'+escape(CARDS.cask.find(x=>x.id===b.choice.cask).name)+'</small></div>').join(""):'<p class="muted">まだありません。</p>';
}
function render(){renderCards();renderRack();renderDetail();renderBottles();updateTap()}
for(const [id,months] of [["month",1],["year",12],["three",36]])$(id).onclick=()=>{
 try{
  const before=new Map(state.barrels.map(b=>[b.id,b.history.length]));
  const next=advance(state,months);
  recentChanges=new Map(next.barrels.filter(b=>b.history.length>before.get(b.id)).map(b=>[b.id,b.history.at(-1)]));
  commit(next);
 }catch(e){note(e.message)}
};
$("clear").onclick=()=>{if(!confirm("このLabの記録を消しますか？"))return;state=initial();selected=null;recentChanges.clear();try{localStorage.removeItem(KEY)}catch{}resetTap();render()};
render();
