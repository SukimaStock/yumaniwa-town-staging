'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the actual rack functions without booting unrelated town scenes.
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const start = main.indexOf('function getSortedNoteArticlesForRack()');
const end = main.indexOf('window.renderNoteCardRack =', start);
assert(start >= 0 && end > start, 'rack source boundaries must exist');
const source = main.slice(start, end);
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(articles, seed = 1, history = [], storageThrows = false) {
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
    vm.runInContext(source, context, { filename: 'main.js:rack' });
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

test('archivePage never changes selected IDs, roles or random consumption', () => {
    const histories = [[], [{ id: 'article-7' }], [{ id: 'article-2' }, { id: 'article-9' }], [{ id: 'unknown' }]];
    for (const history of histories) {
        for (const seed of [0, 1, 17, 20261018, 0xffffffff]) {
            for (const indexes of [[0], [3, 8], candidates.map((_, i) => i)]) {
                const migrated = candidates.map((article, i) => indexes.includes(i)
                    ? { ...article, archivePage: './shinpo/article-' + i + '/' } : article);
                const before = fixture(candidates, seed, history);
                const after = fixture(migrated, seed, history);
                // A second opening also detects changes to random consumption.
                for (let opening = 0; opening < 2; opening++) {
                    const expected = before.select();
                    assert.deepEqual(after.select(), expected);
                    assert.equal(expected.length, 4);
                    assert.equal(new Set(expected.map(slot => slot.id)).size, 4);
                    assert.deepEqual(expected.slice(0, 3).map(slot => slot.kind), ['latest', 'pickup', 'random']);
                    assert(['welcome', 'recommended'].includes(expected[3].kind));
                }
            }
        }
    }
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
