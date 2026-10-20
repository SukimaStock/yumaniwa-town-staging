import {DEFAULT_SEED,MODES,RECIPES,NODES,EDGES,createSession,view,quote,deliver,acceptOffer,declineOffer,advance,bottleCurrent,replaceRecipe} from './model.mjs?v=0.1';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toFixed(2),money=n=>`£${number(n)}`;
const ageName=n=>n<12?`${n}か月`:`${Math.floor(n/12)}年${n%12?`${n%12}か月`:''}`;
const monthName=n=>`実験${Math.floor(n/12)+1}年目${n%12+1}月`;
const statusName=id=>({unknown:'まだ知られていない',known:'知られている',offered:'申し出あり',accepted:'受諾済み',handling:'取扱い中'})[id]??id;
const axes=[['roughness','シゲキ',1],['character','原酒のかおり',1],['wood','木のかおり',1.35]];
let setup={seed:DEFAULT_SEED,mode:'spread',recipe:'aroma',origin:'normal',initialAge:null,initialCount:20};
let session=createSession(setup),destination=NODES[0].id,releaseId=null,deliveryCount=null,bottleCount=null;
const options=rows=>rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name??x.label??x.id)}</option>`).join('');
$('mode').innerHTML=options(MODES);$('recipe').innerHTML=options(RECIPES);$('next-recipe-choice').innerHTML=options(RECIPES);
$('origin').innerHTML+='<optgroup label="開始地点の比較">'+options(NODES.filter(n=>n.max>=20))+'</optgroup>';
function syncControls(){for(const [key,id] of [['seed','seed'],['mode','mode'],['recipe','recipe'],['origin','origin'],['initialAge','initial-age'],['initialCount','initial-count']])$(id).value=setup[key]??'';}
syncControls();
function profileHtml(profile){return axes.map(([key,label,max])=>`<div class="axis"><label>${label}</label><meter min="0" max="${max}" value="${profile[key]}" aria-label="${label}">${number(profile[key])}</meter><span>${number(profile[key])}</span></div>`).join('');}
function drawNetwork(nodes){
 const positions=new Map(NODES.map((n,i)=>[n.id,{x:i%2?450:150,y:60+Math.floor(i/2)*140}]));
 const edges=EDGES.map(e=>Array.isArray(e)?{from:e[0],to:e[1]}:e).sort((a,b)=>Number(a.from===destination)-Number(b.from===destination));
 $('routes').innerHTML='<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 9 5 0 9" fill="none" stroke="#52717d" stroke-width="2"/></marker><marker id="arrow-selected" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 9 5 0 9" fill="none" stroke="#e5bd69" stroke-width="2"/></marker></defs>'+edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return '';const dx=b.x-a.x,dy=b.y-a.y,t=Math.min(dx?117/Math.abs(dx):Infinity,dy?44/Math.abs(dy):Infinity),active=e.from===destination;return `<path class="route${active?' selected':''}" d="M${a.x+dx*t} ${a.y+dy*t} L${b.x-dx*t} ${b.y-dy*t}" marker-end="url(#${active?'arrow-selected':'arrow'})"/>`;}).join('');
 $('nodes').innerHTML=nodes.map(n=>{const pos=positions.get(n.id);return `<button class="node" data-node="${esc(n.id)}" data-status="${esc(n.status)}" aria-pressed="${n.id===destination}" style="left:${pos.x/6}%;top:${pos.y/4}%" aria-label="${esc(n.name)} ${esc(statusName(n.status))}">${esc(n.name)}<small>${esc(statusName(n.status))}${n.offer&&n.status!=='offered'?' · 申し出':''}</small></button>`;}).join('');
}
function renderQuote(){
 const v=view(session),release=v.releases.find(r=>r.id===releaseId),base=quote(session,destination,releaseId);
 if(deliveryCount===null)deliveryCount=base.min??base.quantities?.[0]??1;
 const q=quote(session,destination,releaseId,deliveryCount);
 $('count').value=deliveryCount;$('count').min=base.min??1;$('count').max=base.max??0;$('count').disabled=!release||base.max<1;
 $('quote').textContent=Number.isFinite(q.unitPrice)?`買取 ${money(q.unitPrice)} / 本` : '';
 $('quote-reason').textContent=q.reason??'';$('deliver').disabled=!q.ok;
}
function selectedOffer(){return view(session).nodes.find(n=>n.id===destination)?.offerId;}
const nodeName=id=>NODES.find(n=>n.id===id)?.name??id;
function eventText(e){
 if(e.kind==='bottle')return `たる No.${e.parentSerial} · ${ageName(e.age)}を${e.count}本に残した`;
 if(e.kind==='delivery')return `${nodeName(e.nodeId)}へ${e.count}本納品`;
 if(e.kind==='spread')return e.route.map(nodeName).join(' → ');
 if(e.kind==='offer')return `${nodeName(e.nodeId)}：${e.reason}`;
 if(e.kind==='accept')return `${nodeName(e.nodeId)}の${e.offerKind==='repeat'?'再注文':'申し出'}を受けた`;
 if(e.kind==='decline')return `${nodeName(e.nodeId)}の申し出を見送った`;
 if(e.kind==='fulfilled-repeat')return `${nodeName(e.nodeId)}の再注文に納品`;
 if(e.kind==='replace')return `たる No.${e.parentSerial}を仕込み：${RECIPES.find(r=>r.id===e.recipe)?.name??e.recipe}`;
 return e.text??e.reason??'';
}
function render(){
 const v=view(session);if(!v.nodes.some(n=>n.id===destination))destination=v.nodes[0]?.id;
 if(!v.releases.some(r=>r.id===releaseId))releaseId=v.releases.at(-1)?.id??null;
 $('month').textContent=monthName(v.month);
 $('release').innerHTML=v.releases.map(r=>`<option value="${r.id}">${esc(r.label)} · ${ageName(r.age)} · 残り${r.stock}本</option>`).join('');$('release').value=releaseId??'';$('release').disabled=!v.releases.length;
 const release=v.releases.find(r=>r.id===releaseId);$('release-info').textContent=release?`ビン詰め ${release.originalCount}本 · 残り ${release.stock}本`:'届けるビンはまだありません。';$('release-profile').innerHTML=release?profileHtml(release.profile):'';
 drawNetwork(v.nodes);
 const node=v.nodes.find(n=>n.id===destination);$('destination-name').textContent=node?.name??'';$('destination-status').textContent=node?statusName(node.status)+(node.offer&&node.status!=='offered'?' · 申し出あり':''):'';$('destination-memory').textContent=node?.memory?.text??'';$('destination-reason').textContent=node?.reason??'';
 $('destination-hint').textContent=node?`${node.hint} 一度に${node.min}本から、月${node.max}本まで。`:'';
 $('destination-received').textContent=node?.received?`納品 ${node.received}本 · ${node.memory.months}か月に納品 · 今月あと${node.monthlyRemaining}本`:'';
 const route=node?.evidence?.filter(e=>e.route.length>1).sort((a,b)=>(b.month??0)-(a.month??0))[0];$('destination-route').textContent=route?route.route.map(nodeName).join(' → '):'';
 $('offer-actions').hidden=!node?.offerId;renderQuote();
 const c=v.cask;$('cask').innerHTML=c?`<p>たる No.${c.serial??1} · ${ageName(c.age)} · ${c.type==='bourbon'?'バーボン':'リフィル'}<br>${number(c.litres)} L · ${c.bottles}本まで</p><div class="profile">${profileHtml(c)}</div>`:'<p>たるは空いています。</p>';
 if(bottleCount===null)bottleCount=c?Math.min(5,c.bottles):0;
 $('bottle-count').value=bottleCount;$('bottle-count').max=c?.bottles??0;$('bottle-count').disabled=!c;
 const valid=!!c&&Number.isInteger(bottleCount)&&bottleCount>=1&&bottleCount<=c.bottles;
 $('bottle-quote').textContent=valid?`${bottleCount}本をビンに残す`:'';$('bottle').disabled=!valid;$('next-recipe').hidden=!!c;$('cask-reason').textContent=c?'残したビンの風味は、その時点で固定されます。':'次の製法を選べます。';
 const events=(v.events??[]).filter(e=>e.kind!=='month');$('event-count').textContent=events.length?`(${events.length})`:'';$('events').innerHTML=events.length?[...events].reverse().map(e=>`<article class="event"><time>${monthName(e.month)}</time><p>${esc(eventText(e))}</p></article>`).join(''):'<p class="note">まだ記録はありません。</p>';
 renderBaseline(v.baseline);
}
function renderBaseline(baseline){
 const rows=baseline.shops.filter(row=>row.applicable);
 $('baseline').innerHTML=`<p class="note">自家販売 ${baseline.retailSold}本 · ${esc(baseline.label)}</p>`+rows.map(row=>`<p class="baseline-row">${esc(nodeName(row.id))}<br>実績の条件：${row.evidence.eligible?'達成':'未達'}<br>${esc(row.productCondition||'風味と月齢は条件内')}</p>`).join('')+'<p class="note">実績と風味の条件を参照します。申し出そのものの再現ではありません。</p>';
}
function run(action,message){try{session=action();render();$('message').textContent=message;return true;}catch(error){$('message').textContent=error.message;return false;}}
function reset(){
 const next={seed:Number($('seed').value),mode:$('mode').value,recipe:$('recipe').value,origin:$('origin').value,initialAge:$('initial-age').value===''?null:Number($('initial-age').value),initialCount:Number($('initial-count').value)};
 if(run(()=>{const fresh=createSession(next);setup=next;releaseId=null;destination=NODES[0].id;deliveryCount=null;bottleCount=null;return fresh;},'同じ条件の初期状態に戻しました。'))for(const id of ['delivery-reflection','reflection-route','reflection-repeat','reflection-next'])$(id).value='';
 syncControls();
}
$('nodes').addEventListener('click',event=>{const button=event.target.closest('[data-node]');if(!button)return;destination=button.dataset.node;deliveryCount=null;render();$('nodes').querySelector(`[data-node="${destination}"]`)?.focus({preventScroll:true});});
$('release').addEventListener('change',()=>{releaseId=Number($('release').value);deliveryCount=null;render();});
$('count').addEventListener('input',()=>{deliveryCount=Number($('count').value);const q=quote(session,destination,releaseId,deliveryCount);$('quote-reason').textContent=q.reason??'';$('deliver').disabled=!q.ok;});
$('deliver').addEventListener('click',()=>{if(run(()=>deliver(session,destination,releaseId,deliveryCount,{reflection:$('delivery-reflection').value}),'ビンを届けました。'))$('delivery-reflection').value='';});
$('advance1').addEventListener('click',()=>run(()=>advance(session,1),'1か月進めました。'));
$('advance3').addEventListener('click',()=>run(()=>advance(session,3),'3か月進めました。'));
$('accept').addEventListener('click',()=>run(()=>acceptOffer(session,selectedOffer()),'申し出を受けました。納品先として選べます。'));
$('decline').addEventListener('click',()=>run(()=>declineOffer(session,selectedOffer()),'今回は見送ります。時間は進められます。'));
$('bottle-count').addEventListener('input',()=>{bottleCount=Number($('bottle-count').value);const c=view(session).cask,valid=!!c&&Number.isInteger(bottleCount)&&bottleCount>=1&&bottleCount<=c.bottles;$('bottle-quote').textContent=valid?`${bottleCount}本をビンに残す`:'';$('bottle').disabled=!valid;});
$('bottle').addEventListener('click',()=>run(()=>{const next=bottleCurrent(session,bottleCount);bottleCount=null;releaseId=view(next).releases.at(-1)?.id??null;deliveryCount=null;return next;},'今の風味をビンに残しました。'));
$('replace').addEventListener('click',()=>run(()=>{const next=replaceRecipe(session,$('next-recipe-choice').value);bottleCount=null;return next;},'次のたるを仕込みました。'));
for(const id of ['mode','recipe','seed','origin','initial-age','initial-count'])$(id).addEventListener('change',reset);
$('reset').addEventListener('click',reset);
$('export').addEventListener('click',()=>{const notes=Object.fromEntries(['route','repeat','next'].map(key=>[key,$('reflection-'+key).value]));notes.pendingDelivery=$('delivery-reflection').value;const data=JSON.stringify({format:'ambertime-reputation-session/0.1',...session,initialSetup:setup,notes},null,2)+'\n',url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-reputation-${setup.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent='この実験の記録と感想を書き出しました。';});
render();
