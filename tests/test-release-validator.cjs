'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {validate, readWorks, readWorkSearchMeta, readWorkGuideMeta, html, redirectProbe, imageInfo} = require('../tools/release-validator.cjs');
const {buildPage, buildSitemap} = require('../tools/generate-work-search-pages.cjs');
const REPO = path.resolve(__dirname, '..');
const FIX = path.join(__dirname,'fixtures/release');
const BASE = 'https://sukimastock.github.io/yumaniwa-town/';
const put = (root,f,s) => { fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true}); fs.writeFileSync(path.join(root,f),s); };
function candidate(t,id='dotweather') {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-release-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const work = {...readWorks(REPO).find(w=>w.id===id), launch:'embedded',entry:'./works/'+id+'/index.html'};
    put(root,'data/works.js','window.WORKS = '+JSON.stringify([work])+';');
    put(root,'data/work-search-meta.js',fs.readFileSync(path.join(REPO,'data/work-search-meta.js')));
    const sourceGuide = readWorkGuideMeta(REPO);
    const guideEntry = sourceGuide.meta[id];
    if (!guideEntry) throw new Error('missing repository guide metadata for fixture work: '+id);
    put(
        root,
        'data/work-guide-meta.js',
        'var WORK_GUIDE_MOODS = '+JSON.stringify(sourceGuide.moods)+';\n' +
        'var WORK_GUIDE_FEATURED = '+JSON.stringify([id])+';\n' +
        'var WORK_GUIDE_META = '+JSON.stringify({[id]: guideEntry})+';\n'
    );
    put(root,'data/updates.js','var TOWN_UPDATES = '+JSON.stringify([{date:'2026-01-01',title:'Release '+id,body:'Published '+id,workIds:[id]}])+';');
    put(root,'data/ghost-dialogue.js','window.GHOST_DIALOGUE = '+JSON.stringify({works:{[id]:['最近の作品の話。']}})+';');
    put(root,'works/'+id+'/index.html','<!doctype html><title>Test runtime</title>');
    for (const f of ['work-install-meta.js','town-analytics.js']) put(root,f,fs.readFileSync(path.join(REPO,f)));
    put(root,'data/world-objects.js','window.YUMANIWA_WORLD_OBJECTS = {objects:{}};');
    put(root,'data/station-plaza.js','');
    put(root,'data/town-maps.js','window.TOWN_SCENE_MAPS = {};');
    put(root,'w/'+id+'/manifest.webmanifest',fs.readFileSync(path.join(REPO,'w',id,'manifest.webmanifest')));
    const assets = path.join(REPO,'assets/works',id);
    if (fs.existsSync(assets)) fs.cpSync(assets,path.join(root,'assets/works',id),{recursive:true});
    put(root,'index.html','<a href="./w/'+id+'/">Work</a>');
    const c={root,id,options:{root,env:'production',ids:[id],published:[id]}};
    regenerateSearch(c,'production');
    return c;
}
function mutate(c,f,fn) { put(c.root,f,fn(fs.readFileSync(path.join(c.root,f),'utf8'))); }
function page(c,fn) { mutate(c,'w/'+c.id+'/index.html',fn); }
function enPage(c,fn) { mutate(c,'en/w/'+c.id+'/index.html',fn); }
function metadata(c,fn) { const w=readWorks(c.root); fn(w); put(c.root,'data/works.js','window.WORKS = '+JSON.stringify(w)); }
function writeSearchMeta(root,meta) { put(root,'data/work-search-meta.js','var WORK_SEARCH_META_SCHEMA = 1;\nvar WORK_SEARCH_META = '+JSON.stringify(meta,null,2)+';\n'); }
function searchMetadata(c,fn) { const meta=readWorkSearchMeta(c.root); fn(meta); writeSearchMeta(c.root,meta); }
function writeGuideMeta(root,guide) {
    put(
        root,
        'data/work-guide-meta.js',
        'var WORK_GUIDE_MOODS = '+JSON.stringify(guide.moods,null,2)+';\n' +
        'var WORK_GUIDE_FEATURED = '+JSON.stringify(guide.featured,null,2)+';\n' +
        'var WORK_GUIDE_META = '+JSON.stringify(guide.meta,null,2)+';\n'
    );
}
function guideMetadata(c,fn) { const guide=readWorkGuideMeta(c.root); fn(guide); writeGuideMeta(c.root,guide); }
function regenerateSearch(c,env='production') {
    const work=readWorks(c.root).find(w=>w.id===c.id);
    const meta=readWorkSearchMeta(c.root)[c.id];
    put(c.root,'w/'+c.id+'/index.html',buildPage(c.id,work,meta,'ja',env));
    put(c.root,'en/w/'+c.id+'/index.html',buildPage(c.id,work,meta,'en',env));
    put(c.root,'sitemap.xml',buildSitemap(c.options.published || [c.id]));
}
function has(r,status,check) { assert.ok(r.results.some(x=>x.status===status && x.check===check),status+' '+check+'\n'+JSON.stringify(r.results.filter(x=>x.status!=='PASS'))); }
function clean(r) { assert.equal(r.exitCode,0,JSON.stringify(r.results.filter(x=>['FAIL','HQ_REQUIRED'].includes(x.status)))); }
function digest(root) { const entries=[]; function walk(dir) { for (const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const p=path.join(dir,e.name); if(e.isDirectory())walk(p);else entries.push([path.relative(root,p),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]); } } walk(root); return entries; }
test('HTML parser preserves apostrophes inside double-quoted attributes',()=>{
    const parsed=html('<meta name="description" content="tonight\'s bottle">');
    assert.equal(parsed.meta('description')[0],"tonight's bottle");
});

test('DotWeather production normal page passes static gates; external checks remain and input is unchanged',t=>{
    const c=candidate(t), before=digest(c.root), r=validate(c.options);
    clean(r); assert.equal(r.releaseComplete,false); assert.equal(r.readiness,'UNVERIFIED');
    has(r,'PASS','search.redirect'); has(r,'PASS','search.open-shortcut'); has(r,'PASS','search.generated-ja'); has(r,'PASS','search.generated-en'); has(r,'PASS','search.hreflang-reciprocal'); has(r,'PASS','search.structured-data'); has(r,'PASS','analytics.name'); has(r,'EXTERNAL_CHECK_REQUIRED','analytics.goal');
    assert.deepEqual(digest(c.root),before);
});
test('staging noindex is correct, production noindex fails, public staging page fails',t=>{
    const c=candidate(t); regenerateSearch(c,'staging');
    clean(validate({...c.options,env:'staging'})); has(validate(c.options),'FAIL','search.robots');
    page(c,s=>s.replace('noindex,nofollow','index,follow'));
    enPage(c,s=>s.replace('noindex,nofollow','index,follow'));
    has(validate({...c.options,env:'staging'}),'FAIL','search.robots');
    has(validate({...c.options,env:'staging'}),'FAIL','search.localized-robots');
});
for (const id of ['diorama-calendar','rojiura-masala']) test('unchanged production fixture detects '+id+' noindex and ordinary redirect',t=>{
    const c=candidate(t,id); put(c.root,'w/'+id+'/index.html',fs.readFileSync(path.join(FIX,id+'.html'))); const r=validate(c.options);
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
    guideMetadata(c,guide=>{ guide.meta['coffee-factory']={duration:'3〜5分',moods:['short'],guideLine:'小さな工場を眺めながら、一杯を淹れる。'}; });
    regenerateSearch(c,'staging');
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

test('Guide Ready requires metadata for every open work, even outside selected ids',t=>{
    const c=candidate(t);
    metadata(c,w=>w.push({...w[0],id:'coffee-factory'}));
    const r=validate({...c.options,env:'staging',published:undefined});
    has(r,'FAIL','guide.metadata');
});

test('Guide Ready validates duration, guide line, moods, and featured references',t=>{
    const a=candidate(t);
    guideMetadata(a,guide=>{ guide.meta[a.id].duration=''; });
    has(validate(a.options),'FAIL','guide.duration');

    const b=candidate(t);
    guideMetadata(b,guide=>{ guide.meta[b.id].guideLine=''; });
    has(validate(b.options),'FAIL','guide.guide-line');

    const c=candidate(t);
    guideMetadata(c,guide=>{ guide.meta[c.id].moods=['missing-mood']; });
    has(validate(c.options),'FAIL','guide.moods');

    const d=candidate(t);
    guideMetadata(d,guide=>{ guide.featured=['missing-work']; });
    has(validate(d.options),'FAIL','guide.featured');
});

test('selected release work requires canonical guide image',t=>{
    const c=candidate(t);
    fs.rmSync(path.join(c.root,'assets','works',c.id,'ogp.jpg'),{force:true});
    fs.rmSync(path.join(c.root,'assets','works',c.id,'icon.png'),{force:true});
    has(validate(c.options),'FAIL','guide.image');
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
test('Search v2 requires metadata source and English page',t=>{
    const a=candidate(t); fs.unlinkSync(path.join(a.root,'data/work-search-meta.js')); has(validate(a.options),'FAIL','search.metadata-source');
    const b=candidate(t); fs.unlinkSync(path.join(b.root,'en/w/'+b.id+'/index.html')); has(validate(b.options),'FAIL','search.locale-en');
});
test('Search v2 detects generated-page drift, hreflang drift and structured-data drift',t=>{
    const a=candidate(t); page(a,s=>s.replace('<h1>DotWeather</h1>','<h1>DotWeather!</h1>')); has(validate(a.options),'FAIL','search.generated-ja');
    const b=candidate(t); page(b,s=>s.replace(BASE+'en/w/'+b.id+'/',BASE+'en/w/wrong/')); has(validate(b.options),'FAIL','search.hreflang-reciprocal');
    const c=candidate(t); enPage(c,s=>s.replace('"@type": "SoftwareApplication"','"@type": "CreativeWork"')); has(validate(c.options),'FAIL','search.structured-data');
});
test('Search v2 sitemap requires Japanese and English generated URLs',t=>{
    const c=candidate(t); mutate(c,'sitemap.xml',s=>s.replace('  <url><loc>'+BASE+'en/w/'+c.id+'/</loc></url>\n',''));
    const r=validate(c.options); has(r,'FAIL','sitemap.inclusion-en'); has(r,'FAIL','sitemap.generated');
});
test('Search v2 does not emit meta keywords',t=>{
    const c=candidate(t); page(c,s=>s.replace('</head>','<meta name="keywords" content="weather"></head>'));
    has(validate(c.options),'FAIL','search.meta-keywords');
});

test('CLI exit 0 does not certify release; failure exit 1 and invalid CLI exit 2',t=>{
    const c=candidate(t), script=path.join(REPO,'tools/release-validator.cjs');
    const args=[script,'--root',c.root,'--env','production','--ids',c.id,'--published',c.id];
    let r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Release Complete: UNVERIFIED/);assert.match(r.stdout,/EXTERNAL_CHECK_REQUIRED/);
    page(c,s=>s.replace('index,follow,max-image-preview:large','noindex'));r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,1);
    assert.equal(spawnSync(process.execPath,[script,'--unknown'],{encoding:'utf8'}).status,2);
});

test('nonstandard OGP size is a warning when declared in Search metadata',t=>{
    const c=candidate(t);
    const info=imageInfo(fs.readFileSync(path.join(c.root,'assets/works/dotweather/icon.png')));
    searchMetadata(c,meta=>{ meta.dotweather.ogp={file:'icon.png',mime:'image/png',width:info.width,height:info.height,version:null}; });
    regenerateSearch(c,'production');
    const r=validate(c.options);clean(r);has(r,'WARNING','ogp.recommended-size');
});
test('invalid calendar lastmod is rejected without generating a replacement',t=>{
    const c=candidate(t);mutate(c,'sitemap.xml',s=>s.replace('</loc></url>','</loc><lastmod>2026-02-30</lastmod></url>'));
    has(validate(c.options),'FAIL','sitemap.lastmod');
});
