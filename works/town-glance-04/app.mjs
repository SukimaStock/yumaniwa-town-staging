import {DIRECTIONS,ORDERS,EXPOSURE_MS,TURN_MS,createTrials,relativeDirection,evaluateTrial,position} from './model.mjs';
const $=id=>document.getElementById(id);
const random = new Uint32Array(2); crypto.getRandomValues(random);
const params=new URLSearchParams(location.search);
const order=ORDERS.includes(params.get('order'))?params.get('order'):ORDERS[random[0]%ORDERS.length];
const mirrored=params.has('mirror')?params.get('mirror')==='1':Boolean(random[1]%2);
const trials=createTrials(order,mirrored),records=[];
const session={schema:'town-glance-turn/1',startedAt:new Date().toISOString(),order,mirrored,exposureMs:EXPOSURE_MS,turnMs:TURN_MS,stationAndTower:'fixed; cues hidden before baseline and after turn',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let phase='intro',index=0,attempt=null,timer=null,baselineAt=null,answerAt=null,recordWindow=null;
function snapshot(){return structuredClone({session,phase,completed:index,records});}
function sendRecord(){if(recordWindow&&!recordWindow.closed)recordWindow.postMessage({type:'town-glance-record',record:snapshot()},location.origin);}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==recordWindow||event.data?.type!=='town-glance-record-request')return;sendRecord();});
function render(next,prompt,hint=''){
  phase=next;document.body.dataset.phase=next;$('prompt').textContent=prompt;$('hint').textContent=hint;
  $('station').setAttribute('hidden','');$('tower').setAttribute('hidden','');
  $('answers').hidden=!['baseline','answer'].includes(next);
  $('action').hidden=!['intro','between','paused'].includes(next);$('record').hidden=next!=='done';
  for(const b of $('answers').querySelectorAll('button'))b.disabled=false;
}
function setHeading(value){$('heading').style.setProperty('--angle',`${value*90}deg`);}
function place(id,direction){const p=position(direction);$(id).setAttribute('transform',`translate(${p.x} ${p.y})`);$(id).querySelector('text').setAttribute('y',direction===2?'29':id==='tower'?'-23':'-19');$(id).removeAttribute('hidden');}
function begin(){
  clearTimeout(timer);const t=trials[index];
  attempt={trial:index+1,attempt:records.filter(r=>r.trial===index+1).length+1,...t,expectedBefore:relativeDirection(t.stationWorld,t.initialHeading),expectedAfter:relativeDirection(t.stationWorld,t.finalHeading),exposureStarted:performance.now(),before:null,after:null,beforeMs:null,afterMs:null,turnActualMs:null,status:'in-progress'};
  render('exposure',`駅は、${DIRECTIONS[relativeDirection(t.stationWorld,t.initialHeading)]}にあります。`);
  setHeading(t.initialHeading);$('space-title').textContent='自分の向き';
  if(t.condition==='B'){place('station',t.stationWorld);$('hint').textContent='上から見た位置関係';$('space-title').textContent='上から見た、自分と駅の位置関係';}
  if(t.condition==='C'){place('tower',t.towerWorld);$('hint').textContent=`塔は、${DIRECTIONS[relativeDirection(t.towerWorld,t.initialHeading)]}にあります。`;}
  timer=setTimeout(()=>{if(phase!=='exposure')return;attempt.exposureActualMs=performance.now()-attempt.exposureStarted;render('baseline','駅は、どっち？','今の自分から見て');baselineAt=performance.now();$('space-title').textContent='自分の向き。駅の印は表示しません。';},EXPOSURE_MS);
}
function turn(){
  const t=trials[index];render('turn',t.turn===1?'右に90度、向きます。':'左に90度、向きます。');
  const started=performance.now();
  // Force the initial orientation to be painted before applying a quarter-turn.
  void $('heading').getBoundingClientRect();setHeading(t.initialHeading+t.turn);
  timer=setTimeout(()=>{if(phase!=='turn')return;attempt.turnActualMs=performance.now()-started;render('answer','駅は今、どっち？','今の自分から見て');answerAt=performance.now();},TURN_MS);
}
function answer(value,keyboard){
  if(!['baseline','answer'].includes(phase))return;
  const now=performance.now();
  if(phase==='baseline'){attempt.before=value;attempt.beforeMs=now-baselineAt;turn();return;}
  attempt.after=value;attempt.afterMs=now-answerAt;attempt.status='completed';
  Object.assign(attempt,evaluateTrial(trials[index],attempt.before,attempt.after));
  delete attempt.exposureStarted;records.push(attempt);index++;
  if(index===trials.length)render('done','ここまでです。','ありがとうございました。');
  else {render('between','記録しました。');$('action').textContent='次へ';if(keyboard)$('action').focus({preventScroll:true});}
  sendRecord();
}
$('answers').addEventListener('click',event=>{const button=event.target.closest('[data-answer]');if(!button)return;const raw=button.dataset.answer;answer(raw==='unknown'?raw:Number(raw),event.detail===0);});
$('action').addEventListener('click',()=>{if(['intro','between','paused'].includes(phase))begin();});
function interrupt(reason){
  if(!['exposure','baseline','turn','answer'].includes(phase))return;
  clearTimeout(timer);attempt.status='interrupted';attempt.interruption=reason;delete attempt.exposureStarted;records.push(attempt);
  render('paused','いったん止めました。');$('action').textContent='この場面をやり直す';sendRecord();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt('document-hidden');});
window.addEventListener('pagehide',()=>interrupt('page-hidden'));
window.addEventListener('resize',()=>interrupt('viewport-changed'));
$('record').addEventListener('click',()=>{recordWindow=window.open('./observer.html','town-glance-observer');if(!recordWindow){$('hint').textContent='記録画面を開くには、ポップアップを許可してください。';return;}sendRecord();});
// When launched by the observer, only that window may request these memory records.
if(window.opener){try{if(window.opener.location.origin===location.origin)recordWindow=window.opener;}catch{/* no cross-origin access */}}
render('intro','駅の方向を見て、向きを変えます。','前・後ろ・右・左。わからないでも大丈夫です。');
