import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STAGES,mapStep} from '../world-map-view.mjs';
import {BREWING_CARDS,brewingCardsMarkup} from '../brewing-cards.mjs';
import {shopOrderMarkup} from '../shop-order-view.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('shop-app.mjs'),html=read('index.html'),placement=read('placement-ui.mjs');
const manifest=JSON.parse(read('design/formal-copy/approved-copy.json'));
const section=(start,end)=>{const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'context exists: '+start);return app.slice(a,b);};
const contains=(source,labels)=>{for(const label of labels)assert.ok(source.includes(label),'expected contextual display: '+label);};

test('approved manifest enumerates all 103 grouped decisions and separate map/adoption scope',()=>{
 assert.equal(manifest.entries.length,103);assert.equal(manifest.count.approvedGroupedItems,103);assert.equal(manifest.count.expandedStringChanges,106);
 assert.deepEqual(manifest.entries.map(x=>x.id),Array.from({length:103},(_,i)=>'copy-'+String(i+1).padStart(3,'0')));
 for(const entry of manifest.entries){assert.ok(entry.scope&&entry.preserveNotes&&entry.expectedCallSite,entry.id);for(const path of entry.expectedCallSite.match(/works\/ambertime\/[\w.-]+/g)??[])assert.ok(fs.existsSync(new URL('../'+path.split('/').at(-1),import.meta.url)),entry.id+' source exists');}
 assert.equal(manifest.count.mapChangeAdditional,1);assert.equal(manifest.formalAdoption.id,'placement-formal');
});
test('heading-backed selection shortens only visible names and keeps exact recipe labels',()=>{
 assert.deepEqual(BREWING_CARDS.map(x=>x.label),['ふつうの麦芽','ピート麦芽','短い発酵','長い発酵']);
 const cards=brewingCardsMarkup({labConnection:{cards:{malt:'plain',ferment:'short'}},operations:[]});
 for(const label of ['ふつう','ピート','短め','長め'])assert.ok(cards.includes('<span class="brewing-name">'+label+'</span>'));
 contains(section("if(kind==='flavor-cards')","}else if(kind==='inspect')"),["button('蒸留','flavor-start')"]);
 contains(section('function renderSpirit(){','function staffDisplayStatus(){'),['ここまで','原酒']);
 contains(html,['id="go-distill" type="button">蒸留室','<summary>詳細</summary>','画面を離れると停止']);
});
test('staff and ledger displays keep contextual short labels and important operation distinctions',()=>{
 contains(section('function staffManagerView(){','function staffCanRequest(){'),["?'依頼':'設定'",'次の予約から','たるなし',"['once','1回']","['three','3回まで']","['continuous','続ける']",'予約取消','自分で行う']);
 contains(section('function ledgerView(){','let shopLedgerSnapshot'),["['recipes','仕込み']","['aging','たる']","['releases','発売']","['shops','取扱店']",'<summary>実績</summary>',"button('歩み'"]);
 contains(section('function ledgerShopList(){','function ledgerReleaseView(){'),['開始日不明','納品計',"button('発売'+(d.releaseId!==null?' #'"]);
 contains(section('function ledgerReleaseView(){','let caskSnapshot='),['元のたる','試飲・熟成','確認できた納品','確認できた入金']);
 contains(section('function bottlingPolicyView(){','function bottlingChoiceView('),['共通設定']);
 contains(app,['esc(displayReason(q.reason)||','textContent=displayReason(q.reason)||','次の代へ引き継ぐ','先に共通設定を保存','原酒が1本分足りません',"message('保存しました')",":'保存済み'"]);
});
test('bottling and placement copy removes duplicate quantity and preserves operations',()=>{
 assert.ok(!app.includes('id="bottle-selected"'));contains(app,["'ビン詰め後 '+money", "'残り '+q.remaining"]);
 contains(placement,['希望 ','希望 0本','ひとつ戻す','全部分け直す','これで決める']);assert.ok(!placement.includes('今月の希望'));
 contains(section("}else if(kind==='shop-offer')","}else if(kind==='decision')"),["button('受ける','shop-accept'","button('断る','shop-decline'","button('あとで','shop-later'","offer.shopId==='town-liquor'?'':'<p class=\"quiet\">取扱開始後は毎月自動で発送"]);
});
test('manual town and automatic order displays remain distinct without mutating recorded facts',()=>{
 const state={core:{month:12},placement:{version:1},shopDemand:{lastOrders:[{shopId:'town-liquor',month:12,requested:2,shipped:2,unmet:0,reason:'fulfilled'},{shopId:'supermarket',month:12,requested:10,shipped:0,unmet:10,reason:'insufficient-stock'}]}},raw=JSON.stringify(state);
 assert.equal(shopOrderMarkup(state,'town-liquor'),'');const result=shopOrderMarkup(state,'supermarket',{monthLabel:()=> '1年1月'});
 contains(result,['1年1月</p>','注文 10本','発送なし','在庫不足']);assert.equal(JSON.stringify(state),raw);
 assert.ok(!/setTimeout\(|requestAnimationFrame\(|localStorage|structuredClone\(/.test(read('shop-order-view.mjs')));
});
test('map symbols use conventional direction, accessible names, current name and unlocked bounds',()=>{
 assert.deepEqual(STAGES,['蒸留所','近所','町','地方','日本','地球']);
 const map=section("}else if(kind==='world-map')","}else if(kind==='staff-manager')");
 contains(map,["button('−','world-map-out'",'worldMapStage>=mapViewMax()', 'aria-label="縮小"',"button('＋','world-map-in'",'worldMapStage===1','aria-label="拡大"','MAP_STAGES[worldMapStage-1]',"introduction?'つづける':'戻る'"]);
 contains(app,["a==='world-map-out'?'out':'in'"]);
 for(let max=1;max<=6;max++)for(let current=1;current<=max;current++){assert.equal(mapStep(current,'out',max),Math.min(current+1,max));assert.equal(mapStep(current,'in',max),Math.max(current-1,1));}
});
test('ordinary URL uses native placement and the product modal has no duplicate old retail controls',()=>{
 contains(app,['const placementEnabled=true;','export const SAVE_KEY=FORMAL_SAVE_KEY','D.newPlacementDistillery(seed)','placementUI.markup(id']);
 const product=section("}else if(kind==='product'){",'const activeCask=');
 assert.ok(!/D\.listBottles|button\([^\n]*'list'|sales-destination-choice|自家販売を始める/.test(product));
 contains(product,["x.shop.id!=='town-liquor'",'departmentDestination','releaseComparisonButton','<summary>価格</summary>']);
});
test('cache reader chain updates every changed helper and worker entry',()=>{
 contains(html,['shop-app.mjs?v=visual14-r1','shop.css?v=formal-copy-r1']);
 for(const helper of ['placement-save','shop-order-view','cask-detail-view','brewing-cards','flavor-view','cask-serials','nearby-comparison','partner-orders','history-worker','cask-ledger-worker'])contains(app,[helper+'.mjs?v=formal-copy-r1']);
 contains(app,['placement-ui.mjs?v=visual14-r1']);
 contains(read('cask-detail-view.mjs'),['flavor-view.mjs?v=formal-copy-r1']);
 for(const worker of ['history-worker.mjs','cask-ledger-worker.mjs'])assert.match(read(worker),/\?v=formal-copy-r1/);
});
