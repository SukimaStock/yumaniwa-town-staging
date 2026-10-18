'use strict';
// Build-time only. Never creates PRs, fetches remote data, or publishes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const {siteEnvironment} = require('./site-environment.cjs');
const ROOT = path.resolve(__dirname, '..');
const REPO = 'SukimaStock/yumaniwa-town-staging';
const read = (p, root=ROOT) => fs.readFileSync(path.resolve(root, p), 'utf8');
const exists = (p, root=ROOT) => fs.existsSync(path.resolve(root, p));
const digest = s => crypto.createHash('sha256').update(s).digest('hex'); // Content only; never Plan digests.
const git = (...args) => cp.execFileSync('git', args, {cwd: ROOT, encoding:'utf8'}).trim();
const escape = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const assert = (ok, why) => { if (!ok) throw new Error(why); };
function slug(s) { assert(/^[a-z0-9][a-z0-9-]{1,79}$/.test(s || ''), 'Invalid ID/slug'); return s; }
function notes(root=ROOT) {
  const source = read('data/notes.js',root);
  const start = source.indexOf('var NOTE_ARTICLES = [');
  const end = source.indexOf('\n];', start);
  assert(start >= 0 && end > start, 'Cannot locate canonical NOTE_ARTICLES');
  const box = {};
  vm.runInNewContext(source.slice(start, end + 3), box, {timeout:1000});
  const rows = JSON.parse(JSON.stringify(box.NOTE_ARTICLES));
  assert(new Set(rows.map(a=>a.id)).size === rows.length, 'Duplicate canonical article ID');
  return rows;
}
function metadata(id) { const a = notes().find(a=>a.id === id); assert(a, 'Unknown canonical article ID: '+id); return a; }
function files(root=ROOT) { return exists('data/shinpo',root) ? fs.readdirSync(path.join(root,'data/shinpo')).filter(f=>f.endsWith('.json')).sort().map(f=>'data/shinpo/'+f) : []; }
function load(id) { return JSON.parse(read('data/shinpo/'+slug(id)+'.json')); }
function links(html) { return [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map(m=>m[1]); }
function safeFragment(html) {
  assert(typeof html === 'string' && !/<\/?(?:script|iframe|object|embed|style|link|meta|base|form)\b|\son\w+\s*=|javascript:|data:text\/html/i.test(html), 'Active content is not allowed in article fragments');
}
function validate(a, m, pending = false, root=ROOT) {
  slug(a.id); slug(a.slug);
  assert(a.id === m.id, 'ID mismatch');
  assert(a.source && a.source.reference && a.source.verification && Array.isArray(a.source.missingMedia), 'Source reference, verification and missing media are required');
  assert(Array.isArray(a.blocks) && a.blocks.length, 'Ordered source blocks required');
  a.blocks.forEach(b=>{ assert(['source','editorial-media-note'].includes(b.origin), 'Unknown block provenance'); safeFragment(b.html); });
  safeFragment(a.cover); safeFragment(a.afterword);
  assert(a.afterword.includes('class="afterword"') && a.afterword.includes(m.url), 'Separate town guidance must retain canonical note source');
  assert(!m.archivePage || m.archivePage === './shinpo/'+a.slug+'/', 'Existing article URL must not change');
  assert(pending || m.archivePage, 'Register archivePage in canonical notes record');
  const date=m.publishedAt || m.publish_date;
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date), 'Canonical publication date required');
  const visibleDate=s=>String(s).replace(/(\d+)年(\d+)月(\d+)日/,(_,y,mo,d)=>y+'-'+mo.padStart(2,'0')+'-'+d.padStart(2,'0'));
  assert(visibleDate(a.navDate)===date && visibleDate(a.displayDate)===date,'Stale visible date: reconcile with canonical notes metadata');
  assert(a.afterword.includes(escape(m.title)) && (a.afterword.includes(date) || a.afterword.includes(a.displayDate)), 'Stale canonical attribution: reconcile title/date with notes');
  for (const f of files(root)) {
    const other = JSON.parse(read(f,root));
    assert(other.id === a.id || other.slug !== a.slug, 'Slug already belongs to another ID');
  }
  for (const row of notes(root)) assert(row.id === a.id || row.archivePage !== './shinpo/'+a.slug+'/', 'URL already registered to another ID');
  for (const url of links(a.cover + a.blocks.map(b=>b.html).join('') + a.afterword)) {
    assert(!/^(?:javascript|data):/i.test(url), 'Unsafe link');
    if (/^https?:\/\//.test(url) || url.startsWith('#')) continue;
    const resolved = path.resolve(root,'shinpo',a.slug,url.split(/[?#]/)[0]);
    assert((resolved === root || resolved.startsWith(root+path.sep)), 'Link outside repository');
    assert(fs.existsSync(resolved), 'Missing local link/image: '+url);
  }
}
function edition(a, env = 'staging') {
  siteEnvironment(env);
  if (env !== 'production' || a.afterwordProduction === undefined) return a;
  safeFragment(a.afterwordProduction);
  return {...a, afterword:a.afterwordProduction};
}
function articleCatalog(options = {}) {
  const root = path.resolve(options.root || ROOT);
  const env = options.env || 'staging';
  siteEnvironment(env);
  const selected = options.publishedArticles || [];
  assert(Array.isArray(selected) && new Set(selected).size === selected.length, 'Duplicate or invalid published article IDs');
  const all = files(root).map(f=>edition(JSON.parse(read(f,root)),env));
  if (options.extra) {
    const i = all.findIndex(a=>a.id===options.extra.id);
    if(i<0) all.push(options.extra); else all[i]=options.extra;
  }
  const rows = all.map(a=>{
    const m = notes(root).find(m=>m.id===a.id);
    assert(m,'Unknown canonical article ID: '+a.id);
    validate(a,m,options.extra?.id===a.id,root);
    return {id:a.id,slug:a.slug,title:m.title,date:m.publishedAt || m.publish_date,url:'shinpo/'+a.slug+'/'};
  });
  const ids = new Set(rows.map(a=>a.id));
  for(const m of notes(root).filter(m=>m.archivePage)) assert(ids.has(m.id), 'Registered article has no canonical data: '+m.id);
  for(const id of selected) assert(ids.has(id), 'Unknown published article: '+id);
  assert(new Set(rows.map(a=>a.slug)).size===rows.length,'Duplicate archive slug');
  if(env==='production') {
    const selectedSlugs=new Set(rows.filter(a=>selected.includes(a.id)).map(a=>a.slug));
    for(const a of all.filter(a=>selected.includes(a.id))) {
      for(const match of (a.cover+a.blocks.map(b=>b.html).join('')+a.afterword).matchAll(/href="([^"]*)"/g)) {
        const href=match[1];
        if(/^(?:https?:\/\/|#)/.test(href))continue;
        const resolved=path.resolve(root,'shinpo',a.slug,href.split(/[?#]/)[0]);
        const rel=path.relative(path.join(root,'shinpo'),resolved).replaceAll(path.sep,'/');
        if(rel && !rel.startsWith('..')) {
          const target=rel.replace(/\/index\.html$/,'').replace(/\/$/,'');
          assert(selectedSlugs.has(target),'Unselected article link from '+a.slug+': '+href+'; explicitly include the linked article');
        }
      }
    }
  }
  return rows.filter(a=>env==='staging' || selected.includes(a.id)).sort((a,b)=>b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
function renderIndex(catalog, env = 'staging') {
  const site = siteEnvironment(env);
  const entries = catalog.map(a=>'<li><time datetime="'+escape(a.date)+'">'+escape(a.date)+'</time><a href="./'+escape(a.slug)+'/">'+escape(a.title)+'</a></li>').join('\n');
  const values={robots:site.robots,canonical:site.base+'/shinpo/',entries};
  return read('tools/shinpo-index-template.html').replace(/\{\{(\w+)\}\}/g,(_,k)=>{assert(k in values,'Unknown index field '+k);return values[k];});
}
function render(a, m, env = 'staging') {
  a = edition(a,env);
  validate(a,m,true);
  const site = siteEnvironment(env);
  const img = a.cover.match(/src="\.\.\/\.\.\/(assets\/shinpo\/[^"?]+)"/);
  assert(img,'Cover must use an acquired local assets/shinpo image');
  const values = {title:escape(m.title), date:escape(m.publishedAt || m.publish_date), description:escape(a.description || m.title), ogDescription:escape(a.ogDescription || m.title), robots:site.robots, canonical:site.base+'/shinpo/'+a.slug+'/', ogImage:site.base+'/'+img[1], navDate:escape(a.navDate), displayDate:escape(a.displayDate), cover:a.cover, body:a.blocks.map(b=>b.html).join('\n'), afterword:a.afterword};
  return read('tools/shinpo-template.html').replace(/\{\{#backnumber\}\}([\s\S]*?)\{\{\/backnumber\}\}/g,(_,css)=>a.backnumber ? css : '').replace(/\{\{(\w+)\}\}/g,(_,k)=>{assert(k in values,'Unknown template field '+k);return values[k];});
}
function prospective(o) {
  const m = metadata(o.id), id = slug(o.id), name = slug(o.slug);
  assert(o.body && o.cover && o['source-ref'],'--body, --cover and --source-ref required');
  assert(/^assets\/shinpo\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp)$/.test(o.cover) && !o.cover.includes('..'), 'Invalid acquired image path');
  const date = m.publishedAt || m.publish_date, [y,mo,d] = date.split('-');
  const body = fs.readFileSync(o.body,'utf8').trim();
  // One top-level block per nonempty line; preparer supplies original HTML, never inferred prose.
  const blocks = body.split(/\r?\n/).filter(s=>s.trim()).map(html=>({origin: html.includes('class="media-note"') ? 'editorial-media-note' : 'source', html}));
  const a = {id,slug:name,source:{reference:o['source-ref'],verification:o.verification || 'UNVERIFIED: compare original before merge',missingMedia:o.missing ? o.missing.split('|') : []},cover:'<figure><img src="../../'+o.cover+'" alt="'+escape(o['cover-alt'] || m.title+'の元掲載画像')+'" fetchpriority="high"></figure>',navDate:`${y}年${mo}月${d}日`,displayDate:`${y}年${Number(mo)}月${Number(d)}日`,backnumber:true,blocks,afterword:'<aside class="afterword" aria-label="記事本文の外側にある町内案内"><h2>この町をもう少し歩く</h2><div class="links"><a href="../../?place=shinpo_board">ほかの新聞を読む ↗</a><a href="../../">町を歩く ↗</a></div><div class="source">原典：はままぁ「'+escape(m.title)+'」（note、'+date+'）。<a href="'+escape(m.url)+'" target="_blank" rel="noopener noreferrer">note版を開く ↗</a></div></aside>'};
  return a;
}
function registration(a, m) {
  const source = read('data/notes.js');
  if (m.archivePage) return source;
  const needle = 'id: "'+m.id+'",';
  assert(source.split(needle).length === 2, 'Canonical ID registration is ambiguous');
  return source.replace(needle,needle+'\n        archivePage: "./shinpo/'+a.slug+'/",');
}
function outputs(o) {
  const env = o.env || 'staging';
  const publishedArticles = o['published-articles'] ? o['published-articles'].split(',').map(s=>s.trim()).filter(Boolean) : [];
  const catalog = articleCatalog({env,publishedArticles,...(o.body ? {extra:prospective(o)} : {})});
  const ids = o.id ? [slug(o.id)] : catalog.map(a=>a.id);
  if(env==='production') for(const id of ids) assert(publishedArticles.includes(id),'Production article must be explicitly selected: '+id);
  const out = new Map();
  for(const id of ids) {
    const a = o.body ? prospective(o) : load(id), m = metadata(id);
    validate(edition(a,env),m,!!o.body);
    if(o.body) {
      assert(exists('data/shinpo/'+id+'.json') || !exists('shinpo/'+a.slug+'/index.html'), 'Unregistered existing HTML: inspect before import');
      const p = 'data/shinpo/'+id+'.json', data = JSON.stringify(a,null,2)+'\n';
      assert(!exists(p) || read(p) === data, 'ID already imported with different data; review existing source instead of duplicating');
      out.set(p,data); out.set('data/notes.js',registration(a,m));
    }
    out.set('shinpo/'+a.slug+'/index.html',render(a,m,env));
  }
  out.set('shinpo/index.html',renderIndex(catalog,env));
  return out;
}
function summary(out) { return [...out].map(([p,s])=>({path:p,sha256:digest(s),status:exists(p) ? (read(p)===s ? 'unchanged':'update'):'create'})); }
function official(mode, flag, value) { return cp.execFileSync(process.execPath,[path.join(ROOT,'tools/change-plan-lock.cjs'),mode,flag,value],{cwd:ROOT,encoding:'utf8'}); }
function guard(lockPath, paths) {
  assert(lockPath,'--lock required before writes');
  official('verify','--lock',path.resolve(ROOT,lockPath));
  const lock = JSON.parse(read(lockPath)), p = lock.plan;
  assert(p.revision === 0, 'Only a fresh single r0 is supported');
  assert(p.repository===REPO && p.environment==='staging','Staging repository lock required');
  assert(/SukimaStock\/yumaniwa-town-staging(?:\.git)?$/.test(git('remote','get-url','origin')),'Wrong origin');
  assert(!['main','HEAD'].includes(git('rev-parse','--abbrev-ref','HEAD')),'Use an isolated branch');
  assert(git('rev-parse','origin/main')===p.baseSha,'Base advanced: reconcile remote/PR and prepare a fresh r0 branch; never edit this lock');
  const rel = path.relative(ROOT,path.resolve(ROOT,lockPath));
  const commits = git('rev-list','--reverse',p.baseSha+'..HEAD').split('\n').filter(Boolean);
  assert(commits.length,'Commit the lock alone before implementation');
  assert(git('rev-parse',commits[0]+'^')===p.baseSha,'Lock must directly follow the locked base');
  const locks=git('diff','--name-only',p.baseSha,'HEAD','--','.change-plans').split('\n').filter(Boolean);
  assert(locks.length===1 && locks[0]===rel,'Exactly one new Plan Lock per PR');
  assert(git('diff-tree','--no-commit-id','--name-only','-r',commits[0])===rel,'First commit must contain exactly this single lock');
  assert(git('show',commits[0]+':'+rel)===read(lockPath).trim(),'Lock changed after its first commit');
  const {matches}=require('./change-scope-guard.cjs');
  paths.forEach(f=>assert(!p.forbiddenPaths.some(x=>matches(x,f)) && p.allowedPaths.some(x=>matches(x,f)), 'Path outside locked allowed scope: '+f));
  return lock;
}
function writeOutputs(out, lockPath) {
  const changed = summary(out).filter(s=>s.status!=='unchanged');
  guard(lockPath,changed.map(s=>s.path));
  for(const {path:p} of changed) {
    const target=path.join(ROOT,p); fs.mkdirSync(path.dirname(target),{recursive:true});
    const temp=target+'.shinpo-tmp'; fs.writeFileSync(temp,out.get(p)); fs.renameSync(temp,target);
  }
  return summary(out);
}
function plan(o) {
  const m = metadata(o.id), name = slug(o.slug || (m.archivePage || '').split('/')[2]);
  const changeId=slug(o.change || 'shinpo-'+slug(o.id));
  assert(o.authority,'--authority must quote the actual staging instruction; not an approval generator');
  const base=git('rev-parse','origin/main');
  assert(git('rev-parse','HEAD')===base && !git('status','--porcelain'),'Prepare Plan on a clean latest-main branch before editing');
  const lockPath='.change-plans/'+changeId+'/r0.lock.json';
  const allowed=[lockPath,'data/shinpo/'+o.id+'.json','data/notes.js','shinpo/'+name+'/index.html','shinpo/index.html'];
  const assets=[o.cover,...(o.assets ? o.assets.split(',') : [])].filter(Boolean);
  for(const asset of assets) { assert(/^assets\/shinpo\/[\w./-]+$/.test(asset) && !asset.includes('..'),'Invalid asset path'); if(!allowed.includes(asset)) allowed.push(asset); }
  return {schema:'yumaniwa-change-plan/0.2',changeId,revision:0,status:'READY',repository:REPO,change:'原典を保持してnote記事 '+m.id+' を町内の通常4枠から読む',planLevel:'full',classes:assets.length?['CONTENT','SYSTEM','ASSET']:['CONTENT','SYSTEM'],authority:['Standard','HQ Review'],environment:'staging',baseSha:base,canonicalSources:['data/notes.js','tools/shinpo-template.html',o['source-ref'] || '原典は取得/照合してから実装'],allowedPaths:allowed,conditionalPaths:[],forbiddenPaths:['main.js','index.html','style.css','works/**','.github/**','engines/**','sitemap.xml','tools/**'],expectedChanges:['ID単位の順序付き原文ブロック、取得原画像、該当notesレコード、生成HTMLのみ','既存記事/4枠選抜を変更せず町内案内を本文の外に置く'],ownerDecisions:[o.authority],hqDecisions:['既存静的テンプレート内。unknown-code SYSTEM/full。原典完全性は人が証拠を照合し未取得を記録する。'],rulesApplied:['CHANGE-PLAN single initial r0; official create/verify','Staging only'],staticChecks:['node-syntax'],manualChecks:['原典と全文/順序/外部リンク/画像を照合','mobile/desktopで本文1クリック、スクロール、戻る'],impactChecks:['risk.high-risk-review','runtime.regression',...(assets.length?['asset.file','asset.rendering','asset.cache']:[])],impactExclusions:[],rollback:'この記事追加PRのみrevert。既存記事/保存/Productionは不変。',outOfScope:['Production','既存記事変更','共通runtime','CMS/DB','外部権限'],promotion:'Staging only',unverified:['原典照合は別途証拠が必要','iPhone/iPad実機未確認'],problem:'既存note記事を町内本文として読む',currentContract:'notesのID/title/date/urlが正本。移植済みはarchivePageへ1クリック。',whyExistingIsInsufficient:'対象記事本文が未移植',design:'既存template/CLIで静的生成。原典と町内案内を分離。',alternativesRejected:['固定枠','原典の要約/リンク置換/画像創作','CMS'],migration:'ID/原note URL保持、archivePageのみ登録',compatibility:'元の4枠と他記事を保持',boundaryCases:['同じIDの再実行','未取得media','中断再開','base進行'],testPlan:['node tools/shinpo-migrate.cjs check','node tests/test-shinpo-rack.cjs','node tests/test-shinpo-migrate.cjs','Scope/Risk/Impact、必須CI、レビュー、Pages'],promotionRisk:'Productionは変更しない'};
}
function inspect(o) {
  const m=metadata(o.id), a=exists('data/shinpo/'+slug(o.id)+'.json')?load(o.id):null;
  const result={metadata:m,source:a?.source || null,existing:m.archivePage || null};
  if(o.source) {
    const original=fs.readFileSync(o.source,'utf8');
    const text=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,'');
    result.comparison={sourceSha256:digest(original),missingSourceBlocks:a?a.blocks.filter(b=>b.origin==='source' && !text(original).includes(text(b.html))).map((b)=>b.html):[],sourceLinks:links(original),articleLinks:a?links(a.blocks.map(b=>b.html).join('\n')):[],verdict:'REVIEW REQUIRED: text/link aid only, not proof of complete original capture'};
  }
  return result;
}
function resume(o) {
  const state={branch:git('rev-parse','--abbrev-ref','HEAD'),head:git('rev-parse','HEAD'),cachedMain:git('rev-parse','origin/main'),workingTree:git('status','--short'),articles:files().map(f=>{try {const a=JSON.parse(read(f)),m=metadata(a.id),html=render(a,m);return {...summary(new Map([['shinpo/'+a.slug+'/index.html',html]]))[0],needsRegistration:!m.archivePage};} catch(e) {return {path:f,status:'needs-review',error:e.message};}}),next:'Fetch latest main and query existing PRs via authorized GitHub access before continuing. Never retry an uncertain PR create without lookup.'};
  if(o.lock) { const l=JSON.parse(read(o.lock)); official('verify','--lock',path.resolve(ROOT,o.lock)); state.lock={path:o.lock,digest:l.planDigest,base:l.plan.baseSha}; state.baseAdvanced=l.plan.baseSha!==state.cachedMain; }
  if(o['pr-state']) {
    const prs=JSON.parse(fs.readFileSync(o['pr-state'],'utf8'));
    assert(Array.isArray(prs),'PR snapshot must be an array from authorized lookup');
    state.prs=prs.filter(p=>p.head===state.branch);
    state.next=state.prs.length ? 'Existing PR found: inspect state, exact head, CI and reviews; do not create another PR.' : 'Lookup reports no matching PR; confirm fresh remote state before manual PR creation.';
    if(state.prs.some(p=>p.merged)) state.next='Merged PR found: verify main/merge SHA and Pages; do not regenerate or recreate PR.';
    if(state.baseAdvanced && !state.prs.some(p=>p.merged)) state.next='Base advanced: reconcile existing PR; use official fresh branch/r0 replacement procedure and reference predecessor, never edit existing lock.';
  }
  return state;
}
function main(argv) {
  const command=argv.shift() || 'help', o={};
  while(argv.length) { const key=argv.shift(); assert(key.startsWith('--') && argv.length,'Expected --option value'); o[key.slice(2)]=argv.shift(); }
  let result;
  if(command==='inspect') result=inspect(o);
  else if(command==='plan') {
    const p=plan(o);
    if(o.lock) {
      assert(o.lock==='.change-plans/'+p.changeId+'/r0.lock.json','Use exact fresh r0 lock path');
      assert(!exists(o.lock),'Lock already exists; verify/resume, never overwrite');
      const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'shinpo-plan-'));
      try { const f=path.join(temp,'plan.json'); fs.writeFileSync(f,JSON.stringify(p)); const lock=official('create','--plan',f); fs.mkdirSync(path.dirname(path.join(ROOT,o.lock)),{recursive:true}); fs.writeFileSync(path.join(ROOT,o.lock),lock,{flag:'wx'}); official('verify','--lock',path.join(ROOT,o.lock)); result={lock:o.lock,next:'Review and commit ONLY this lock first, then import acquired original content.'}; } finally {fs.rmSync(temp,{recursive:true,force:true});}
    } else result=p;
  } else if(['dry-run','check','generate','import'].includes(command)) {
    assert(command!=='import' || o.body,'import requires --body');
    assert(!['generate','import'].includes(command) || !o.env || o.env==='staging', 'Production outputs are read-only here; use the separately authorized release workflow');
    const out=outputs(o), changes=summary(out);
    if(command==='check') assert(changes.every(x=>x.status==='unchanged'),'Generated HTML differs: '+changes.filter(x=>x.status!=='unchanged').map(x=>x.path).join(', '));
    result=['generate','import'].includes(command)?writeOutputs(out,o.lock):changes;
  } else if(command==='resume') result=resume(o);
  else result={usage:'node tools/shinpo-migrate.cjs inspect|dry-run|plan|import|generate|check|resume [--id ID] [--lock PATH]',guide:'tools/SHINPO-MIGRATION.md'};
  console.log(JSON.stringify(result,null,2));
}
module.exports={notes,metadata,load,edition,render,renderIndex,articleCatalog,validate,outputs,summary,guard,plan,resume,inspect,main};
if(require.main===module) {try {main(process.argv.slice(2));} catch(e) { console.error(e.message);process.exitCode=1; }}
