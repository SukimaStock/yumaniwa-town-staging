import {NODES,SHOPS,EDGES,STRATEGIES,CONDITIONS,KINDS,run,summary,affinity,productAt} from './model.mjs';

const $=id=>document.getElementById(id);
const localIds=new Set(SHOPS.map(n=>n.id));
const names=new Map(NODES.map(n=>[n.id,n.name]));
const name=id=>names.get(id)??id;
const percent=n=>Number.isFinite(n)?(n*100).toFixed(1):'—';
const decimal=n=>Number.isFinite(n)?n.toFixed(4):'—';
const date=month=>Number.isFinite(month)?`${Math.floor(month/12)}年${month%12}月`:'—';
const kindName=kind=>KINDS[kind]??kind;
const productName=p=>({young:'若い商品',standard:'標準の商品',long:'長期熟成品'})[p?.kind]??'商品';
const productText=p=>p?`${p.age}か月 · 刺激 ${percent(p.roughness)} / 原酒香 ${percent(p.character)} / 木香 ${percent(p.wood)} · 価格 ${p.price}`:'—';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ns='http://www.w3.org/2000/svg';
let timer=null,selectedEventId=null,activeState=null;
const cache=new Map();

$('condition').innerHTML=CONDITIONS.map(c=>`<option value="${escape(c.id)}">${escape(c.id)} ${escape(c.name)}</option>`).join('');$('condition').value='B';
$('strategy').innerHTML=STRATEGIES.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('');$('strategy').value='local';
$('memory-shop').innerHTML=SHOPS.map(n=>`<option value="${escape(n.id)}">${escape(n.name)}</option>`).join('');

function isSpace(n){return /space|cosmos|universe/i.test(String(n.level))||/space|cosmos/i.test(n.id)||n.name.includes('宇宙');}
function groupIndex(n,levels){return localIds.has(n.id)?0:1+levels.indexOf(String(n.level));}
function groupName(level,index){return index===0?'町 · 店舗ごと':level;}
function selectedOptions(){const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<1||seed>4294967295){$('seed').setCustomValidity('1〜4294967295の整数を入力してください。');$('seed').reportValidity();return null;}$('seed').setCustomValidity('');return {seed,strategy:$('strategy').value,condition:$('condition').value,sns:false,space:false,rootedness:true,memory:true,bridges:true,supply:24,quantityScale:1};}
function calculate(options,month){const key=JSON.stringify({...options,condition:undefined,month});if(cache.has(key))return cache.get(key);const all=CONDITIONS.map(condition=>{const state=run({...options,condition:condition.id},month/12);return {condition,state,view:summary(state)};});cache.set(key,all);if(cache.size>6)cache.delete(cache.keys().next().value);return all;}
function receiptOf(state,id){return state.receipts.find(r=>r.id===id)??state.receipts[id];}
function chanceArrival(a){return !!a.eventId||String(a.channel??'').startsWith('chance')||!!a.chanceChannel;}

function drawMap(state,destination,latest,selectedEvent){const visible=NODES.filter(n=>!isSpace(n));const levels=[...new Set(visible.filter(n=>!localIds.has(n.id)).map(n=>String(n.level)))];const groups=Array.from({length:levels.length+1},()=>[]);for(const n of visible)groups[groupIndex(n,levels)].push(n);
 const positions=new Map();let height=40;
 const groupBounds=groups.map((nodes,index)=>{const start=height,columns=Math.min(2,Math.max(1,nodes.length)),rows=Math.ceil(nodes.length/columns);height+=38;for(let i=0;i<nodes.length;i++){const column=i%columns,row=Math.floor(i/columns);positions.set(nodes[i].id,{x:20+(column+.5)*(370/columns),y:height+row*94+24});}height+=rows*94+22;return {start,end:height,index,level:index===0?'町':levels[index-1]};});
 $('map').setAttribute('viewBox',`0 0 410 ${height+20}`);$('map').replaceChildren();
 function svg(tag,attrs,text,parent=$('map')){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
 for(const group of groupBounds){svg('rect',{x:13,y:group.start,width:384,height:group.end-group.start-5,rx:4,fill:'none',stroke:'#ccd4cb'});svg('text',{x:26,y:group.start+22,class:'group-label'},groupName(group.level,group.index));}
 svg('text',{x:20,y:23,'font-size':13},'蒸留所1号店 → 実納品が起点');
 const path=latest?.path??[],highlight=new Set(path.slice(1).map((id,i)=>`${path[i]}:${id}`));
 for(const edge of EDGES){const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b||/sns|space/i.test(edge.channel))continue;const hit=!chanceArrival(latest??{})&&(highlight.has(`${edge.from}:${edge.to}`)||highlight.has(`${edge.to}:${edge.from}`));svg('path',{d:`M${a.x} ${a.y} Q${(a.x+b.x)/2+15} ${(a.y+b.y)/2} ${b.x} ${b.y}`,fill:'none',stroke:hit?'#ae673e':'#bdc8bf','stroke-width':hit?4:1.3});}
 const shownEvents=selectedEvent?[selectedEvent]:(state.events??[]).slice(-5);
 for(const event of shownEvents){const a=positions.get(event.source),b=positions.get(event.target);if(!a||!b)continue;const active=event.id===selectedEvent?.id;svg('path',{d:`M${a.x} ${a.y} Q${Math.min(395,Math.max(a.x,b.x)+55)} ${(a.y+b.y)/2} ${b.x} ${b.y}`,class:'chance-line',fill:'none','stroke-width':active?4:2,opacity:active?1:.45,'data-event-path':event.id});}
 if(latest&&chanceArrival(latest)&&!selectedEvent){for(let i=1;i<path.length;i++){const a=positions.get(path[i-1]),b=positions.get(path[i]);if(a&&b)svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'chance-line','stroke-width':4});}}
 for(const node of visible){const p=positions.get(node.id),value=state.nodes[node.id],awareness=value?.awareness??0,interest=value?.interest??0,selected=node.id===destination;const g=svg('g',{class:'node',tabindex:0,role:'button','aria-label':`${node.name}の口コミ経路`});svg('circle',{cx:p.x,cy:p.y,r:12,fill:interest>=.008?'#d5ac4d':awareness>=.10?'#7aa8ba':'#fafbf5',stroke:selected?'#263b3b':'#839b8c','stroke-width':selected?3:1},undefined,g);if((value?.received??0)>0)svg('circle',{cx:p.x,cy:p.y,r:3.5,fill:'#263b3b'},undefined,g);const label=svg('text',{x:p.x,y:p.y+28,'text-anchor':'middle',class:'node-label'});const parts=Array.from(node.name);for(let i=0;i<parts.length;i+=9)svg('tspan',{x:p.x,dy:i?15:0},parts.slice(i,i+9).join(''),label);svg('text',{x:p.x,y:p.y+60,'text-anchor':'middle',class:'node-value'},`${percent(awareness)} / ${percent(interest)}`);const select=()=>{$('destination').value=node.id;selectedEventId=null;render();};g.onclick=select;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};}
}

function render(){const options=selectedOptions();if(!options)return;const month=Number($('month').value),all=calculate(options,month),selected=all.find(x=>x.condition.id===options.condition)??all[0],state=selected.state,view=selected.view;activeState=state;
 const visible=NODES.filter(n=>!isSpace(n)),destinationBefore=$('destination').value;const destinationIds=new Set(visible.map(n=>n.id));$('destination').innerHTML=visible.map(n=>`<option value="${escape(n.id)}">${escape(n.name)}</option>`).join('');$('destination').value=destinationIds.has(destinationBefore)?destinationBefore:visible.at(-1)?.id;
 const events=state.events??view.events??[],kinds=[...new Set(events.map(e=>e.kind))],filterBefore=$('event-filter').value;$('event-filter').innerHTML='<option value="all">すべて</option>'+kinds.map(kind=>`<option value="${escape(kind)}">${escape(kindName(kind))}</option>`).join('');$('event-filter').value=kinds.includes(filterBefore)?filterBefore:'all';
 const filtered=events.filter(e=>$('event-filter').value==='all'||e.kind===$('event-filter').value),previousEvent=$('event-select').value;selectedEventId=filtered.some(e=>String(e.id)===String(selectedEventId))?selectedEventId:null;
 $('event-select').innerHTML=filtered.map(e=>`<option value="${escape(e.id)}">${escape(date(e.month))} ${escape(name(e.source))} → ${escape(name(e.target))}</option>`).join('')||'<option value="">出来事なし</option>';
 if(selectedEventId!==null)$('event-select').value=String(selectedEventId);else if(filtered.some(e=>String(e.id)===previousEvent))$('event-select').value=previousEvent;else $('event-select').value=filtered.at(-1)?.id??'';
 const selectedEvent=filtered.find(e=>String(e.id)===$('event-select').value)??null;
 const destination=$('destination').value,arrivals=state.arrivals.filter(a=>a.to===destination),latest=arrivals.filter(a=>(a.path?.length??0)>1).at(-1)??arrivals.at(-1);
 $('time').value=`${date(month)} · ${view.generation}代目`;
 $('totals').textContent=`供給 ${view.produced}本 · 実納品 ${view.delivered}本 · 在庫 ${view.inventory}本 · 取引した店 ${view.trading.length}店`;
 $('measures').innerHTML=`<div><dt>地元の定着</dt><dd>${percent(view.localRoot)}</dd></div><div><dt>町の関心</dt><dd>${percent(view.townInterest)}</dd></div><div><dt>外部の認知</dt><dd>${percent(view.remoteAwareness)}</dd></div>`;
 const handovers=view.handovers??state.handovers??[],inherited=handovers.at(-1)?.eventCount??0;$('generation').textContent=handovers.length?(handovers.every(h=>h.preserved&&h.eventsPreserved!==false)?`${handovers.length}回の世代交代。直近の交代で${inherited}件の出来事を継承。`:'世代交代時の継承状態を確認してください。'):'世代交代前。取引・商品記憶・出来事を次代へ引き継ぎます。';
 document.querySelectorAll('[data-years]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.years)*12===month));
 drawMap(state,destination,latest,selectedEventId!==null?selectedEvent:null);
 if(latest){const receipt=receiptOf(state,latest.receipt);$('route').textContent=`${chanceArrival(latest)?'偶然の経路':'通常の口コミ'}：${latest.path.map(name).join(' → ')} ｜ ${date(latest.month)}到着 ｜ 実納品 #${latest.receipt} ${receipt?`${receipt.count}本・${date(receipt.month)}`:''} ｜ 情報量 ${decimal(latest.strength)}・相性 ${percent(latest.fit)}`;}else $('route').textContent='この地点へ届いた口コミはまだありません。';
 $('event-totals').textContent=`出来事 ${view.eventCount??events.length}件 · 通常経路の到着 ${view.normalArrivalCount??state.arrivals.filter(a=>!chanceArrival(a)).length}件 · 偶然の経路の到着 ${view.chanceArrivalCount??state.arrivals.filter(chanceArrival).length}件 · 最初の海外到着 ${date(view.firstOverseasArrival)}`;
 if(selectedEvent){const e=selectedEvent,receipt=receiptOf(state,e.receipt);$('event-detail').textContent=`出来事 #${e.id} · ${date(e.month)}・${e.generation}代目 ｜ ${name(e.source)} → ${name(e.target)} ｜ ${kindName(e.kind)} ｜ 発売 #${e.releaseId} ${productName(e.product)} ｜ ${e.reason} ｜ ${state.month<e.month+e.delay?"到着予定":"到着時点"} ${date(e.month+e.delay)}`;
 $('receipt-detail').innerHTML=receipt?`<dl><dt>実納品</dt><dd>#${escape(receipt.id)} · ${escape(receipt.shipment??e.shipment)}</dd><dt>年月・店</dt><dd>${escape(date(receipt.month))} · ${escape(name(receipt.to))}</dd><dt>本数</dt><dd>${receipt.count}本</dd><dt>発売回</dt><dd>#${escape(e.releaseId)}</dd><dt>実納品の商品</dt><dd>${escape(productText(receipt.product))}</dd><dt>出来事の商品</dt><dd>${escape(productText(e.product))}</dd><dt>発生確率／抽選値</dt><dd>${decimal(e.probability)} / ${decimal(e.roll)}</dd><dt>伝播強度の相性</dt><dd>${percent(e.strengthFit)}</dd><dt>影響／遅延</dt><dd>${escape(typeof e.impact==='object'?JSON.stringify(e.impact):e.impact)} / ${escape(e.delay)}か月</dd></dl>`:'元の実納品を確認できません。';
 }else{$('event-detail').textContent='この条件・時点では、仮想の出会いはまだ発生していません。';$('receipt-detail').textContent='選択できる出来事はありません。';}
 $('events').innerHTML=[...filtered].reverse().map(e=>`<tr><td><button type="button" class="event-select-button" data-event="${escape(e.id)}" aria-pressed="${e.id===selectedEvent?.id}">${escape(date(e.month))}</button><br><small>${e.generation}代目</small></td><td>${escape(kindName(e.kind))}<br>${escape(name(e.target))}</td><td>${escape(name(e.source))}<br><a href="#receipt-audit" data-receipt-event="${escape(e.id)}">実納品 #${escape(e.receipt)}</a></td><td>発売 #${escape(e.releaseId)}<br><small>${escape(productName(e.product))} · ${escape(e.product?.age)}か月</small></td><td>${escape(e.reason)}</td></tr>`).join('')||'<tr><td colspan="5">出来事なし</td></tr>';
 for(const button of $('events').querySelectorAll('[data-event]'))button.onclick=()=>{selectedEventId=button.dataset.event;const event=events.find(e=>String(e.id)===String(selectedEventId));if(event)$('destination').value=event.target;render();};
 for(const anchor of $('events').querySelectorAll('[data-receipt-event]'))anchor.onclick=()=>{selectedEventId=anchor.dataset.receiptEvent;const event=events.find(e=>String(e.id)===String(selectedEventId));if(event)$('destination').value=event.target;render();$('receipt-audit').open=true;};
 const product=productAt(state);$('product').textContent=`今の発売商品の特徴：${productText(product)}`;
 $('nodes').innerHTML=SHOPS.map(shop=>{const n=state.nodes[shop.id];return `<tr><td>${escape(shop.name)}<br><small>${escape(shop.region)}</small></td><td>${percent(n.root)}</td><td>${percent(n.awareness)}</td><td>${percent(n.interest)}</td><td>${n.received??0}本<br><small>${n.periods??0}時期</small></td><td>${n.memories?.length??0}種類</td></tr>`;}).join('');
 const shop=SHOPS.find(n=>n.id===$('memory-shop').value)??SHOPS[0],node=state.nodes[shop.id],memories=node.memories??[],fit=affinity(shop,product).fit,lastResponse=(state.responses??[]).filter(r=>r.to===shop.id).at(-1);const deliveredReaction=lastResponse?`直近の実納品：発売 #${lastResponse.release}（${date(lastResponse.month)}）、納品時の相性 ${percent(lastResponse.fit)}・馴染み ${percent(lastResponse.recall)}。`:'まだ実納品の反応はありません。';$('reaction').textContent=`${shop.name}と今の商品の相性見込み ${percent(fit)}。${deliveredReaction}`;
 $('memories').innerHTML=memories.map(memory=>`<tr><td>${escape(productName(memory.product))}<br><small>${escape(productText(memory.product))}</small></td><td>${percent(memory.fit)}</td><td>${memory.contacts??0}</td><td>${Number(memory.likedContacts??0).toFixed(1)}</td><td>${escape(date(memory.firstMonth))}<br>${escape(date(memory.lastMonth))}</td></tr>`).join('')||'<tr><td colspan="5">商品記憶なし</td></tr>';
 $('comparison').innerHTML=all.map(({condition,view:v})=>`<tr><td>${escape(condition.id)} ${escape(condition.name)}</td><td>${percent(v.localRoot)}</td><td>${percent(v.townInterest)}</td><td>${percent(v.remoteAwareness)}</td><td>${v.eventCount??0}件</td><td>${escape(date(v.firstRemoteArrival))}</td><td>${v.delivered}本</td></tr>`).join('');
 window.labSnapshot={summary:view,options};
}
for(const id of ['condition','strategy','seed'])$(id).addEventListener('change',()=>{selectedEventId=null;render();});
for(const id of ['destination','memory-shop','event-filter'])$(id).addEventListener('change',()=>{selectedEventId=null;render();});
$('event-select').addEventListener('change',()=>{selectedEventId=$('event-select').value;const event=activeState?.events.find(e=>String(e.id)===String(selectedEventId));if(event)$('destination').value=event.target;render();});
$('month').addEventListener('input',render);
for(const button of document.querySelectorAll('[data-years]'))button.onclick=()=>{$('month').value=Number(button.dataset.years)*12;render();};
$('play').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('play').textContent='▶ 再生';return;}if(Number($('month').value)>=1080)$('month').value=0;timer=setInterval(()=>{if(Number($('month').value)>=1080){$('play').click();return;}$('month').value=Math.min(1080,Number($('month').value)+3);render();},600);$('play').textContent='Ⅱ 停止';};
render();
