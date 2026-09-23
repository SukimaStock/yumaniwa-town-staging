(() => {
'use strict';
const D=window.NUDGE_DATA;
const $=s=>document.querySelector(s);
const uniq=a=>[...new Set(a.filter(Boolean))];
const clamp=(n,a=-5,b=5)=>Math.max(a,Math.min(b,n));
let medium='AUTO', current=null, history=loadHistory();

function emptySpec(){
  return {source:'',medium,resolvedMedium:'IMAGE',targets:[],axes:Object.fromEntries(D.axes.map(a=>[a,0])),scope:'contextual',locks:[],hardLocks:[],avoids:[],matched:[],intents:[],flags:[],notes:[],confirmed:false};
}
function init(){
  renderMediums(); renderSamples(); renderHistory();
  $('#analyzeBtn').onclick=analyze;
  $('#addTargetBtn').onclick=addTarget;
  $('#targetInput').addEventListener('keydown',e=>{if(e.key==='Enter') addTarget();});
  $('#copyPromptBtn').onclick=()=>copyText($('#promptOut').textContent,'prompt copied');
  $('#copyJpBtn').onclick=()=>copyText(buildJp(current),'JP spec copied');
  $('#copyJsonBtn').onclick=()=>copyText($('#jsonOut').textContent,'JSON copied');
  $('#confirmBtn').onclick=()=>saveCurrent(true);
  $('#saveBtn').onclick=()=>saveCurrent(false);
  analyze();
}
function renderMediums(){
  const root=$('#mediums'); root.innerHTML='';
  D.mediums.forEach(m=>{const b=document.createElement('button'); b.className='chipbtn'+(m===medium?' active':''); b.textContent=m; b.onclick=()=>{medium=m;renderMediums();analyze();};root.appendChild(b);});
}
function renderSamples(){
  const root=$('#samples'); root.innerHTML='';
  D.samples.forEach(([m,t],i)=>{const b=document.createElement('button');b.textContent=`EX ${i+1}`;b.onclick=()=>{medium=m;$('#source').value=t;renderMediums();analyze();};root.appendChild(b);});
}
function detectMedium(text){
  if(medium!=='AUTO') return medium;
  if(/効果音|BGM|環境音|ドローン音|音量|低音|高音|余韻|アタック|音/.test(text)) return 'AUDIO';
  if(/動き|モーション|アニメ|カクつ/.test(text)) return 'MOTION';
  if(/文字|ボタン|アイコン|UI|余白|Webページ/.test(text)) return 'UI';
  if(/文章|テキスト|説明/.test(text)) return 'TEXT';
  return 'IMAGE';
}
function amountNear(text,index){
  const s=text.slice(Math.max(0,index-10),index+8); let best=null;
  D.amounts.forEach(a=>{const i=s.lastIndexOf(a.p); if(i>=0&&(!best||i>best.i)) best={...a,i};});
  return best;
}
function analyze(){
  const text=$('#source').value.trim(); const s=emptySpec(); s.source=text; s.medium=medium; s.resolvedMedium=detectMedium(text);
  D.targetWords.forEach(w=>{if(text.includes(w)) s.targets.push(w);});
  D.phrases.forEach(r=>{
    let start=0;
    while(true){const idx=text.indexOf(r.p,start); if(idx<0) break; const amt=amountNear(text,idx); const factor=amt?Math.max(.35,amt.v/3):1;
      Object.entries(r.axes||{}).forEach(([a,v])=>{let n=v; if(v!==0&&amt) n=Math.sign(v)*Math.max(1,Math.round(Math.abs(v)*factor)); s.axes[a]=clamp(s.axes[a]+n);});
      if(r.target) s.targets.push(r.target); if(r.intent) s.intents.push(r.intent); if(r.avoid) s.avoids.push(...r.avoid); if(r.flags) s.flags.push(...r.flags); s.matched.push(amt?`${amt.p} + ${r.p}`:r.p); start=idx+r.p.length;
    }
  });
  D.locks.forEach(r=>{const re=new RegExp(r.re,'g'); if(re.test(text)){s.locks.push(r.label); if(r.hard) s.hardLocks.push(r.label); s.matched.push(r.label+' LOCK');}});
  if(/ここだけ|だけ変え|だけ直/.test(text)) s.scope='selected_only';
  if(/他はそのまま/.test(text)) s.scope='selected_only + lock_unselected';
  if(/前の方がいい|前回.*いい/.test(text)){s.flags.push('compare_previous');s.intents.push('use previous version as primary reference');s.matched.push('前版比較');}
  if(/戻す|戻して/.test(text)){s.flags.push('rollback');s.matched.push('rollback');}
  s.targets=uniq(s.targets); s.locks=uniq(s.locks); s.hardLocks=uniq(s.hardLocks); s.avoids=uniq(s.avoids); s.matched=uniq(s.matched); s.intents=uniq(s.intents); s.flags=uniq(s.flags);
  if(!s.targets.length) s.targets=['選択対象'];
  translateMedium(s); current=s; renderAll();
}
function translateMedium(s){
  if(s.resolvedMedium==='AUDIO'&&s.axes.scale!==0){const v=s.axes.scale;s.axes.scale=0;s.axes.presence=clamp(s.axes.presence+v);s.notes.push('AUDIO: 「大きさ」を perceived presence として解釈');}
  if(s.resolvedMedium==='MOTION'&&s.axes.scale!==0){const v=s.axes.scale;s.axes.scale=0;s.axes.response=clamp(s.axes.response+v);s.notes.push('MOTION: 「大きさ」を movement / response として解釈');}
  if(s.resolvedMedium==='TEXT'&&s.axes.scale!==0) s.notes.push('TEXT: SCALE は文字サイズまたは情報階層として扱う');
  if(s.medium==='AUTO') s.notes.push(`AUTO → ${s.resolvedMedium}`);
}
function renderAll(){
  renderTags('#targets',current.targets,'target'); renderTags('#locks',current.locks.length?current.locks:['—'],'lock'); renderTags('#avoids',current.avoids.length?current.avoids:['—'],'avoid');
  $('#scope').textContent=current.scope; renderAxes(); renderTags('#matched',current.matched.length?current.matched:['辞書一致なし'],'phrase');
  $('#translationNote').textContent=current.notes.join(' / ')||`${current.resolvedMedium} interpretation`;
  $('#promptOut').textContent=buildPrompt(current); $('#jsonOut').textContent=JSON.stringify(exportSpec(current),null,2);
  $('#intentOut').textContent=current.intents.length?`INTENT\n- ${current.intents.join('\n- ')}${current.flags.length?`\n\nFLAGS\n- ${current.flags.join('\n- ')}`:''}`:'INTENT\n—';
}
function renderTags(sel,arr,cls){const root=$(sel);root.innerHTML='';arr.forEach(t=>{const x=document.createElement('span');x.className=`tag ${cls}`;x.textContent=t;root.appendChild(x);});}
function renderAxes(){
  const root=$('#axes');root.innerHTML='';D.axes.forEach(a=>{const v=current.axes[a]||0;const row=document.createElement('div');row.className='axis'+(v?' active':'');const pct=Math.abs(v)/5*50,left=v<0?50-pct:50;
    row.innerHTML=`<div class="axis-name">${D.axisLabels[a]}</div><button data-d="-1">−</button><div class="track"><i></i><b style="left:${left}%;width:${pct}%"></b></div><button data-d="1">＋</button><div class="axis-value">${v>0?'+':''}${v}</div>`;
    row.querySelectorAll('button').forEach(b=>b.onclick=()=>{current.axes[a]=clamp((current.axes[a]||0)+Number(b.dataset.d));renderAll();}); root.appendChild(row);
  });
}
function addTarget(){const i=$('#targetInput'),v=i.value.trim();if(!v||!current)return;current.targets=uniq(current.targets.filter(x=>x!=='選択対象').concat(v));i.value='';renderAll();}
function amountWord(v){const a=Math.abs(v);return a<=1?'very slightly':a<=2?'slightly':a<=3?'clearly but modestly':'substantially';}
function targetText(s){return s.targets.filter(x=>x!=='選択対象').join(', ')||'the selected element';}
function axisSentence(a,v,s){if(!v)return'';const up=v>0,am=amountWord(v),t=targetText(s),m=s.resolvedMedium;
  const map={scale:up?`Increase the scale of ${t} ${am}.`:`Reduce the scale of ${t} ${am}.`,presence:up?`Increase the perceived presence of ${t} ${am}.`:`Reduce the perceived presence of ${t} ${am}.`,density:up?`Increase the information/detail density ${am}.`:`Reduce secondary detail and information density ${am}.`,polish:up?`Increase polish and formality ${am}.`:`Reduce polish and formality ${am}; keep it modest rather than degraded.`,feel:up?`Make the result feel more natural and resolved ${am}.`:`Reduce the current feeling that is causing friction ${am}, without changing unrelated qualities.`,space:up?`Increase spacing or breathing room ${am}.`:`Reduce spacing or distance ${am}.`,response:up?`Make the response quicker and more immediate ${am}.`:`Make the response slower or weightier ${am}.`};
  if(m==='AUDIO'&&a==='presence'&&up) return `Increase the perceived presence of ${t} ${am}. Do not rely on gain alone; prefer restrained changes to transient clarity, body, EQ, proximity, or mix balance.`;
  if(m==='MOTION'&&a==='response') return up?`Make the motion response ${am} quicker and lighter while preserving natural continuity.`:`Make the motion ${am} slower or weightier without introducing visible stutter.`;
  return map[a]||'';
}
function buildPrompt(s){const lines=[`Revise ${targetText(s)} only as needed to match the following direction.`];D.axes.forEach(a=>{const x=axisSentence(a,s.axes[a],s);if(x)lines.push(x);});
  if(s.flags.includes('compare_previous')) lines.push('Use the previous version as the primary reference and preserve the qualities that were working there.');
  if(s.intents.includes('reduce formality and make more modest')||s.intents.includes('reduce formality slightly')) lines.push('Make it feel more modest and practical, not damaged, dirty, or lower quality.');
  if(s.intents.includes('simplify into larger logical shapes')) lines.push('Simplify the underlying design into larger logical shapes rather than merely lowering resolution.');
  if(s.locks.length) lines.push(`Preserve unchanged: ${s.locks.join(', ')}.`);
  if(s.scope.includes('selected_only')) lines.push('Limit the revision to the specified target. Keep unselected areas unchanged.');
  if(s.hardLocks.length) lines.push(`Hard lock: do not alter ${s.hardLocks.join(', ')}.`);
  if(s.avoids.length) lines.push(`Avoid: ${s.avoids.join(', ')}.`);
  lines.push('Do not redesign or reinterpret unrelated parts unless explicitly requested.'); return lines.join('\n');}
function buildJp(s){const changed=D.axes.filter(a=>s.axes[a]).map(a=>`${D.axisLabels[a]} ${s.axes[a]>0?'+':''}${s.axes[a]}`);return [`対象: ${targetText(s)}`,`媒体: ${s.resolvedMedium}`,`調整: ${changed.join(' / ')||'なし'}`,`範囲: ${s.scope}`,`維持: ${s.locks.join(' / ')||'なし'}`,`禁止: ${s.avoids.join(' / ')||'なし'}`,`意図: ${s.intents.join(' / ')||'—'}`].join('\n');}
function exportSpec(s){return{schema:'sukimastock-nudge/0.1',source:s.source,medium:s.resolvedMedium,target:s.targets,axes:s.axes,scope:s.scope,lock:s.locks,hardLock:s.hardLocks,avoid:s.avoids,intent:s.intents,flags:s.flags,matchedLanguage:s.matched,confirmed:!!s.confirmed};}
async function copyText(t,msg){try{await navigator.clipboard.writeText(t);$('#status').textContent=msg;}catch{$('#status').textContent='copy unavailable';}}
function loadHistory(){try{return JSON.parse(localStorage.getItem('sukimastockNudgeHistory')||'[]');}catch{return[];}}
function persist(){localStorage.setItem('sukimastockNudgeHistory',JSON.stringify(history.slice(0,50)));}
function saveCurrent(confirmed){if(!current)return;const item=JSON.parse(JSON.stringify(current));item.confirmed=confirmed;item.savedAt=new Date().toISOString();item.id=Date.now();history.unshift(item);history=history.slice(0,50);persist();renderHistory();$('#status').textContent=confirmed?'interpretation confirmed + saved':'saved';if(confirmed){current.confirmed=true;$('#jsonOut').textContent=JSON.stringify(exportSpec(current),null,2);}}
function renderHistory(){const root=$('#history');root.innerHTML='';if(!history.length){root.innerHTML='<div class="empty">まだ履歴はありません。</div>';return;}history.forEach(item=>{const d=document.createElement('div');d.className='history-item';const active=D.axes.filter(a=>item.axes?.[a]).map(a=>`${D.axisLabels[a]} ${item.axes[a]>0?'+':''}${item.axes[a]}`).join(' / ');d.innerHTML=`<div class="history-text">${escapeHtml(item.source||'')}</div><div class="history-meta">${item.confirmed?'✓ CONFIRMED':'SAVED'} · ${item.resolvedMedium||item.medium} · ${active||'NO AXIS'}</div>`;d.onclick=()=>{$('#source').value=item.source||'';medium=item.medium||'AUTO';renderMediums();analyze();};root.appendChild(d);});}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
init();
})();
