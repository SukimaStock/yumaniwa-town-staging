import {FLAVORS,GROUPS,TIMINGS,create,step,summary,flavorAt,shopView,exportLog,replay} from './model.mjs';
const $=id=>document.getElementById(id),date=m=>`${Math.floor(m/12)}年${m%12}か月`;
const names=Object.fromEntries(FLAVORS.map(f=>[f.id,f.name]));
const options=(id,rows)=>$(id).replaceChildren(...rows.map(row=>{const o=document.createElement('option');o.value=row.id;o.textContent=row.name;return o;}));
options('group',GROUPS);options('timing',TIMINGS);options('flavor',FLAVORS);
$('group').value='E';$('timing').value='rotation';$('flavor').value='fruit';
let state=create(),selected='town',token=0,busy=false;
const line=(text,month)=>{const li=document.createElement('li');if(Number.isInteger(month)){const time=document.createElement('time');time.textContent=date(month);li.append(time);}li.append(document.createTextNode(text));return li;};
function rows(id,items,empty){$(id).replaceChildren(...(items.length?items:[null]).map(item=>item?line(item.text,item.month):Object.assign(line(empty),{className:'empty'})));}
function controls(){for(const b of document.querySelectorAll('.controls button'))b.disabled=busy||state.month>=360||b.dataset.year&&+b.dataset.year*12<=state.month;$('download').disabled=busy;}
function render(){
 const data=summary(state),product=flavorAt(state);
 $('date').textContent=date(data.month);$('stock').textContent=`比較用供給 ${data.produced}本・納品 ${data.delivered}本・在庫 ${data.inventory}本`;
 $('product-name').textContent=product.name+(product.label&&product.label!==product.name?'：'+product.label:'');
 const recipe=product.recipe;const malt={plain:'ふつうの麦芽',peat:'ピート麦芽'}[recipe.malt]??recipe.malt,ferment={short:'短い発酵',long:'長い発酵'}[recipe.ferment]??recipe.ferment,cask={refill:'リフィル',bourbon:'バーボン',oloroso:'シェリー',first:'1stフィル'}[recipe.cask]??recipe.cask;
 $('recipe').textContent=`${malt}・${ferment}／採取 ${Math.round(recipe.start*99)}–${Math.round(recipe.end*99)}／${cask} ${date(product.ageMonths)}`;
 const axes=[['果実香','fruit'],['麦の香り','grain'],['煙の香り','smoke'],['厚み','body'],['シゲキ','rough'],['樽香','wood']];
 $('flavor-bars').replaceChildren(...axes.map(([label,key])=>{const row=document.createElement('div');row.className='flavor-row';const title=document.createElement('span');title.textContent=label;const bar=document.createElement('span');bar.className='bar';bar.setAttribute('role','img');const value=Number(product.profile[key]??0),amount=Math.max(0,Math.min(1,value));bar.setAttribute('aria-label',`${label}：${amount<.25?'弱め':amount<.6?'中ほど':'強め'}`);const fill=document.createElement('i');fill.style.width=amount*100+'%';bar.append(fill);row.append(title,bar);return row;}));
 if(!data.shops.some(x=>x.id===selected))selected=data.shops[0]?.id;
 $('shops').replaceChildren(...data.shops.map(shop=>{const b=document.createElement('button');b.type='button';b.className='shop-button';b.dataset.shop=shop.id;b.setAttribute('aria-pressed',String(shop.id===selected));const name=document.createElement('strong');name.textContent=shop.name;const status=document.createElement('span');status.textContent=shop.status+'・'+shop.received+'本';b.append(name,status);b.onclick=()=>{selected=shop.id;render();};return b;}));
 if(selected){const shop=shopView(state,selected);$('shop-name').textContent=shop.name;$('shop-status').textContent=shop.status;
 const comment=typeof shop.lastComment==='string'?shop.lastComment:shop.lastComment?.text;
 $('handler-comment').textContent=comment?`担当者「${comment}」`:'担当者の反応はまだありません。';
 $('relationship').textContent=`納品 ${shop.received}本・${shop.deliveries}回${shop.firstHandling===null||shop.firstHandling===undefined?'':`／取扱可能 ${date(shop.firstHandling)}`}${shop.settled?'／好みに合う納品が続いています。':''}`;
 rows('shipments',(shop.history??[]).slice(-6).reverse().map(h=>({month:h.month,text:`発売#${h.releaseId}・${names[h.flavorId]??h.flavorId} ${h.count}本${h.comment?'／担当者「'+(typeof h.comment==='string'?h.comment:h.comment.text)+'」':''}`})),'この店への納品はまだありません。');
 const contacts=state.town.events.filter(e=>['arrival','interest','inquiry','visit','rumor'].includes(e.type)&&(e.to===selected||e.from===selected)).map(e=>({month:e.month,text:e.reason}));
 rows('shop-events',[...(shop.events??[]),...contacts].sort((a,b)=>a.month-b.month).slice(-8).reverse(),'この店の出来事はまだありません。');}
 const reached=data.regions.filter(r=>r.firstArrival!==null&&r.firstArrival!==undefined);
 rows('regions',reached.map(r=>({month:r.firstArrival,text:`${r.name}／${r.firstInterest===null||r.firstInterest===undefined?'好みに合う反応は未記録':'好みに合う反応あり'}・問い合わせ ${r.inquiries}件・訪問 ${r.visits}件`})),'町の外への到着はまだありません。');
 rows('events',data.recentEvents.slice(0,8),'出来事はまだありません。');controls();
}
function syncForm(){for(const key of ['seed','group','timing','access','flavor','change'])if(state.options[key]!==undefined)$(key).value=state.options[key];}
function reset(e){e.preventDefault();if(!$('settings').reportValidity())return;try{const values=Object.fromEntries(new FormData($('settings')));values.seed=Number(values.seed);const next=create(values);token++;busy=false;state=next;selected='town';render();$('status').textContent='条件を切り替えました。';}catch(error){$('status').textContent=error.message;}}
$('settings').addEventListener('submit',reset);
async function advanceTo(target){const mine=++token;busy=true;controls();$('status').textContent=`${date(target)}まで進めています。`;try{while(state.month<target){for(let i=0;i<6&&state.month<target;i++)step(state);if(mine!==token)return;await new Promise(resolve=>setTimeout(resolve,0));if(mine!==token)return;}busy=false;render();$('status').textContent=`${date(state.month)}までの記録です。`;}catch(error){if(mine!==token)return;busy=false;controls();$('status').textContent='計算を止めました：'+error.message;}}
$('next-month').onclick=()=>advanceTo(Math.min(360,state.month+1));for(const button of document.querySelectorAll('[data-year]'))button.onclick=()=>advanceTo(+button.dataset.year*12);
$('download').onclick=()=>{const blob=new Blob([JSON.stringify(exportLog(state),null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ambertime-shop-lab-${state.options.seed}-${state.month}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);};
$('import-log').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const mine=++token;busy=false;try{if(file.size>12*1024*1024)throw Error('12MB以下のLabのJSONを選んでください。');const log=JSON.parse(await file.text());if(mine!==token)return;const restored=replay(log);state=restored;selected='town';syncForm();render();$('status').textContent='JSONの条件と記録を再現しました。';}catch(error){if(mine===token){controls();$('status').textContent='読み込めませんでした：'+error.message;}}finally{e.target.value='';}});
window.labSnapshot=()=>structuredClone(state);window.labExport=()=>exportLog(state);
syncForm();render();
