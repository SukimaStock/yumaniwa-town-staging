'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditTimeline}=require('./timeline-audit.cjs');
const pumpoko=require('./pumpoko-contract.cjs'),orbit=require('./orbit-contract.cjs');
const P=(event,extra={})=>({event,session:1,mode:'journey',travelling:0,arrived:2,lost:7,total:9,resolved:true,resultCount:2,growthComplete:false,...extra});
const O=(event,extra={})=>({event,session:1,pending:[],decoded:['S:01'],found:1,read:[1],interpreted:[1],data:1,...extra});
test('PUMPOKO coherent transition with title reset and fresh next run',()=>{
 const f=[P('resolved'),P('grown',{growthComplete:true}),P('return-title',{mode:'prologue',travelling:9,arrived:0,lost:0,resolved:false,resultCount:0,growthComplete:false}),P('second-journey',{session:2,travelling:9,arrived:0,lost:0,resolved:false,resultCount:0})];
 assert.deepEqual(auditTimeline(f,pumpoko),[]);
});
test('ORBIT coherent packet recovery, HOME decode and inert archive replay',()=>{
 const f=[O('start',{pending:[],decoded:[],found:0,read:[],interpreted:[],data:0}),O('SERA-recovery',{pending:['S:01'],decoded:[],found:0,read:[],interpreted:[]}),O('HOME-before-analysis',{pending:['S:01'],decoded:[],found:0,read:[],interpreted:[]}),O('HOME-analysis',{read:[],interpreted:[]}),O('first-memory'),O('archive-replay')];
 assert.deepEqual(auditTimeline(f,orbit),[]);
});
for(const [label,frames,contract,id] of [
 ['premature-resolution',[P('before',{resolved:false,travelling:1,arrived:1}),P('bad',{travelling:1})],pumpoko,'NO_PREMATURE_RESOLUTION'],
 ['duplicate-seed',[P('ok'),P('bad',{arrived:3})],pumpoko,'SEED_CONSERVATION'],
 ['result-drift',[P('ok'),P('bad',{resultCount:1})],pumpoko,'RESULT_EQUALS_ARRIVALS'],
 ['dirty-reset',[P('grown',{growthComplete:true}),P('return-title',{mode:'prologue',arrived:1,lost:0,resolved:false})],pumpoko,'RESET_AT_TITLE'],
 ['early-decode',[O('before',{pending:[],decoded:[],found:0,read:[],interpreted:[]}),O('SERA-recovery',{pending:['S:01']})],orbit,'SERA_NO_PREMATURE_DECODE'],
 ['double-accounted-packet',[O('before'),O('bad',{pending:['S:01']})],orbit,'NO_PENDING_DECODED_OVERLAP'],
 ['inert-replay-violation',[O('before'),O('archive-replay',{data:2})],orbit,'ARCHIVE_REPLAY_INERT'],
 ['lost-packet',[O('before',{pending:['S:02']}),O('bad')],orbit,'PENDING_ACCOUNTED']
])test('detects '+label,()=>{const issues=auditTimeline(frames,contract);assert.ok(issues.some(x=>x.rule===id),'expected '+id+', got '+JSON.stringify(issues));assert.ok(issues.every(x=>Number.isInteger(x.step)&&x.step>=0));});
