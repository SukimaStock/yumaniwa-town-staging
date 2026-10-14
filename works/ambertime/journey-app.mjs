import {newJourney,tick,choose,nextJourney,serializeJourney,restoreJourney,currentCask,observation,choiceView,formatRecord,JOURNEY_PARAMETERS,sampleJourney,endTasting,finishJourney,comparison} from './journey.mjs?v=0.4';
import {barrel,glass,bottleArt} from './art.mjs?v=0.4';
import {ageLabel,bottleQuote} from './model.mjs';
export const SAVE_KEY='sukimastock.ambertime.journey.v1';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`£${Math.round(n).toLocaleString('en-GB')}`;
const preview=new URLSearchParams(location.search).get('preview')==='1';
const trialSeed=Number(new URLSearchParams(location.search).get('seed'));
const initialSeed=preview&&Number.isInteger(trialSeed)&&trialSeed>=1&&trialSeed<=4294967295?trialSeed:20261014;
let journey=null,paused=false,timer=null,pulse=null,canSave=!preview,bottleOpen=false,tasteWasPaused=true,bottleWasPaused=true,roundDrawn=null,decisionKey='',resultKey='',recordsKey='';
function stopClock(){if(timer!==null){clearTimeout(timer);timer=null;}}
function notice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=!text;}
function persist(){
 if(preview){$('save-status').textContent='試遊中 · 保存しません';return;}
 if(!canSave)return;
 try{localStorage.setItem(SAVE_KEY,serializeJourney(journey));$('save-status').textContent='保存しました';}
 catch{canSave=false;notice('保存できません。このページでは続けられますが、再開すると進行が戻ることがあります。');$('save-status').textContent='未保存';}
}
function schedule(){
 stopClock();
 if(!journey||paused||document.hidden||bottleOpen||journey.view==='tasting'||journey.phase!=='watching')return;
 timer=setTimeout(()=>{timer=null;if(paused||document.hidden||bottleOpen||journey.view==='tasting'||journey.phase!=='watching')return;journey=tick(journey);persist();render('month');schedule();},JOURNEY_PARAMETERS.monthMs);
}
function act(fn,motion=''){
 stopClock();try{journey=fn(journey);persist();render(motion);}catch(e){notice(e.message);render();}schedule();
}
function pulseMotion(name){document.body.dataset.motion=name;clearTimeout(pulse);pulse=setTimeout(()=>delete document.body.dataset.motion,500);}
const sampleText=s=>(s?.text??[]).map(esc).join(' · ');
function sampleList(samples){return (samples??[]).map(s=>`<li><time>${esc(ageLabel(s.age))}</time><span>${sampleText(s)}</span></li>`).join('');}
function renderRecord(record,history=false){
 const f=formatRecord(record),memories=Array.isArray(f.memory)?f.memory:f.memory?[f.memory]:[];
 const choices=(f.choices??[]).map(c=>`<li><time>${esc(ageLabel(c.age))}</time><span>${esc(c.text)}</span></li>`).join('');
 const details=`${f.description?`<p class="record-description">${esc(f.description)}</p>`:''}${memories.length?`<ul class="memories">${memories.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:''}<details><summary>試飲と判断の記録</summary>${f.samples?.length?`<ul class="sample-history">${sampleList(f.samples)}</ul>`:'<p class="quiet">試飲の記録はありません。</p>'}<ul class="record-choices">${choices}</ul></details>`;
 if(history)return `<article class="record-history"><h3>${esc(f.name)}</h3><p>${esc(ageLabel(f.age))} · ${esc(f.bottles)}本</p><p class="record-flavor">${(f.taste??[]).map(esc).join(' · ')}</p>${details}</article>`;
 return `<h2>${esc(f.name)}</h2><div class="bottle">${bottleArt(f.profile?.wood??.4)}</div><p>${esc(ageLabel(f.age))} · ${esc(f.bottles)}本</p><p class="finish-taste">${(f.taste??[]).map(esc).join(' · ')}</p>${details}<p class="yield">蒸発 ${Number(f.evaporated??0).toFixed(1)} L · 維持費 ${money(f.upkeep??0)}</p><button id="next-barrel" type="button">別の樽を預かる</button>`;
}
function renderTasting(){
 const cmp=comparison(journey),s=cmp.current;
 if(!s)return;
 $('taste-date').textContent=`${ageLabel(s.age)}の試飲`;
 $('taste-current').innerHTML=(s.text??[]).map((t,i)=>`<p><span>${['口当たり','香り','余韻'][i]}</span>${esc(t)}</p>`).join('');
 $('taste-previous').hidden=!cmp.previous;
 if(cmp.previous){$('taste-previous').innerHTML=`<h3>前回 · ${esc(ageLabel(cmp.previous.age))}</h3><p>${sampleText(cmp.previous)}</p><ul>${(cmp.lines??[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;}
 $('taste-same-month').hidden=!(journey.samples?.length&&cmp.previous&&cmp.current.age===cmp.previous.age);
}
function render(motion=''){
 if(!journey)return;
 const c=currentCask(journey),o=observation(journey),pending=choiceView(journey),tasting=journey.view==='tasting',finished=journey.phase==='finished';
 $('game').hidden=false;$('recovery').hidden=true;
 document.querySelector('.warehouse').hidden=finished;
 document.body.classList.toggle('is-tasting',tasting&&!bottleOpen);
 $('legacy-note').hidden=journey.rules!=='legacy';
 if(o){
  $('age').textContent=ageLabel(o.age);$('amount').textContent=`残り ${o.litres.toFixed(1)} L`;
  $('loss').textContent=`仕込みから −${Math.max(0,o.initialLitres-o.litres).toFixed(1)} L`;
  $('glass').innerHTML=glass(o.wood,{sample:true});
  // Flavor is deliberately available only in the tasting panel.
  $('change').textContent=journey.rules==='legacy'?'この樽の時間を引き継いでいます。':o.wood>.66?'色が深くなってきました。':o.wood>.36?'琥珀色が濃くなってきました。':o.wood>.13?'少し色づいてきました。':'まだ淡い色です。';
  const latest=journey.samples?.at(-1);$('last-taste').textContent=latest?`前の試飲 · ${ageLabel(latest.age)}`:'グラスを選んで、ひとくち確かめる。';
 }
 const drawKey=`${journey.seed}:${journey.round}`;
 if(roundDrawn!==drawKey){$('barrel').innerHTML=barrel(c?.type??'bourbon');$('cask-kind').textContent=c?.type==='refill'?'リフィル・バーボン樽':'バーボン樽';roundDrawn=drawKey;}
 $('free-actions').hidden=finished||tasting||bottleOpen;
 $('time-controls').hidden=finished||tasting||bottleOpen||journey.phase!=='watching';
 $('toggle-time').textContent=paused?'続きを見守る':'ひと休み';
 $('tasting-panel').hidden=!tasting||bottleOpen||finished;
 if(tasting)renderTasting();
 $('decision').hidden=!pending||tasting||bottleOpen||finished;
 const key=JSON.stringify(pending);
 if(pending&&decisionKey!==key){
  const title=journey.rules==='legacy'&&pending.id==='arrival'&&journey.intent==='wood'&&o.wood<JOURNEY_PARAMETERS.woodGoal?'まだ淡い樽香':pending.title;
  $('decision').innerHTML=`<h2>${esc(title)}</h2><p>${esc(journey.rules==='legacy'?'引き継いだ樽の節目です。試飲してから決めることもできます。':pending.text)}</p><div class="options">${pending.options.map(op=>{const q=op.id==='bottle'?bottleQuote(journey.core,c.id):null;return `<button class="choice" type="button" data-choice="${esc(op.id)}" data-event="${esc(pending.id)}">${esc(op.label)}${q?`<span>${q.count}本 · 費用 ${money(q.cost)}</span>`:op.hint?`<span>${esc(op.hint)}</span>`:''}</button>`;}).join('')}</div>`;decisionKey=key;
 }
 $('bottle-tray').hidden=!bottleOpen||finished;
 if(bottleOpen&&c){const q=bottleQuote(journey.core,c.id);$('bottle-quote').textContent=`${q.count}本 · 瓶詰め費用 ${money(q.cost)}`;$('confirm-bottle').disabled=!q.count||q.cost>journey.core.cash;}
 $('result').hidden=!finished;
 const rk=finished?JSON.stringify(journey.result):'';
 if(finished&&resultKey!==rk){$('result').innerHTML=renderRecord(journey.result);resultKey=rk;}
 const status=finished?'この樽の記録を残しました。':tasting?'試飲中 · 時間を止めています。':bottleOpen?'瓶詰めする量を確かめる。':pending?'時間を止めています。':paused?'時間は止まっています。':'時間が流れています。';
 if($('time-status').textContent!==status)$('time-status').textContent=status;
 $('ledger-body').innerHTML=`<p>資金 ${money(journey.core.cash)} · 維持費累計 ${money(journey.core.totals.upkeep)}</p>${finished?`<p>瓶詰め翌月 · ${journey.result.sold??0}本販売 · ${money(journey.result.revenue??0)}</p>`:''}`;
 $('records').hidden=!journey.records.length;
 const allKey=JSON.stringify(journey.records);
 if(recordsKey!==allKey){$('records-body').innerHTML=journey.records.slice().reverse().map(r=>renderRecord(r,true)).join('');recordsKey=allKey;}
 if(motion)pulseMotion(motion);
}
function taste(){
 if(!journey||journey.phase==='finished'||bottleOpen)return;
 if(journey.view!=='tasting')tasteWasPaused=paused;
 stopClock();act(sampleJourney,'pour');
}
function openBottle(){
 if(!journey||journey.phase==='finished')return;
 bottleWasPaused=paused;stopClock();bottleOpen=true;render();
}
$('taste-button').addEventListener('click',taste);
$('glass-button').addEventListener('click',taste);
$('end-tasting').addEventListener('click',()=>{if(journey?.view!=='tasting')return;paused=tasteWasPaused;act(endTasting);});
$('open-bottle').addEventListener('click',openBottle);
$('taste-bottle').addEventListener('click',openBottle);
$('cancel-bottle').addEventListener('click',()=>{bottleOpen=false;paused=bottleWasPaused;render();schedule();});
$('confirm-bottle').addEventListener('click',()=>{if(!bottleOpen||journey.phase==='finished')return;stopClock();try{const next=finishJourney(journey);journey=next;bottleOpen=false;persist();render('bottle');}catch(e){notice(e.message);}});
$('toggle-time').addEventListener('click',()=>{paused=!paused;render();schedule();});
$('skip').addEventListener('click',()=>{if(journey?.view==='tasting'||bottleOpen)return;act(s=>{for(let i=0;i<100&&s.phase==='watching';i++)s=tick(s);return s;},'month');});
$('decision').addEventListener('click',event=>{
 const btn=event.target.closest('[data-choice]');
 if(!btn||!journey||bottleOpen||journey.view==='tasting'||journey.phase!=='choice'||btn.dataset.event!==journey.pending?.id||!journey.pending.options.some(o=>o.id===btn.dataset.choice))return;
 paused=false;act(s=>choose(s,btn.dataset.choice));
});
$('result').addEventListener('click',event=>{if(event.target.closest('#next-barrel')&&journey?.phase==='finished'){paused=document.hidden;bottleOpen=false;act(nextJourney);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;tasteWasPaused=true;bottleWasPaused=true;stopClock();}render();});
window.addEventListener('pagehide',stopClock);
window.addEventListener('pageshow',e=>{if(e.persisted){paused=true;tasteWasPaused=true;stopClock();render();}});
$('reset').addEventListener('click',()=>{
 if(!confirm('この進行と一本の記録を初期化しますか？以前の蒸留所の保存は残ります。'))return;
 stopClock();journey=newJourney(initialSeed);paused=document.hidden;bottleOpen=false;tasteWasPaused=true;canSave=!preview;roundDrawn=null;decisionKey='';resultKey='';notice('');persist();render();schedule();
});
function boot(){
 if(preview){journey=newJourney(initialSeed);paused=document.hidden;persist();render();schedule();return;}
 let stored;try{stored=localStorage.getItem(SAVE_KEY);}catch{canSave=false;notice('保存を読み取れません。元の記録を保護して止めています。');$('recovery').hidden=false;return;}
 if(stored!==null){try{journey=restoreJourney(stored);paused=true;tasteWasPaused=true;render();}catch{canSave=false;notice('この保存は開けません。元の記録は残しています。');$('recovery').hidden=false;}return;}
 journey=newJourney();paused=document.hidden;persist();render();schedule();
}
boot();
