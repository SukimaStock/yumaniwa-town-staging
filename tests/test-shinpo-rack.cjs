'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const cp = require('node:child_process');
const baselineMain = cp.execFileSync('git', ['show', 'f3f8ad6e994eee02f41440e7cb62fae8d75b16ea:main.js'], {cwd:path.join(__dirname,'..'),encoding:'utf8'});
const baselineSource = baselineMain.slice(baselineMain.indexOf('function getSortedNoteArticlesForRack()'),baselineMain.indexOf('window.renderNoteCardRack ='));

// Exercise the actual rack functions without booting unrelated town scenes.
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const start = main.indexOf('function getSortedNoteArticlesForRack()');
const end = main.indexOf('window.renderNoteCardRack =', start);
assert(start >= 0 && end > start, 'rack source boundaries must exist');
const source = main.slice(start, end);
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(articles, seed = 1, history = [], storageThrows = false, rackSource = source) {
    let state = seed >>> 0;
    const math = Object.create(Math);
    math.random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    let stored = JSON.stringify(history);
    const opens = [];
    const context = vm.createContext({
        Math: math, URL,
        NOTE_ARTICLES: plain(articles),
        getNotePublishDate: article => article.publishedAt || article.publish_date || '',
        getNoteEmbedUrl: article => 'https://note.com/embed/' + article.id,
        SHINPO_HISTORY_KEY: 'test-shinpo-history', SHINPO_HISTORY_LIMIT: 24,
        window: {
            location: { href: 'https://sukimastock.github.io/yumaniwa-town-staging/?place=shinpo_board' },
            localStorage: {
                getItem() { if (storageThrows) throw new Error('storage unavailable'); return stored; },
                setItem(key, value) { if (storageThrows) throw new Error('storage unavailable'); stored = value; }
            },
            open: (...args) => opens.push(args)
        }
    });
    vm.runInContext(rackSource, context, { filename: 'main.js:rack' });
    context.openNoteArticleFromRack = context.window.openNoteArticleFromRack;
    return { context, opens, history: () => JSON.parse(stored),
        select: () => plain(context.buildNoteRackSelection()).map(slot => ({ id: slot.article.id, kind: slot.kind, label: slot.label })) };
}

const candidates = Array.from({ length: 12 }, (_, i) => ({
    id: 'article-' + i, title: i % 2 ? 'ゲームを作る' : '時計アプリ',
    url: 'https://note.com/hamamah/n/nfixture' + i,
    publishedAt: '2026-' + String(12 - i).padStart(2, '0') + '-18',
    featured: i === 4, themes: [i % 2 ? 'game' : 'app']
}));

test('without unused local articles, old featured/recent behavior and random consumption are unchanged', () => {
    for (const history of [[], [{id:'article-7'}], [{id:'unknown'}]]) {
        for (const seed of [0,1,17,20261018,0xffffffff]) {
            for (const list of [candidates, candidates.map(a=>({...a,featured:false})), candidates.map((a,i)=>({...a,archivePage:i===0?'./shinpo/latest/':''}))]) {
                const now=fixture(list,seed,history),old=fixture(list,seed,history,false,baselineSource);
                for(let opening=0;opening<3;opening++)assert.deepEqual(now.select(),old.select());
            }
        }
    }
});

test('pickup draws each unused local article with or without history and keeps four distinct roles', () => {
    for(const indexes of [[],[11],[3,8,11],[0],[0,8,11]]) {
        const articles=candidates.map((a,i)=>({...a,...(indexes.includes(i)?{archivePage:'./shinpo/'+i+'/'}:{})}));
        const expected=indexes.filter(i=>i!==0).map(i=>'article-'+i),seen=new Set();
        for(const history of [[],[{id:'article-7'}],[{id:'unknown'}]]) {
            for(let i=0;i<100;i++) {
                const seed=Math.imul(i+1,2654435761)>>>0;
                const f=fixture(articles,seed,history),slots=f.select();
                assert.deepEqual(slots,fixture(articles,seed,history).select());
                assert.equal(slots.length,4);assert.equal(new Set(slots.map(s=>s.id)).size,4);
                assert.equal(slots[0].id,'article-0');assert.deepEqual(slots.slice(0,3).map(s=>s.kind),['latest','pickup','random']);
                assert.equal(slots[3].kind,history.length?'recommended':'welcome');
                if(expected.length){assert(expected.includes(slots[1].id));seen.add(slots[1].id);}
            }
        }
        assert.deepEqual([...seen].sort(),expected.sort());
    }
});

test('51-article regression snapshot: old local articles are eligible and all are selected', () => {
    // Pin only this historical regression case; future article additions need no test edits.
    const data=cp.execFileSync('git',['show','f3f8ad6e994eee02f41440e7cb62fae8d75b16ea:data/notes.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
    const start=data.indexOf('var NOTE_ARTICLES = ['),box={};
    vm.runInNewContext(data.slice(start,data.indexOf('\n];',start)+3),box);
    const articles=plain(box.NOTE_ARTICLES);
    const sorted=fixture(articles).context.getSortedNoteArticlesForRack();
    const locals=sorted.filter(a=>a.archivePage).map(a=>a.id),seen=new Set();
    assert.equal(articles.length,51);assert.equal(locals.length,3);
    assert(locals.every(id=>sorted.findIndex(a=>a.id===id)>=10));
    for(const history of [[],[{id:locals[0]}]])for(let i=0;i<100;i++) {
        const slots=fixture(articles,Math.imul(i+1,2654435761)>>>0,history).select();
        assert.equal(slots[0].id,sorted[0].id);assert.equal(slots.length,4);assert.equal(new Set(slots.map(s=>s.id)).size,4);
        assert(locals.includes(slots[1].id));seen.add(slots[1].id);
    }
    assert.deepEqual([...seen].sort(),Array.from(locals).sort());
});

test('zero through three candidates retain the existing smaller-rack fallback', () => {
    for (let count = 0; count <= 3; count++) {
        for (const history of [[], [{ id: 'article-0' }]]) {
            const subset = candidates.slice(0, count);
            const migrated = subset.map(article => ({ ...article, archivePage: './shinpo/example/' }));
            const slots = fixture(migrated, 17, history).select();
            assert.deepEqual(slots, fixture(subset, 17, history).select());
            assert.equal(slots.length, count);
            assert.equal(new Set(slots.map(slot => slot.id)).size, count);
            assert.deepEqual(slots.map(slot => slot.kind), ['latest', 'pickup', 'random'].slice(0, count));
        }
    }
});

test('a migrated article newer than July 17 occupies the normal latest role only', () => {
    const articles = candidates.map((article, i) => i === 0
        ? { ...article, archivePage: './shinpo/newest/' } : article);
    const slots = fixture(articles).select();
    assert(candidates[0].publishedAt > '2026-07-17');
    assert.deepEqual(slots[0], { id: 'article-0', label: '最新', kind: 'latest' });
    assert.equal(slots.length, 4);
    assert(!slots.some(slot => slot.kind === 'archive' || slot.label === '町のはじまり'));
});

test('one card activation opens the selected internal or note destination once', () => {
    for (const migrated of [false, true]) {
        for (const storageThrows of [false, true]) {
            const article = { ...candidates[0], ...(migrated ? { archivePage: './shinpo/newest/' } : {}) };
            const f = fixture([article], 1, [], storageThrows);
            const html = f.context.renderNoteRackCard({ article, label: '最新', kind: 'latest' });
            const actions = [...html.matchAll(/onclick="([^"]+)"/g)];
            assert.equal(actions.length, 1);
            vm.runInContext(actions[0][1], f.context);
            assert.deepEqual(f.opens, [[migrated
                ? 'https://sukimastock.github.io/yumaniwa-town-staging/shinpo/newest/'
                : article.url, '_blank']]);
            if (!storageThrows) assert.equal(f.history()[0].id, article.id);
            f.context.window.openNoteArticleFromRack('missing');
            assert.equal(f.opens.length, 1);
        }
    }
});

test('migrated cards never render an added subtitle, even with legacy teaser metadata', () => {
    const articles = require('../tools/shinpo-migrate.cjs').notes().filter(a => a.archivePage);
    assert.equal(articles.length >= 3, true);
    for (const original of articles) {
        assert.equal(original.archiveTeaser, undefined);
        for (const teaser of [undefined, 'UNREQUESTED SUBTITLE']) {
            const article = {...original, archiveTeaser: teaser};
            const f = fixture([article]);
            const html = f.context.renderNoteRackCard({article, label:'最新', kind:'latest'});
            assert(!html.includes('shinpo-archive-teaser'));
            assert(!html.includes('UNREQUESTED SUBTITLE'));
            assert(!html.includes('棚ではなく、「場所」が欲しかった。'));
            assert(html.includes(original.title));
            assert.equal([...html.matchAll(/onclick=/g)].length, 1);
        }
    }
});
