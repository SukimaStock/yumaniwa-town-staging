import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';
import {bottlingPolicyCountChoices,stepBottlingPolicyCount,stepBottlingCondition,policyNumber,bottleChoices} from '../ui-details.mjs';
import {fill,advance} from './brands-helpers.mjs';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const max=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres);
const plain=x=>JSON.parse(JSON.stringify(x));
function fresh(factory=D.newBottlingPolicyDistillery){let s=fill(factory(42),{progress:65,type:'refill'});s=D.bottleBranded(s,s.core.casks[0].id,{},1);return D.hireBottlingStaff(s);}
function harness(game=fresh(),{saveOK=true}={}){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',dataset:{},innerHTML:'',textContent:'',disabled:false,scrollTop:77,attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 const buttonNode=action=>node(action),body=node('dialog-body'),dialog=node('action-dialog');
 body.querySelector=selector=>selector.startsWith('label')?node('condition-label'):buttonNode(selector.match(/data-action=["']?([^\]"']+)/)?.[1]);
 dialog.querySelector=body.querySelector;
 const ctx={P,D,game,modal:{kind:'bottler-panel',editPolicy:true},bottlingPolicyCountChoices,stepBottlingPolicyCount,stepBottlingCondition,policyNumber,
  $:node,button:(label,action,id='',extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,render(){throw Error('draft interaction must not rerender dialog');},message(){},preview:true,canSave:true,userPaused:false,elapsed:0,
  countdown:{cancel(){}},stopClock(){},automaticNews:{push(){}},automaticEvents:()=>[],caskName:String,soldOutLabel:()=>'',noteMapReach(){},schedule(){},runtimeHalted:false,
  saveCandidate:()=>saveOK,restoreCommitted(){},storageNotice(){}};
 const funcs=app.slice(app.indexOf('function validPlanDraft('),app.indexOf('function bottlingChoiceView('));
 const update=app.slice(app.indexOf('function updateBottleDraft('),app.indexOf("$('dialog-body').addEventListener('change'",app.indexOf('function updateBottleDraft(')));
 const begin=app.indexOf(" if(['policy-count-less','policy-count-more','policy-condition-less','policy-condition-more']");
 const clicks=app.slice(begin,app.indexOf(" if(a==='bottling-toggle'",begin));
 const saveStart=app.indexOf(" if(a==='bottling-policy-save'&&kind==='bottler-panel'){");
 const save=app.slice(saveStart,app.indexOf(" if(a==='bottling-delegate'",saveStart));
 const act=app.slice(app.indexOf('function act(fn,'),app.indexOf('function actMarket('));
 vm.runInNewContext(funcs+update+act+`\nfunction click(a){const kind=modal.kind;${clicks}}\nfunction savePolicy(){const a='bottling-policy-save',kind=modal.kind;${save}}`,ctx);
 // Keep render strict for all draft edits; allow it only for the existing saved transaction.
 const savedRender=ctx.render;
 return {ctx,nodes,node,body,buttonNode,view:()=>ctx.bottlingPolicyView(),sync:()=>ctx.syncBottlingPolicyInputs(),click:a=>ctx.click(a),input(id,value){const el=node(id);el.value=value;ctx.updateBottleDraft({target:el});},save(){ctx.render=()=>{};try{return ctx.savePolicy();}finally{ctx.render=savedRender;}},snapshot:()=>D.serializeDistillery(ctx.game)};
}

test('staff quantities use five steps, preserve only current legacy value and include dynamic terminal maximum',()=>{
 assert.deepEqual(bottlingPolicyCountChoices(null,54),[5,10,15,20,25,30,35,40,45,50,54]);
 assert.deepEqual(bottlingPolicyCountChoices(7,15),[5,7,10,15]);assert.deepEqual(bottlingPolicyCountChoices(1,15),[1,5,10,15]);
 assert.equal(stepBottlingPolicyCount(10,'less',max),5);assert.equal(stepBottlingPolicyCount(10,'more',max),15);
 assert.equal(stepBottlingPolicyCount(7,'less',max),5);assert.equal(stepBottlingPolicyCount(7,'more',max),10);
 assert.equal(stepBottlingPolicyCount(1,'less',max),null);assert.equal(stepBottlingPolicyCount(1,'more',max),5);
 assert.equal(stepBottlingPolicyCount(50,'more',54),54);assert.equal(stepBottlingPolicyCount(54,'less',54),50);assert.equal(stepBottlingPolicyCount(54,'more',54),null);
 assert.equal(bottlingPolicyCountChoices(null,max).at(-1),max);
 // Manual residual choices remain valid independently of staff stepping.
 assert.deepEqual(bottleChoices(3,3),[3]);
});

test('condition stepping is one unit and invalid or empty input never silently becomes zero',()=>{
 for(const limit of [1200,999]){assert.equal(stepBottlingCondition(24,'less',limit),23);assert.equal(stepBottlingCondition(24,'more',limit),25);assert.equal(stepBottlingCondition(0,'less',limit),null);assert.equal(stepBottlingCondition(limit,'more',limit),null);for(const value of [null,-1,1.5,limit+1,NaN])assert.equal(stepBottlingCondition(value,'more',limit),null);}
 assert.equal(policyNumber(''),null);assert.equal(policyNumber('  '),null);assert.equal(policyNumber('-1'),-1);assert.equal(policyNumber('24.5'),24.5);assert.equal(policyNumber('0'),0);
});

test('real view and input handlers keep draft controls mounted through repeated +/- and mode changes',()=>{
 const h=harness(),before=h.snapshot();h.view();h.ctx.modal.planDraft={mode:'age',age:24,threshold:7,count:10};h.sync();
 const input=h.node('bottling-condition'),quantity=h.node('bottling-quantity'),less=h.buttonNode('policy-condition-less'),body=h.body;
 h.click('policy-condition-less');assert.equal(h.ctx.modal.planDraft.age,23);h.click('policy-condition-more');h.click('policy-condition-more');assert.equal(h.ctx.modal.planDraft.age,25);
 h.click('policy-count-more');assert.equal(h.ctx.modal.planDraft.count,15);h.click('policy-count-less');assert.equal(h.ctx.modal.planDraft.count,10);
 assert.equal(h.node('bottling-condition'),input);assert.equal(h.node('bottling-quantity'),quantity);assert.equal(h.buttonNode('policy-condition-less'),less);assert.equal(body.scrollTop,77);assert.equal(h.snapshot(),before);
 h.input('bottling-mode','stock');assert.equal(input.dataset.policyField,'threshold');assert.equal(input.max,'999');assert.equal(input.value,7);h.click('policy-condition-more');assert.equal(h.ctx.modal.planDraft.threshold,8,'stock condition increments one, never five');assert.equal(h.node('bottling-condition-unit').textContent,'本以下になったら');
 h.input('bottling-mode','age');assert.equal(input.max,'1200');assert.equal(input.value,25);assert.equal(h.node('bottling-condition-unit').textContent,'か月以上になったら');
});

test('typing preserves the live number input value and does not replace focused controls',()=>{
 const h=harness();h.view();h.ctx.modal.planDraft={mode:'age',age:24,threshold:7,count:7};h.sync();
 const input=h.node('bottling-condition');let value='0024',writes=0;
 Object.defineProperty(input,'value',{configurable:true,get:()=>value,set:next=>{writes++;value=next;}});
 h.ctx.updateBottleDraft({target:input});assert.equal(h.ctx.modal.planDraft.age,24);assert.equal(writes,0,'input event must not programmatically rewrite the focused number field');assert.equal(value,'0024');
 assert.equal(h.node('bottling-condition'),input);assert.equal(h.body.scrollTop,77);
 const listeners=app.match(/\$\('dialog-body'\)\.addEventListener\('click',e=>handleModal\(e\)\)/g)??[];assert.equal(listeners.length,1,'one delegated click handler per body');
});

test('direct invalid input disables save and stepping without changing formal policy',()=>{
 const h=harness(),before=h.snapshot();h.view();h.ctx.modal.planDraft={mode:'age',age:24,threshold:7,count:7};h.sync();
 for(const raw of ['', '-1','24.5','1201']){h.input('bottling-condition',raw);assert.equal(h.buttonNode('bottling-policy-save').disabled,true);assert.equal(h.buttonNode('policy-condition-less').disabled,true);assert.equal(h.buttonNode('policy-condition-more').disabled,true);assert.notEqual(h.ctx.modal.planDraft.age,0);h.save();assert.equal(h.snapshot(),before);}
 h.input('bottling-condition','0');assert.equal(h.buttonNode('policy-condition-less').disabled,true);assert.equal(h.buttonNode('policy-condition-more').disabled,false);assert.equal(h.buttonNode('bottling-policy-save').disabled,false);
 h.input('bottling-condition','1200');assert.equal(h.buttonNode('policy-condition-more').disabled,true);assert.equal(h.buttonNode('policy-condition-less').disabled,false);
 h.input('bottling-mode','stock');h.input('bottling-condition','999');assert.equal(h.buttonNode('policy-condition-more').disabled,true);h.input('bottling-condition','1000');assert.equal(h.buttonNode('bottling-policy-save').disabled,true);
 assert.equal(h.snapshot(),before);
});

test('legacy one/seven stay exact on opening, age-only save and cold restoration; failure and close discard drafts',()=>{
 for(const count of [1,7]){
  const saved=D.setBottlingPolicy(fresh(),{mode:'age',age:24,count}),raw=D.serializeDistillery(saved),h=harness(D.restoreDistillery(raw));
  const view=h.view();assert.match(view,new RegExp('<option value="'+count+'" selected>'));assert.equal(h.snapshot(),raw);h.sync();h.click('policy-condition-more');assert.equal(h.ctx.modal.planDraft.count,count);assert.equal(h.snapshot(),raw);h.save();assert.equal(D.commonBottlingPolicy(h.ctx.game).age,25);assert.equal(D.commonBottlingPolicy(h.ctx.game).count,count);assert.equal(D.serializeDistillery(D.restoreDistillery(h.snapshot())),h.snapshot());
  const failed=harness(D.restoreDistillery(raw),{saveOK:false});failed.view();failed.click('policy-condition-more');failed.save();assert.equal(failed.snapshot(),raw);assert.equal(D.commonBottlingPolicy(failed.ctx.game).age,24);
  const cancelled=harness(D.restoreDistillery(raw));cancelled.view();cancelled.click('policy-count-more');cancelled.ctx.modal=null;assert.equal(cancelled.snapshot(),raw);
 }
});

test('common-policy edits preserve frozen reservations and actual residual three-bottle execution',()=>{
 let s=fresh(),id=s.core.casks[0].id;s=D.setBottlingPolicy(s,{mode:'age',age:24,count:7});s=D.delegateBottling(s,id);const reservation=plain(D.bottlingReservation(s,id)),h=harness(s);h.view();h.click('policy-condition-more');h.save();assert.deepEqual(plain(D.bottlingReservation(h.ctx.game,id)),reservation);assert.equal(D.commonBottlingPolicy(h.ctx.game).count,7);
 let residual=fresh(D.newBottlingRolesDistillery);id=residual.core.casks[0].id;residual=D.bottleBranded(residual,id,{},D.quote(residual,id).count-3);assert.equal(D.quote(residual,id).count,3);residual=D.setBottlingPolicy(residual,{mode:'age',age:1,count:10});residual=D.delegateBottling(residual,id);const before=residual.core.totals.costs;residual=advance(residual,1);assert.equal(residual.automation.lastBottlings[0].count,3);assert.equal(residual.automation.lastBottlings[0].cost,3*P.bottlingCost);assert.equal(residual.core.totals.costs,before+3*P.bottlingCost+residual.automation.lastBottlings[0].salary);assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(residual))),D.serializeDistillery(residual));
});
