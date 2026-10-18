'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tool=require('../tools/shinpo-migrate.cjs');
const baseline='644ce1e04a999cf575bd6affe2a24e374fe1125e';
const git=(cwd,...args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const run=(cwd,...args)=>cp.execFileSync(process.execPath,['tools/shinpo-migrate.cjs',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const compact=s=>s.replace(/>\s+</g,'><').trim();

test('existing three articles preserve ordered content, links, images, metadata and CSS',()=>{
 for(const m of ['note-20260717-153a44e0','95d48e6613ce4037907364809ee3359f','31beb527cad14b72a2afdc57f4b986b4'].map(tool.metadata)) {
  const a=tool.load(m.id), generated=tool.render(a,m);
  let old=git(root,'show',baseline+':shinpo/'+a.slug+'/index.html');
  // Parent rechecked original note on 2026-10-18: restore source links, preserving all other baseline content.
  const sourceLinks = a.slug === 'town-beginning' ? { '../../w/yakitori-wars/':'https://sukimastock.itch.io/yakitori-wars', '../../w/midnight-cola/':'https://sukimastock.itch.io/midnight-cola' } : a.slug === 'game-app-in-between' ? { 'https://pic.twitter.com/LawEbLaWw9':'https://x.com/sukimastock/status/2053552847078170744', 'https://pic.twitter.com/8UypJUbbc4M':'https://x.com/sukimastock/status/2056457725253427457', 'https://pic.twitter.com/7sO1Ecec4M':'https://x.com/sukimastock/status/2054447396487102904' } : {};
  for(const [from,to] of Object.entries(sourceLinks)) old=old.replaceAll('href="'+from+'"','href="'+to+'"');
  if(a.slug==='town-beginning') old=old.replace('<a class="source-preview" href="../../">','<a class="source-preview" href="https://sukimastock.github.io/yumaniwa-town/">');
  // Explicit owner correction on 2026-10-18 is limited to these source links.
  if(a.slug==='town-beginning') {
   old=old.replace(/<a href="https:\/\/sukimastock\.itch\.io\/[^"]+">([^<]+)<\/a>/g,'$1');
   old=old.replace(/<a class="source-preview" href="https:\/\/sukimastock\.itch\.io\/[^"]+" target="_blank" rel="noopener noreferrer">(.*?)<\/a>/g,'<div class="source-preview">$1</div>');
  }
  if(a.slug==='board-game-making')old=old.replace('href="https://sukimastock.itch.io/yakitori-wars" target="_blank" rel="noopener noreferrer"','href="../../w/yakitori-wars/"').replace('sukimastock.itch.io ↗','湯間庭町 ↗');
  const withoutRestoredMedia=generated.replace(/<figure><img src="\.\.\/\.\.\/assets\/shinpo\/(?:board-game-making\/body-[1-5]|town-beginning\/town-animation|game-app-in-between\/(?:cow-suction|faucet-ghost|tofu-tower))\.webp"[^>]*>(?:<figcaption>[^<]*<\/figcaption>)?<\/figure>/g,'');
  old=old.replace(/<aside class="media-note"[\s\S]*?<\/aside>/g,'');
  assert.equal(compact(withoutRestoredMedia),compact(old),a.slug);
  assert.equal(generated,fs.readFileSync(path.join(root,'shinpo',a.slug,'index.html'),'utf8'));
 }
 assert.equal(tool.load('95d48e6613ce4037907364809ee3359f').blocks.filter(b=>b.origin==='editorial-media-note').length,0);
 assert.equal(tool.load('31beb527cad14b72a2afdc57f4b986b4').blocks.filter(b=>b.html.includes('video-citation')).length,3);
});
test('dry-run is deterministic, read-only, and regeneration is already clean',()=>{
 const before=git(root,'status','--porcelain');
 assert.equal(run(root,'dry-run'),run(root,'dry-run'));
 run(root,'check');
 assert.equal(git(root,'status','--porcelain'),before);
});
test('isolated next-article flow: official lock, interrupted import, idempotence and PR reconciliation',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shinpo-test-'));
 const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),s);};
 try {
  for(const p of ['tools/shinpo-migrate.cjs','tools/shinpo-template.html','tools/change-plan-lock.cjs','tools/change-scope-guard.cjs']) write(p,fs.readFileSync(path.join(root,p)));
  write('data/notes.js','var NOTE_ARTICLES = [\n{id: "note-new", title: "新しい原文", url: "https://note.com/example/n/n123", publishedAt: "2026-10-18"}\n];\n');
  write('assets/shinpo/original.png',fs.readFileSync(path.join(root,'assets/shinpo/town-beginning/cover.png')));
  git(dir,'init','-q');git(dir,'config','user.name','Fixture');git(dir,'config','user.email','fixture@example.invalid');git(dir,'add','.');git(dir,'commit','-qm','baseline');
  git(dir,'remote','add','origin','https://github.com/SukimaStock/yumaniwa-town-staging.git');git(dir,'update-ref','refs/remotes/origin/main','HEAD');git(dir,'switch','-c','article-fixture');
  const base=git(dir,'rev-parse','HEAD'), lock='.change-plans/shinpo-note-new/r0.lock.json';
  const args=['--id','note-new','--slug','new-article','--cover','assets/shinpo/original.png','--source-ref','original fixture','--authority','Fixture: staging only'];
  const plan=JSON.parse(run(dir,'plan',...args,'--assets','assets/shinpo/body-1.png,assets/shinpo/body-2.png'));assert.ok(plan.allowedPaths.includes('assets/shinpo/body-2.png'));assert.equal(plan.planLevel,'full');assert.ok(plan.impactChecks.includes('risk.high-risk-review'));
  run(dir,'plan',...args,'--lock',lock);
  const body=path.join(os.tmpdir(),path.basename(dir)+'-body.html');fs.writeFileSync(body,'<p>元の本文。</p>\n<p><a href="https://example.com/original">元のリンク</a></p>\n');
  try {
   const input=[...args,'--body',body];
   assert.throws(()=>run(dir,'import',...input,'--lock',lock),/Command failed/);
   git(dir,'add',lock);git(dir,'commit','-qm','lock alone');
   const state=JSON.parse(run(dir,'resume','--lock',lock));assert.equal(state.baseAdvanced,false);assert.deepEqual(state.articles,[]);
   const planned=JSON.parse(run(dir,'resume','--lock',lock));assert.equal(planned.articles.length,0);
   const before=git(dir,'status','--porcelain');assert.equal(run(dir,'dry-run',...input),run(dir,'dry-run',...input));assert.equal(git(dir,'status','--porcelain'),before);
   run(dir,'import',...input,'--lock',lock);
   // Model interruption after data was saved but before canonical registration.
   write('data/notes.js',git(dir,'show',base+':data/notes.js')+'\n');
   assert.equal(JSON.parse(run(dir,'resume','--lock',lock)).articles[0].needsRegistration,true);
   run(dir,'import',...input,'--lock',lock);
   // Model interruption after data/notes were saved but before HTML was atomically renamed.
   fs.rmSync(path.join(dir,'shinpo/new-article/index.html'));
   assert.equal(JSON.parse(run(dir,'resume','--lock',lock)).articles[0].status,'create');
   run(dir,'import',...input,'--lock',lock);run(dir,'check');
   const first=git(dir,'diff');run(dir,'import',...input,'--lock',lock);run(dir,'generate','--lock',lock);assert.equal(git(dir,'diff'),first);
   const prfile=path.join(os.tmpdir(),path.basename(dir)+'-prs.json');
   try {
    fs.writeFileSync(prfile,JSON.stringify([{number:123,head:'article-fixture',state:'open',head_sha:git(dir,'rev-parse','HEAD')}]));
    assert.match(JSON.parse(run(dir,'resume','--lock',lock,'--pr-state',prfile)).next,/Existing PR/);
    fs.writeFileSync(prfile,JSON.stringify([{number:123,head:'article-fixture',state:'closed',merged:true}]));
    assert.match(JSON.parse(run(dir,'resume','--lock',lock,'--pr-state',prfile)).next,/Merged PR/);
   }finally{fs.rmSync(prfile,{force:true});}
   git(dir,'add','.');git(dir,'commit','-qm','article');git(dir,'update-ref','refs/remotes/origin/main','HEAD');
   assert.equal(JSON.parse(run(dir,'resume','--lock',lock)).baseAdvanced,true);
   assert.throws(()=>run(dir,'generate','--lock',lock),/Command failed/);
   git(dir,'update-ref','refs/remotes/origin/main',base);
   const original=fs.readFileSync(path.join(dir,lock),'utf8');const tampered=JSON.parse(original);tampered.plan.change+=' changed';write(lock,JSON.stringify(tampered));
   assert.throws(()=>run(dir,'generate','--lock',lock),/Command failed/);write(lock,original);
   const data=JSON.parse(fs.readFileSync(path.join(dir,'data/shinpo/note-new.json'),'utf8'));data.slug='different-url';write('data/shinpo/note-new.json',JSON.stringify(data));
   assert.throws(()=>run(dir,'check'),/Command failed/);
  } finally {fs.rmSync(body,{force:true});}
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('article headers have no added subtitle and metadata descriptions are optional',()=>{
 for(const id of ['note-20260717-153a44e0','95d48e6613ce4037907364809ee3359f','31beb527cad14b72a2afdc57f4b986b4']) {
  const a=tool.load(id),m=tool.metadata(id);
  delete a.description;delete a.ogDescription;
  const html=tool.render(a,m);
  assert(html.includes('<meta name="description" content="'+m.title+'">'));
  assert(html.includes('<meta property="og:description" content="'+m.title+'">'));
  const header=html.split('<article class="paper"')[1].split('<p>')[0];
  assert(!/class="(?:article-kicker|[^\"]*subtitle|[^\"]*teaser)"/.test(header));
  assert(!header.includes('はままぁの制作記録。'));
  assert(html.includes(a.blocks.map(b=>b.html).join('\n')));
 }
});
