import {DEFAULT_SEED,STRATEGIES,CONDITIONS,bottles} from './model.mjs';
import {createSeason,fairStatus,panelFor,annualAdvance,nextFair,skipFair,enterFair,seasonalReplace} from './seasonal.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toFixed(2),score=n=>Number(n).toFixed(1);
const typeName=type=>type==='bourbon'?'バーボン':'リフィル';
const ageName=n=>n<12?`${n}か月`:`${Math.floor(n/12)}年${n%12?`${n%12}か月`:''}`;
const axes=[['roughness','シゲキ',1],['character','原酒のかおり',1],['wood','木のかおり',1.35]];
const observationKeys=['choice','aging','recommendation','next-batch','interruption'];
let session=createSeason(),selected=session.casks[0].id;
$('strategy').innerHTML=STRATEGIES.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
function syncControls(){
 $('strategy').value=session.strategy;$('consumption').value=session.consumption;$('evaporation').value=session.evaporation;$('seed').value=session.seed??DEFAULT_SEED;
 $('panel-mode').value=session.options.panelMode;$('aggregation').value=session.options.aggregation;$('recommendations').value=session.options.recommendations?'on':'off';
}
syncControls();

function caskArt(c){
 const warm=c.type==='bourbon',fill=warm?'#a7743e':'#8f7853',highlight=warm?'#c99655':'#aa9470';
 return `<svg viewBox="0 0 36 38" aria-hidden="true"><path fill="#101c24" d="M6 35h25v3H6z"/><path fill="${fill}" d="M10 2h16v2h4v5h2v21h-2v4h-4v2H10v-2H6v-4H4V9h2V4h4z"/><path fill="${highlight}" d="M10 5h5v26h-5zM17 4h3v29h-3zM22 5h3v26h-3z"/><path fill="#533f2b" d="M8 4h2v29H8zM26 4h2v29h-2zM15 5h2v28h-2zM20 4h2v29h-2z"/><path fill="#a8ae9d" d="M6 9h24v4H6zM6 25h24v4H6z"/><path fill="#596b6c" d="M6 12h24v2H6zM6 28h24v2H6z"/><path fill="#ddd4af" d="M13 16h11v7H13z"/><path fill="#66513a" d="M15 18h7v1h-7zM15 20h5v1h-5z"/></svg>`;
}
function render(){
 const c=session.casks.find(x=>x.id===selected)??session.casks[0];selected=c.id;
 const fair=fairStatus(session),nextMonths=12-session.month%12;
 $('fair-title').textContent=`第${fair.year}回 品評会`;
 $('fair-status').textContent=({upcoming:'開催前',open:'受付中',submitted:'出品済み',skipped:'見送り'})[fair.status];
 $('fair-due').textContent=fair.status==='upcoming'?`開催まで ${fair.opensAt-session.month}か月`:`次の品評会まで ${nextMonths}か月`;
 $('judges').innerHTML=fair.judges.map(j=>`<div class="judge-intro"><b>${esc(j.name)}</b><p>${esc(j.hint)}</p></div>`).join('');
 $('next-panel').hidden=fair.status==='upcoming';
 $('next-panel-title').textContent=`来年の審査員（第${fair.year+1}回）`;
 $('next-judges').innerHTML=fair.status==='upcoming'?'':panelFor(session.seed,fair.year+1,session.options.panelMode).map(j=>`<div class="judge-intro"><b>${esc(j.name)}</b><p>${esc(j.hint)}</p></div>`).join('');
 $('month').textContent=session.month?`開始から ${ageName(session.month)}`:'開始時点';
 $('casks').innerHTML=session.casks.map(x=>`<button class="cask" data-cask="${x.id}" aria-pressed="${x.id===selected}" aria-label="たる No.${x.id} ${typeName(x.type)} ${ageName(x.age)} ${number(x.litres)}リットル"><span class="number">No.${x.id}<span class="mark" aria-hidden="true">${x.id===selected?'▼':''}</span></span>${caskArt(x)}<span class="type">${typeName(x.type)} · 抽出${x.recipe.stop}%</span><span class="age">${ageName(x.age)}</span><span class="volume">${number(x.litres)} L · ${bottles(x)}本</span>${axes.map(([key,label,max])=>`<span class="axis"><span>${label}</span><meter min="0" max="${max}" value="${x[key]}" aria-label="${label}">${number(x[key])}</meter><span class="value">${number(x[key])}</span></span>`).join('')}</button>`).join('');
 $('selected').textContent=`No.${c.id}を選択中 · 出品 ${number(CONDITIONS.consumption[session.consumption])} L`;
 $('submit').disabled=fair.status!=='open'||c.litres<=0||c.litres+1e-12<CONDITIONS.consumption[session.consumption];
 $('skip').disabled=fair.status!=='open';
 $('advance6').disabled=session.casks.some(x=>x.age+6>120);
 $('advance12').disabled=session.casks.some(x=>x.age+12>120);
 $('next-fair').disabled=session.casks.some(x=>x.age+nextMonths>120);
 $('sold').textContent=session.sold.length?`売却 ${session.sold.length}樽 · ${session.sold.reduce((sum,x)=>sum+(x.bottles??0),0)}本` : '';
 const latest=session.history.at(-1);$('history-wrap').hidden=!latest;
 if(!latest){$('latest').innerHTML='<p class="empty">開催月になったら、1樽を選んで出品できます。</p>';$('history').innerHTML='';return;}
 if(latest.kind==='skip')$('latest').innerHTML=`<p class="skip-record">第${latest.year}回 · ${esc(latest.reason)}</p>`;
 else{
  const e=latest.evaluation;
  $('latest').innerHTML=`<div class="verdict"><strong>${latest.rank}位 / ${latest.fieldSize}作</strong><span>第${latest.year}回 · No.${latest.caskId} · ${ageName(latest.age)}</span><span>総合 ${score(e.total)}</span></div><div class="judge-results">${e.judges.map(j=>`<div class="judge-result"><div>${esc(j.name)}</div><div class="score">${score(j.score)}</div><p>${esc(j.comment)}</p></div>`).join('')}</div><p class="note">消費 ${number(latest.consumed)} L · 残り ${number(latest.afterLitres)} L</p>${latest.options.recommendations?`<p class="recommend">個人推薦：${latest.recommendations.length?latest.recommendations.map(esc).join('・'):'なし'}</p>`:''}`;
 }
 $('history').innerHTML=[...session.history].reverse().map(h=>h.kind==='skip'?`<tr class="skip-record"><td>${h.year}</td><td colspan="7">${esc(h.reason)}</td></tr>`:`<tr><td>${h.year}</td><td>No.${h.caskId}</td><td>${h.age}</td><td class="history-scores">${h.evaluation.judges.map(j=>`${esc(j.name)} ${score(j.score)}`).join('<br>')}</td><td>${score(h.evaluation.total)}</td><td>${h.rank} / ${h.fieldSize}</td><td>${h.recommendations.length?h.recommendations.map(esc).join('・'):'—'}</td><td>${number(h.consumed)}</td></tr>`).join('');
}
function run(action,message){try{session=action();$('message').textContent=message;render();return true;}catch(error){$('message').textContent=error.message;return false;}}
function reset(){
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<1||seed>4294967295){syncControls();$('message').textContent='シードは1〜4294967295の整数です。';$('seed').focus();return;}
 const ok=run(()=>{const fresh=createSeason({seed,strategy:$('strategy').value,consumption:$('consumption').value,evaporation:$('evaporation').value,panelMode:$('panel-mode').value,aggregation:$('aggregation').value,recommendations:$('recommendations').value==='on'});selected=fresh.casks[0].id;return fresh;},'同じシードの初期4樽に戻しました。');
 if(ok)for(const key of observationKeys)$('observation-'+key).value='';
 syncControls();
}
$('casks').addEventListener('click',event=>{const button=event.target.closest('[data-cask]');if(!button)return;selected=Number(button.dataset.cask);$('message').textContent='';render();$('casks').querySelector(`[data-cask="${selected}"]`)?.focus({preventScroll:true});});
$('submit').addEventListener('click',()=>run(()=>enterFair(session,selected),'今年の出品結果を記録しました。'));
$('skip').addEventListener('click',()=>run(()=>skipFair(session),'今年は見送ります。熟成や仕込みは続けられます。'));
$('next-fair').addEventListener('click',()=>run(()=>nextFair(session),'次の品評会まで進めました。'));
$('advance6').addEventListener('click',()=>run(()=>annualAdvance(session,6),'6か月進めました。'));
$('advance12').addEventListener('click',()=>run(()=>annualAdvance(session,12),'1年進めました。'));
$('replace').addEventListener('click',()=>run(()=>{const next=seasonalReplace(session,selected,{stop:Number($('recipe-stop').value),type:$('recipe-type').value});selected=next.casks.find(x=>!session.casks.some(old=>old.id===x.id))?.id??next.casks[0].id;return next;},'売却し、新しい樽を置きました。'));
for(const id of ['strategy','consumption','evaporation','seed','panel-mode','aggregation','recommendations'])$(id).addEventListener('change',reset);
$('reset').addEventListener('click',reset);
$('export').addEventListener('click',()=>{
 const observations=Object.fromEntries(observationKeys.map(key=>[key,$('observation-'+key).value]));
 const data=JSON.stringify({format:'ambertime-contest-session/0.2',...session,observations},null,2)+'\n',url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-contest-v02-${session.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent='この実験の記録と感想を書き出しました。';
});
render();
