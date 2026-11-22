import {DEFAULT_CONFIG,SHOP_DEFINITIONS,runComparison} from './model.mjs?perf=v06';

const form=document.querySelector('#conditions'),results=document.querySelector('#results');
const status=document.querySelector('#status'),error=document.querySelector('#error');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(value,digits=0)=>Number.isFinite(value)?value.toLocaleString('ja-JP',{maximumFractionDigits:digits}):'—';
const cash=value=>Number.isFinite(value)?`£${number(value,2)}`:'—';
const definitions=Array.isArray(SHOP_DEFINITIONS)?SHOP_DEFINITIONS:Object.values(SHOP_DEFINITIONS);
const name=id=>definitions.find(s=>s.id===id)?.name??worldEvidence?.prices?.nativeContext?.opening?.contexts.find(c=>c.partnerId===id)?.partnerName??({'bar':'路地裏のバー','town-liquor':'町の酒店',supermarket:'町のスーパー',retail:'自家販売'}[id]??id);
let output=null,view='strategies',busy=false,worldEvidence=null,worldLoading=false;

form.elements.focus.innerHTML=['bar','town-liquor','supermarket'].map(id=>`<option value="${id}">${esc(name(id))}</option>`).join('');
function fillDefaults(){for(const [key,value] of Object.entries(DEFAULT_CONFIG))if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;}
function readConfig(){return Object.fromEntries(Object.keys(DEFAULT_CONFIG).map(key=>[key,['focus','method'].includes(key)?form.elements.namedItem(key).value:Number(form.elements.namedItem(key).value)]));}
function metrics(rows){return `<dl class="metrics">${rows.map(([key,value])=>`<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;}
function evidence(events=[]){
  return `<details><summary>計算時の理由・イベント（${events.length}件）</summary>${events.length?`<ol class="event-list">${events.map(e=>`<li><time>${number(e.month)}か月目${e.shopId?`・${esc(name(e.shopId))}`:''}</time><br>${esc(e.message??e.type)}<details><summary>条件を確認</summary><pre>${esc(JSON.stringify(e.conditions??e,null,2))}</pre></details></li>`).join('')}</ol>`:'<p class="empty">この期間にはイベントがありません。</p>'}</details>`;
}
function stageLabel(value){return typeof value==='string'?value:({0:'取扱開始',1:'取引の実績あり',2:'馴染みの店',3:'大切な取引先'}[value]??`段階 ${value??0}`);}
function shopResult(id,s){
  const r=s.relation??{},c=s.current??{},region=s.region??{};
  const stages=[['到達','reached'],['関心','interest'],['問い合わせ','inquiry'],['訪問','visit'],['取扱の申し出','offer'],['契約','contract']];
  return `<section class="shop"><h3>${esc(name(id))}</h3>${metrics([['実売',`${number(s.paidBottles)}本`],['実売のあった月',`${number(s.activeMonths)}か月`]])}
    <p><span class="tag candidate">候補</span>${esc(stageLabel(r.stage))}・関係 ${number(r.score,2)}${r.targetReached?'／点数目標に到達':''}</p>
    <p class="progress">量 ${number(r.volume,2)} ＋ 継続 ${number(r.continuity,2)}</p>
    <p><span class="tag candidate">${esc(s.routeName??'候補の接点')}</span>${stages.map(([label,key])=>`${label} ${region[key]?'✓':'—'}`).join(' ／ ')}</p>
    <details><summary>現行の口コミ計算と比較</summary>${metrics([['関係root',number(c.root,4)],['認知',number(c.awareness,4)],['関心',number(c.interest,4)],['問い合わせ',`${number(c.inquiries)}件`],['訪問',`${number(c.visits)}件`]])}<p class="note">現行のrootと候補の関係値は別の尺度です。候補の接点も、現行本編の契約成立を表しません。</p></details>
  </section>`;
}
function snapshotsTable(snapshots=[]){
  return `<div class="table-wrap"><table><caption>同じ資源からの時間比較</caption><thead><tr><th scope="col">経過</th><th scope="col">売れた本数</th><th scope="col">売上</th><th scope="col">手元</th><th scope="col">棚</th></tr></thead><tbody>${snapshots.map(s=>`<tr><th scope="row">${number(s.month)}か月</th><td>${number(s.sold)}本</td><td>${cash(s.revenue)}</td><td>${number(s.hand)}本</td><td>${number(Object.values(s.shelves??{}).reduce((a,b)=>a+b,0))}本</td></tr>`).join('')}</tbody></table></div>`;
}
function townEvents(events=[]){
  const shown=events.slice(-20);
  return `<details><summary>現行計算の到達・反応（全${events.length}件中、直近${shown.length}件）</summary><div class="table-wrap"><table><thead><tr><th>月</th><th>出来事・原因</th><th>出発</th><th>到着</th></tr></thead><tbody>${shown.map(e=>`<tr><td>${number(e.month)}</td><td>${esc({arrival:'到達',interest:'関心',inquiry:'問い合わせ',visit:'訪問',memory:'記憶',referral:'紹介',shipment:'実売',release:'発売'}[e.type]??e.type)}<details><summary>この結果の根拠</summary><p>記録 ${esc(e.id)} ／ 原因 ${esc(e.sourceId??'なし')}</p><pre>${esc(JSON.stringify({event:{id:e.id,type:e.type,month:e.month,sourceId:e.sourceId,from:e.from,to:e.to,reason:e.reason},sources:e.sources??[],trials:e.trials??[]},null,2))}</pre></details></td><td>${esc(e.from??'—')}</td><td>${esc(e.to??'—')}</td></tr>`).join('')}</tbody></table></div><p class="note">現行モデルから返された事実です。各結果から、その原因の記録と対応する抽選だけを確認できます。probabilityは確率、rollは抽選値です。到達・問い合わせ・訪問は契約とは別です。</p></details>`;
}
function trials(s){return `<details><summary>現行口コミの確率と乱数（全${number(s.currentTownTrialCount)}件中、直近${s.currentTownTrials?.length??0}件）</summary><p class="note">probabilityが確率、rollがseedから決まる抽選値、sourceIdが原因の記録です。skipは抽選を行わなかった理由を示します。</p><pre>${esc(JSON.stringify(s.currentTownTrials??[],null,2))}</pre></details>`;}
function regions(items=[]){return `<section class="shop"><h3>候補の地域への接点</h3><p class="note">同じ地域へ複数の店から届いても、地域数は重複して数えません。地域と条件は仮置きです。</p>${items.map(r=>`<p><strong>${esc(r.name)}</strong><br>${[['到達','reached'],['関心','interest'],['問い合わせ','inquiry'],['訪問','visit'],['取扱の相談','offer'],['契約','contract']].map(([label,key])=>`${label} ${r[key]?'✓':'—'}`).join(' ／ ')}</p>`).join('')}</section>`;}
function targetSnapshot(s){const t=s.targetSnapshot;if(view!=='goal')return '';return `<section class="shop"><h3>目標値に達した時点</h3>${t?metrics([['経過',`${number(t.month)}か月`],['集中店での実売',`${number(t.sold)}本`],['実売のあった月',`${number(t.activeMonths)}か月`],['売上',cash(t.revenue)],['手元',`${number(t.hand)}本`],['棚の残数',`${number(Object.values(t.shelves??{}).reduce((a,b)=>a+b,0))}本`],['関係値',number(t.score,2)]]):'<p class="empty">比較期間内には到達していません。</p>'}<p class="note">使用した本数と待った時間を比較します。売上から費用は差し引いていません。</p></section>`;}
function strategyCard(s){
  const shelves=Object.values(s.shelves??{}).reduce((a,b)=>a+b,0);
  return `<article class="strategy"><h2>${esc(s.label)}</h2>${metrics([['販売本数',`${number(s.sold)}本`],['売上',cash(s.revenue)],['手元／店の棚',`${number(s.hand)}本／${number(shelves)}本`],['経過',`${number(s.month)}か月`],...(Object.hasOwn(s,'targetMonth')?[['目標値への初到達',s.targetMonth===null?'期間内に未達':`${number(s.targetMonth)}か月目`]]:[])])}${targetSnapshot(s)}${snapshotsTable(s.snapshots)}${regions(s.regions)}${Object.entries(s.shops??{}).map(([id,shop])=>shopResult(id,shop)).join('')}${evidence(s.events)}${townEvents(s.currentTownEvents)}${trials(s)}</article>`;
}
function candidateEvidence(c){if(!c)return '';return `<section class="shop"><h3><span class="tag candidate">候補</span>発売回数を使わない実績</h3>${metrics([['実売',`${number(c.sold)}本`],['実売のあった月',`${number(c.activeMonths)}か月`]])}<ul>${Object.entries(c.unlock).map(([id,u])=>`<li>${esc(name(id))}：${u.achievementReached?'実績条件成立':'実績条件未成立'}（量 ${u.volumeReached?'✓':'—'}／継続 ${u.continuityReached?'✓':'—'}）</li>`).join('')}</ul><p class="note">実績条件だけの比較です。適格な商品・ブランド経過・申し出の条件は別に必要で、契約成立ではありません。</p>${metrics([['現行の瓶詰め歴史件数',`${number(c.currentHistoryBottlingCount)}件`],['候補の酒の記憶',`${number(c.historyBottlingCount)}件`]])}<p class="note">${esc(c.historyCountBasis)}</p><details><summary>残す酒と受入条件</summary><p>${esc(c.memoryPolicy)}</p><pre>${esc(JSON.stringify({memoryCandidates:c.memoryCandidates,unlock:c.unlock},null,2))}</pre></details></section>`;}
function splitCard(s){
  const rep=typeof s.brandReputation==='number'?s.brandReputation:s.brandReputation?.bonus;
  const unlock=Object.entries(s.unlock??{}).map(([id,e])=>`<li>${esc(name(id))}：${e.eligible?'条件成立':'未成立'}（実売${number(e.sold)}本・売れた発売${number(e.soldReleases)}回）</li>`).join('');
  return `<article class="strategy"><h2>${esc(s.label)}</h2>${metrics([['瓶詰め済み',`${number(s.bottled)}本`],['販売済み',`${number(s.sold)}本`],['販売中の在庫',`${number(s.inventory)}本`],['樽に残る量',`${number(s.remainingLitres,2)}L`],['発売記録',`${number(s.releaseCount)}件`],['売れた発売',`${number(s.soldReleaseCount)}件`],['同時在庫商品の最大',`${number(s.peakProducts)}件`],['現行評判bonus',number(rep,5)]])}<p class="note">${esc(s.note)}</p><h3>現行の店解放条件</h3><ul>${unlock}</ul><p class="note">条件成立と、実際の申し出・取扱開始は別です。</p>${candidateEvidence(s.candidate)}<details><summary>実際の現行口コミ計算のイベント・記憶候補</summary><pre>${esc(JSON.stringify(s.town,null,2))}</pre></details><details><summary>月ごとの実売</summary><div class="table-wrap"><table><thead><tr><th>月</th><th>本数</th></tr></thead><tbody>${(s.monthlySales??[]).map(m=>`<tr><td>${number(m.month)}</td><td>${number(m.sold)}</td></tr>`).join('')}</tbody></table></div></details>${evidence(s.events)}</article>`;
}
function diagnostic(d){if(!d)return '';return `<section><h2>同じ実売・同じ味で、発売IDだけを分けると</h2><p class="note">${esc(d.label)}。同じ月間販売数を保ち、実績の数え方だけへの影響を切り分けます。この診断には選択した煙割合を使います。</p><div class="table-wrap"><table><thead><tr><th scope="col">入力</th><th scope="col">実売</th><th scope="col">売れた発売</th><th scope="col">現行：酒店の解放条件</th><th scope="col">候補：酒店の実績条件</th><th scope="col">候補：酒の記憶</th><th scope="col">評判bonus</th><th scope="col">口コミ判定</th><th scope="col">記憶候補</th></tr></thead><tbody>${d.cases.map(c=>`<tr><th scope="row">${c.id==='whole'?'1発売':'54発売'}</th><td>${number(c.sold)}本</td><td>${number(c.soldReleaseCount)}回</td><td>${c.unlock?.['town-liquor']?.eligible?'成立':'未成立'}</td><td>${c.candidate?.unlock?.['town-liquor']?.achievementReached?'成立':'未成立'}</td><td>${number(c.candidate?.historyBottlingCount)}件</td><td>${number(c.brandReputation?.bonus,5)}</td><td>${number(c.town?.attempts)}件</td><td>${number(c.town?.memoryCandidates)}件</td></tr>`).join('')}</tbody></table></div><details><summary>診断の全条件と結果</summary><pre>${esc(JSON.stringify(d,null,2))}</pre></details></section>`;}
function renderWorldEvidence(){
 if(!worldEvidence){
  results.innerHTML='<p role="status">正式取引網の検証結果を読み込んでいます。</p>';
  if(!worldLoading){worldLoading=true;fetch('./results-world-network.json?world=world-network-v01').then(r=>{if(!r.ok)throw Error('検証結果を読み込めません。');return r.json();}).then(data=>{worldEvidence=data;if(view==='world-network')renderWorldEvidence();}).catch(e=>{results.innerHTML='<p role="alert">'+esc(e.message)+'</p>';}).finally(()=>{worldLoading=false;});}
  return;
 }
 const r=worldEvidence,rows=r.comparisons.flatMap(c=>c.rows.map(row=>({...row,seed:c.seed,phase:c.phase}))),long=r.longRun;
 results.innerHTML='<p>記録済みの、本編の正式操作による比較です。seedごとに同じ自然発生した問い合わせ時点から始め、生産の条件を共通にして配分方針だけを変えています。以下の価格候補は、別の反実仮想です。</p><div class="table-wrap"><table><thead><tr><th>seed</th><th>開始条件</th><th>生産</th><th>方針</th><th>完了月数</th><th>資金の増減</th><th>売上増分</th><th>残瓶</th><th>遠方契約数</th><th>口コミ到達先</th><th>新しい問い合わせ</th><th>花が咲いた相手</th><th>停止理由</th></tr></thead><tbody>'+rows.map(s=>'<tr><td>'+number(s.seed)+'</td><td>'+esc(s.phase==='before-overseas-inquiry'?'海外問い合わせ前':'遠方申し出あり')+'</td><td>'+esc((s.production==='balanced'?'共通の交互生産':s.production==='grain'?'麦・補充樽':'特徴酒のみ')+' / '+(s.intervalMonths??12)+'か月ごと')+'</td><td>'+esc(s.label+(s.policy==='local'?' · '+name(s.localFocus??'bar'):''))+'</td><td>'+number(s.completedMonths)+'</td><td>'+cash(s.delta.cash)+'</td><td>'+cash(s.delta.revenue)+'</td><td>'+number(s.final.inventory.stock)+'</td><td>'+number(s.final.contracts.length)+'</td><td>'+number(s.final.town.reached.length)+'</td><td>'+number(s.delta.inquiries)+'</td><td>'+esc(s.final.scenery.filter(p=>p.flowerStage>0).map(p=>name(p.id)+' '+p.flowerStage).join(' / ')||'なし')+'</td><td>'+esc(s.stop?.message??'期間完了')+'</td></tr>').join('')+'</tbody></table></div><p class="note">資金の増減には製造費と維持費を含みます。遠方への納品代金は顧客実売ではありません。自然に契約できなかった相手を試験のために追加していません。この開始条件では遠方への即時支払が資金面で有利ですが、問い合わせや花の育つ相手は異なります。一時的な仕込み・在庫待ちは、月を進めて再試行しています。</p><details><summary>100年相当の長期試験と帳面上限</summary>'+metrics([['目標期間',number(long.requestedMonths)+'か月'],['実際に完了',number(long.completedMonths)+'か月'],['停止理由',long.stop?.message??'目標期間完了'],['正式操作',number(long.final.operations)+'件'],['発売',number(long.final.releases)+'件'],['町の実績帳',number(long.final.nativeReceipts)+'件'],['生データ',number(long.final.rawBytes)+'bytes'],['正式v8',long.formalSession?.ok?number(long.formalSession.codeUnits)+'code units':'未成立：'+(long.formalSession?.error??'未確認')],['別プロセスの復元',long.coldSubprocess?.exact?number(long.coldSubprocess.restoreMilliseconds/1000,2)+'秒':'未確認']])+'<p class="note">上限や資金で止まった場合、その時点の測定値です。100年間遊べたという意味にはしません。別プロセスの復元時間は、この検証環境で測った起動時の負荷です。iPhoneの測定値ではありません。</p></details><h2>プレミア価格：正式採用は保留</h2><p>'+esc(r.prices.reason)+'</p><p class="note">'+esc(r.prices.demandEvidence)+'</p><p class="note">相性・実績・継続・需要・在庫を使う仮の条件です。地理による加算はなく、本編の価格・保存には接続していません。</p><details><summary>仮の購入・引受率を使った比較</summary><div class="table-wrap"><table><thead><tr><th>酒</th><th>相手</th><th>瓶/期間</th><th>相性</th><th>候補倍率</th><th>各価格の期待収入/残瓶</th></tr></thead><tbody>'+r.prices.cases.map(c=>'<tr><td>'+esc(c.profile)+'</td><td>'+esc(c.partnerName??name(c.venue))+'</td><td>'+number(c.stock)+'本/'+number(c.months)+'か月</td><td>'+number(c.fit,2)+'</td><td>'+number(c.premium,2)+'</td><td>'+c.offers.map(o=>number(o.multiplier,2)+'倍：'+cash(o.expectedRevenue)+' / '+number(o.expectedUnsold,2)+'本').join('<br>')+'</td></tr>').join('')+'</tbody></table></div></details><details><summary>実際の申し出・実績から価格候補の条件を確認</summary><div class="table-wrap"><table><thead><tr><th>時点</th><th>相手</th><th>申し出</th><th>確定量/月数</th><th>残瓶</th><th>観測した需要</th><th>現行単価</th><th>候補倍率</th></tr></thead><tbody>'+Object.entries(r.prices.nativeContext??{}).filter(([,v])=>v?.contexts).flatMap(([key,v])=>v.contexts.map(c=>'<tr><td>'+number(v.month)+'月</td><td>'+esc(c.partnerName??name(c.partnerId))+'</td><td>'+esc(c.pendingOfferIds.join(', ')||'なし')+'</td><td>'+number(c.confirmedQuantity)+'本/'+number(c.tradeMonths)+'月</td><td>'+number(c.availableStock)+'</td><td>'+number(c.demand.units)+'</td><td>'+cash(c.canonicalQuote.unitPrice)+'</td><td>'+number(c.candidateMultiplier,2)+'</td></tr>')).join('')+'</tbody></table></div><p class="note">契約だけでは需要を加算しません。地域の顧客実売は観測していません。</p></details><details><summary>共通生産・正式実績・因果の検証データ</summary><pre>'+esc(JSON.stringify(r,null,2))+'</pre></details>';
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
function render(){
  const network=view==='world-network';form.hidden=network;document.querySelector('.definitions').hidden=network;status.hidden=network;
  if(view==='world-network'){renderWorldEvidence();return;}
  if(!output)return;
  const c=output.config;
  const intro=`<p class="note">表示中：${number(c.months)}か月・${number(view==='split'?54:c.total)}本・seed ${number(c.seed)}。${c.method==='carry'?'販売数は現行の端数繰越式（販売の抽選なし）。':'販売数は研究用のseed抽選式。'} 口コミの現行計算にはseedの影響があります。</p>`;
  if(view==='strategies')results.innerHTML=intro+'<p>棚へまとめて置く、複数の店へ分ける、時間をかけて置く。同じ初期資源で、売上と関係の育ち方を比べます。</p><div class="comparison">'+output.strategies.map(strategyCard).join('')+'</div>';
  else if(view==='goal')results.innerHTML=intro+'<p>同じ関係の点数目標へ、量と継続を変えて近づきます。「大切な取引先」には、点数目標に加えて月間機会の2倍以上の実売と3か月以上の実売月が必要です。未達の場合も、その条件の結果として表示します。</p><div class="comparison two">'+output.goal.map(strategyCard).join('')+'</div>';
  else results.innerHTML=intro+'<p>同じ樽の54本を比較します。総本数・煙と厚み・集中店・継続の重みは戦略比較用です。この瓶詰め比較はリフィル樽、刺激0.25・個性0.7・樽香0.3の共通条件から開始します。在庫商品の上限を守るため、1本ずつの瓶詰めは売れるまで待つ場合があります。熟成時期が違う瓶は、同じ味として扱いません。</p><div class="comparison">'+output.split.map(splitCard).join('')+'</div>'+diagnostic(output.splitDiagnostic);
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
async function calculate(repeat=false){
  if(busy||(!repeat&&!form.reportValidity()))return;
  busy=true;error.hidden=true;status.textContent=repeat?'表示中の条件で再計算しています。':'比較しています。';
  document.querySelectorAll('.actions button').forEach(b=>b.disabled=true);
  await new Promise(resolve=>setTimeout(resolve,0));
  try{
    const config=repeat&&output?output.config:readConfig();
    const next=runComparison(config);
    const same=repeat&&output?JSON.stringify(next)===JSON.stringify(output):null;
    output=next;render();
    status.textContent=same===null?'比較しました。条件を変えて再計算できます。':same?'同じ条件・同じseedで、全比較結果が一致しました。':'同じ条件で結果が一致しませんでした。再現性の検証に失敗しました。';
    if(same===false){error.hidden=false;error.textContent='再現性の不一致を検出しました。この結果を確定した比較として扱わないでください。';}
  }catch(e){error.hidden=false;error.textContent=e.message;status.textContent='比較できませんでした。入力条件を確認してください。';}
  finally{busy=false;document.querySelectorAll('.actions button').forEach(b=>b.disabled=false);}
}
form.addEventListener('submit',event=>{event.preventDefault();calculate();});
document.querySelector('#reset').addEventListener('click',()=>{fillDefaults();calculate();});
document.querySelector('#repeat').addEventListener('click',()=>calculate(true));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));
document.querySelector('#shops').innerHTML=`<div class="table-wrap"><table><thead><tr><th scope="col">店</th><th scope="col">月間販売機会</th><th scope="col">熟成条件</th><th scope="col">価格</th></tr></thead><tbody>${definitions.map(s=>`<tr><th scope="row">${esc(s.name)}</th><td>${s.opportunities===null?'通常棚なし（企画）':`${number(s.opportunities)}回`}</td><td>${number(s.minAge)}か月以上${s.maxRoughness!==null?`・刺激 ≤ ${number(s.maxRoughness,2)}`:''}</td><td>標準の${number(s.rate,2)}倍</td></tr>`).join('')}</tbody></table></div><p class="note">戦略比較の標準価格は£20固定です。煙と厚みを変えても価格を固定し、相性の影響を切り分けます。デパートは本編の企画取引です。このLabの3店への棚配分には含めません。関係の段階名と数値は仮置きです。</p>`;
fillDefaults();calculate();
