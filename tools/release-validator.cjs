#!/usr/bin/env node
'use strict';
// Read-only checks on trusted repository snapshots. VM is a test harness, not a security sandbox.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validateSceneData } = require('../town-scene-validation.js');
const { buildPage: buildSearchPage, buildSitemap: buildSearchSitemap } = require('./generate-work-search-pages.cjs');
const BASE = 'https://sukimastock.github.io/yumaniwa-town/';
const ID = /^[a-z0-9][a-z0-9-]*$/;
const text = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/g, ' ').trim();
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
function attrs(s) {
    const out = {};
    for (const m of s.matchAll(/([^\s=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
    }
    return out;
}
function html(source) {
    const clean = source.replace(/<!--[\s\S]*?-->/g, '');
    const scripts = [...clean.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
        .map(m => ({ attrs: attrs(m[1]), code: m[2] }));
    const markup = clean.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
    const tags = name => [...markup.matchAll(new RegExp('<' + name + '\\b((?:[^>"\']|"[^"]*"|\'[^\']*\')*)>', 'gi'))].map(m => attrs(m[1]));
    const metas = tags('meta');
    return { markup, scripts, tags, metas,
        meta: key => metas.filter(a => (a.name || a.property || '').toLowerCase() === key).map(a => a.content || ''),
        elements: name => [...markup.matchAll(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '\\s*>', 'gi'))].map(m => m[1]) };
}
function run(source, context, filename) {
    vm.runInContext(source, context, { filename, timeout: 500 });
}
function context(extra = {}) {
    const c = { URL, URLSearchParams, console: { log() {}, warn() {}, info() {} }, ...extra };
    c.window = c; return vm.createContext(c, { codeGeneration: { strings: false, wasm: false } });
}
function readWorks(root) {
    const c = context(); run(fs.readFileSync(path.join(root, 'data/works.js'), 'utf8'), c, 'data/works.js');
    if (!Array.isArray(c.WORKS)) throw new Error('data/works.js must define WORKS[]');
    return JSON.parse(JSON.stringify(c.WORKS));
}
function readWorkSearchMeta(root) {
    const file = path.join(root, 'data/work-search-meta.js');
    if (!fs.existsSync(file)) throw new Error('missing data/work-search-meta.js');
    const c = context();
    run(fs.readFileSync(file, 'utf8'), c, 'data/work-search-meta.js');
    if (c.WORK_SEARCH_META_SCHEMA !== 1) throw new Error('WORK_SEARCH_META_SCHEMA must equal 1');
    if (!c.WORK_SEARCH_META || typeof c.WORK_SEARCH_META !== 'object' || Array.isArray(c.WORK_SEARCH_META)) throw new Error('data/work-search-meta.js must define WORK_SEARCH_META{}');
    return JSON.parse(JSON.stringify(c.WORK_SEARCH_META));
}
function searchOgp(id, meta) {
    const ogp = meta && meta.ogp || {};
    const file = ogp.file || 'ogp.jpg';
    const mime = ogp.mime || 'image/jpeg';
    const width = Number(ogp.width || 1200);
    const height = Number(ogp.height || 630);
    const version = ogp.version === undefined ? 1 : ogp.version;
    const suffix = version === null || version === '' ? '' : '?v=' + encodeURIComponent(String(version));
    return { file, mime, width, height, url: BASE + 'assets/works/' + id + '/' + file + suffix };
}
function readTownReleaseSignals(root) {
    const c = context();
    const updatesFile = path.join(root, 'data/updates.js');
    const ghostFile = path.join(root, 'data/ghost-dialogue.js');
    if (!fs.existsSync(updatesFile)) throw new Error('missing data/updates.js');
    if (!fs.existsSync(ghostFile)) throw new Error('missing data/ghost-dialogue.js');
    run(fs.readFileSync(updatesFile, 'utf8'), c, 'data/updates.js');
    run(fs.readFileSync(ghostFile, 'utf8'), c, 'data/ghost-dialogue.js');
    if (!Array.isArray(c.TOWN_UPDATES)) throw new Error('data/updates.js must define TOWN_UPDATES[]');
    if (!c.GHOST_DIALOGUE || typeof c.GHOST_DIALOGUE !== 'object' || !c.GHOST_DIALOGUE.works || typeof c.GHOST_DIALOGUE.works !== 'object') throw new Error('data/ghost-dialogue.js must define GHOST_DIALOGUE.works');
    return JSON.parse(JSON.stringify({ updates: c.TOWN_UPDATES, ghostWorks: c.GHOST_DIALOGUE.works }));
}
function local(root, url, base = BASE) {
    const u = new URL(url, base);
    if (u.origin !== new URL(BASE).origin || !u.pathname.startsWith(new URL(BASE).pathname)) throw new Error('not a local production URL: ' + url);
    const rel = decodeURIComponent(u.pathname.slice(new URL(BASE).pathname.length));
    const file = path.resolve(root, rel);
    const prefix = fs.realpathSync(root) + path.sep;
    if (!(file + path.sep).startsWith(path.resolve(root) + path.sep)) throw new Error('path escapes root');
    if (fs.existsSync(file) && !(fs.realpathSync(file) + path.sep).startsWith(prefix)) throw new Error('symlink escapes root');
    return file;
}
function imageInfo(b) {
    if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { mime: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (b.length > 4 && b[0] === 255 && b[1] === 216) {
        let p = 2;
        while (p + 4 <= b.length) {
            if (b[p++] !== 255) break;
            while (b[p] === 255) p++;
            const marker = b[p++];
            if (marker === 0xd9 || marker === 0xda) break;
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
            const len = b.readUInt16BE(p);
            if (len < 2 || p + len > b.length) break;
            if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && len >= 8) return { mime: 'image/jpeg', height: b.readUInt16BE(p + 3), width: b.readUInt16BE(p + 5) };
            p += len;
        }
    }
    return null;
}
// Exercise the existing inline redirect pattern, including load/timer callbacks.
// Unexecutable/external scripts are unresolved, never silently treated as proven safe.
function redirectProbe(page, search) {
    const redirects = [], callbacks = [];
    const loc = { search, hash: '', pathname: '/w/test/', replace: u => redirects.push(String(u)), assign: u => redirects.push(String(u)) };
    Object.defineProperty(loc, 'href', { get: () => BASE, set: u => redirects.push(String(u)) });
    const c = context({ setTimeout: fn => { callbacks.push(fn); return 1; }, setInterval: fn => { callbacks.push(fn); return 1; },
        clearTimeout() {}, clearInterval() {}, requestAnimationFrame: fn => { callbacks.push(fn); },
        addEventListener: (type, fn) => { if (['load','DOMContentLoaded'].includes(type)) callbacks.push(fn); },
        document: { addEventListener: (type, fn) => { if (['load','DOMContentLoaded'].includes(type)) callbacks.push(fn); } } });
    for (const obj of [c, c.document]) Object.defineProperty(obj, 'location', { get: () => loc, set: u => redirects.push(String(u)), configurable: true });
    c.self = c; c.top = c; c.parent = c;
    for (const s of page.scripts) {
        if (s.attrs.type && !['text/javascript','application/javascript','module'].includes(s.attrs.type)) continue;
        if (s.attrs.src) throw new Error('external script requires review: ' + s.attrs.src);
        run(s.code, c, 'w inline script');
    }
    if (typeof c.onload === 'function') callbacks.push(c.onload);
    if (typeof c.document.onload === 'function') callbacks.push(c.document.onload);
    let i = 0;
    while (callbacks.length && i++ < 30) {
        c.__callback = callbacks.shift();
        if (typeof c.__callback !== 'function') throw new Error('string timer cannot be verified');
        run('__callback()', c, 'w callback');
    }
    if (callbacks.length) throw new Error('timer loop cannot be verified');
    return redirects;
}
function reachablePages(root) {
    const seen = new Set(), queue = [BASE];
    while (queue.length && seen.size < 500) {
        const url = queue.shift();
        if (seen.has(url)) continue;
        seen.add(url);
        let f;
        try { f = local(root, url); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch { continue; }
        if (!f.endsWith('.html') || !fs.existsSync(f)) continue;
        for (const a of html(fs.readFileSync(f, 'utf8')).tags('a')) {
            if (!a.href || /(?:^|\s)nofollow(?:\s|$)/i.test(a.rel || '')) continue;
            try { const u = new URL(a.href, url); if (u.origin === new URL(BASE).origin && u.pathname.startsWith(new URL(BASE).pathname) && !u.search) { u.hash = ''; queue.push(u.href); } } catch {}
        }
    }
    return seen;
}
function validate(options) {
    const root = path.resolve(options.root || path.join(__dirname, '..'));
    const results = [];
    const add = (status, work, check, message) => results.push({ status, work, check, message });
    const check = (ok, work, code, message) => add(ok ? 'PASS' : 'FAIL', work, code, message);
    const done = () => ({ root, environment: options.env, results,
        exitCode: results.some(r => ['FAIL','HQ_REQUIRED'].includes(r.status)) ? 1 : 0,
        releaseComplete: false, readiness: 'UNVERIFIED',
        summary: Object.fromEntries(['PASS','FAIL','WARNING','HQ_REQUIRED','EXTERNAL_CHECK_REQUIRED'].map(s => [s, results.filter(r => r.status === s).length])) });
    if (!['staging','production'].includes(options.env)) { add('FAIL','*','input.environment','specify --env staging|production'); return done(); }
    let works, searchMeta = {}, townSignals = { updates: [], ghostWorks: {} }, published = options.published;
    try {
        works = readWorks(root);
        if (options.productionRoot) {
            if (published) throw new Error('choose --published OR --production-root');
            if (path.resolve(options.productionRoot) === root && options.env === 'staging') throw new Error('staging cannot be its own production source');
            published = readWorks(path.resolve(options.productionRoot)).filter(w => w.status === 'open').map(w => w.id);
            add('WARNING','*','release.set-source','--production-root is an explicitly selected production snapshot; verify its SHA/provenance in the release record');
        }
    } catch (e) { add('FAIL','*','input.read',e.message); return done(); }
    try { searchMeta = readWorkSearchMeta(root); }
    catch (e) { add('FAIL','*','search.metadata-source',e.message); }
    try { townSignals = readTownReleaseSignals(root); }
    catch (e) { add('FAIL','*','town.release-signals',e.message); }
    if (published && (!Array.isArray(published) || published.some(id => !ID.test(id)) || new Set(published).size !== published.length)) { add('FAIL','*','release.set','published IDs must be valid and unique'); return done(); }
    if (options.env === 'production' && !published) add('FAIL','*','release.set','production requires explicit full --published set or --production-root; staging open is NOT the publication set');
    const ids = options.allProduction ? published : options.ids;
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !ID.test(id)) || new Set(ids).size !== ids.length) { add('FAIL','*','input.ids','provide unique --ids or --all-production with an explicit publication set'); return done(); }
    if (options.allProduction && options.ids?.length) add('FAIL','*','input.ids','choose --ids OR --all-production');
    for (const id of options.physical || []) if (!ids.includes(id)) add('FAIL',id,'input.physical','--physical ID must be selected in --ids/all-production');
    for (const w of works) if (!w || typeof w !== 'object' || !ID.test(w.id || '')) add('FAIL','*','metadata.id','WORKS contains an invalid identity');
    const counts = new Map(); for (const w of works) if (w?.id) counts.set(w.id, (counts.get(w.id) || 0) + 1);
    for (const [id, n] of counts) if (n !== 1) add('FAIL',id,'metadata.unique','duplicate WORKS id');
    if (published) for (const id of published) check(works.some(w => w.id === id && w.status === 'open'), id, 'release.member', 'publication set member must exist and be open in the candidate');
    if (options.env === 'production' && published) for (const w of works.filter(w => w.status === 'open')) if (!published.includes(w.id)) add('FAIL',w.id,'release.unapproved-open','candidate contains an open work outside the explicit publication set');
    let sitemap = [];
    const sm = path.join(root, 'sitemap.xml');
    if (!fs.existsSync(sm)) add(options.env === 'production' ? 'FAIL' : 'WARNING','*','sitemap.file','sitemap.xml missing; staging is not a production candidate');
    else {
        const xml = fs.readFileSync(sm,'utf8').replace(/<!--[\s\S]*?-->/g,'');
        if (!/<urlset\b/.test(xml) || !/<\/urlset>/.test(xml)) add('FAIL','*','sitemap.xml','expected XML urlset');
        sitemap = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/g)].map(m => decode(m[1].trim()));
        if (new Set(sitemap).size !== sitemap.length) add('FAIL','*','sitemap.duplicate','duplicate loc URL');
        for (const value of [...xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1])) {
            if (!/^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/.test(value) || !Number.isFinite(Date.parse(value)) || !Number.isFinite(Date.parse(value.slice(0,10))) || new Date(value.slice(0,10)).toISOString().slice(0,10) !== value.slice(0,10) || value.slice(0,10) > new Date().toISOString().slice(0,10)) add('FAIL','*','sitemap.lastmod','invalid/future lastmod: ' + value);
        }
        add('WARNING','*','sitemap.lastmod','lastmod content accuracy needs history review; not required to equal today; no dates generated');
        if (!published) add('WARNING','*','sitemap.membership','unpublished membership UNVERIFIED: provide explicit publication set');
        else for (const url of sitemap) {
            try {
                const u = new URL(url);
                const basePath = new URL(BASE).pathname;
                const rel = u.pathname.startsWith(basePath) ? u.pathname.slice(basePath.length) : '';
                let m = rel.match(/^w\/([^/]+)\/?$/);
                let locale = 'ja';
                if (!m) { m = rel.match(/^en\/w\/([^/]+)\/?$/); locale = 'en'; }
                if (m) {
                    const expected = locale === 'ja' ? BASE + 'w/' + m[1] + '/' : BASE + 'en/w/' + m[1] + '/';
                    check(published.includes(m[1]) && url === expected, m[1], 'sitemap.membership','sitemap work URL must be canonical and in explicit publication set: ' + url);
                } else if (url !== BASE) add('HQ_REQUIRED','*','sitemap.nonwork','non-work URL outside current root/w and en/w policy: ' + url);
            } catch { add('FAIL','*','sitemap.url','invalid URL: ' + url); }
        }
        if (published) check(fs.readFileSync(sm,'utf8') === buildSearchSitemap(published),'*','sitemap.generated','sitemap.xml must exactly match Search/Share generator output for the explicit publication set');
    }
    const reachable = reachablePages(root);
    let scenes, objects, sceneError;
    try {
        if (!fs.existsSync(path.join(root, 'data/world-objects.js'))) throw new Error('legacy/no world-object basis; generation-crossing policy is unresolved');
        const c = context({ DESTINATIONS: {} });
        for (const f of ['data/world-objects.js','data/station-plaza.js','data/town-maps.js']) run(fs.readFileSync(path.join(root,f),'utf8'),c,f);
        scenes = c.TOWN_SCENE_MAPS; objects = c.YUMANIWA_WORLD_OBJECTS.objects;
    } catch(e) { sceneError = e.message; }
    for (const id of ids) {
        const matches = works.filter(w => w.id === id);
        if (matches.length !== 1) { add('FAIL',id,'metadata.identity','expected exactly one WORKS entry'); continue; }
        const w = matches[0], canonical = BASE + 'w/' + id + '/', enCanonical = BASE + 'en/w/' + id + '/';
        if (options.env === 'production' && published && !published.includes(id)) add('FAIL',id,'release.selected','selected ID is not authorized in publication set');
        for (const key of ['title','description','venue','kind','status','launch','frameMode']) check(typeof w[key] === 'string' && !!w[key].trim(),id,'metadata.' + key,'nonempty ' + key + ' required');
        check(w.status === 'open',id,'metadata.status-open','release target must be open');
        const updateRecord = (townSignals.updates || []).find(entry => entry && Array.isArray(entry.workIds) && entry.workIds.includes(id) && typeof entry.date === 'string' && !!entry.date.trim() && typeof entry.title === 'string' && !!entry.title.trim() && typeof entry.body === 'string' && !!entry.body.trim());
        check(!!updateRecord,id,'town.update-history','new/open work requires a nonempty TOWN_UPDATES record linked by workIds: '+id);
        const ghostLines = townSignals.ghostWorks && townSignals.ghostWorks[id];
        check(Array.isArray(ghostLines) && ghostLines.some(line => typeof line === 'string' && !!line.trim()),id,'town.ghost-dialogue','new/open work requires at least one nonempty GHOST_DIALOGUE.works['+id+'] line');
        for (const [key, values] of Object.entries({ venue:['leisure_center','tomogushi_alley'], kind:['work','game'], launch:['embedded','itch_embed','external'], frameMode:['standard','soft','phone-cola','phone-yakitori'] })) if (w[key] && !values.includes(w[key])) add('HQ_REQUIRED',id,'contract.'+key,'unknown '+key+': '+w[key]);
        if (w.playerLayout && !['phone','responsive'].includes(w.playerLayout)) add('HQ_REQUIRED',id,'contract.playerLayout','unknown layout: '+w.playerLayout);
        for (const key of ['playerWidth','playerHeight']) if (w.playerLayout === 'phone' || w[key] !== undefined) check(typeof w[key] === 'number' && Number.isFinite(w[key]) && w[key] > 0,id,'metadata.'+key,'positive numeric '+key+' required for phone');
        try {
            if (w.launch === 'embedded') {
                check(typeof w.entry === 'string' && /^\.\/works\/[^?#]+/.test(w.entry),id,'launch.entry','embedded entry must be a local ./works/ path');
                const f = local(root,w.entry || ''); check(fs.existsSync(f) && fs.statSync(f).isFile(),id,'launch.file','entry file exists: '+w.entry);
                check(fs.existsSync(path.join(root,'works',id)),id,'launch.folder','works/'+id+'/ exists');
                check(new URL(w.entry || '', BASE).pathname.startsWith(new URL('works/'+id+'/',BASE).pathname),id,'launch.identity','entry belongs to work ID folder');
            } else if (w.launch === 'itch_embed') {
                check(/^https:\/\/itch\.io\/embed-upload\/\d+(?:[/?#]|$)/.test(w.embedUrl || ''),id,'launch.embedUrl','expected itch.io/embed-upload/<number>');
                check(/^https:\/\/[a-z0-9-]+\.itch\.io\/[^?#/]+(?:[/?#]|$)/i.test(w.url || ''),id,'launch.url','normal itch project URL required');
            } else if (w.launch === 'external') { const u = new URL(w.url); check(u.protocol === 'https:' && !u.username && !u.password,id,'launch.url','external URL must use HTTPS'); }
        } catch(e) { add('FAIL',id,'launch.path',e.message); }
        const meta = searchMeta[id];
        check(!!meta && typeof meta === 'object',id,'search.metadata-source','Search/Share metadata required for selected work');
        if (meta && typeof meta === 'object') {
            if (!['VideoGame','SoftwareApplication','CreativeWork'].includes(meta.schemaType || '')) add('HQ_REQUIRED',id,'search.schema-type','unknown schemaType: '+String(meta.schemaType || ''));
            check(Array.isArray(meta.alternateNames) && meta.alternateNames.every(v => typeof v === 'string' && !!v.trim()),id,'search.metadata-source','alternateNames must be a string array');

            const ogpContract = searchOgp(id, meta);
            for (const locale of ['ja','en']) {
                const data = meta[locale];
                check(!!data && typeof data === 'object',id,'search.locale-'+locale,'metadata locale required: '+locale);
                if (!data || typeof data !== 'object') continue;
                for (const key of ['pageTitle','metaDescription','body','shareTitle','shareDescription','imageAlt']) {
                    check(typeof data[key] === 'string' && !!data[key].trim(),id,'search.metadata-source',locale+'.'+key+' must be nonempty');
                }
                for (const key of ['genres','terms']) {
                    check(Array.isArray(data[key]) && data[key].length > 0 && data[key].every(v => typeof v === 'string' && !!v.trim()),id,'search.metadata-source',locale+'.'+key+' must be a nonempty string array');
                }

                const localeFile = locale === 'ja'
                    ? path.join(root,'w',id,'index.html')
                    : path.join(root,'en','w',id,'index.html');
                const localeCanonical = locale === 'ja' ? canonical : enCanonical;
                if (!fs.existsSync(localeFile)) {
                    add('FAIL',id,'search.locale-'+locale,'missing '+path.relative(root,localeFile));
                    continue;
                }

                const actualSource = fs.readFileSync(localeFile,'utf8');
                const expectedSource = buildSearchPage(id,w,meta,locale,options.env);
                check(actualSource === expectedSource,id,'search.generated-'+locale,'generated '+locale+' page must exactly match metadata + generator');

                const localized = html(actualSource);
                const htmlTags = localized.tags('html');
                check(htmlTags.length === 1 && htmlTags[0].lang === locale,id,'search.locale-'+locale,'html lang must equal '+locale);

                const localizedTitle = localized.elements('title');
                check(localizedTitle.length === 1 && text(localizedTitle[0]) === data.pageTitle,id,'search.localized-metadata',locale+' title must match metadata source');
                check(localized.meta('description').length === 1 && localized.meta('description')[0] === data.metaDescription,id,'search.localized-metadata',locale+' description must match metadata source');
                check(localized.meta('og:title').length === 1 && localized.meta('og:title')[0] === data.shareTitle,id,'search.localized-metadata',locale+' og:title must match metadata source');
                check(localized.meta('og:description').length === 1 && localized.meta('og:description')[0] === data.shareDescription,id,'search.localized-metadata',locale+' og:description must match metadata source');
                check(localized.meta('twitter:title').length === 1 && localized.meta('twitter:title')[0] === data.shareTitle,id,'search.localized-metadata',locale+' twitter:title must match metadata source');
                check(localized.meta('twitter:description').length === 1 && localized.meta('twitter:description')[0] === data.shareDescription,id,'search.localized-metadata',locale+' twitter:description must match metadata source');
                check(localized.meta('og:image:alt').length === 1 && localized.meta('og:image:alt')[0] === data.imageAlt,id,'search.localized-metadata',locale+' og:image:alt must match metadata source');
                check(localized.meta('twitter:image:alt').length === 1 && localized.meta('twitter:image:alt')[0] === data.imageAlt,id,'search.localized-metadata',locale+' twitter:image:alt must match metadata source');
                check(localized.meta('og:image').length === 1 && localized.meta('og:image')[0] === ogpContract.url,id,'search.localized-metadata',locale+' OGP image must match metadata OGP contract');
                check(localized.meta('twitter:image').length === 1 && localized.meta('twitter:image')[0] === ogpContract.url,id,'search.localized-metadata',locale+' X image must match metadata OGP contract');
                check(localized.meta('og:image:type').length === 1 && localized.meta('og:image:type')[0] === ogpContract.mime,id,'search.localized-metadata',locale+' OGP MIME must match metadata OGP contract');
                check(Number(localized.meta('og:image:width')[0]) === ogpContract.width && Number(localized.meta('og:image:height')[0]) === ogpContract.height,id,'search.localized-metadata',locale+' OGP dimensions must match metadata OGP contract');
                check(localized.meta('keywords').length === 0,id,'search.meta-keywords','do not emit meta keywords; terms live in Search metadata / structured data');

                const canons = localized.tags('link').filter(a => (a.rel || '').toLowerCase() === 'canonical');
                check(canons.length === 1 && canons[0].href === localeCanonical,id,'search.locale-canonical',locale+' canonical must equal '+localeCanonical);
                check(localized.meta('og:url').length === 1 && localized.meta('og:url')[0] === localeCanonical,id,'search.locale-og-url',locale+' og:url must equal canonical');

                const alternates = localized.tags('link').filter(a => (a.rel || '').toLowerCase() === 'alternate' && a.hreflang);
                const byLang = Object.fromEntries(alternates.map(a => [a.hreflang,a.href]));
                check(alternates.length === 3 && byLang.ja === canonical && byLang.en === enCanonical,id,'search.hreflang-reciprocal',locale+' page must declare reciprocal ja/en hreflang URLs');
                check(byLang['x-default'] === canonical,id,'search.x-default',locale+' x-default must point to Japanese canonical');

                const robotsLocalized = localized.meta('robots').join(',').toLowerCase().split(/[\s,]+/);
                if (options.env === 'production') check(robotsLocalized.includes('index') && robotsLocalized.includes('follow') && !robotsLocalized.some(x=>['noindex','nofollow','none'].includes(x)),id,'search.localized-robots',locale+' production page requires index,follow');
                else check(robotsLocalized.includes('noindex') || robotsLocalized.includes('none'),id,'search.localized-robots',locale+' staging page requires noindex');

                const scripts = localized.scripts.filter(s => (s.attrs.type || '').toLowerCase() === 'application/ld+json');
                let structured = null;
                if (scripts.length === 1) {
                    try { structured = JSON.parse(scripts[0].code); } catch {}
                }
                const expectedName = locale === 'ja'
                    ? data.shareTitle.replace(/｜湯間庭町\s*$/,'')
                    : data.shareTitle.replace(/\s*\|\s*Yumaniwa Town\s*$/,'');
                const structuredOk = !!structured
                    && structured['@context'] === 'https://schema.org'
                    && structured['@type'] === meta.schemaType
                    && structured.name === expectedName
                    && structured.url === localeCanonical
                    && structured.image === ogpContract.url
                    && structured.description === data.metaDescription
                    && structured.inLanguage === locale
                    && JSON.stringify(structured.genre) === JSON.stringify(data.genres)
                    && JSON.stringify(structured.keywords) === JSON.stringify(data.terms);
                check(scripts.length === 1 && structuredOk,id,'search.structured-data',locale+' JSON-LD must match Search metadata, canonical and OGP');
                if (structured && meta.schemaType === 'VideoGame') check(structured.gamePlatform === 'Web Browser',id,'search.structured-data',locale+' VideoGame must declare Web Browser platform');
                if (structured && meta.schemaType === 'SoftwareApplication') check(structured.operatingSystem === 'Web Browser',id,'search.structured-data',locale+' SoftwareApplication must declare Web Browser OS');

                const linksLocalized = localized.tags('a').map(a => { try { return new URL(a.href,localeCanonical).href; } catch { return ''; } });
                check(linksLocalized.includes(BASE+'?work='+id),id,'search.localized-links',locale+' page requires static town launch link');
                check(linksLocalized.includes(BASE),id,'search.localized-links',locale+' page requires static town root link');
                check(linksLocalized.includes(locale === 'ja' ? enCanonical : canonical),id,'search.localized-links',locale+' page requires static language-switch link');

                try {
                    const ordinary = redirectProbe(localized,'');
                    check(!ordinary.length,id,'search.localized-redirect',locale+' ordinary visit must not redirect');
                    const compatibility = redirectProbe(localized,'?open=1');
                    check(compatibility.length === 1 && compatibility.every(value => {
                        const u = new URL(value,localeCanonical);
                        return u.origin + u.pathname === BASE && u.searchParams.getAll('work').length === 1 && u.searchParams.get('work') === id;
                    }),id,'search.localized-open-shortcut',locale+' open=1 must target this work in town shell');
                } catch(e) { add('HQ_REQUIRED',id,'search.localized-script-review',locale+' redirect behavior UNVERIFIED: '+e.message); }

                check(reachable.has(localeCanonical),id,'search.localized-discovery','static followable path from root required for '+localeCanonical);
            }
        }

        const pageFile = path.join(root,'w',id,'index.html');
        if (!fs.existsSync(pageFile)) add('FAIL',id,'search.page','missing w/'+id+'/index.html');
        else {
            const page = html(fs.readFileSync(pageFile,'utf8'));
            const single = key => { const vals = page.meta(key); check(vals.length === 1 && !!vals[0].trim(),id,'search.'+key,'one nonempty '+key+' required'); return vals[0] || ''; };
            check(page.elements('title').length === 1 && !!text(page.elements('title')[0]),id,'search.title','one nonempty title required');
            single('description'); single('og:title'); single('og:description');
            check(page.elements('h1').some(s => text(s)),id,'search.h1','nonempty h1 required');
            check(page.elements('p').some(s => text(s.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi,''))),id,'search.body','introductory paragraph required, not just a launch link');
            const links = page.tags('a').map(a => { try { return new URL(a.href,canonical).href; } catch { return ''; } });
            check(links.includes(BASE+'?work='+id),id,'search.launch-link','static town launch link required');
            check(links.includes(BASE),id,'search.town-link','static town root link required');
            const canons = page.tags('link').filter(a => (a.rel || '').toLowerCase() === 'canonical');
            check(canons.length === 1 && canons[0].href === canonical,id,'search.canonical','canonical must equal '+canonical);
            check(single('og:url') === canonical,id,'search.og-url','og:url must equal canonical');
            const robots = page.meta('robots').join(',').toLowerCase().split(/[\s,]+/);
            if (options.env === 'production') check(!page.meta('googlebot').join(',').toLowerCase().split(/[\s,]+/).some(x=>['noindex','nofollow','none'].includes(x)),id,'search.googlebot','no restrictive Googlebot override');
            if (options.env === 'production') check(robots.includes('index') && robots.includes('follow') && !robots.some(x=>['noindex','nofollow','none'].includes(x)),id,'search.robots','production requires index,follow; noindex/nofollow/none forbidden');
            else check(robots.includes('noindex') || robots.includes('none'),id,'search.robots','staging requires noindex (correct environment policy)');
            check(!page.metas.some(a => (a['http-equiv'] || '').toLowerCase()==='refresh'),id,'search.meta-refresh','no automatic meta refresh');
            try {
                const normal = redirectProbe(page,''); check(!normal.length,id,'search.redirect','ordinary visit must not redirect'+(normal.length?': '+normal.join(', '):''));
                const compatibility = redirectProbe(page,'?open=1');
                if (compatibility.length) check(compatibility.every(value => { const u = new URL(value,canonical); return u.origin + u.pathname === BASE && u.searchParams.getAll('work').length === 1 && u.searchParams.get('work') === id; }),id,'search.open-shortcut','open=1 shortcut must target this work in town shell');
            } catch(e) { add('HQ_REQUIRED',id,'search.script-review','redirect behavior UNVERIFIED: '+e.message); }
            if (/\bon\w+\s*=/i.test(page.markup)) add('HQ_REQUIRED',id,'search.inline-handler','inline HTML event handler needs redirect review');
            const image = single('og:image'), twitter = single('twitter:image');
            single('og:image:alt'); single('twitter:image:alt');
            const card = single('twitter:card'); check(['summary','summary_large_image'].includes(card),id,'share.card','supported X card required');
            check(image === twitter && !!image,id,'ogp.same-image','OGP and X image must reference the same adopted image');
            if (image) try {
                const u = new URL(image); const f = local(root,image);
                check(u.href.startsWith(BASE+'assets/works/'+id+'/'),id,'ogp.identity','image URL belongs to assets/works/'+id+'/');
                check(fs.existsSync(f) && fs.statSync(f).isFile(),id,'ogp.file','declared image file exists');
                if (fs.existsSync(f) && fs.statSync(f).isFile()) {
                    const info = imageInfo(fs.readFileSync(f));
                    if (!info) add('HQ_REQUIRED',id,'ogp.format','only current JPEG/PNG byte formats are inspected; review another format');
                    else {
                        check(single('og:image:type') === info.mime,id,'ogp.mime','declared MIME matches image bytes');
                        check(Number(single('og:image:width')) === info.width && Number(single('og:image:height')) === info.height,id,'ogp.dimensions','declared dimensions match bytes: '+info.width+'x'+info.height);
                        const ext = path.extname(f).toLowerCase(); check((info.mime==='image/png' && ext==='.png') || (info.mime==='image/jpeg' && ['.jpg','.jpeg'].includes(ext)),id,'ogp.extension','extension matches bytes');
                        if (info.width !== 1200 || info.height !== 630) add('WARNING',id,'ogp.recommended-size','1200x630 is the current convention, not a hard rule; review card cropping');
                    }
                }
            } catch(e) { add('FAIL',id,'ogp.url',e.message); }
            check(reachable.has(canonical),id,'search.discovery','static followable link path from root to '+canonical+' required');
        }
        if (options.env === 'production' || fs.existsSync(sm)) {
            check(sitemap.includes(canonical),id,'sitemap.inclusion','Japanese canonical URL must be in sitemap: '+canonical);
            check(sitemap.includes(enCanonical),id,'sitemap.inclusion-en','English canonical URL must be in sitemap: '+enCanonical);
        }
        try {
            const links = []; const c = context({ location:{search:'?work='+id}, document:{createElement:()=>({}),head:{appendChild:l=>links.push(l)}} });
            run(fs.readFileSync(path.join(root,'work-install-meta.js'),'utf8'),c,'work-install-meta.js');
            const manifestLinks = links.filter(l=>l.rel==='manifest');
            check(manifestLinks.length===1 && new URL(manifestLinks[0].href,BASE).href === canonical+'manifest.webmanifest',id,'install.contract','existing install script must resolve this work manifest');
            const mf = path.join(root,'w',id,'manifest.webmanifest'); const m = JSON.parse(fs.readFileSync(mf,'utf8'));
            for (const key of ['id','start_url']) check(new URL(m[key] || '',canonical).href === BASE+'?work='+id,id,'manifest.'+key,key+' must resolve to town work URL');
            check(new URL(m.scope || '',canonical).href === BASE,id,'manifest.scope','scope must resolve to town root');
            const icons = links.filter(l=>l.rel==='apple-touch-icon');
            if (!icons.length) add('PASS',id,'install.iconless','existing install script applies iconless exception; no PWA requirement added');
            for (const icon of [...icons.map(l=>({src:l.href,base:BASE})), ...(m.icons || []).map(l=>({...l,base:canonical}))]) {
                const f=local(root,icon.src,icon.base); check(new URL(icon.src,icon.base).pathname.startsWith(new URL('assets/works/'+id+'/',BASE).pathname),id,'install.icon-identity','icon must belong to this work'); check(fs.existsSync(f) && fs.statSync(f).isFile(),id,'install.icon','icon exists: '+icon.src);
            }
            if (icons.length) check(Array.isArray(m.icons) && m.icons.length>0,id,'manifest.icons','non-iconless work requires manifest icons');
        } catch(e) { add('FAIL',id,'install.manifest',e.message); }
        const physical = (options.physical || []).includes(id);
        if (sceneError) add(physical ? 'HQ_REQUIRED' : 'EXTERNAL_CHECK_REQUIRED',id,'scene.basis',sceneError+'; placement UNVERIFIED, specify --physical for intended physical placement; do not copy staging basis');
        else {
            let found = 0;
            for (const [sceneId,scene] of Object.entries(scenes)) {
                const triggers = (scene.triggers || []).filter(t=>t.type==='work' && t.workId===id);
                if (!triggers.length) continue;
                found += triggers.length;
                const result = validateSceneData(scene,objects); check(result.ok,id,'scene.contract',sceneId+': '+(result.ok?'existing scene contract valid':result.errors.join('; ')));
                for (const trigger of triggers) {
                    const props = (scene.props || []).filter(p=>p.enabled!==false && p.interaction?.enabled!==false && p.interaction?.triggerId===trigger.id);
                    check(props.length>0,id,'scene.prop',sceneId+'/'+trigger.id+' needs linked enabled prop');
                    for (const prop of props) {
                        check(prop.tap !== false && prop.tap?.enabled !== false,id,'scene.tap',prop.id+' tap enabled');
                        try { const f=local(root,objects[prop.objectId]?.src || ''); check(fs.existsSync(f) && fs.statSync(f).isFile(),id,'scene.object',prop.objectId+' image exists'); } catch(e) { add('FAIL',id,'scene.object',e.message); }
                    }
                }
            }
            if (physical) check(found>0,id,'scene.physical','explicit physical work needs a work trigger');
            if (!found && !physical) add('WARNING',id,'scene.menu-only','no physical trigger; treated as menu-only; confirm placement intent in release record');
        }
        try {
            const emitted = [], links = [];
            const c = context({ location:{pathname: options.env==='staging'?'/yumaniwa-town-staging/':'/yumaniwa-town/'},
                getWorkById:x=>works.find(w=>w.id===x), document:{getElementById:()=>null,createElement:()=>({}),head:{appendChild:l=>links.push(l)}},
                navigator:{}, plausible:(name,payload)=>emitted.push({name,payload}), console:{info:(_prefix,name)=>emitted.push({name})} });
            run(fs.readFileSync(path.join(root,'town-analytics.js'),'utf8'),c,'town-analytics.js');
            const events = ['Work Open', ...(w.launch==='external'?[]:['Work Close']), 'Share'];
            for (const event of events) { c.trackYumaniwaEvent(event,{work:id}); check(emitted.some(e=>e.name===event+': '+id),id,'analytics.name','existing tracker emits '+event+': '+id); add('EXTERNAL_CHECK_REQUIRED',id,'analytics.goal','UNVERIFIED Plausible Goal: '+event+': '+id+(event==='Share'?' (native share success only; applicability requires review)':'')); }
            if (options.env==='staging') check(links.length===0,id,'analytics.environment','staging probe injects no tracker script');
            add('EXTERNAL_CHECK_REQUIRED',id,'analytics.runtime','UNVERIFIED actual launch/close hooks, core action applicability and production delivery; Work Open means attempt, not completion');
        } catch(e) { add('HQ_REQUIRED',id,'analytics.contract','cannot inspect existing tracker: '+e.message); }
        add('EXTERNAL_CHECK_REQUIRED',id,'town.runtime','UNVERIFIED mobile/PC main action, return, controls, physical reachability, cache/revisit');
        add('EXTERNAL_CHECK_REQUIRED',id,'share.handoff','UNVERIFIED adopted Japanese copy, controls, required English/media and external handoff');
    }
    add('EXTERNAL_CHECK_REQUIRED','*','release.record','UNVERIFIED base/staging/candidate SHA, exclusions, dependencies, environment differences, validation and rollback; validator success is NOT Release Complete');
    add('EXTERNAL_CHECK_REQUIRED','*','release.live','UNVERIFIED Pages SHA success, live headers/card/links, five Ready confirmations and selected announcement/handoff');
    return done();
}
function parseArgs(argv) {
    const o = {}; const list = s => s.split(',').map(x=>x.trim()).filter(Boolean);
    const fields = {'--root':'root','--env':'env','--ids':'ids','--published':'published','--production-root':'productionRoot','--physical':'physical'};
    for (let i=0;i<argv.length;i++) {
        const a=argv[i];
        if (['--help','--json','--all-production'].includes(a)) { o[a==='--all-production'?'allProduction':a.slice(2)] = true; continue; }
        if (!fields[a] || !argv[i+1] || argv[i+1].startsWith('--') || o[fields[a]]!==undefined) throw new Error('unknown, repeated or incomplete option: '+a);
        o[fields[a]] = ['--ids','--published','--physical'].includes(a)?list(argv[++i]):argv[++i];
    }
    return o;
}
if (require.main === module) {
    try {
        const o=parseArgs(process.argv.slice(2));
        if (o.help) console.log('node tools/release-validator.cjs --env staging|production [--root CHECKOUT] (--ids ID[,ID] | --all-production) [--published FULL_ID_SET | --production-root VERIFIED_PRODUCTION_CHECKOUT] [--physical ID[,ID]] [--json]\nRead-only. Exit: 0 static checks nonblocking (external review still required), 1 FAIL/HQ_REQUIRED, 2 CLI error. See RELEASE-WORKFLOW.md.');
        else { const r=validate(o); if (o.json) console.log(JSON.stringify(r,null,2)); else { for (const x of r.results) console.log(`${x.status} [${x.work}] ${x.check}: ${x.message}`); console.log('\n'+JSON.stringify(r.summary)+'\nRelease Complete: UNVERIFIED (never certified by this tool)'); } process.exitCode=r.exitCode; }
    } catch(e) { console.error('FAIL validator: '+e.message); process.exitCode=2; }
}
module.exports = { validate, readWorks, readWorkSearchMeta, readTownReleaseSignals, html, imageInfo, redirectProbe, parseArgs };
