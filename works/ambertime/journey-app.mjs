import {newJourney,tick,choose,nextJourney,serializeJourney,restoreJourney,currentCask,observation,choiceView,formatRecord,JOURNEY_PARAMETERS} from './journey.mjs';
import {barrel,glass,bottleArt} from './art.mjs';
import {ageLabel,bottleQuote} from './model.mjs';

// The clock owns no game rules: one foreground callback is one model month.
export const SAVE_KEY='sukimastock.ambertime.journey.v1';
const MONTH_MS=JOURNEY_PARAMETERS.monthMs;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`£${Math.round(n).toLocaleString('en-GB')}`;
const age=n=>ageLabel(n);
const preview=new URLSearchParams(location.search).get('preview')==='1';
let journey=null,paused=false,timer=null,pulse=null,canSave=!preview,renderedPhase='',renderedPending='',renderedRound=-1,renderedRecordsKey=null;
function stopClock(){if(timer!==null){clearTimeout(timer);timer=null;}}
function notice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=!text;}
function persist(){
  if(preview){$('save-status').textContent='試遊中 · 保存しません';return;}
  if(!canSave)return;
  try{localStorage.setItem(SAVE_KEY,serializeJourney(journey));$('save-status').textContent='保存しました';}
  catch{canSave=false;notice('保存できませんでした。この画面では遊べますが、再開時に進行が戻ることがあります。');$('save-status').textContent='未保存';}
}
function schedule(){
  stopClock();
  if(!journey||paused||document.hidden||journey.phase!=='watching')return;
  timer=setTimeout(()=>{timer=null;if(paused||document.hidden||journey.phase!=='watching')return;journey=tick(journey);persist();render(true);schedule();},MONTH_MS);
}
function renderLedger(){
  const c=journey.core,o=observation(journey);
  $('ledger-body').innerHTML=`<p>資金 ${money(c.cash)} · 維持費累計 ${money(c.totals?.upkeep??c.totalUpkeep??0)}</p><p>${esc(o?`${age(o.age)} · ${o.litres.toFixed(1)} L`:'瓶詰め済み')}</p><p>樽の購入・蒸留・月々の維持費を支払って育てています。</p>`;
}
function renderRecord(r,history=false){
  const f=formatRecord(r);
  const decisions=(f.choices??[]).map(c=>`<li><time>${esc(age(c.age))}</time>${esc(c.text)}</li>`).join('');
  if(history)return `<article class="record-history"><h3>${esc(f.name)}</h3><p>${esc(typeof f.age==='number'?age(f.age):f.age)} · ${esc(f.bottles)}本</p><p>${(f.taste??[]).map(esc).join(' · ')}</p><ul class="record-choices">${decisions}</ul></article>`;
  return `<h2>${esc(f.name)}</h2><div class="bottle">${bottleArt(r.profile?.wood??r.wood??.4)}</div><p>${esc(typeof f.age==='number'?age(f.age):f.age)} · ${esc(f.bottles)}本</p><p class="finish-taste">${(f.taste??[]).map(esc).join(' · ')}</p><ul class="record-choices">${decisions}</ul><p class="yield">${esc(f.sold)}本を販売 · ${money(f.revenue)}<br>蒸発 ${Number(f.evaporated??0).toFixed(1)} L · 維持費 ${money(f.upkeep??0)}</p><button type="button" id="next-barrel">別の樽を預かる</button>`;
}
function render(animate=false){
  if(!journey)return;
  $('game').hidden=false;$('recovery').hidden=true;
  const o=observation(journey),c=currentCask(journey),pending=choiceView(journey);
  if(o){
    $('age').textContent=age(o.age);$('amount').textContent=`残り ${o.litres.toFixed(1)} L`;
    $('loss').textContent=`仕込みから −${Math.max(0,o.initialLitres-o.litres).toFixed(1)} L`;
    $('glass').innerHTML=glass(o.wood);
    $('taste').innerHTML=(o.text??[]).map(t=>`<span>${esc(t)}</span>`).join('');
    $('change').textContent=o.change??'';
  }
  if(renderedRound!==journey.round){
    $('barrel').innerHTML=barrel(c?.type??'bourbon');
    $('cask-kind').textContent=c?.type==='refill'?'リフィル・バーボン樽':'バーボン樽';
    renderedRound=journey.round;
  }
  $('time-controls').hidden=journey.phase!=='watching';
  $('toggle-time').textContent=paused?'続きを見守る':'ひと休み';
  const timeStatus=journey.phase==='finished'?'瓶詰めして、この樽の時間を残しました。':journey.phase==='choice'?'時間を止めています。':'時間'+(paused?'は止まっています。':'が流れています。');
  if($('time-status').textContent!==timeStatus)$('time-status').textContent=timeStatus;
  $('decision').hidden=journey.phase!=='choice';$('result').hidden=journey.phase!=='finished';
  if(journey.phase==='choice'&&pending&&(renderedPhase!=='choice'||renderedPending!==pending.id)){
    $('decision').innerHTML=`<h2>${esc(pending.title)}</h2><p>${esc(pending.text)}</p><div class="options">${pending.options.map(op=>{const q=op.id==='bottle'?bottleQuote(journey.core,c.id):null;const hint=q?`${q.count}本 · 瓶詰め費用 ${money(q.cost)}`:op.hint;return `<button type="button" class="choice" data-choice="${esc(op.id)}" data-stage="${esc(pending.id)}">${esc(op.label)}${hint?`<span>${esc(hint)}</span>`:''}</button>`;}).join('')}</div>`;
    renderedPending=pending.id;
  }
  if(journey.phase==='finished'&&renderedPhase!=='finished'){
    $('result').innerHTML=renderRecord(journey.result);
    $('next-barrel').addEventListener('click',()=>{stopClock();journey=nextJourney(journey);paused=false;renderedPhase='';renderedRound=-1;persist();render();schedule();});
  }
  // Keep the barrel visible while deciding; after bottling, the physical bottle is the focus.
  document.querySelector('.warehouse').hidden=journey.phase==='finished';
  renderedPhase=journey.phase;
  renderLedger();
  $('records').hidden=!journey.records.length;
  const recordsKey=JSON.stringify(journey.records);
  if(renderedRecordsKey!==recordsKey){$('records-body').innerHTML=journey.records.slice().reverse().map(r=>renderRecord(r,true)).join('');renderedRecordsKey=recordsKey;}
  if(animate){
    document.body.classList.remove('month-pulse');void document.body.offsetWidth;document.body.classList.add('month-pulse');
    clearTimeout(pulse);pulse=setTimeout(()=>document.body.classList.remove('month-pulse'),550);
  }
}
$('toggle-time').addEventListener('click',()=>{paused=!paused;render();schedule();});
$('skip').addEventListener('click',()=>{
  stopClock();
  for(let i=0;i<100&&journey.phase==='watching';i++)journey=tick(journey);
  persist();render(true);schedule();
});
$('decision').addEventListener('click',event=>{
  const btn=event.target.closest('[data-choice]');if(!btn||!journey||journey.phase!=='choice'||btn.dataset.stage!==journey.pending?.id||!journey.pending.options.some(o=>o.id===btn.dataset.choice))return;
  stopClock();journey=choose(journey,btn.dataset.choice);paused=false;persist();render();schedule();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){paused=true;stopClock();}
  // Returning to the page requires explicit resume; no elapsed-time catch-up.
  render();
});
window.addEventListener('pagehide',stopClock);
window.addEventListener('pageshow',event=>{if(event.persisted){paused=true;stopClock();render();}});
$('reset').addEventListener('click',()=>{
  if(!confirm('この進行と一本の記録を初期化しますか？以前の蒸留所の保存は残ります。'))return;
  stopClock();journey=newJourney();paused=false;canSave=!preview;renderedPhase='';renderedRound=-1;notice('');persist();render();schedule();
});
function boot(){
  if(preview){journey=newJourney();paused=document.hidden;persist();render();schedule();return;}
  let stored;
  try{stored=localStorage.getItem(SAVE_KEY);}catch{canSave=false;notice('保存を読み取れませんでした。記録を保護するため、自動で始めません。');$('recovery').hidden=false;return;}
  if(stored!==null){
    try{journey=restoreJourney(stored);paused=true;render();schedule();}
    catch{canSave=false;notice('この保存は読み込めません。元の記録を残しています。');$('recovery').hidden=false;}
    return;
  }
  journey=newJourney();paused=document.hidden;persist();render();schedule();
}
boot();
