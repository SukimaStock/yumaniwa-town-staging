#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROD_BASE = 'https://sukimastock.github.io/yumaniwa-town';

const DEFAULT_THEME = {
  theme:'#0a0a0a', bg:'#0a0a0a', fg:'#f4efe5', p:'#c9c1b4',
  playBg:'#f0b35d', playFg:'#25170b', border:'#5a554c',
  town:'#eee7dc', note:'#8f887e'
};
const THEMES = {
  orbit: {
    theme:'#080a10', bg:'#080a10', fg:'#f4f4f2', p:'#c7cbd3',
    playBg:'#eef1f5', playFg:'#11151d', border:'#59606d',
    town:'#eef1f5', note:'#8f96a3'
  },
  'diorama-calendar': { ...DEFAULT_THEME, theme:'#f7f5ef' },
  steamclock: {
    theme:'#100c0b', bg:'#100c0b', fg:'#f4efe5', p:'#c9c1b4',
    playBg:'#d59a51', playFg:'#24160d', border:'#5a514a',
    town:'#eee7dc', note:'#8f887e'
  }
};

function parseArgs(argv) {
  const out = { env:'', published:[], mode:'' };
  for (let i=2;i<argv.length;i++) {
    const arg=argv[i];
    if (arg==='--env') out.env=argv[++i]||'';
    else if (arg==='--published') out.published=String(argv[++i]||'').split(',').map(v=>v.trim()).filter(Boolean);
    else if (arg==='--write') out.mode='write';
    else if (arg==='--check') out.mode='check';
    else throw new Error('unknown argument: '+arg);
  }
  if (!['staging','production'].includes(out.env)) throw new Error('--env staging|production is required');
  if (!out.published.length) throw new Error('--published <id,id,...> is required; never infer publication set from staging open works');
  if (!out.mode) throw new Error('choose one of --write or --check');
  return out;
}

function loadVar(file, names) {
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  for (const name of names) {
    if (context[name]!==undefined) return JSON.parse(JSON.stringify(context[name]));
    if (context.window && context.window[name]!==undefined) return JSON.parse(JSON.stringify(context.window[name]));
  }
  throw new Error(file+' must define one of: '+names.join(', '));
}

function esc(v) {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function jsonScript(v) { return JSON.stringify(v,null,2).replace(/</g,'\\u003c'); }

function heading(work, localeData, locale) {
  if (locale==='ja') return work.menuTitle || work.frameTitle || work.title;
  return localeData.shareTitle.replace(/\s*\|\s*Yumaniwa Town\s*$/,'');
}

function buildPage(id, work, meta, locale, env) {
  const data=meta[locale];
  const ja=locale==='ja';
  const prefix=ja?'../..':'../../..';
  const canonical=ja ? PROD_BASE+'/w/'+id+'/' : PROD_BASE+'/en/w/'+id+'/';
  const jaUrl=PROD_BASE+'/w/'+id+'/';
  const enUrl=PROD_BASE+'/en/w/'+id+'/';
  const ogp=meta.ogp || {};
  const ogpFile=ogp.file || 'ogp.jpg';
  const ogpMime=ogp.mime || 'image/jpeg';
  const ogpWidth=Number(ogp.width || 1200);
  const ogpHeight=Number(ogp.height || 630);
  const ogpVersion=ogp.version === undefined ? 1 : ogp.version;
  const versionSuffix=ogpVersion === null || ogpVersion === '' ? '' : '?v='+encodeURIComponent(String(ogpVersion));
  const image=PROD_BASE+'/assets/works/'+id+'/'+ogpFile+versionSuffix;
  const relImage=prefix+'/assets/works/'+id+'/'+ogpFile+versionSuffix;
  const play=prefix+'/?work='+id;
  const town=prefix+'/';
  const langLink=ja ? '../../en/w/'+id+'/' : '../../../w/'+id+'/';
  const robots=env==='production' ? 'index,follow,max-image-preview:large' : 'noindex,nofollow';
  const theme=THEMES[id]||DEFAULT_THEME;
  const h1=heading(work,data,locale);
  const schemaName=ja
    ? data.shareTitle.replace(/｜湯間庭町\s*$/,'')
    : data.shareTitle.replace(/\s*\|\s*Yumaniwa Town\s*$/,'');

  const schema={
    '@context':'https://schema.org',
    '@type':meta.schemaType,
    name:schemaName,
    url:canonical,
    image,
    description:data.metaDescription,
    inLanguage:ja?'ja':'en',
    genre:data.genres,
    keywords:data.terms,
    isPartOf:{
      '@type':'WebSite',
      name:ja?'湯間庭町':'Yumaniwa Town',
      url:PROD_BASE+'/'
    }
  };
  if (Array.isArray(meta.alternateNames) && meta.alternateNames.length) schema.alternateName=meta.alternateNames;
  if (meta.schemaType==='VideoGame') schema.gamePlatform='Web Browser';
  if (meta.schemaType==='SoftwareApplication') schema.operatingSystem='Web Browser';

  const siteName=ja?'湯間庭町':'Yumaniwa Town';
  const note=ja
    ? (id==='orbit' ? 'ORBIT — Silent Reboot / 湯間庭町の作品' : '湯間庭町にある作品のひとつです。')
    : 'A work in Yumaniwa Town.';

  return `<!doctype html>
<html lang="${ja?'ja':'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${theme.theme}">
  <meta name="description" content="${esc(data.metaDescription)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ja" href="${jaUrl}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="x-default" href="${jaUrl}">
  <meta property="og:locale" content="${ja?'ja_JP':'en_US'}">
  <meta property="og:locale:alternate" content="${ja?'en_US':'ja_JP'}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${esc(data.shareTitle)}">
  <meta property="og:description" content="${esc(data.shareDescription)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="${ogpMime}">
  <meta property="og:image:width" content="${ogpWidth}">
  <meta property="og:image:height" content="${ogpHeight}">
  <meta property="og:image:alt" content="${esc(data.imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(data.shareTitle)}">
  <meta name="twitter:description" content="${esc(data.shareDescription)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${esc(data.imageAlt)}">
  <title>${esc(data.pageTitle)}</title>
  <script type="application/ld+json">
${jsonScript(schema)}
  </script>
  <style>
    :root{color-scheme:dark;--bg:${theme.bg};--fg:${theme.fg};--p:${theme.p};--play-bg:${theme.playBg};--play-fg:${theme.playFg};--border:${theme.border};--town:${theme.town};--note:${theme.note}}
    *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif}.card{width:min(680px,100%);padding:24px}img{display:block;width:100%;height:auto;border-radius:16px}h1{margin:22px 0 10px;font-size:clamp(28px,7vw,42px);line-height:1.2}p{margin:0;color:var(--p);font-size:16px;line-height:1.8}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}a{display:inline-block;padding:13px 18px;border-radius:999px;text-decoration:none;font-weight:700}.play{background:var(--play-bg);color:var(--play-fg)}.town{border:1px solid var(--border);color:var(--town)}.note{margin-top:18px;font-size:13px;color:var(--note)}.language{margin-top:12px;font-size:13px}.language a{padding:0;color:var(--town);font-weight:600;text-decoration:underline;text-underline-offset:3px}
  </style>
  <script>
    (function () {
      var params=new URLSearchParams(window.location.search);
      if (params.get("open")!=="1") return;
      params.delete("open");
      params.delete("work");
      var target="${play}";
      var preserved=params.toString();
      if (preserved) target+="&"+preserved;
      if (window.location.hash) target+=window.location.hash;
      window.location.replace(target);
    })();
  </script>
</head>
<body>
  <main class="card">
    <img src="${relImage}" alt="${esc(data.imageAlt)}">
    <h1>${esc(h1)}</h1>
    <p>${esc(data.body)}</p>
    <div class="actions">
      <a class="play" href="${play}">${ja?'湯間庭町で開く':'Open in Yumaniwa Town'}</a>
      <a class="town" href="${town}">${ja?'湯間庭町へ':'Back to Yumaniwa Town'}</a>
    </div>
    <p class="note">${esc(note)}</p>
    <p class="language"><a href="${langLink}" hreflang="${ja?'en':'ja'}">${ja?'English':'日本語'}</a></p>
  </main>
</body>
</html>
`;
}

function buildSitemap(ids) {
  const lines=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>'+PROD_BASE+'/</loc></url>'
  ];
  for (const id of ids) {
    lines.push('  <url><loc>'+PROD_BASE+'/w/'+id+'/</loc></url>');
    lines.push('  <url><loc>'+PROD_BASE+'/en/w/'+id+'/</loc></url>');
  }
  lines.push('</urlset>','');
  return lines.join('\n');
}

function ensureDir(file) { fs.mkdirSync(path.dirname(file),{recursive:true}); }

function compareOrWrite(file, expected, mode, mismatches) {
  if (mode==='write') {
    ensureDir(file);
    fs.writeFileSync(file,expected,'utf8');
    return;
  }
  if (!fs.existsSync(file) || fs.readFileSync(file,'utf8')!==expected) {
    mismatches.push(path.relative(process.cwd(),file));
  }
}

function main() {
  const args=parseArgs(process.argv);
  const root=process.cwd();
  const works=loadVar(path.join(root,'data/works.js'),['WORKS']);
  const meta=loadVar(path.join(root,'data/work-search-meta.js'),['WORK_SEARCH_META']);
  const byId=new Map(works.map(work=>[work.id,work]));
  const seen=new Set();

  for (const id of args.published) {
    if (seen.has(id)) throw new Error('duplicate published id: '+id);
    seen.add(id);
    const work=byId.get(id);
    if (!work) throw new Error('published work missing from data/works.js: '+id);
    if (work.status!=='open') throw new Error('published work must be status=open: '+id);
    if (!meta[id] || !meta[id].ja || !meta[id].en) throw new Error('published work missing ja/en Search metadata: '+id);
  }

  const mismatches=[];
  for (const id of args.published) {
    const work=byId.get(id);
    compareOrWrite(path.join(root,'w',id,'index.html'),buildPage(id,work,meta[id],'ja',args.env),args.mode,mismatches);
    compareOrWrite(path.join(root,'en','w',id,'index.html'),buildPage(id,work,meta[id],'en',args.env),args.mode,mismatches);
  }
  compareOrWrite(path.join(root,'sitemap.xml'),buildSitemap(args.published),args.mode,mismatches);

  if (args.mode==='check' && mismatches.length) {
    console.error('Generated Search/Share files are out of date:');
    mismatches.forEach(file=>console.error('- '+file));
    process.exit(1);
  }
  console.log((args.mode==='write'?'Generated':'Verified')+' Search/Share v2 for '+args.published.length+' works ('+args.env+').');
}

if (require.main===module) {
  try { main(); } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}
module.exports={parseArgs,loadVar,buildPage,buildSitemap};
