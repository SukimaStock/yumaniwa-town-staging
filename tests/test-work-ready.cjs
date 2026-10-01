'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = read('work-ready.js');
const worksContext = {};
vm.runInNewContext(read('data/works.js'), worksContext);
// Inspect the private selector without adding a production export.
const selector = vm.runInNewContext('(' + source.match(/function getWorkSource\(work\) \{[\s\S]*?\n    \}/)[0] + ')');

function player(work) {
    function element() {
        const classes = new Set();
        return { hidden: false, disabled: false, listeners: {},
            classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
            setAttribute() {}, addEventListener(name, fn) { this.listeners[name] = fn; }, appendChild() {},
            insertBefore(button) { this.button = button; } };
    }
    const ids = Object.fromEntries(['work-player','work-player-controls','work-player-frame','work-player-loading','work-player-loading-label'].map(id => [id, element()]));
    ids['work-player'].classList.add('visible');
    ids['work-player-frame'].src = selector(work);
    let current = work, now = 10000, next = 0;
    const timers = new Map();
    const window = {currentWorkId: work.id, getWorkById: () => current,
        requestAnimationFrame: fn => fn(), setTimeout: (fn, ms) => { timers.set(++next,{fn,due:now+ms}); return next; }, clearTimeout: id => timers.delete(id)};
    vm.runInNewContext(source, {window, document: {getElementById: id => ids[id], createElement: element, head: element()},
        MutationObserver: class { observe() {} }, Date: {now: () => now}});
    return {button: ids['work-player-controls'].button, frame: ids['work-player-frame'],
        click() { this.button.listeners.click({preventDefault() {},stopPropagation() {}}); },
        tick(ms) { now += ms; for(const [id,t] of [...timers]) if(t.due<=now) {timers.delete(id);t.fn();} },
        close() { ids['work-player'].classList.remove('visible'); },
        change(work) { current=work; window.currentWorkId=work.id; }};
}

for (const id of ['yakitori-wars','midnight-cola','junkissa-dive','rojiura-masala']) {
    test(id + ': retained itch URL never takes over the local frame', () => {
        const work = worksContext.WORKS.find(w => w.id === id);
        assert.equal(work.launch, 'embedded');
        assert.ok(work.embedUrl);
        assert.equal(selector(work), work.entry);
        const p = player(work);
        assert.equal(p.button.hidden, true);
        p.click(); p.tick(700);
        assert.equal(p.frame.src, work.entry);
    });
}
const itch = {id:'itch-fixture',launch:'itch_embed',embedUrl:'https://itch.io/embed-upload/123',entry:'./unused.html',url:'https://example.com/unused'};
test('itch_embed retains retry, blank delay and cooldown', () => {
    const p = player(itch);
    assert.equal(p.button.hidden,false);
    p.click(); assert.equal(p.frame.src,'about:blank'); assert.equal(p.button.disabled,true);
    p.tick(699); assert.equal(p.frame.src,'about:blank');
    p.tick(1); assert.equal(p.frame.src,itch.embedUrl);
    p.click(); assert.equal(p.frame.src,itch.embedUrl);
    p.tick(4000); assert.equal(p.button.disabled,false);
    p.click(); assert.equal(p.frame.src,'about:blank');
});
for (const action of ['close','change']) test('pending retry does not reopen after '+action, () => {
    const p=player(itch);p.click();
    if(action==='close') p.close(); else p.change({id:'other'});
    p.tick(700);assert.equal(p.frame.src,'about:blank');
});
test('explicit launch selects only its own field, including missing-field cases', () => {
    const fields={entry:'./local.html',embedUrl:itch.embedUrl,url:'https://example.com/work'};
    for(const [launch,field] of [['embedded','entry'],['itch_embed','embedUrl'],['external','url']]) {
        assert.equal(selector({...fields,launch}),fields[field]);
        assert.equal(selector({...fields,launch,[field]:''}),'');
    }
    assert.equal(selector(null),'');assert.equal(selector({...fields,launch:'unknown'}),'');
    assert.equal(selector(fields),fields.url);
    assert.equal(selector({entry:fields.entry,embedUrl:fields.embedUrl}),fields.entry);
});
test('external works with a retained embedUrl do not expose itch retry', () => {
    const work={...itch,launch:'external'};const p=player(work);
    assert.equal(p.button.hidden,true);p.click();p.tick(700);assert.equal(p.frame.src,work.url);
});
