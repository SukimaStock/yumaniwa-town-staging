'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {classify}=require('../tools/staging-targeted-change-proof.cjs');
function git(root,...args){const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
function put(root,file,body){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),body);}
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'targeted-proof-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,'init','-q');git(root,'config','user.name','Test');git(root,'config','user.email','test@example.invalid');
  put(root,'index.html',['<head>','<title>original</title>','</head>',...Array.from({length:12},(_,i)=>`<!-- spacer ${i} -->`),'<body>','<main>town</main>','</body>',''].join('\n'));
  put(root,'style.css','/* town */\nbody { color: black; }\n/* end */\n');
  put(root,'works/existing/index.html','<title>game</title>\n');put(root,'works/existing/game.js','const level = 1;\n');
  put(root,'data/work-lifecycle.json',JSON.stringify({schema:'sukimastock-work-lifecycle/1',works:[{id:'existing',path:'works/existing',status:'active'}]})+'\n');
  const commit=message=>{git(root,'add','-A');git(root,'commit','-qm',message||'change');return git(root,'rev-parse','HEAD');};
  const initial=commit('initial');
  return {root,initial,commit,read:file=>fs.readFileSync(path.join(root,file),'utf8'),put:(file,body)=>put(root,file,body),check:(baseSha,headSha)=>classify({root,baseSha,headSha})};
}
function reference(source,selection){return `Restore selected UI change\n\nRestore-Source: ${source}\nRestore-Hunks: ${JSON.stringify(selection)}`;}
test('normal numeric local level and animation edits remain lightweight',t=>{const f=fixture(t);f.put('works/existing/game.js','const level = 2;\n');assert.equal(f.check(f.initial,f.commit()).eligible,true);});
test('small contract changes require ordinary review',t=>{
  for(const line of ['localStorage.setItem("new-key", "1");','fetch("https://example.invalid");','window.parent.postMessage({}, "*");','import x from "../../engine/core.js";','const SAVE_KEY = "new";','const schemaVersion = 2;','eval("danger");']){
    const f=fixture(t);f.put('works/existing/game.js',line+'\n');assert.equal(f.check(f.initial,f.commit()).reason,'CONTRACT_REVIEW_REQUIRED',line);
  }
});
test('alternate distribution paths cannot enter the local route',t=>{const f=fixture(t);f.put('works/existing/dist/bundle.zip','archive\n');assert.equal(f.check(f.initial,f.commit()).reason,'CONTRACT_REVIEW_REQUIRED');});
test('selected reverse hunk preserves SEO and a later independent improvement in the SAME file',t=>{
  const f=fixture(t);let body=f.read('index.html').replace('original','SEO improvement').replace('<main>town</main>','<main>town</main>\n<aside>intrusive UI</aside>');
  f.put('index.html',body);const source=f.commit('SEO plus unwanted UI');
  body=body.replace('spacer 5','later independent improvement');f.put('index.html',body);const base=f.commit('independent fix');
  f.put('index.html',body.replace('<aside>intrusive UI</aside>\n',''));const head=f.commit(reference(source,{'index.html':[2]}));
  const result=f.check(base,head);assert.equal(result.reason,'EXACT_TARGETED_RESTORE');assert.equal(result.eligible,true);assert.match(f.read('index.html'),/SEO improvement/);assert.match(f.read('index.html'),/later independent improvement/);
  assert.equal(result.verificationState,'UNVERIFIED');
});
test('revert name alone grants no shared-file exception',t=>{const f=fixture(t);f.put('index.html',f.read('index.html')+'<aside>new UI</aside>\n');assert.equal(f.check(f.initial,f.commit('revert approved change')).eligible,false);});
test('source reference plus an extra unproven edit is rejected',t=>{
  const f=fixture(t);const original=f.read('index.html');f.put('index.html',original.replace('<main>town</main>','<main>town</main>\n<aside>UI</aside>'));const source=f.commit();
  f.put('index.html',original.replace('original','unrelated alteration'));assert.equal(f.check(source,f.commit(reference(source,{'index.html':[1]}))).reason,'NOT_EXACT_SELECTED_REVERSE');
});
test('restore cannot touch security infrastructure, Engine or two works',t=>{
  for(const file of ['tools/change-plan-lock.cjs','engine/core.js','works/other/game.js']){
    const f=fixture(t);const original=f.read('index.html');f.put('index.html',original.replace('<main>town</main>','<main>town</main>\n<aside>UI</aside>'));const source=f.commit();f.put('index.html',original);f.put(file,'changed\n');assert.equal(f.check(source,f.commit(reference(source,{'index.html':[1]}))).eligible,false,file);
  }
});
test('conflicts do not overwrite later dependent improvements',t=>{
  const f=fixture(t);const original=f.read('index.html');f.put('index.html',original.replace('<main>town</main>','<main>town</main>\n<aside>UI</aside>'));const source=f.commit();f.put('index.html',f.read('index.html').replace('<aside>UI</aside>','<aside>later changed UI</aside>'));const base=f.commit();f.put('index.html',original);assert.equal(f.check(base,f.commit(reference(source,{'index.html':[1]}))).eligible,false);
});
test('unreachable source, duplicate and invalid hunk selections fail closed',t=>{
  for(const selection of [{'index.html':[0]},{'index.html':[1,1]},{'index.html':[99]},[]]){
    const f=fixture(t);const original=f.read('index.html');f.put('index.html',original.replace('<main>town</main>','<main>town</main>\n<aside>UI</aside>'));const source=f.commit();f.put('index.html',original);assert.equal(f.check(source,f.commit(reference(source,selection))).eligible,false);
  }
  const f=fixture(t);f.put('index.html',f.read('index.html').replace('original','other'));assert.equal(f.check(f.initial,f.commit(reference('0'.repeat(40),{'index.html':[1]}))).eligible,false);
});
test('local edits that claim exact restore must really prove their source',t=>{const f=fixture(t);f.put('works/existing/game.js','const level = 2;\n');assert.equal(f.check(f.initial,f.commit(reference(f.initial,{'works/existing/game.js':[1]}))).eligible,false);});
test('HTML executable contract restoration stays on the protected route',t=>{
  const f=fixture(t);const original=f.read('index.html');f.put('index.html',original.replace('<main>town</main>','<main>town</main>\n<script>const x = 1;</script>'));const source=f.commit();f.put('index.html',original);assert.equal(f.check(source,f.commit(reference(source,{'index.html':[1]}))).reason,'CONTRACT_REVIEW_REQUIRED');
});
