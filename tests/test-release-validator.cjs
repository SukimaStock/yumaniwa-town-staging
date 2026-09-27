'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {validate, readWorks, html, redirectProbe, imageInfo} = require('../tools/release-validator.cjs');
const REPO = path.resolve(__dirname, '..');
const FIX = path.join(__dirname,'fixtures/release');
const BASE = 'https://sukimastock.github.io/yumaniwa-town/';
const put = (root,f,s) => { fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true}); fs.writeFileSync(path.join(root,f),s); };
function candidate(t,id='dotweather') {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-release-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const work = {...readWorks(REPO).find(w=>w.id===id), launch:'embedded',entry:'./works/'+id+'/index.html'};
    put(root,'data/works.js','window.WORKS = '+JSON.stringify([work])+';');
    put(root,'data/updates.js','var TOWN_UPDATES = '+JSON.stringify([{date:'2026-01-01',title:'Release '+id,body:'Published '+id,workIds:[id]}])+';');
    put(root,'data/ghost-dialogue.js','window.GHOST_DIALOGUE = '+JSON.stringify({works:{[id]:['最近の作品の話。']}})+';');
    put(root,'works/'+id+'/index.html','<!doctype html><title>Test runtime</title>');
    for (const f of ['work-install-meta.js','town-analytics.js']) put(root,f,fs.readFileSync(path.join(REPO,f)));
    put(root,'data/world-objects.js','window.YUMANIWA_WORLD_OBJECTS = {objects:{}};');
    put(root,'data/station-plaza.js','');
    put(root,'data/town-maps.js','window.TOWN_SCENE_MAPS = {};');
    put(root,'w/'+id+'/index.html',fs.readFileSync(path.join(FIX,id+'.html')));
    put(root,'w/'+id+'/manifest.webmanifest',fs.readFileSync(path.join(REPO,'w',id,'manifest.webmanifest')));
    const assets = path.join(REPO,'assets/works',id);
    if (fs.existsSync(assets)) fs.cpSync(assets,path.join(root,'assets/works',id),{recursive:true});
    put(root,'index.html','<a href="./w/'+id+'/">Work</a>');
    put(root,'sitemap.xml','<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+BASE+'w/'+id+'/</loc><lastmod>2026-01-01</lastmod></url></urlset>');
    return {root,id,options:{root,env:'production',ids:[id],published:[id]}};
}
function mutate(c,f,fn) { put(c.root,f,fn(fs.readFileSync(path.join(c.root,f),'utf8'))); }
function page(c,fn) { mutate(c,'w/'+c.id+'/index.html',fn); }
function metadata(c,fn) { const w=readWorks(c.root); fn(w); put(c.root,'data/works.js','window.WORKS = '+JSON.stringify(w)); }
function has(r,status,check) { assert.ok(r.results.some(x=>x.status===status && x.check===check),status+' '+check+'\n'+JSON.stringify(r.results.filter(x=>x.status!=='PASS'))); }
function clean(r) { assert.equal(r.exitCode,0,JSON.stringify(r.results.filter(x=>['FAIL','HQ_REQUIRED'].includes(x.status)))); }
function digest(root) { const entries=[]; function walk(dir) { for (const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const p=path.join(dir,e.name); if(e.isDirectory())walk(p);else entries.push([path.relative(root,p),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]); } } walk(root); return entries; }
test('DotWeather production normal page passes static gates; external checks remain and input is unchanged',t=>{
    const c=candidate(t), before=digest(c.root), r=validate(c.options);
    clean(r); assert.equal(r.releaseComplete,false); assert.equal(r.readiness,'UNVERIFIED');
    has(r,'PASS','search.redirect'); has(r,'PASS','search.open-shortcut'); has(r,'PASS','analytics.name'); has(r,'EXTERNAL_CHECK_REQUIRED','analytics.goal');
    assert.deepEqual(digest(c.root),before);
});
test('staging noindex is correct, production noindex fails, public staging page fails',t=>{
    const c=candidate(t); page(c,s=>s.replace('index,follow,max-image-preview:large','noindex,nofollow'));
    clean(validate({...c.options,env:'staging'})); has(validate(c.options),'FAIL','search.robots');
    page(c,s=>s.replace('noindex,nofollow','index,follow')); has(validate({...c.options,env:'staging'}),'FAIL','search.robots');
});
for (const id of ['diorama-calendar','rojiura-masala']) test('unchanged production fixture detects '+id+' noindex and ordinary redirect',t=>{
    const c=candidate(t,id), r=validate(c.options);
    has(r,'FAIL','search.robots'); has(r,'FAIL','search.redirect'); has(r,'FAIL','search.h1'); has(r,'FAIL','search.body');
    if(id==='diorama-calendar') { has(r,'FAIL','search.og:image'); has(r,'PASS','install.iconless'); }
});
test('unchanged production sitemap detects SteamClock omission',t=>{
    const c=candidate(t,'steamclock'); put(c.root,'sitemap.xml',fs.readFileSync(path.join(FIX,'production-sitemap.xml')));
    has(validate(c.options),'FAIL','sitemap.inclusion');
});
test('production set is explicit, CoffeeFactory is never implicitly authorized',t=>{
    const c=candidate(t); has(validate({...c.options,published:undefined}),'FAIL','release.set');
    metadata(c,w=>w.push({...w[0],id:'coffee-factory'}));
    has(validate(c.options),'FAIL','release.unapproved-open');
    page(c,s=>s.replace('index,follow,max-image-preview:large','noindex'));
    clean(validate({...c.options,env:'staging',published:undefined}));
    const all=validate({...c.options,env:'staging',ids:undefined,allProduction:true});
    assert.ok(!all.results.some(x=>x.work==='coffee-factory'));
    has(validate({...c.options,published:undefined,ids:undefined,allProduction:true}),'FAIL','input.ids');
});
test('unknown launch and frame modes require HQ; missing entry and player sizes fail',t=>{
    const c=candidate(t); metadata(c,w=>{w[0].launch='new-launch';w[0].frameMode='new-frame';w[0].playerLayout='phone';w[0].playerWidth=-1;delete w[0].playerHeight;});
    let r=validate(c.options); has(r,'HQ_REQUIRED','contract.launch'); has(r,'HQ_REQUIRED','contract.frameMode'); has(r,'FAIL','metadata.playerWidth');has(r,'FAIL','metadata.playerHeight');
    metadata(c,w=>{w[0].launch='embedded';w[0].entry='./works/dotweather/missing.html';});has(validate(c.options),'FAIL','launch.file');
});
test('town update history and ghost dialogue are release gates',t=>{
    const a=candidate(t); put(a.root,'data/updates.js','var TOWN_UPDATES = [];'); has(validate(a.options),'FAIL','town.update-history');
    const b=candidate(t); put(b.root,'data/ghost-dialogue.js','window.GHOST_DIALOGUE = { works: {} };'); has(validate(b.options),'FAIL','town.ghost-dialogue');
});

test('duplicate identity and absent description fail',t=>{
    const c=candidate(t); metadata(c,w=>w.push({...w[0]})); has(validate(c.options),'FAIL','metadata.unique');
    metadata(c,w=>{w.pop();delete w[0].description;});has(validate(c.options),'FAIL','metadata.description');
});
test('itch project/embed contracts and HTTPS external URL',t=>{
    const c=candidate(t); metadata(c,w=>Object.assign(w[0],{launch:'itch_embed',url:'https://author.itch.io/game',embedUrl:'https://itch.io/embed-upload/12345?color=fff'}));clean(validate(c.options));
    metadata(c,w=>{w[0].embedUrl='https://evil.example/embed-upload/123';});has(validate(c.options),'FAIL','launch.embedUrl');
    metadata(c,w=>{w[0].launch='external';w[0].url='http://author.itch.io/game';});has(validate(c.options),'FAIL','launch.url');
});
test('canonical, images, declared MIME, dimensions and static discovery are checked',t=>{
    const c=candidate(t); page(c,s=>s.replace('image/jpeg','image/png').replace('content="1200"','content="2"').replace('<link rel="canonical" href="'+BASE,'<link rel="canonical" href="https://wrong.example/'));
    let r=validate(c.options);has(r,'FAIL','search.canonical');has(r,'FAIL','ogp.mime');has(r,'FAIL','ogp.dimensions');
    put(c.root,'index.html','<script>/* JS links do not provide static discovery */</script>');has(validate(c.options),'FAIL','search.discovery');
    fs.unlinkSync(path.join(c.root,'assets/works/dotweather/ogp.jpg'));has(validate(c.options),'FAIL','ogp.file');
});
test('sitemap rejects duplicates, unpublished IDs and future dates',t=>{
    const c=candidate(t); mutate(c,'sitemap.xml',s=>s.replace('</urlset>','<url><loc>'+BASE+'w/dotweather/</loc></url><url><loc>'+BASE+'w/coffee-factory/</loc><lastmod>9999-01-01</lastmod></url></urlset>'));
    const r=validate(c.options);has(r,'FAIL','sitemap.duplicate');has(r,'FAIL','sitemap.membership');has(r,'FAIL','sitemap.lastmod');
});
test('manifest scope, start URL and icon references fail independently',t=>{
    const c=candidate(t); mutate(c,'w/dotweather/manifest.webmanifest',s=>{const m=JSON.parse(s);m.start_url='../../?work=other';m.scope='./';m.icons[0].src='./missing.png';return JSON.stringify(m);});
    const r=validate(c.options);has(r,'FAIL','manifest.start_url');has(r,'FAIL','manifest.scope');has(r,'FAIL','install.icon');has(r,'FAIL','install.icon-identity');
});
function physical(c) {
    const rect={x:1,y:1,w:1,h:1};
    const scene={mapWidth:10,mapHeight:10,passableRects:[],blockedRects:[],blockedPoints:[],areaZones:[],triggers:[{id:'play',type:'work',workId:c.id,area:rect}],props:[{id:'machine',objectId:'cabinet',...rect,interaction:{...rect,triggerId:'play'},collision:rect}]};
    put(c.root,'data/world-objects.js','window.YUMANIWA_WORLD_OBJECTS = '+JSON.stringify({objects:{cabinet:{src:'./assets/works/dotweather/icon.png'}}}));
    const save=()=>put(c.root,'data/town-maps.js','window.TOWN_SCENE_MAPS = '+JSON.stringify({test:scene})); save(); return {scene,save};
}
test('physical chain uses existing scene contract; menu-only needs no prop',t=>{
    const c=candidate(t); clean(validate(c.options)); has(validate({...c.options,physical:[c.id]}),'FAIL','scene.physical');
    const {scene,save}=physical(c);clean(validate({...c.options,physical:[c.id]}));
    scene.props[0].collision.w=-1;save();has(validate(c.options),'FAIL','scene.contract');
    scene.props[0].interaction.triggerId='missing';save();has(validate(c.options),'FAIL','scene.prop');
    scene.props[0].interaction.triggerId='play';scene.props[0].objectId='missing';save();has(validate(c.options),'FAIL','scene.object');
});
test('legacy foundation stays unresolved; explicit physical intent requires HQ',t=>{
    const c=candidate(t);fs.unlinkSync(path.join(c.root,'data/world-objects.js'));
    has(validate(c.options),'EXTERNAL_CHECK_REQUIRED','scene.basis');has(validate({...c.options,physical:[c.id]}),'HQ_REQUIRED','scene.basis');
});
test('redirect forms, meta refresh and uncertain scripts cannot silently pass',t=>{
    for(const code of ['location.href="../../?work=x"','window.location="../../?work=x"','setTimeout(()=>location.replace("../../?work=x"),100)','window.onload=()=>location.assign("../../?work=x")']) assert.equal(redirectProbe(html('<script>'+code+'</script>'),'').length,1);
    const c=candidate(t);page(c,s=>s.replace('</head>','<meta http-equiv="refresh" content="0;url=../../"></head>'));has(validate(c.options),'FAIL','search.meta-refresh');
    page(c,s=>s.replace('</head>','<script src="unknown.js"></script></head>'));has(validate(c.options),'HQ_REQUIRED','search.script-review');
});
test('CLI exit 0 does not certify release; failure exit 1 and invalid CLI exit 2',t=>{
    const c=candidate(t), script=path.join(REPO,'tools/release-validator.cjs');
    const args=[script,'--root',c.root,'--env','production','--ids',c.id,'--published',c.id];
    let r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Release Complete: UNVERIFIED/);assert.match(r.stdout,/EXTERNAL_CHECK_REQUIRED/);
    page(c,s=>s.replace('index,follow,max-image-preview:large','noindex'));r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,1);
    assert.equal(spawnSync(process.execPath,[script,'--unknown'],{encoding:'utf8'}).status,2);
});

test('nonstandard OGP size is a warning, not a blanket prohibition',t=>{
    const c=candidate(t);
    const info=imageInfo(fs.readFileSync(path.join(c.root,'assets/works/dotweather/icon.png')));
    page(c,s=>s.replaceAll('ogp.jpg?v=1','icon.png').replace('image/jpeg','image/png').replace('content="1200"','content="'+info.width+'"').replace('content="630"','content="'+info.height+'"'));
    const r=validate(c.options);clean(r);has(r,'WARNING','ogp.recommended-size');
});
test('invalid calendar lastmod is rejected without generating a replacement',t=>{
    const c=candidate(t);mutate(c,'sitemap.xml',s=>s.replace('2026-01-01','2026-02-30'));
    has(validate(c.options),'FAIL','sitemap.lastmod');
});
