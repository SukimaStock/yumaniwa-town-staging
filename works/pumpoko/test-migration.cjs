'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),base='8661c64d9f7dcdd4b19e9f95fbb1f58c86c046b6';
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const oldFiles=git('ls-tree','-r','--name-only',base,'works/kotsu-koro').toString().trim().split('\n');
const edits={
 'work-config.js':s=>s.replace('id: "kotsu-koro"','id: "pumpoko"'),
 'sketch.js':s=>s.replace('    audio: SSE.audio.withBaseline({ storageKey: W.id + ".sound", music: {','    // Legacy persistence keys are intentional: renaming the work must not reset saved settings.\n    i18n: { storageKey: "sse:kotsu-koro:language" },\n    audio: SSE.audio.withBaseline({ storageKey: "kotsu-koro.sound", music: {'),
 'builder/builder.js':s=>s.replace('  const m=M.create()', '  // Keep the legacy draft key: existing drafts and TEST START must survive the rename.\n  const m=M.create()').replace("a.download='kotsu-koro-stage.json'","a.download='pumpoko-stage.json'"),
 'test-dynamics.cjs':s=>s.replace("id: 'kotsu-koro'","id: 'pumpoko'"),
 'test-journey.cjs':s=>s.replace("id:'kotsu-koro'","id:'pumpoko'"),
};
test('all moved runtime, stage, assets and evidence bytes match baseline except approved naming edits',()=>{
 assert.equal(oldFiles.length,33);
 for(const old of oldFiles){const rel=old.slice('works/kotsu-koro/'.length),before=git('show',base+':'+old),after=fs.readFileSync(path.join(__dirname,rel));
  if(rel==='BUILDER.md')continue;
  if(edits[rel])assert.equal(after.toString(),edits[rel](before.toString()),rel);
  else assert.deepEqual(after,before,rel);
 }
 const unchanged=git('diff','--name-only',base,'--','engine','data','tools','tests','.github','main.js','index.html','style.css').toString();assert.equal(unchanged,'');
 const oldLocks=git('ls-tree','-r','--name-only',base,'.change-plans').toString().trim().split('\n');
 for(const p of oldLocks)assert.deepEqual(fs.readFileSync(path.join(root,p)),git('show',base+':'+p),p);
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
