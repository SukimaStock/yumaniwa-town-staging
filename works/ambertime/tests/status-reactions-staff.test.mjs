import test from 'node:test';
import assert from 'node:assert/strict';
import {staffStatusView} from '../staff-status-view.mjs';

const queued={mode:'once',status:'queued'};
const base={hired:true,reservation:queued,cash:400,canBegin:{ok:true,reason:'',minimum:300}};
function freezeDeep(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value;}

test('the seven existing staff states retain their labels without a narrow-footer dependency',()=>{
 const cases=[
  [{hired:false},{brief:'',detail:'',blockingReason:''}],
  [{hired:true},{brief:'指示待ち',detail:'指示待ち',blockingReason:''}],
  [base,{brief:'依頼済み',detail:'1回\n依頼済み',blockingReason:''}],
  [{...base,automatic:true},{brief:'仕込み中',detail:'1回\n仕込み中',blockingReason:''}],
  [{...base,full:true},{brief:'空き待ち',detail:'1回\n空き待ち',blockingReason:'空き待ち'}],
  [{...base,cash:299},{brief:'資金待ち',detail:'1回\n資金待ち',blockingReason:'資金待ち'}],
  [{...base,judgment:true},{brief:'判断待ち',detail:'1回\n判断待ち',blockingReason:'判断待ち'}]
 ];
 for(const [input,expected] of cases)assert.deepEqual(staffStatusView(input),expected);
 assert.deepEqual(staffStatusView(),{brief:'',detail:'',blockingReason:''});
});

test('three-run, continuing and stop-after detail preserve the recorded reservation facts',()=>{
 assert.deepEqual(staffStatusView({...base,reservation:{mode:'three',remaining:2,stopAfter:true},automatic:true}),{brief:'仕込み中',detail:'3回まで\n残り2回\n仕込み中\n今回で終了',blockingReason:''});
 assert.equal(staffStatusView({...base,reservation:{mode:'continuous'}}).detail,'続ける\n依頼済み');
 assert.equal(staffStatusView({...base,hired:false}).brief,'依頼済み','legacy reservations remain visible without a current hire');
});

test('active, full, judgment and cash follow the existing display priority',()=>{
 const blocked={...base,full:true,judgment:true,cash:0};
 assert.equal(staffStatusView({...blocked,automatic:true}).brief,'仕込み中');
 assert.equal(staffStatusView(blocked).brief,'空き待ち');
 assert.equal(staffStatusView({...blocked,full:false}).brief,'判断待ち');
 assert.equal(staffStatusView({...blocked,full:false,judgment:false}).brief,'資金待ち');
 assert.equal(staffStatusView({...base,cash:300}).brief,'依頼済み','exact required funds are sufficient');
});

test('important waits expose the formal guard reason in both detail and the blocking projection',()=>{
 for(const [fields,brief,reason] of [
  [{full:true},'空き待ち','貯蔵庫の4樽が埋まっています。'],
  [{cash:0},'資金待ち','仕込みと樽・瓶に £300 必要です。'],
  [{judgment:true},'判断待ち','届いた申し出を確認します。']
 ]){
  const view=staffStatusView({...base,...fields,canBegin:{ok:false,minimum:300,reason}});
  assert.equal(view.brief,brief);assert.equal(view.blockingReason,reason);assert.equal(view.detail,'1回\n'+brief+'\n'+reason);
 }
 const same=staffStatusView({...base,full:true,canBegin:{minimum:300,reason:'空き待ち'}});
 assert.equal(same.detail,'1回\n空き待ち','fallback labels are not duplicated');
 assert.equal(staffStatusView({...base,canBegin:{minimum:300,reason:'今月は仕込み済みです。'}}).blockingReason,'','ordinary queued state does not gain a permanent warning');
});

test('projection accepts frozen input and never rewrites reservation or guard facts',()=>{
 const input=freezeDeep({...base,reservation:{mode:'three',remaining:1,stopAfter:true},full:true,canBegin:{minimum:300,reason:'商品の販売を待ちます。'}}),before=JSON.stringify(input);
 assert.equal(staffStatusView(input).detail,'3回まで\n残り1回\n空き待ち\n今回で終了\n商品の販売を待ちます。');
 assert.equal(JSON.stringify(input),before);assert.equal(Object.keys(input.reservation).length,3);
});
