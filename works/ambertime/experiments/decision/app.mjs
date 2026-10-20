import {DEFAULT_SEED,CONDITIONS,FIXTURES,createSession,view,quote,bottle,start,canStart,advance,sample,setListed} from './model.mjs?v=0.1';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toFixed(2),money=n=>`£${number(n)}`;
const typeName=type=>type==='bourbon'?'バーボン':'リフィル';
const ageName=n=>n<12?`${n}か月`:`${Math.floor(n/12)}年${n%12?`${n%12}か月`:''}`;
const axes=[['roughness','シゲキ',1],['character','原酒のかおり',1],['wood','木のかおり',1.35]];
let session=createSession(),selected=view(session).casks[0]?.id??null,bottleCount=null;
$('condition').innerHTML=CONDITIONS.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
$('fixture').innerHTML=FIXTURES.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
function syncControls(){$('condition').value=session.condition;$('fixture').value=session.fixture;$('seed').value=session.seed??DEFAULT_SEED;}
syncControls();
function caskArt(c){
 const warm=c.type==='bourbon',fill=warm?'#a7743e':'#8f7853',highlight=warm?'#c99655':'#aa9470';
 return `<svg viewBox="0 0 36 38" aria-hidden="true"><path fill="#101c24" d="M6 35h25v3H6z"/><path fill="${fill}" d="M10 2h16v2h4v5h2v21h-2v4h-4v2H10v-2H6v-4H4V9h2V4h4z"/><path fill="${highlight}" d="M10 5h5v26h-5zM17 4h3v29h-3zM22 5h3v26h-3z"/><path fill="#533f2b" d="M8 4h2v29H8zM26 4h2v29h-2zM15 5h2v28h-2zM20 4h2v29h-2z"/><path fill="#a8ae9d" d="M6 9h24v4H6zM6 25h24v4H6z"/><path fill="#596b6c" d="M6 12h24v2H6zM6 28h24v2H6z"/><path fill="#ddd4af" d="M13 16h11v7H13z"/><path fill="#66513a" d="M15 18h7v1h-7zM15 20h5v1h-5z"/></svg>`;
}

function renderQuote(){
 const v=view(session),c=v.casks.find(x=>x.id===selected),all=quote(session,selected);
 $('bottle-count').disabled=!c||all.maxCount<1;$('bottle-count').max=all.maxCount;
 if(bottleCount===null)bottleCount=all.maxCount;
 $('bottle-count').value=bottleCount??'';
 const q=quote(session,selected,bottleCount);
 $('bottle-quote').textContent=c?`${q.count}本 · 費用 ${money(q.cost)}`:'たるを選んでください。';
 $('bottle').disabled=!q.ok;$('bottle-reason').textContent=q.reason;
}
function recipe(){return {stop:Number($('recipe-stop').value),type:$('recipe-type').value};}
function renderRecipe(){const q=canStart(session,recipe());$('start-cost').textContent=`費用 ${money(q.cost)} · 必要な資金 ${money(q.minimum)}`;$('start-reason').textContent=q.reason;$('start').disabled=!q.ok;}
function historyEntry(h){
 const when=`${h.month}か月目`;
 if(h.kind==='bottle')return `<article class="entry"><div class="entry-main">${when} · No.${h.serial}を${h.count}本ビン詰め</div><p>${esc(h.season)} · 費用 ${money(h.cost)}<br>資金 ${money(h.before.cash)} → ${money(h.after.cash)}<br>ビン在庫 ${h.before.inventory.reduce((n,p)=>n+p.stock,0)} → ${h.after.inventory.reduce((n,p)=>n+p.stock,0)}本</p>${Object.entries({why:'今、詰める理由',wait:'待ちたかったこと',next:'次に試したいこと'}).some(([key])=>h.notes?.[key])?`<dl>${Object.entries({why:'今、詰める理由',wait:'待ちたかったこと',next:'次に試したいこと'}).filter(([key])=>h.notes?.[key]).map(([key,label])=>`<dt>${label}</dt><dd>${esc(h.notes[key])}</dd>`).join('')}</dl>`:''}</article>`;
 if(h.kind==='start')return `<div class="entry">${when} · No.${h.serial}を仕込み<br>${typeName(h.type)} · 抽出${h.stop}% · 費用 ${money(h.cost)}</div>`;
 if(h.kind==='month')return `<div class="entry">${when} · ${esc(h.season)}<br>売上 ${money(h.revenue??0)} · 維持費 ${money(h.upkeep)} · 資金 ${money(h.cash)}</div>`;
 if(h.kind==='list'||h.kind==='store')return `<div class="entry">${when} · ビン${h.productId}を${h.kind==='list'?'販売中に変更':'保管に戻した'}</div>`;
 return '';
}
function render(){
 const v=view(session),c=v.casks.find(x=>x.id===selected)??v.casks[0];selected=c?.id??null;
 $('date').textContent=v.date;$('season').textContent=v.season.name;$('season-hint').textContent=v.season.hint+(CONDITIONS.find(x=>x.id===session.condition)?.season&&v.season.next?` ${v.season.next.months}か月後は${v.season.next.name}。${v.season.next.hint}`:'');
 $('cash').textContent=money(v.cash);$('capacity').textContent=`${v.freeSlots} / 4樽`;$('upkeep').textContent=money(v.upkeep);$('reserve').textContent=money(v.reserve);$('elapsed').textContent=`${v.month}か月経過`;
 $('casks').innerHTML=v.casks.map(x=>`<button class="cask" data-cask="${x.id}" aria-pressed="${x.id===selected}" aria-label="たる No.${x.serial} ${typeName(x.type)} ${ageName(x.age)} ${number(x.litres)}リットル"><span class="number">No.${x.serial}<span class="mark" aria-hidden="true">${x.id===selected?'▼':''}</span></span>${caskArt(x)}<span class="type">${typeName(x.type)}</span><span class="age">${ageName(x.age)}</span><span class="volume">${number(x.litres)} L · ${x.bottles}本</span>${axes.map(([key,label,max])=>`<span class="axis"><span>${label}</span><meter min="0" max="${max}" value="${x[key]}" aria-label="${label}">${number(x[key])}</meter><span class="value">${number(x[key])}</span></span>`).join('')}</button>`).join('')+Array.from({length:v.freeSlots},()=>'<div class="empty-slot">空き</div>').join('');
 $('selected').textContent=c?`たる No.${c.serial}`:'たるはありません。';$('sample').disabled=!c;
 $('tasting').textContent=session.tasting?.caskId===selected?session.tasting.text:'';
 renderQuote();renderRecipe();
 const m=v.lastMonth;$('last-month').textContent=m?`前月 売上 ${money(m.revenue??0)} · ${m.bottles??0}本 · 維持費 ${money(m.upkeep)}`:'';
 $('products').innerHTML=v.products.length?v.products.map(p=>`<article class="product" data-product="${p.id}"><div class="section-line"><h3>No.${p.sourceSerial}から · ${p.stock}本</h3><span class="product-state">${p.listed?'販売中':'保管中'}</span></div><p class="note">${typeName(p.type)} · ${ageName(p.age)}でビン詰め · 1本 ${money(p.price)}${Number.isFinite(p.sold)?` · 売却済み${p.sold}本`:''}</p><button data-list="${p.id}" data-listed="${p.listed}">${p.listed?'保管に戻す':'販売する'}</button><details><summary>詰めた時の風味</summary><p class="product-profile">${axes.map(([key,label])=>`${label} ${number(p[key])}`).join(' · ')}</p></details></article>`).join(''):'<p class="note">保管中・販売中のビンはありません。</p>';
 const latest=session.history.filter(h=>h.kind==='bottle').at(-1);$('latest').innerHTML=latest?historyEntry(latest):'';
 $('history-count').textContent=session.history.length?`(${session.history.length})`:'';
 $('history').innerHTML=session.history.length?[...session.history].reverse().filter(h=>h!==latest).map(historyEntry).join(''):'<p class="note">まだ記録はありません。</p>';
 const condition=CONDITIONS.find(x=>x.id===session.condition);$('condition-note').textContent=condition?.finance||condition?.season?'費用と季節の違いは、この実験用の仮説です。':'現行の費用・熟成・販売モデルを使います。';
}
function run(action,message){try{session=action();render();$('message').textContent=session.notice||message;return true;}catch(error){$('message').textContent=error.message;return false;}}
function reset(){
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<1||seed>4294967295){syncControls();$('message').textContent='シードは1〜4294967295の整数です。';$('seed').focus();return;}
 if(run(()=>{const fresh=createSession({seed,condition:$('condition').value,fixture:$('fixture').value});selected=view(fresh).casks[0]?.id??null;bottleCount=null;return fresh;},'同じシードの初期状態に戻しました。'))for(const id of ['note-why','note-wait','note-next','overall-notes'])$(id).value='';
 syncControls();
}
$('casks').addEventListener('click',event=>{const button=event.target.closest('[data-cask]');if(!button)return;selected=Number(button.dataset.cask);bottleCount=null;render();$('message').textContent='';$('casks').querySelector(`[data-cask="${selected}"]`)?.focus({preventScroll:true});});
$('bottle-count').addEventListener('input',()=>{bottleCount=Number($('bottle-count').value);const q=quote(session,selected,bottleCount);$('bottle-quote').textContent=`${q.count}本 · 費用 ${money(q.cost)}`;$('bottle').disabled=!q.ok;$('bottle-reason').textContent=q.reason;});
$('sample').addEventListener('click',()=>run(()=>sample(session,selected),'試飲しました。'));
$('bottle').addEventListener('click',()=>{if(run(()=>{const next=bottle(session,selected,bottleCount,Object.fromEntries(['why','wait','next'].map(key=>[key,$('note-'+key).value])));bottleCount=null;return next;},'ビンに詰めて保管しました。'))for(const key of ['why','wait','next'])$('note-'+key).value='';});
$('products').addEventListener('click',event=>{const button=event.target.closest('[data-list]');if(!button)return;const listed=button.dataset.listed!=='true';run(()=>setListed(session,Number(button.dataset.list),listed),listed?'販売を始めます。次の月から売れます。':'保管に戻しました。');});
$('advance1').addEventListener('click',()=>{bottleCount=null;run(()=>advance(session,1),'1か月進めました。');});
$('advance6').addEventListener('click',()=>{bottleCount=null;run(()=>advance(session,6),'6か月進めました。');});
for(const id of ['recipe-stop','recipe-type'])$(id).addEventListener('change',renderRecipe);
$('start').addEventListener('click',()=>run(()=>{const next=start(session,recipe());selected=view(next).casks.at(-1)?.id??null;bottleCount=null;return next;},'新しいたるを仕込みました。'));
for(const id of ['condition','fixture','seed'])$(id).addEventListener('change',reset);
$('reset').addEventListener('click',reset);
$('export').addEventListener('click',()=>{const notes={overall:$('overall-notes').value,pending:Object.fromEntries(['why','wait','next'].map(key=>[key,$('note-'+key).value]))},data=JSON.stringify({format:'ambertime-decision-session/0.1',...session,notes},null,2)+'\n',url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-decision-${session.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent='この実験の記録とメモを書き出しました。';});
render();
