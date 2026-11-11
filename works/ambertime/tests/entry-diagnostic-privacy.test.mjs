import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeEntryDiagnostic,formatEntryDiagnostic,ENTRY_DIAGNOSTIC_BUILD} from '../entry-diagnostics.mjs';
const formal='sukimastock.ambertime.main.v1',prefix=formal+'.before-market-rules.v1.';

test('only explicitly projected failure fields are retained; names and save strings are removed',()=>{
 const raw=JSON.stringify({version:8,game:{brands:[{name:'作者の銘柄'}],label:'Old Brand Name'}}),candidateText=JSON.stringify({name:'新しい銘柄'});
 const error=Object.assign(Error('invalid 作者の銘柄 and 新しい銘柄, "Old Brand Name" '+raw),{name:'Error',code:'invalid-session',raw,player:'作者の銘柄'});error.stack='private stack Old Brand Name';
 const d=makeEntryDiagnostic({operation:'new-menu',stage:'candidate-validation',error,snapshot:{raw,legacy:[]},candidateText,versions:{appBuild:'entry-diagnostics-20261111-r1',player:'作者の銘柄',app:'https://example.test/shop-app.mjs?v=ui4-diag'}});
 const output=JSON.stringify(d)+formatEntryDiagnostic(d);
 for(const secret of ['作者の銘柄','新しい銘柄','Old Brand Name',raw,'private stack'])assert(!output.includes(secret),secret);
 assert.equal(d.exception.code,'invalid-session');assert.equal(d.operation,'new-menu');assert.equal(d.stage,'candidate-validation');assert.equal(d.versions.diagnosticsBuild,ENTRY_DIAGNOSTIC_BUILD);
 assert(!Object.hasOwn(d,'snapshot'));assert(!Object.hasOwn(d.exception,'stack'));assert(!Object.hasOwn(d.versions,'player'));
});

test('exact code-controlled dependency versions remain usable despite overlapping player strings',()=>{
 const base='https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
 const model=base+'partner-orders.mjs?v=all-stores-s2-1&regional=regional-v01&delivery=regional-delivery-v01&world=world-network-v01&restore=stage7-v01';
 const app=base+'shop-app.mjs?aging=1&restore=stage7-v01&repair=entry-diagnostics-20261111-r1';
 const raw=JSON.stringify({mode:'age',status:'working',brands:[{name:'stage7'},{name:'entry-diagnostics'}]});
 const versions={app,model,appBuild:ENTRY_DIAGNOSTIC_BUILD,sessionEntryBuild:ENTRY_DIAGNOSTIC_BUILD,sessionEntry:base+'session-entry.mjs?v=entry-diagnostics-20261111-r1',save:base+'development-save.mjs?v=bar-v01-1',recallOperations:base+'recall/operations.mjs?v=bar-v01-1',recallCollector:base+'recall/collector.mjs?v=bar-v01-1',formalFormat:8,worldCreatorPresent:true};
 const d=makeEntryDiagnostic({error:Error('invalid age for stage7'),snapshot:{raw,legacy:[]},versions});
 for(const [key,value] of Object.entries(versions))assert.equal(d.versions[key],value,key);
 assert(!d.exception.message.includes('age'));assert(!d.exception.message.includes('stage7'));
});

test('untrusted version text, URL parameters, paths and origins cannot leak player input',()=>{
 const base='https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
 for(const versions of [{appBuild:'PrivateName'},{sessionEntryBuild:'PrivateName'},{app:base+'shop-app.mjs?name=PrivateName'},{model:base+'partner-orders.mjs?v=PrivateName'},{save:base+'PrivateName.mjs?v=bar-v01-1'},{app:'https://PrivateName.example/works/ambertime/shop-app.mjs'},{app:base+'shop-app.mjs#PrivateName'},{app:'https://PrivateName@sukimastock.github.io/yumaniwa-town-staging/works/ambertime/shop-app.mjs'}]){
  const d=makeEntryDiagnostic({versions,error:Error('generic fault')});assert(!JSON.stringify(d).includes('PrivateName'));
 }
});

test('the actual index import URL is preserved exactly by the diagnostic version whitelist',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const rel=html.match(/<script type="module" src="([^"]+shop-app[^"]+)"/)[1].replaceAll('&amp;','&');
 const app=new URL(rel,'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/').href;
 assert.equal(makeEntryDiagnostic({versions:{app}}).versions.app,app);
});

test('each source envelope is parsed once for the combined exception projection',()=>{
 const raw=JSON.stringify({name:'PrivateName'}),parse=JSON.parse;let calls=0;
 JSON.parse=(...args)=>{calls++;return parse(...args);};
 try{const d=makeEntryDiagnostic({error:{name:'Error',code:'fault',message:'PrivateName failed'},snapshot:{raw,legacy:[]},versions:{appBuild:ENTRY_DIAGNOSTIC_BUILD,sessionEntryBuild:ENTRY_DIAGNOSTIC_BUILD}});assert(!d.exception.message.includes('PrivateName'));assert.equal(calls,1);}
 finally{JSON.parse=parse;}
});

test('malformed JSON error snippets and quoted values are redacted without requiring a reader',()=>{
 const raw='{broken "PrivateName"';
 const d=makeEntryDiagnostic({operation:'continue',stage:'continue-restore',error:new SyntaxError('Unexpected token P, "PrivateName" is not valid JSON'),snapshot:{raw,legacy:[]}});
 assert(!formatEntryDiagnostic(d).includes('PrivateName'));assert.equal(d.exception.name,'SyntaxError');
 const unquoted=makeEntryDiagnostic({error:Error('Cannot restore PrivateName'),snapshot:{raw,legacy:[]}});assert(!formatEntryDiagnostic(unquoted).includes('PrivateName'));
 const cap=makeEntryDiagnostic({error:{message:'a'.repeat(2000)}});assert(cap.exception.message.length<=601);
});

test('legacy source names are private and unknown operations/stages cannot publish arbitrary data',()=>{
 const d=makeEntryDiagnostic({operation:'PrivateName',stage:'PrivateName',error:Error('LegacyName'),snapshot:{raw:null,legacy:[{key:'sukimastock.ambertime.wholesale.v20',raw:JSON.stringify({name:'LegacyName'})}]}});
 assert.equal(d.operation,'unknown');assert.equal(d.stage,'unknown');assert(!formatEntryDiagnostic(d).includes('LegacyName'));assert(!formatEntryDiagnostic(d).includes('PrivateName'));
 assert.equal(d.sizes.legacyRecords,1);
});

test('storage inspection reads only AmberTime backup values and never writes or reads another work',()=>{
 const entries=new Map([[prefix+'first','old raw'],[prefix+'second','older raw'],['sukimastock.other-work.save','OTHER_PRIVATE_DATA']]),reads=[];
 const storage={length:entries.size,key:i=>[...entries.keys()][i],getItem:key=>{reads.push(key);return entries.get(key)??null;},setItem(){assert.fail('diagnostics must not write');},removeItem(){assert.fail('diagnostics must not delete');}};
 const d=makeEntryDiagnostic({error:Error('Quota'),snapshot:{raw:'original',legacy:[]},storage});
 assert.deepEqual(reads,[prefix+'first',prefix+'second']);assert.equal(d.sizes.backupRecords,2);assert.equal(d.sizes.backupCharacters,16);assert(!JSON.stringify(d).includes('OTHER_PRIVATE_DATA'));assert(!JSON.stringify(d).includes('old raw'));
});

test('unavailable size inspection does not replace the actual stage or exception',()=>{
 const storage={get length(){throw Error('blocked storage');}};
 const d=makeEntryDiagnostic({stage:'backup-write',error:Object.assign(Error('quota exceeded'),{name:'QuotaExceededError',code:22}),storage,formalState:'unchanged'});
 assert.equal(d.stage,'backup-write');assert.equal(d.exception.message,'quota exceeded');assert.equal(d.exception.code,'22');assert.equal(d.sizes.inspection,'unavailable');
 const formatted=formatEntryDiagnostic(d);assert(formatted.includes('処理前と同じ原文（復元可能とは限りません）'));assert(formatted.includes('正式readerの検証完了: いいえ'));
});

test('an unavailable source snapshot reports unknown sizes instead of implying no saved record',()=>{
 const unavailable=makeEntryDiagnostic({snapshot:null,error:Object.assign(Error('denied'),{name:'SecurityError'})});
 assert.equal(unavailable.sizes.beforeCharacters,null);assert.equal(unavailable.sizes.legacyRecords,null);assert.equal(unavailable.sizes.legacyCharacters,null);
 const formatted=formatEntryDiagnostic(unavailable);assert(formatted.includes('処理前の正式原文: 確認不能'));assert(formatted.includes('旧開発版の原文: 確認不能'));
 const empty=makeEntryDiagnostic({snapshot:{raw:null,legacy:[]}});assert.equal(empty.sizes.beforeCharacters,0);assert.equal(empty.sizes.legacyRecords,0);assert(formatEntryDiagnostic(empty).includes('処理前の正式原文: 0文字'));
 assert.equal(makeEntryDiagnostic({snapshot:{}}).sizes.beforeCharacters,null);
});

test('backup presence/readback and formal readback/reader validation are separate facts',()=>{
 const d=makeEntryDiagnostic({operation:'continue',stage:'install',error:Error('apply fault'),formalState:'candidate-verified',backupPresent:true,backupVerified:false,writeVerified:true,restoreValidated:true});
 const formatted=formatEntryDiagnostic(d);assert(formatted.includes('原文バックアップ: あり'));assert(formatted.includes('バックアップ読戻し一致: 未確認'));assert(formatted.includes('候補の正式書込み・読戻し一致: 確認済み'));assert(formatted.includes('正式readerの検証完了: はい'));
});

test('every instrumented stage has its own readable label and exception fields',()=>{
 for(const stage of ['record-check','record-recheck','candidate-create','candidate-validation','continue-restore','backup-check','backup-write','backup-readback','formal-write','formal-readback','install','apply','session-apply','preparation-ui','writing-ui','completion-ui','finalize']){
  const d=makeEntryDiagnostic({operation:'new-title',stage,error:Object.assign(Error('injected '+stage),{code:'fault-'+stage})});
  const formatted=formatEntryDiagnostic(d);assert(formatted.includes('['+stage+']'));assert(formatted.includes('fault-'+stage));assert(!formatted.includes('失敗段階: 不明'));
 }
});
