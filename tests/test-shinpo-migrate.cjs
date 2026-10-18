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
  // Current owner instruction restores this one town card to its environment-relative URL.
  // Explicit owner correction on 2026-10-18 is limited to these source links.
  if(a.slug==='town-beginning') {
   old=old.replace(/<a href="https:\/\/sukimastock\.itch\.io\/[^"]+">([^<]+)<\/a>/g,'$1');
   old=old.replace(/<a class="source-preview" href="https:\/\/sukimastock\.itch\.io\/[^"]+" target="_blank" rel="noopener noreferrer">(.*?)<\/a>/g,'<div class="source-preview">$1</div>');
  }
  if(a.slug==='board-game-making')old=old.replace('href="https://sukimastock.itch.io/yakitori-wars" target="_blank" rel="noopener noreferrer"','href="../../w/yakitori-wars/"').replace('sukimastock.itch.io ↗','湯間庭町 ↗');
  const withoutRestoredMedia=generated.replace(/<figure><img src="\.\.\/\.\.\/assets\/shinpo\/(?:board-game-making\/body-[1-5]|town-beginning\/town-animation|game-app-in-between\/(?:cow-suction|faucet-ghost|tofu-tower))\.webp"[^>]*>(?:<figcaption>[^<]*<\/figcaption>)?<\/figure>/g,'');
  old=old.replace(/<aside class="media-note"[\s\S]*?<\/aside>/g,'');
  const paper=s=>s.match(/<article class="paper"[\s\S]*?<\/article>/)[0];
  const normalizeImages=s=>compact(s.replace(/<img\b[^>]*>/g,tag=>tag.replace(/\s(?:width|height|alt)="[^"]*"/g,'')));
  assert.equal(normalizeImages(paper(withoutRestoredMedia)),normalizeImages(paper(old)),a.slug+' source paper');
  assert.equal(compact(generated.match(/<aside class="afterword"[\s\S]*?<\/aside>/)[0]),compact(old.match(/<aside class="afterword"[\s\S]*?<\/aside>/)[0]),a.slug+' source attribution');
  const style=s=>s.match(/<style>([\s\S]*?)<\/style>/)[1];
  const navigationCss='nav .nav-links{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}nav{flex-wrap:wrap}h1,.afterword a{overflow-wrap:anywhere}';
  assert.equal(style(generated).replace(navigationCss,''),style(old),a.slug+' preserved paper styling');
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
  for(const p of ['tools/shinpo-migrate.cjs','tools/shinpo-template.html','tools/shinpo-index-template.html','tools/site-environment.cjs','tools/change-plan-lock.cjs','tools/change-scope-guard.cjs']) write(p,fs.readFileSync(path.join(root,p)));
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
   const backnumber=fs.readFileSync(path.join(dir,'shinpo/index.html'),'utf8');
   assert.equal((backnumber.match(/href="\.\/new-article\/"/g)||[]).length,1);
   assert(backnumber.includes('<time datetime="2026-10-18">2026-10-18</time>'));
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

test('backnumbers expose every registered local article once, in publication order, with environment metadata',()=>{
 const all=tool.articleCatalog();
 const registered=tool.notes().filter(m=>m.archivePage);
 assert.deepEqual(new Set(all.map(a=>a.id)),new Set(registered.map(a=>a.id)));
 const page=tool.renderIndex(all);
 assert(!/<script\b/.test(page));
 for(const a of all){
  assert.equal(page.split('href="./'+a.slug+'/"').length-1,1);
  assert(page.includes('<time datetime="'+a.date+'">'+a.date+'</time>'));
  assert(tool.render(tool.load(a.id),tool.metadata(a.id)).includes('<a href="../">バックナンバー</a>'));
 }
 assert.deepEqual(all.map(a=>a.date),all.map(a=>a.date).sort().reverse());
 assert(page.includes('noindex,nofollow'));
 assert(page.includes('href="https://sukimastock.github.io/yumaniwa-town-staging/shinpo/"'));
 const id='note-20261009-n308001a6a00a',m=tool.metadata(id),a=tool.load(id);
 const selected=tool.articleCatalog({env:'production',publishedArticles:[id]});
 assert.deepEqual(selected.map(a=>a.id),[id]);
 assert.equal(tool.articleCatalog({env:'production'}).length,0);
 assert.throws(()=>tool.articleCatalog({env:'preview'}),/Unknown site environment/);
 assert.throws(()=>tool.articleCatalog({env:'production',publishedArticles:[id,id]}),/Duplicate/);
 assert.throws(()=>tool.articleCatalog({env:'production',publishedArticles:['missing']}),/Unknown published article/);
 assert.throws(()=>tool.articleCatalog({env:'production',publishedArticles:['ea784083edc146d298ba5b7c33a1b7f1']}),/Unselected article link/);
 assert.equal(tool.articleCatalog({env:'production',publishedArticles:all.map(a=>a.id)}).length,all.length);
 const html=tool.render(a,m,'production');
 assert(html.includes('content="index,follow,max-image-preview:large"'));
 assert(html.includes('href="https://sukimastock.github.io/yumaniwa-town/shinpo/orbit-remaking/"'));
 assert(html.includes('content="https://sukimastock.github.io/yumaniwa-town/assets/shinpo/orbit-remaking/cover.png"'));
 assert(!html.includes('yumaniwa-town-staging'));
 const expected=tool.outputs({env:'production','published-articles':id});
 assert.deepEqual([...expected.keys()].sort(),['shinpo/index.html','shinpo/orbit-remaking/index.html']);
 const stage=tool.render(a,m);
 assert(stage.includes('content="https://sukimastock.github.io/yumaniwa-town-staging/assets/shinpo/orbit-remaking/cover.png"'));
});

test('connection edit preserves all source prose and asset references; only the five authorized hrefs change',()=>{
 const before='3a50c4852af0422cc028a6c007d04182cd5c5a26';
 const expected={
  'town-beginning':[['https://sukimastock.github.io/yumaniwa-town/','../../']],
  'yakitori-remake':[['https://note.com/hamamah/n/n0ca130319cac','../board-game-making/']],
  'making-like-craft':[['https://note.com/hamamah/n/n0ca130319cac','../board-game-making/'],['https://note.com/hamamah/n/nca6b0ef9db94','../touch-doodles/']],
  'touch-doodles':[['https://note.com/hamamah/n/n16f7a42c0b6a','../game-app-in-between/']]
 };
 const imageAttributes=s=>s.replace(/<img\b[^>]*>/g,tag=>tag.replace(/\s(?:width|height|alt)="[^"]*"/g,''));
 for(const row of tool.articleCatalog()){
  const a=tool.load(row.id),old=JSON.parse(git(root,'show',before+':data/shinpo/'+row.id+'.json'));
  // 2026-10-18 owner requested connection to the now-published CoffeeFactory Web edition.
  const expectedGuidance=row.slug==='leftover-details'
   ? old.afterword.replace('<div class="links">','<div class="links"><a href="../../w/coffee-factory/">CoffeeFactory（現在のWeb版）↗</a>')
   : old.afterword;
  assert.equal(a.afterword,expectedGuidance,row.slug+' attribution and guidance');
  assert.equal(imageAttributes(a.cover),imageAttributes(old.cover),row.slug+' cover');
  assert.equal(a.blocks.length,old.blocks.length);
  a.blocks.forEach((b,i)=>{
   let prior=old.blocks[i].html;
   for(const [from,to] of expected[row.slug]||[])prior=prior.replaceAll('href="'+from+'"','href="'+to+'"');
   assert.equal(imageAttributes(b.html),imageAttributes(prior),row.slug+' block '+i);
   assert.equal(b.origin,old.blocks[i].origin);
  });
  for(const img of (a.cover+a.blocks.map(b=>b.html).join('')).matchAll(/<img\b[^>]*>/g)){
   assert.match(img[0],/\bwidth="[1-9]\d*"/);assert.match(img[0],/\bheight="[1-9]\d*"/);
   assert(!img[0].includes('alt="画像"'));
  }
 }
});


test('production guidance edition omits only unpublished AmberTime while preserving historical source',()=>{
 const a=tool.load('note-20260807-n845da26b1b0b'),m=tool.metadata(a.id);
 const anchor='<a href="../../works/ambertime/">AmberTime（現在のWeb版）↗</a>';
 assert(a.afterword.includes(anchor));
 assert.equal(a.afterwordProduction,a.afterword.replace(anchor,''));
 const original=JSON.stringify(a.blocks),stage=tool.render(a,m),production=tool.render(a,m,'production');
 assert(stage.includes(anchor));assert(!production.includes(anchor));
 assert.equal(tool.edition(a,'staging'),a);
 assert.equal(tool.edition({...a,afterwordProduction:undefined},'production').afterword,a.afterword);
 assert.equal(tool.edition(a,'production').afterword,a.afterwordProduction);
 assert.equal(JSON.stringify(a.blocks),original);
 assert(stage.includes(a.blocks.map(b=>b.html).join('\n')));
 assert(production.includes(a.blocks.map(b=>b.html).join('\n')));
 assert(production.includes(m.url));
 assert.throws(()=>tool.edition({...a,afterwordProduction:'<script>bad()</script>'},'production'),/Active content/);
 const all=tool.articleCatalog();
 assert.equal(tool.articleCatalog({env:'production',publishedArticles:all.map(a=>a.id)}).length,all.length);
});


test('production outputs validate the selected guidance without an unpublished work directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shinpo-production-edition-'));
 try {
  const copy=p=>{const target=path.join(dir,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target);};
  for(const p of ['tools/shinpo-migrate.cjs','tools/site-environment.cjs','tools/shinpo-template.html','tools/shinpo-index-template.html','data/notes.js'])copy(p);
  for(const p of fs.readdirSync(path.join(root,'data/shinpo')))copy('data/shinpo/'+p);
  const all=tool.articleCatalog();
  for(const row of all){
   fs.mkdirSync(path.join(dir,'shinpo',row.slug),{recursive:true});
   const a=tool.edition(tool.load(row.id),'production');
   for(const url of tool.load(row.id).cover.concat(a.blocks.map(b=>b.html).join(''),a.afterword).matchAll(/(?:href|src)="([^"#]*)"/g)){
    const u=url[1];if(/^https?:/.test(u))continue;
    const target=path.resolve(dir,'shinpo',a.slug,u.split(/[?#]/)[0]);
    if(target===dir || target.startsWith(path.join(dir,'shinpo')))continue;
    fs.mkdirSync(path.dirname(target),{recursive:true});
    if(u.split(/[?#]/)[0].endsWith('/'))fs.mkdirSync(target,{recursive:true});else fs.writeFileSync(target,'fixture');
   }
  }
  assert(!fs.existsSync(path.join(dir,'works/ambertime')));
  const result=cp.execFileSync(process.execPath,['-e',"const t=require('./tools/shinpo-migrate.cjs');const ids=t.notes().filter(a=>a.archivePage).map(a=>a.id).join(',');const o=t.outputs({env:'production','published-articles':ids});console.log(JSON.stringify([...o.keys()]));"],{cwd:dir,encoding:'utf8'});
  assert.equal(JSON.parse(result).length,all.length+1);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
