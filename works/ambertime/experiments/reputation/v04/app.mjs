import {NODES,SHOPS,EDGES,STRATEGIES,run,summary,affinity,productAt} from './model.mjs';

const $=id=>document.getElementById(id);
const localIds=new Set(SHOPS.map(n=>n.id));
const names=new Map(NODES.map(n=>[n.id,n.name]));
const name=id=>names.get(id)??id;
const percent=n=>Number.isFinite(n)?(n*100).toFixed(1):'—';
const date=month=>Number.isFinite(month)?`${Math.floor(month/12)}年${month%12}月`:'—';
const productText=p=>p?`${p.age}か月 · 刺激 ${percent(p.roughness)} / 原酒香 ${percent(p.character)} / 木香 ${percent(p.wood)} · 価格 ${p.price}`:'—';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ns='http://www.w3.org/2000/svg';
let timer=null,current=null;
const cache=new Map();

$('strategy').innerHTML=STRATEGIES.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('');
$('strategy').value='distributed';
$('memory-shop').innerHTML=SHOPS.map(n=>`<option value="${escape(n.id)}">${escape(n.name)}</option>`).join('');

function isSpace(n){return /space|cosmos|universe/i.test(String(n.level))||/space|cosmos/i.test(n.id)||n.name.includes('宇宙');}
function groupIndex(n,levels){return localIds.has(n.id)?0:1+levels.indexOf(String(n.level));}
function groupName(level,index){if(index===0)return '町 · 店舗ごと';if(/near|region|around/i.test(level))return '周辺地域 · 集約';if(/nation|domestic|country|prefecture/i.test(level))return '他県・全国';if(/over|abroad|foreign|world|international/i.test(level))return '海外 · 集約';if(/space|cosmos|universe/i.test(level))return '宇宙 · 仮想条件';return level;}
function selectedOptions(){const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<1||seed>4294967295){$('seed').setCustomValidity('1〜4294967295の整数を入力してください。');$('seed').reportValidity();return null;}$('seed').setCustomValidity('');const mode=$('mode').value;return {seed,strategy:$('strategy').value,sns:$('sns').value==='on',space:$('space').checked,rootedness:mode!=='rootednessOff',memory:mode!=='memoryOff',bridges:mode!=='bridgesOff',supply:24,quantityScale:1};}
function calculate(options,month){const key=JSON.stringify({...options,strategy:undefined,month});if(cache.has(key))return cache.get(key);const all=STRATEGIES.map(strategy=>{const state=run({...options,strategy:strategy.id},month/12);return {strategy,state,view:summary(state)};});cache.set(key,all);if(cache.size>6)cache.delete(cache.keys().next().value);return all;}

function drawMap(state,options,destination,latest){const visible=NODES.filter(n=>options.space||!isSpace(n));const levels=[...new Set(visible.filter(n=>!localIds.has(n.id)).map(n=>String(n.level)))];const groups=Array.from({length:levels.length+1},()=>[]);for(const n of visible)groups[groupIndex(n,levels)].push(n);
 const positions=new Map();let height=40;
 const groupBounds=groups.map((nodes,index)=>{const start=height,columns=Math.min(2,Math.max(1,nodes.length)),rows=Math.ceil(nodes.length/columns);height+=38;for(let i=0;i<nodes.length;i++){const column=i%columns,row=Math.floor(i/columns);positions.set(nodes[i].id,{x:20+(column+.5)*(370/columns),y:height+row*94+24});}height+=rows*94+22;return {start,end:height,index,level:index===0?'town':levels[index-1]};});
 $('map').setAttribute('viewBox',`0 0 410 ${height+20}`);$('map').replaceChildren();
 function svg(tag,attrs,text,parent=$('map')){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
 for(const group of groupBounds){svg('rect',{x:13,y:group.start,width:384,height:group.end-group.start-5,rx:4,fill:'none',stroke:'#ccd4cb'});svg('text',{x:26,y:group.start+22,class:'group-label'},groupName(group.level,group.index));}
 svg('text',{x:20,y:23,'font-size':13},'蒸留所1号店 → 実際に納品した店から口コミが出る');
 const path=latest?.path??[],highlight=new Set(path.slice(1).map((id,i)=>`${path[i]}:${id}`));
 for(const edge of EDGES){const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)continue;const sns=/sns/i.test(edge.channel);if(sns&&!options.sns)continue;const outside=!localIds.has(edge.from)||!localIds.has(edge.to);if(outside&&!options.bridges)continue;const hit=highlight.has(`${edge.from}:${edge.to}`)||highlight.has(`${edge.to}:${edge.from}`);const lift=Math.min(45,Math.abs(a.x-b.x)*.1);svg('path',{d:`M${a.x} ${a.y} Q${(a.x+b.x)/2+lift} ${(a.y+b.y)/2} ${b.x} ${b.y}`,fill:'none',stroke:hit?'#ae673e':sns?'#8c9aa4':'#bdc8bf','stroke-width':hit?4:1.3,'stroke-dasharray':sns?'5 5':'none'});}
 for(const node of visible){const p=positions.get(node.id),value=state.nodes[node.id],awareness=value?.awareness??0,interest=value?.interest??0,selected=node.id===destination;const g=svg('g',{class:'node',tabindex:0,role:'button','aria-label':`${node.name}の口コミ経路`});svg('circle',{cx:p.x,cy:p.y,r:12,fill:interest>=.008?'#d5ac4d':awareness>=.10?'#7aa8ba':'#fafbf5',stroke:selected?'#263b3b':'#839b8c','stroke-width':selected?3:1},undefined,g);if((value?.received??0)>0)svg('circle',{cx:p.x,cy:p.y,r:3.5,fill:'#263b3b'},undefined,g);const label=svg('text',{x:p.x,y:p.y+28,'text-anchor':'middle',class:'node-label'});const parts=Array.from(node.name);for(let i=0;i<parts.length;i+=9)svg('tspan',{x:p.x,dy:i?15:0},parts.slice(i,i+9).join(''),label);svg('text',{x:p.x,y:p.y+60,'text-anchor':'middle',class:'node-value'},`${percent(awareness)} / ${percent(interest)}`);const select=()=>{$('destination').value=node.id;render();};g.onclick=select;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};}
}

function render(){const options=selectedOptions();if(!options)return;const month=Number($('month').value),all=calculate(options,month),selected=all.find(x=>x.strategy.id===options.strategy)??all[0],state=selected.state,view=selected.view;current={state,view,options};
 const visible=NODES.filter(n=>options.space||!isSpace(n)),destinationBefore=$('destination').value;const destinationIds=new Set(visible.map(n=>n.id));$('destination').innerHTML=visible.map(n=>`<option value="${escape(n.id)}">${escape(n.name)}</option>`).join('');$('destination').value=destinationIds.has(destinationBefore)?destinationBefore:visible.at(-1)?.id;
 const destination=$('destination').value,arrivals=state.arrivals.filter(a=>a.to===destination),latest=arrivals.filter(a=>(a.path?.length??0)>1).at(-1)??arrivals.at(-1);
 $('time').value=`${date(month)} · ${view.generation}代目`;
 $('totals').textContent=`供給 ${view.produced}本 · 実納品 ${view.delivered}本 · 在庫 ${view.inventory}本 · 取引した店 ${view.trading.length}店`;
 $('measures').innerHTML=`<div><dt>地元の定着</dt><dd>${percent(view.localRoot)}</dd></div><div><dt>町の認知</dt><dd>${percent(view.localAwareness)}</dd></div><div><dt>外部の認知</dt><dd>${percent(view.remoteAwareness)}</dd></div>`;
 const handovers=view.handovers??state.handovers??[];$('generation').textContent=handovers.length?(handovers.every(h=>h.preserved)?`${handovers.length}回の世代交代。取引と商品記憶を継承。`:'世代交代時の継承状態を確認してください。'):'世代交代前。取引と商品記憶を次代へ引き継ぎます。';
 document.querySelectorAll('[data-years]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.years)*12===month));
 drawMap(state,options,destination,latest);
 if(latest){const receipt=state.receipts.find(r=>r.id===latest.receipt)??state.receipts[latest.receipt];$('route').textContent=`${latest.path.map(name).join(' → ')} ｜ ${date(latest.month)}到着 ｜ 実納品 #${latest.receipt} ${receipt?`${receipt.count}本・${date(receipt.month)}`:''} ｜ 情報量 ${latest.strength.toFixed(4)}・相性 ${percent(latest.fit)}${latest.channel?`・${latest.channel}`:''}`;}else $('route').textContent='この地点へ届いた口コミはまだありません。';
 $('arrival-list').innerHTML=arrivals.slice(-6).reverse().map(a=>`<li>${escape(date(a.month))}：${escape(a.path.map(name).join(' → '))} · 納品 #${escape(a.receipt)} · 情報量 ${a.strength.toFixed(4)}</li>`).join('')||'<li>到着なし</li>';
 const product=productAt(state);$('product').textContent=`今の発売商品の特徴：${productText(product)}`;
 $('nodes').innerHTML=SHOPS.map(shop=>{const n=state.nodes[shop.id];return `<tr><td>${escape(shop.name)}<br><small>${escape(shop.region)}</small></td><td>${percent(n.root)}</td><td>${percent(n.awareness)}</td><td>${percent(n.interest)}</td><td>${n.received??0}本<br><small>${n.periods??0}時期</small></td><td>${n.memories?.length??0}種類</td></tr>`;}).join('');
 const shop=SHOPS.find(n=>n.id===$('memory-shop').value)??SHOPS[0],node=state.nodes[shop.id],memories=node.memories??[],fit=affinity(shop,product).fit,lastResponse=(state.responses??[]).filter(r=>r.to===shop.id).at(-1);const deliveredReaction=lastResponse?`直近の実納品：発売 #${lastResponse.release}（${date(lastResponse.month)}）、納品時の相性 ${percent(lastResponse.fit)}・馴染み ${percent(lastResponse.recall)}。`:'まだ実納品の反応はありません。';$('reaction').textContent=`${shop.name}と今の商品の相性見込み ${percent(fit)}。${deliveredReaction}${!options.memory?'商品記憶を外した比較です。':memories.length?'過去に実納品した特徴を下に表示します。':'まだ実納品の記憶はありません。'}`;
 $('memories').innerHTML=memories.map(memory=>`<tr><td>${escape(({young:'若い商品',standard:'標準の商品',long:'長期熟成品'})[memory.product?.kind]??'過去の商品')}<br><small>${escape(productText(memory.product))}</small></td><td>${percent(memory.fit)}</td><td>${memory.contacts??0}</td><td>${Number(memory.likedContacts??0).toFixed(1)}</td><td>${escape(date(memory.firstMonth))}<br>${escape(date(memory.lastMonth))}</td></tr>`).join('')||'<tr><td colspan="5">商品記憶なし</td></tr>';
 $('comparison').innerHTML=all.map(({strategy,view:v})=>`<tr><td>${escape(strategy.name)}</td><td>${percent(v.localRoot)}</td><td>${percent(v.localAwareness)}</td><td>${percent(v.remoteAwareness)}</td><td>${v.remoteKnown.length}地点<br><small>${escape(v.remoteKnown.map(name).join('、')||'—')}</small></td><td>${v.delivered}本</td></tr>`).join('');
 window.labSnapshot={summary:view,options};
}
for(const id of ['strategy','seed','sns','mode','space','destination','memory-shop'])$(id).addEventListener('change',render);
$('month').addEventListener('input',render);
for(const button of document.querySelectorAll('[data-years]'))button.onclick=()=>{$('month').value=Number(button.dataset.years)*12;render();};
$('play').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('play').textContent='▶ 再生';return;}if(Number($('month').value)>=1080)$('month').value=0;timer=setInterval(()=>{if(Number($('month').value)>=1080){$('play').click();return;}$('month').value=Math.min(1080,Number($('month').value)+3);render();},600);$('play').textContent='Ⅱ 停止';};
render();
