import {create,step,setPolicy,summarize,exportLog,report,MODES,POLICIES,PRODUCT_OPTIONS,NODES,date} from './model.mjs';
import {drawMap,hitPlace} from './map.mjs';
const $=id=>document.getElementById(id),nodeName=id=>id==='distillery'?'1号店の蒸留所':NODES.find(n=>n.id===id)?.name??'—';
const typeNames={release:'発売',shipment:'納品',rumor:'偶然の紹介',arrival:'口コミの到着',memory:'記憶',interest:'関心',share:'紹介',visit:'訪問',inquiry:'問い合わせ',trade:'取扱開始',resurface:'記憶の再浮上',generation:'世代交代',policy:'方針変更'};
const important=new Set(['rumor','trade','resurface','generation']);
let state=create(),playing=false,speed=1,timer=null,token=0,target=null,page=0,selected='distillery',visibleIds=[],selectedEvent=null;
const PAGE_SIZE=12,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function options(select,values){select.replaceChildren(...values.map(v=>new Option(v.name,v.id)));}
options($('mode'),MODES);options($('policy'),POLICIES);options($('product'),PRODUCT_OPTIONS);
$('mode').value=state.mode;$('policy').value=state.policy;$('product').value=state.product;
window.labSnapshot=()=>structuredClone(state);window.labExport=()=>exportLog(state);
function status(text){$('status').textContent=text;}
function error(e){pause();status('計算を止めました：'+e.message);console.error(e);}
function pause(){playing=false;target=null;token++;clearTimeout(timer);timer=null;syncButtons();}
function syncButtons(){
 $('play').textContent=playing||target!==null?'Ⅱ 一時停止':'▶ 再生';$('play').classList.toggle('running',playing||target!==null);$('play').setAttribute('aria-pressed',String(playing||target!==null));
 $('speed').textContent=speed+'倍';$('speed').setAttribute('aria-pressed',String(speed===2));
 document.querySelectorAll('[data-year]').forEach(b=>{b.disabled=state.month>=Number(b.dataset.year)*12;});
}
function draw(){visibleIds=drawMap($('map'),state,{frame:reduced?0:Math.floor(performance.now()/600)%2,selected,motion:reduced?8:Math.floor(performance.now()/150)});}
function placeDetail(){
 if(selected==='distillery'){$('place-detail').textContent=`1号店 · AmberTimeのみ。使用中 ${state.barrels.length}/4たる、納品 ${state.delivered}本。`;return;}
 const n=state.nodes[selected],config=NODES.find(n=>n.id===selected),phase=n.trading?'取扱いあり':n.contact?'訪問・問い合わせの接点あり':n.discovered?'関心あり':'口コミが到着';
 $('place-detail').textContent=`${config.region} · ${phase}。認知 ${Math.round(n.awareness*100)} / 関心 ${Math.round(n.interest*100)} / 関係 ${Math.round(n.root*100)}。納品 ${n.received}本、訪問 ${n.visits}件、問い合わせ ${n.inquiries}件。`;
}
function renderPlaces(){
 draw();if(!visibleIds.includes(selected))selected='distillery';
 const key=visibleIds.join('|');if($('place').dataset.key!==key){options($('place'),visibleIds.map(id=>({id,name:nodeName(id)})));$('place').dataset.key=key;}
 $('place').value=selected;placeDetail();draw();
 const discovered=visibleIds.filter(id=>id==='distillery'||id==='town'||state.nodes[id]?.discovered),known=visibleIds.filter(id=>!discovered.includes(id));
 $('map').setAttribute('aria-label',`街の実験用配置。建物：${discovered.map(nodeName).join('、')}。口コミのみ：${known.map(nodeName).join('、')||'なし'}。道と線は接点を示し、実際の伝播経路は記録の詳細で確認できます。`);
}
function filteredEvents(){const f=$('filter').value;return state.events.filter(e=>{if(f==='all')return true;if(f==='news')return !['shipment','release'].includes(e.type)&&(e.type!=='arrival'||e.channel!=='direct');return e.type===f;}).reverse();}
function renderNews(){
 const all=filteredEvents(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));page=Math.min(page,pages-1);
 $('news').replaceChildren();
 for(const e of all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){
  const li=document.createElement('li'),button=document.createElement('button'),time=document.createElement('time'),text=document.createElement('span');
  if(important.has(e.type))li.className='important';button.type='button';button.dataset.eventId=e.id;time.textContent=`${date(e.month)} · ${e.generation}代目 · ${typeNames[e.type]}`;text.textContent=e.reason;
  button.append(time,text);button.onclick=()=>eventDetail(e.id);li.append(button);$('news').append(li);
 }
 if(!all.length){const li=document.createElement('li');li.className='empty';li.textContent='この種類の記録はまだありません。';$('news').append(li);}
 $('newer').disabled=page===0;$('older').disabled=page>=pages-1;$('page-count').textContent=`${page+1} / ${pages} · ${all.length}件`;
}
function eventDetail(id){
 const e=state.events.find(x=>x.id===id);if(!e)return;selectedEvent=id;
 const body=$('event-body');body.replaceChildren();const p=document.createElement('p');p.textContent=e.reason;body.append(p);
 const dl=document.createElement('dl'),fields=[['年月',date(e.month)+' · '+e.generation+'代目'],['出来事',e.id+' · '+typeNames[e.type]],['場所',`${nodeName(e.from)} → ${nodeName(e.to)}`],['発売回',e.releaseId?'#'+e.releaseId:'—']];
 const release=state.releases.find(r=>r.id===e.releaseId);if(release){const q=release.product;fields.push(['商品',`${PRODUCT_OPTIONS.find(x=>x.id===release.kind)?.name??release.kind} / ${q.age}か月 / シゲキ ${q.roughness.toFixed(2)}・原酒香 ${q.character.toFixed(2)}・木香 ${q.wood.toFixed(2)} / 価格 ${q.price}`]);}
 for(const[k,v]of fields){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd);}body.append(dl);
 if(e.sourceId){const button=document.createElement('button');button.type='button';button.textContent='発生元 '+e.sourceId+' を見る';button.onclick=()=>eventDetail(e.sourceId);body.append(button);}
 const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='計算・参照情報';pre.textContent=JSON.stringify(e,null,2);details.append(summary,pre);body.append(details);$('event-detail').open=true;
}
function render(){
 const s=summarize(state);$('time').textContent=date(state.month);$('generation').textContent=state.generation===1?'初代':state.generation+'代目';$('stock').textContent=`在庫 ${s.inventory}本 · ${s.barrels}/4たる`;
 syncButtons();renderPlaces();renderNews();if($('report').open)$('report-text').value=report(state);
}
function tick(){
 if(!playing)return;try{step(state);page=0;render();if(state.month>=1200){pause();status('100年間の計算が終わりました。ログを書き出せます。');return;}timer=setTimeout(tick,850/speed);}catch(e){error(e);}
}
$('play').onclick=()=>{if(playing||target!==null){pause();status(date(state.month)+'で一時停止。');}else if(state.month<1200){playing=true;syncButtons();status('1か月ずつ進行中。');timer=setTimeout(tick,850/speed);}else status('100年に到達しました。初期状態に戻すと再実行できます。');};
$('speed').onclick=()=>{speed=speed===1?2:1;syncButtons();if(playing){clearTimeout(timer);timer=setTimeout(tick,850/speed);}};
async function advanceTo(month){
 pause();if(month<=state.month){status('過去へ戻る場合は初期状態に戻してください。');return;}
 target=month;const current=token;syncButtons();
 try{while(state.month<month&&token===current){const stop=Math.min(month,state.month+12);while(state.month<stop)step(state);page=0;render();status(`${date(month)}まで計算中 · ${date(state.month)}`);await new Promise(resolve=>setTimeout(resolve,0));}
  if(token===current){target=null;render();status(date(state.month)+'まで計算しました。途中の出来事もすべて記録しています。');}
 }catch(e){error(e);}
}
document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>advanceTo(Number(b.dataset.year)*12));
$('reset').onclick=()=>{const seed=Number($('seed').value);if(!$('seed').value.trim()||!Number.isInteger(seed)||seed<1||seed>4294967295){status('シードは1〜4294967295の整数で指定してください。');$('seed').focus();return;}try{const next=create({seed,mode:$('mode').value,policy:$('policy').value,product:$('product').value});pause();state=next;page=0;selected='distillery';selectedEvent=null;$('event-detail').open=false;$('event-body').textContent='記録を選ぶと、発売回と発生元を確認できます。';render();status('初期状態に戻しました。');}catch(e){error(e);}};
$('apply').onclick=()=>{try{pause();setPolicy(state,{policy:$('policy').value,product:$('product').value});page=0;render();status('現在の月から商品・納品方針を切り替えました。');}catch(e){error(e);}};
$('place').onchange=()=>{selected=$('place').value;placeDetail();draw();};
$('map').onclick=e=>{const id=hitPlace($('map'),e,state);if(id){selected=id;$('place').value=id;placeDetail();draw();}};
$('filter').onchange=()=>{page=0;renderNews();};$('newer').onclick=()=>{page--;renderNews();$('news').scrollTop=0;};$('older').onclick=()=>{page++;renderNews();$('news').scrollTop=0;};
$('json').onclick=()=>{try{const payload=exportLog(state),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-town-v01-${state.seed}-${state.month}months.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status(`${date(state.month)}の全履歴をJSONで保存しました。`);}catch(e){error(e);}};
$('copy').onclick=async()=>{const text=report(state);$('report-text').value=text;try{await navigator.clipboard.writeText(text);status('時系列の要約をコピーしました。');}catch{$('report').open=true;$('report-text').focus();$('report-text').select();status('自動コピーを利用できません。表示された要約をコピーしてください。');}};
$('report').ontoggle=()=>{if($('report').open)$('report-text').value=report(state);};
render();
if(!reduced)setInterval(()=>{if(!document.hidden)draw();},150);
