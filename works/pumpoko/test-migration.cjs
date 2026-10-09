'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),base='8661c64d9f7dcdd4b19e9f95fbb1f58c86c046b6',migration='45c9c6117d7a35382681803df8161753ce28b5aa';
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let gitRoot;try{gitRoot=git('rev-parse','--show-toplevel').toString().trim();}catch(e){throw Error('BLOCKED: migration audit requires the full town Git checkout, including commits '+base+' and '+migration+' and its top-level files; the standalone ZIP does not contain these prerequisites.');}
assert.equal(path.resolve(gitRoot),root,'BLOCKED: run the migration audit from the full town checkout with works/pumpoko intact');
const oldFiles=git('ls-tree','-r','--name-only',base,'works/kotsu-koro').toString().trim().split('\n');
const edits={
 'work-config.js':s=>s.replace('id: "kotsu-koro"','id: "pumpoko"'),
 'sketch.js':s=>s.replace('    audio: SSE.audio.withBaseline({ storageKey: W.id + ".sound", music: {','    // Legacy persistence keys are intentional: renaming the work must not reset saved settings.\n    i18n: { storageKey: "sse:kotsu-koro:language" },\n    audio: SSE.audio.withBaseline({ storageKey: "kotsu-koro.sound", music: {'),
 'builder/builder.js':s=>s.replace('  const m=M.create()', '  // Keep the legacy draft key: existing drafts and TEST START must survive the rename.\n  const m=M.create()').replace("a.download='kotsu-koro-stage.json'","a.download='pumpoko-stage.json'"),
 'test-dynamics.cjs':s=>s.replace("id: 'kotsu-koro'","id: 'pumpoko'"),
 'test-journey.cjs':s=>s.replace("id:'kotsu-koro'","id:'pumpoko'"),
};
// The byte-for-byte migration proof is historical; later work edits do not rewrite it.
test('migration commit preserves every moved byte except its approved naming edits',()=>{
 assert.equal(oldFiles.length,33);
 for(const old of oldFiles){const rel=old.slice('works/kotsu-koro/'.length),before=git('show',base+':'+old),after=git('show',migration+':works/pumpoko/'+rel);
  if(rel==='BUILDER.md')continue;
  if(edits[rel])assert.equal(after.toString(),edits[rel](before.toString()),rel);
  else assert.deepEqual(after,before,rel);
 }
 const unchanged=git('diff','--name-only',base,migration,'--','engine','data','tools','tests','.github','main.js','index.html','style.css').toString();assert.equal(unchanged,'');
 const oldLocks=git('ls-tree','-r','--name-only',base,'.change-plans').toString().trim().split('\n');
 for(const p of oldLocks)assert.deepEqual(fs.readFileSync(path.join(root,p)),git('show',base+':'+p),p);
});
test('current protected gameplay, Builder, assets, save keys and historical evidence retain migration contents',()=>{
 const protectedFiles=oldFiles.map(p=>p.slice('works/kotsu-koro/'.length)).filter(p=>
  /^(assets|audio|builder|fixtures)\//.test(p)||['codea-lite.js','dynamics.js','stage-geometry.js','RESEARCH.md','VALIDATION.md','STAGE1.md','BUILDER.md'].includes(p));
 // Only the authorized canonical course extension is exempt from current
 // stage-data.js byte protection; the migration-commit proof above is exact.
 for(const rel of protectedFiles){
  const before=git('show',migration+':works/pumpoko/'+rel),after=fs.readFileSync(path.join(__dirname,rel));
  if(rel==='fixtures/canonical-baseline.json'){
   // The added old-stage snapshot must retain every frozen historical field
   // and equal the original migration data, rather than rewriting its proof.
   const {stageData,...historical}=JSON.parse(after);assert.deepEqual(historical,JSON.parse(before),rel);
   const context={module:{exports:{}}};vm.runInNewContext(git('show',migration+':works/pumpoko/stage-data.js').toString(),context);
   assert.deepEqual(stageData,JSON.parse(JSON.stringify(context.module.exports)),rel+' historical stageData');
  }else assert.deepEqual(after,before,rel);
 }
 assert.match(read('works/pumpoko/sketch.js'),/storageKey: "kotsu-koro\.sound"/);
 assert.match(read('works/pumpoko/sketch.js'),/storageKey: "sse:kotsu-koro:language"/);
 assert.match(read('works/pumpoko/builder/builder.js'),/kotsu-koro-stage-builder-v1/);
 assert.match(read('works/pumpoko/builder/builder.js'),/pumpoko-stage\.json/);
});
function files(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(p,d.name)):path.relative(root,path.join(p,d.name)));}
test('legacy tree contains only two no-runtime redirect pages',()=>{
 assert.deepEqual(files(path.join(root,'works/kotsu-koro')).sort(),['works/kotsu-koro/builder/index.html','works/kotsu-koro/index.html']);
 for(const p of files(path.join(root,'works/kotsu-koro'))){const html=read(p);assert.doesNotMatch(html,/<script[^>]+src=|<audio|<canvas|<img|http-equiv="refresh"/i);assert.match(html,/<a id="new-entry" href="\.\.\//);}
});
test('fixed same-site redirects preserve site prefixes, query and hash across URL variants',()=>{
 for(const builder of [false,true])for(const prefix of ['', '/yumaniwa-town-staging'])for(const tail of ['', '/', '/index.html']){
  const old=prefix+'/works/kotsu-koro'+(builder?'/builder':'')+tail,expected=prefix+'/works/pumpoko/'+(builder?'builder/':'')+'?dev=1&stage=1&to=https://example.org/evil#anchor';
  const html=read('works/kotsu-koro/'+(builder?'builder/':'')+'index.html');let actual,link={},calls=0;
  const location={pathname:old,search:'?dev=1&stage=1&to=https://example.org/evil',hash:'#anchor',replace(v){actual=v;calls++;}};
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{location,document:{getElementById:()=>link}});
  assert.equal(actual,expected);assert.equal(link.href,expected);assert.equal(calls,1);
 }
});
