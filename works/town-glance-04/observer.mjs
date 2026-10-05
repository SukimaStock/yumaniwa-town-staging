import {DIRECTIONS} from './model.mjs';
const $=id=>document.getElementById(id);let participant=null,data=null;const notes=new Map();
function request(){if(participant&&!participant.closed)participant.postMessage({type:'town-glance-record-request'},location.origin);}
if(window.opener){try{if(window.opener.location.origin===location.origin)participant=window.opener;}catch{/* ignore other origins */}}
function answer(value){return value==='unknown'?'わからない':Number.isInteger(value)?DIRECTIONS[value]:'—';}
function milliseconds(value){return Number.isFinite(value)?`${Math.round(value)}ms`:'—';}
function response(value,time,expected){return `${answer(value)} (${milliseconds(time)})${Number.isInteger(expected)?` / 基準: ${DIRECTIONS[expected]}`:''}`;}
function render(){
  $('rows').replaceChildren();$('status').textContent=`${data.completed}/6回を記録。画面状態: ${data.phase}`;
  $('session').textContent=`条件順 ${data.session.order} → ${[...data.session.order].reverse().join('')} / 左右反転 ${data.session.mirrored?'あり':'なし'} / ${data.session.startedAt}`;
  for(const r of data.records){
    const tr=document.createElement('tr');const values=[`${r.trial} / ${r.attempt}`,r.condition,r.turn===1?'右90°':'左90°',response(r.before,r.beforeMs,r.expectedBefore),response(r.after,r.afterMs,r.expectedAfter),`${milliseconds(r.exposureActualMs)} / ${milliseconds(r.turnActualMs)}`,r.status==='interrupted'?`中断: ${r.interruption}`:`前: ${r.baselineUnderstood?'方向一致':'保持を確認できず'} / 後: ${{unknown:'わからない','direction-match':'方向一致','direction-mismatch':'方向不一致'}[r.outcome]}`];
    for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    if(r.status==='interrupted'||!r.baselineUnderstood)tr.classList.add('invalid');
    const td=document.createElement('td'),note=document.createElement('textarea');const key=`${r.trial}-${r.attempt}`;
    note.setAttribute('aria-label',`${r.trial}回目、試行${r.attempt}の観察メモ`);note.value=notes.get(key)||'';note.addEventListener('input',()=>notes.set(key,note.value));td.append(note);tr.append(td);$('rows').append(tr);
  }
  $('export').disabled=!data.records.length;
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==participant||event.data?.type!=='town-glance-record')return;
  const next=event.data.record;if(!next||next.session?.schema!=='town-glance-turn/1'||!Array.isArray(next.records))return;
  if(data&&data.session.startedAt!==next.session.startedAt)notes.clear();data=next;render();
});
$('launch').addEventListener('click',()=>{
  if(participant&&!participant.closed){$('status').textContent='開いている被験者画面を先に閉じてください。記録を保存してから新しい実験を開始できます。';participant.focus();return;}
  const url=new URL('./index.html',location.href);url.searchParams.set('order',$('order').value);url.searchParams.set('mirror',$('mirror').value);
  participant=window.open(url,'town-glance-participant');if(!participant){$('status').textContent='ポップアップを許可して、もう一度開いてください。';return;}
  notes.clear();data=null;$('rows').replaceChildren();$('export').disabled=true;$('status').textContent='被験者画面を開きました。回答／中断時に記録を受け取ります。';
});
$('export').addEventListener('click',()=>{
  if(!data)return;const exported=structuredClone(data);exported.records.forEach(r=>r.observerNote=notes.get(`${r.trial}-${r.attempt}`)||'');
  const blob=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='town-glance-turn-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
request();
