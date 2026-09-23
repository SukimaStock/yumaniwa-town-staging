(()=>{"use strict";
const D=window.NUDGE_DATA;
const $=s=>document.querySelector(s);
const clone=o=>JSON.parse(JSON.stringify(o));
const clamp=(n,a=-5,b=5)=>Math.max(a,Math.min(b,n));
const uniq=a=>[...new Set(a.filter(Boolean))];

let medium="AUTO";
let history=loadHistory();
let current=emptySpec();

function emptySpec(){
  return {
    source:"",
    medium:medium,
    resolvedMedium:null,
    targets:[],
    axes:Object.fromEntries(D.axes.map(a=>[a,0])),
    scope:"contextual",
    locks:[],
    hardLocks:[],
    avoids:[],
    matched:[],
    intents:[],
    flags:[],
    notes:[],
    confirmed:false
  };
}

function init(){
  renderMediums();
  renderSamples();
  renderHistory();
  renderAxes();
  $("#analyzeBtn").onclick=analyze;
  $("#addTargetBtn").onclick=addTarget;
  $("#targetInput").addEventListener("keydown",e=>{if(e.key==="Enter")addTarget();});
  $("#copyPromptBtn").onclick=()=>copy($("#promptOut").textContent,"prompt copied");
  $("#copyJpBtn").onclick=()=>copy(buildJp(current),"JP spec copied");
  $("#copyJsonBtn").onclick=()=>copy($("#jsonOut").textContent,"JSON copied");
  $("#saveBtn").onclick=()=>save(false);
  $("#confirmBtn").onclick=()=>save(true);
  analyze();
}

function renderMediums(){
  const root=$("#mediums");
  root.innerHTML="";
  D.mediums.forEach(m=>{
    const b=document.createElement("button");
    b.className="medium"+(m===medium?" active":"");
    b.textContent=m;
    b.onclick=()=>{medium=m;renderMediums();analyze();};
    root.appendChild(b);
  });
}

function renderSamples(){
  const root=$("#samples");
  root.innerHTML="";
  D.samples.forEach((item,i)=>{
    const b=document.createElement("button");
    b.className="sample";
    b.textContent="EX "+(i+1);
    b.onclick=()=>{
      medium=item[0];
      $("#source").value=item[1];
      renderMediums();
      analyze();
    };
    root.appendChild(b);
  });
}

function amountNear(text,index){
  const s=text.slice(Math.max(0,index-10),index+2);
  let best=null;
  D.amounts.forEach(a=>{
    const i=s.lastIndexOf(a.p);
    if(i>=0&&(!best||i>best.i))best={p:a.p,v:a.v,i:i};
  });
  return best;
}

function analyze(){
  const text=$("#source").value.trim();
  const spec=emptySpec();
  spec.source=text;
  spec.medium=medium;

  D.targetWords.forEach(w=>{
    if(text.includes(w))spec.targets.push(w==="暖簾"?"のれん":w);
  });

  D.phrases.forEach(rule=>{
    let start=0;
    while(true){
      const idx=text.indexOf(rule.p,start);
      if(idx<0)break;
      const amt=amountNear(text,idx);
      const mult=amt?Math.max(.34,amt.v/3):1;
      Object.entries(rule.axes||{}).forEach(([axis,val])=>{
        let next=val;
        if(val!==0&&amt)next=Math.sign(val)*Math.max(1,Math.round(Math.abs(val)*mult));
        spec.axes[axis]=clamp(spec.axes[axis]+next);
      });
      if(rule.target)spec.targets.push(rule.target);
      if(rule.intent)spec.intents.push(rule.intent);
      if(rule.avoid)spec.avoids.push(...rule.avoid);
      if(rule.flags)spec.flags.push(...rule.flags);
      spec.matched.push((amt?amt.p+" + ":"")+rule.p);
      start=idx+rule.p.length;
    }
  });

  D.locks.forEach(rule=>{
    const re=new RegExp(rule.re);
    const m=text.match(re);
    if(m){
      spec.locks.push(rule.label);
      if(rule.hard)spec.hardLocks.push(rule.label);
      spec.matched.push(m[0]);
    }
  });

  if(/ここだけ|だけ変え|だけ直/.test(text))spec.scope="selected_only";
  if(/他はそのまま|他.*変えない/.test(text))spec.scope="selected_only + lock_unselected";

  if(/前の方がいい|前回.*いい/.test(text)){
    spec.flags.push("compare_previous");
    spec.intents.push("use previous version as primary reference");
    spec.matched.push("前の方がいい");
  }
  if(/戻す|戻して/.test(text)){
    spec.flags.push("rollback");
    spec.matched.push("戻す");
  }
  if(/これでいく|これで完成|完成でいい/.test(text)){
    spec.flags.push("freeze_candidate");
  }

  spec.targets=cleanTargets(uniq(spec.targets));
  spec.locks=uniq(spec.locks);
  spec.hardLocks=uniq(spec.hardLocks);
  spec.avoids=uniq(spec.avoids);
  spec.matched=uniq(spec.matched);
  spec.intents=uniq(spec.intents);
  spec.flags=uniq(spec.flags);

  applyMedium(spec);
  if(!spec.targets.length)spec.targets=["選択対象"];
  current=spec;
  renderAll();
}

function cleanTargets(a){
  return a.filter(t=>{
    if(t==="建物"&&a.includes("建物本体"))return false;
    if(t==="音"&&a.some(x=>["効果音","BGM","環境音","ドローン音"].includes(x)))return false;
    return true;
  });
}

function applyMedium(spec){
  let m=spec.medium;
  if(m==="AUTO"){
    const s=spec.source;
    if(/効果音|BGM|音量|低音|高音|余韻|アタック|ドローン音|環境音/.test(s))m="AUDIO";
    else if(/動き|モーション|アニメ|カクつ/.test(s))m="MOTION";
    else if(/文字|ボタン|UI|アイコン/.test(s))m="UI";
    else if(/文章|テキスト|説明/.test(s))m="TEXT";
    else m="IMAGE";
    spec.notes.push("AUTO → "+m);
  }
  spec.resolvedMedium=m;

  if(m==="AUDIO"&&spec.axes.scale!==0){
    const v=spec.axes.scale;
    spec.axes.scale=0;
    spec.axes.presence=clamp(spec.axes.presence+v);
    spec.notes.push("AUDIO: 「大きさ」を perceived presence として翻訳");
  }
  if(m==="MOTION"&&spec.axes.scale!==0){
    const v=spec.axes.scale;
    spec.axes.scale=0;
    spec.axes.response=clamp(spec.axes.response+v);
    spec.notes.push("MOTION: 「大きさ」を movement / response として翻訳");
  }
}

function renderAll(){
  renderTags("#targets",current.targets,"target");
  renderTags("#locks",current.locks.length?current.locks:["—"],"lock");
  renderTags("#avoids",current.avoids.length?current.avoids:["—"],"avoid");
  $("#scope").textContent=current.scope;
  renderTags("#matched",current.matched.length?current.matched:["辞書一致なし"],"phrase");
  renderAxes();
  $("#translationNote").textContent=current.notes.join(" / ")||((current.resolvedMedium||current.medium)+" interpretation");
  $("#promptOut").textContent=buildPrompt(current);
  $("#jsonOut").textContent=JSON.stringify(exportSpec(current),null,2);
  $("#intentOut").textContent=(current.intents.length?"INTENT\n- "+current.intents.join("\n- "):"INTENT\n—")+(current.flags.length?"\n\nFLAGS\n- "+current.flags.join("\n- "):"");
}

function renderTags(sel,arr,cls){
  const root=$(sel);
  root.innerHTML="";
  arr.forEach(t=>{
    const s=document.createElement("span");
    s.className="tag "+cls;
    s.textContent=t;
    root.appendChild(s);
  });
}

function renderAxes(){
  const root=$("#axes");
  if(!root)return;
  root.innerHTML="";
  D.axes.forEach(axis=>{
    const val=(current.axes&&current.axes[axis])||0;
    const pct=Math.abs(val)/5*50;
    const left=val<0?50-pct:50;
    const row=document.createElement("div");
    row.className="axis"+(val?" active":"");
    row.innerHTML=
      '<div class="axis-name">'+D.axisLabels[axis]+'</div>'+
      '<button data-d="-1">−</button>'+
      '<div class="track"><div class="fill" style="left:'+left+'%;width:'+pct+'%"></div></div>'+
      '<button data-d="1">＋</button>'+
      '<div class="axis-value">'+(val>0?"+":"")+val+'</div>';
    row.querySelectorAll("button").forEach(b=>{
      b.onclick=()=>{
        current.axes[axis]=clamp((current.axes[axis]||0)+Number(b.dataset.d));
        renderAll();
      };
    });
    root.appendChild(row);
  });
}

function addTarget(){
  const input=$("#targetInput");
  const v=input.value.trim();
  if(!v)return;
  current.targets=uniq(current.targets.filter(x=>x!=="選択対象").concat(v));
  input.value="";
  renderAll();
}

function strength(v){
  const a=Math.abs(v);
  if(a<=1)return"very slightly";
  if(a<=2)return"slightly";
  if(a<=3)return"clearly but modestly";
  return"substantially";
}

function targetText(spec){
  const arr=spec.targets.filter(x=>x!=="選択対象");
  return arr.join(", ")||"the selected element";
}

function axisSentence(axis,v,spec){
  if(!v)return"";
  const up=v>0;
  const amount=strength(v);
  const target=targetText(spec);
  const m=spec.resolvedMedium;
  let out="";
  if(axis==="scale")out=(up?"Increase":"Reduce")+" the scale of "+target+" "+amount+".";
  if(axis==="presence")out=(up?"Increase":"Reduce")+" the perceived presence of "+target+" "+amount+".";
  if(axis==="density")out=up?"Increase information/detail density "+amount+".":"Reduce secondary detail and information density "+amount+".";
  if(axis==="polish")out=up?"Increase polish and formality "+amount+".":"Reduce polish and formality "+amount+"; keep it modest rather than degraded.";
  if(axis==="feel")out=up?"Make the result feel more natural and resolved "+amount+".":"Reduce the current feeling that is causing friction "+amount+", without changing unrelated qualities.";
  if(axis==="space")out=up?"Increase spacing / breathing room "+amount+".":"Reduce spacing / distance "+amount+".";
  if(axis==="response")out=up?"Make the response quicker and more immediate "+amount+".":"Make the response slower or weightier "+amount+".";

  if(m==="AUDIO"&&axis==="presence"&&up){
    out="Increase the perceived presence of "+target+" "+amount+". Do not rely on gain alone; prefer restrained transient clarity, body, EQ, proximity, or mix balance.";
  }
  if(m==="MOTION"&&axis==="response"){
    out=up
      ?"Make the motion response "+amount+" quicker and lighter while keeping continuity natural."
      :"Make the motion "+amount+" slower or weightier without introducing visible stutter.";
  }
  return out;
}

function buildPrompt(spec){
  const lines=[];
  lines.push("Revise "+targetText(spec)+" only as needed to match the following direction.");
  D.axes.forEach(a=>{
    const x=axisSentence(a,spec.axes[a],spec);
    if(x)lines.push(x);
  });
  if(spec.flags.includes("compare_previous"))lines.push("Use the previous version as the primary reference and preserve the qualities that were working there.");
  if(spec.intents.includes("improve world fit"))lines.push("Improve compatibility with the surrounding visual language before changing the object itself dramatically.");
  if(spec.intents.some(x=>x.includes("formality")))lines.push("Make it more modest and practical, not damaged, dirty, or lower quality.");
  if(spec.scope.includes("selected_only"))lines.push("Limit the revision to the specified target. Keep unselected areas unchanged.");
  if(spec.locks.length)lines.push("Preserve unchanged: "+spec.locks.join(", ")+".");
  if(spec.hardLocks.length)lines.push("Hard lock: do not alter "+spec.hardLocks.join(", ")+".");
  if(spec.avoids.length)lines.push("Avoid: "+spec.avoids.join(", ")+".");
  lines.push("Do not redesign or reinterpret unrelated parts unless explicitly requested.");
  return lines.join("\n");
}

function buildJp(spec){
  const changed=D.axes.filter(a=>spec.axes[a]).map(a=>D.axisLabels[a]+" "+(spec.axes[a]>0?"+":"")+spec.axes[a]);
  return [
    "対象: "+targetText(spec),
    "媒体: "+(spec.resolvedMedium||spec.medium),
    "調整: "+(changed.length?changed.join(" / "):"なし"),
    "範囲: "+spec.scope,
    "維持: "+(spec.locks.length?spec.locks.join(" / "):"なし"),
    "禁止: "+(spec.avoids.length?spec.avoids.join(" / "):"なし"),
    "意図: "+(spec.intents.length?spec.intents.join(" / "):"—")
  ].join("\n");
}

function exportSpec(spec){
  return {
    schema:"sukimastock-nudge/0.1",
    source:spec.source,
    medium:spec.resolvedMedium||spec.medium,
    target:spec.targets,
    axes:spec.axes,
    scope:spec.scope,
    lock:spec.locks,
    hardLock:spec.hardLocks,
    avoid:spec.avoids,
    intent:spec.intents,
    flags:spec.flags,
    matchedLanguage:spec.matched,
    confirmed:!!spec.confirmed
  };
}

async function copy(text,msg){
  try{
    await navigator.clipboard.writeText(text);
    $("#status").textContent=msg;
  }catch(e){
    $("#status").textContent="copy unavailable";
  }
}

function loadHistory(){
  try{return JSON.parse(localStorage.getItem("sukimastockNudgeHistory")||"[]");}
  catch(e){return[];}
}

function save(confirmed){
  const item=clone(current);
  item.confirmed=confirmed;
  item.savedAt=new Date().toISOString();
  item.id=Date.now();
  history.unshift(item);
  history=history.slice(0,50);
  localStorage.setItem("sukimastockNudgeHistory",JSON.stringify(history));
  current.confirmed=confirmed;
  renderHistory();
  renderAll();
  $("#status").textContent=confirmed?"interpretation confirmed + saved":"saved";
}

function renderHistory(){
  const root=$("#history");
  root.innerHTML="";
  if(!history.length){
    root.innerHTML='<div class="empty">まだ履歴はありません。</div>';
    return;
  }
  history.forEach(item=>{
    const d=document.createElement("div");
    d.className="history-item";
    const active=D.axes.filter(a=>item.axes&&item.axes[a]).map(a=>D.axisLabels[a]+" "+(item.axes[a]>0?"+":"")+item.axes[a]).join(" / ");
    d.innerHTML=
      '<div class="history-text">'+escapeHtml(item.source||"")+'</div>'+
      '<div class="history-meta">'+(item.confirmed?"✓ CONFIRMED":"SAVED")+" · "+(item.resolvedMedium||item.medium)+" · "+(active||"NO AXIS")+"</div>";
    d.onclick=()=>{
      current=clone(item);
      medium=item.medium||"AUTO";
      $("#source").value=item.source||"";
      renderMediums();
      renderAll();
    };
    root.appendChild(d);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

init();
})();