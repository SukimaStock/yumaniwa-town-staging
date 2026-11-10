import {currentView,compactView} from './memory.mjs';
import {packageArt,packageFamily} from '../ambertime/release-package.mjs';
import {sceneViews,drawScene} from '../ambertime/recall/pixel-scene.mjs';
import {renderMap} from '../ambertime/experiments/world-map/v01/map.mjs';
import {mapShopPositions,STAGES} from '../ambertime/world-map-view.mjs';
import {dialogueShopName} from '../ambertime/shop-dialogue.mjs';
import {monthLabel} from '../ambertime/model.mjs';
const mode=new URLSearchParams(location.search).get('mode')==='current'?'current':'compact';
const root=document.getElementById('view');let view=null,tab='shops',shopIndex=0,releaseIndex=0,eraIndex=0,sceneIndex=0,stage=3,memoryIndex=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=n=>Number.isInteger(n)?monthLabel(n):'記録なし';
const family=p=>({smoke:'スモーキー',fruit:'果実',grain:'穀物',body:'厚み',mixed:'複雑'})[packageFamily(p)]??'風味の記録なし';
const number=n=>Number.isFinite(n)?n.toLocaleString():'記録なし';
const labelKind=k=>({'delivery':'納品','sale':'販売','bottling':'瓶詰め','fill':'樽詰め','shop-start':'初取引','arrival':'評判が届いた','inquiry':'問い合わせ','visit':'訪問','handover':'世代交代'})[k]??k;
function canvasScene(scene){const c=root.querySelector('canvas');if(!c)return;drawScene(c.getContext('2d'),sceneViews({scenes:[scene]})[0]);}
function options(items,index,selectId,label){return `<label>${label}<select id="${selectId}">${items.map((x,i)=>`<option value="${i}" ${index===i?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;}
function select(id,callback){root.querySelector('#'+id)?.addEventListener('change',e=>{callback(Number(e.target.value));render();});}
function releaseButtons(ids){return `<div class="bottles">${ids.map(id=>{const r=view.ledger.releases.find(r=>r.id===id);return r?`<button class="bottle" data-release="${esc(id)}">${packageArt(r.profile,r.brand)}<span>${esc(date(r.bottledMonth))}</span></button>`:'';}).join('')}</div>`;}
function bindReleases(){for(const b of root.querySelectorAll('[data-release]'))b.onclick=()=>{releaseIndex=view.ledger.releases.findIndex(r=>String(r.id)===b.dataset.release);tab='ledger';render();};}
function rows(items){return `<ol>${items.map(x=>`<li><time>${esc(date(x.month))}</time> ${esc(x.label??x.text??x.sentence??labelKind(x.kind??x.type))}${x.shopId?' · '+esc(dialogueShopName(x.shopId)):''}${x.regionId?' · '+esc(view.map.regions.find(r=>r.id===x.regionId)?.name??x.regionId):''}${x.releaseId!=null?' · '+esc(date(view.ledger.releases.find(r=>r.id===x.releaseId)?.bottledMonth))+'発売':''}${x.count!=null?' · '+esc(x.count)+'本':''}</li>`).join('')}</ol>`;}
function shops(){
 if(!view.shops.length){root.innerHTML='<h1>取扱店</h1><p class="empty">まだ取扱店はありません。</p>';return;}
 shopIndex=Math.min(shopIndex,view.shops.length-1);const s=view.shops[shopIndex];
 root.innerHTML=options(view.shops.map(s=>s.name),shopIndex,'shop','取扱店')+'<canvas class="art" width="120" height="72" aria-label="店先の情景"></canvas>'+`<blockquote>${esc(s.remark||'いらっしゃいませ。')}</blockquote><dl><dt>取扱開始</dt><dd>${esc(date(s.startMonth))}</dd><dt>最近の納品</dt><dd>${esc(date(s.lastMonth))}</dd><dt>これまでに</dt><dd>${number(s.deliveryCount)}回・${number(s.bottles)}本</dd></dl>`;
 const memories=s.memories??[];if(memories.length){memoryIndex=Math.min(memoryIndex,memories.length-1);const d=memories[memoryIndex];root.insertAdjacentHTML('beforeend',options(memories.map(d=>`${date(view.ledger.releases.find(r=>r.id===d.releaseId)?.bottledMonth)} · ${d.text}`),memoryIndex,'memory','この時点で話せる一言の例')+`<blockquote>${esc(d.text)}</blockquote>`+releaseButtons(d.releaseId!=null?[d.releaseId]:[]));select('memory',n=>memoryIndex=n);}
 else root.insertAdjacentHTML('beforeend','<p class="subtle">過去の酒について話す根拠は、まだありません。</p>');
 root.insertAdjacentHTML('beforeend',releaseButtons((s.releases??[]).filter(id=>!memories.some(d=>d.releaseId===id))));
 if(mode==='current'&&view.details?.deliveries)root.insertAdjacentHTML('beforeend',`<details><summary>納品明細</summary><div class="current-lines">${rows(view.details.deliveries.filter(d=>(d.shopId??'town-liquor')===s.shopId).map(d=>({...d,kind:'delivery'})))}</div></details>`);
 canvasScene({month:view.month,sentence:'',event:{kind:'delivery',ids:{shopId:s.shopId}}});select('shop',n=>{shopIndex=n;memoryIndex=0;});bindReleases();
}
function maps(){
 const m=view.map;stage=Math.max(1,Math.min(stage,m.max));
 root.innerHTML=`<h1>評判の広がり</h1><nav><button id="near" ${stage===1?'disabled':''}>近くへ</button><span>${esc(STAGES[stage-1])}</span><button id="far" ${stage===m.max?'disabled':''}>遠くへ</button></nav><canvas class="art map-art" width="144" height="144" aria-label="現在到達している範囲の地図"></canvas><div id="regions"></div>`;
 const ctx=root.querySelector('canvas').getContext('2d');renderMap(ctx,stage);const marker=(x,y)=>{ctx.fillStyle='#27353b';ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle='#e6d49e';ctx.fillRect(x-2,y-2,4,4);};
 for(const [id,xy] of Object.entries(mapShopPositions(stage)))if(m.activeShops.includes(id))marker(...xy);
 if(stage===4&&m.reached.near)marker(90,42);if(stage===5&&m.reached.national)marker(72,72);
 const regions=m.regions.filter(r=>r.firstArrivalMonth!=null||r.inquiry||r.visit||r.trading);
 root.querySelector('#regions').innerHTML=regions.length?regions.map(r=>`<div class="entry"><strong>${esc(r.name)}</strong><p class="meta">${r.firstArrivalMonth!=null?'初めて評判が届いた '+esc(date(r.firstArrivalMonth)):'評判到達の記録なし'}${r.inquiry?' · 問い合わせあり':''}${r.visit?' · 訪問あり':''}${r.trading?' · 取扱いあり':''}</p>${r.lastEvent?`<p>${esc(date(r.lastEvent.month))} ${esc(labelKind(r.lastEvent.kind))}</p>`:''}<p class="subtle">現在の評判 ${number(r.awareness)} ／ 関心 ${number(r.interest)}</p></div>`).join(''):'<p class="empty">まだ評判が届いた地域はありません。</p>';
 if(mode==='current'&&view.details?.arrivals)root.insertAdjacentHTML('beforeend',`<details><summary>口コミ到達の履歴</summary><div class="current-lines">${rows(view.details.arrivals.filter(e=>e.channel!=='direct').map(e=>({...e,kind:e.type??'arrival'})))}</div></details>`);
 root.querySelector('#near').onclick=()=>{stage--;render();};root.querySelector('#far').onclick=()=>{stage++;render();};
}
function ledger(){
 const releases=view.ledger.releases;
 root.innerHTML='<h1>過去の酒</h1>';
 if(releases.length){releaseIndex=Math.max(0,Math.min(releaseIndex,releases.length-1));const r=releases[releaseIndex];root.insertAdjacentHTML('beforeend',options(releases.map(r=>`${date(r.bottledMonth)} · ${r.name}`),releaseIndex,'release','発売した酒')+`<div class="entry">${r.profile?packageArt(r.profile,r.brand):'<p class="meta">当時のパッケージは記録なし</p>'}<p>${esc(r.name)}</p><p>${esc(date(r.bottledMonth))}発売<br>${number(r.age)}か月熟成 · ${esc(family(r.profile))}</p><p class="meta">${r.sourceGeneration!=null?'第'+esc(r.sourceGeneration)+'世代の酒':'造った世代の記録なし'}</p></div>`+`<p class="subtle">${r.recipe?'製法の記録あり。次の仕込みの手がかりにできます。':'製法の記録なし。同じ味を再現できるとは限りません。'}</p>`);select('release',n=>releaseIndex=n);}
 else root.insertAdjacentHTML('beforeend','<p class="empty">まだ発売した酒はありません。</p>');
 if(mode==='current'&&view.details?.ledgerEvents)root.insertAdjacentHTML('beforeend',`<details><summary>製造・取引の全記録</summary><div class="current-lines">${rows(view.details.ledgerEvents)}</div></details>`);
 root.insertAdjacentHTML('beforeend',`<h2>最近の製造・納品</h2>${rows(view.ledger.recent)}<h2>歩み</h2>${rows(view.ledger.milestones)}<details><summary>世代ごとの記録</summary><pre>${esc(JSON.stringify(view.ledger.generations,null,2))}</pre></details>`);
}
function recalls(){
 if(!view.recalls.length){root.innerHTML='<h1>世代回想</h1><p class="empty">まだ確定した回想はありません。</p>';return;}
 eraIndex=Math.min(eraIndex,view.recalls.length-1);const era=view.recalls[eraIndex];sceneIndex=Math.min(sceneIndex,Math.max(0,era.scenes.length-1));const s=era.scenes[sceneIndex];
 root.innerHTML=options(view.recalls.map(r=>'第'+r.generation+'世代'),eraIndex,'era','確定した回想');
 if(!s){root.insertAdjacentHTML('beforeend','<p class="empty">この代に選ばれた場面はありません。</p>');select('era',n=>{eraIndex=n;sceneIndex=0;});return;}
 root.insertAdjacentHTML('beforeend',`<canvas class="art" width="120" height="72" aria-label="回想の情景"></canvas><div class="caption"><p class="meta">${esc(date(s.month))}</p><p>${esc(s.sentence)}</p></div><nav class="recall-nav"><button id="previous" ${sceneIndex===0?'disabled':''}>戻る</button><span>${sceneIndex+1} / ${era.scenes.length}</span><button id="next" ${sceneIndex===era.scenes.length-1?'disabled':''}>次へ</button></nav><p class="notice">${mode==='compact'?'この代の終わりに確定した文章と情景を再生しています。候補の再選出はしません。':'全候補とその参照関係から、既存の選出処理で比較しています。'}</p>`);
 canvasScene(s);select('era',n=>{eraIndex=n;sceneIndex=0;});root.querySelector('#previous').onclick=()=>{sceneIndex--;render();};root.querySelector('#next').onclick=()=>{sceneIndex++;render();};
}
function render(){if(!view)return;({shops,maps,ledger,recalls}[tab==='map'?'maps':tab])();}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='small-memory-input')return;view=mode==='compact'?compactView(e.data.payload):currentView(e.data.payload);tab=e.data.tab;render();});
