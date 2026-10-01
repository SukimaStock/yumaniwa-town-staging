'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'work-install-meta.js'), 'utf8');

function links(search) {
    const added = [];
    vm.runInNewContext(source, { window: { location: { search } }, URLSearchParams,
        document: { createElement: () => ({}), head: { appendChild: link => added.push(link) } } });
    return added;
}

test('Diorama direct route adds its existing canonical home-screen icon', () => {
    assert.deepEqual(links('?work=diorama-calendar'), [
        { rel: 'apple-touch-icon', href: './assets/works/diorama-calendar/icon.png' },
        { rel: 'manifest', href: './w/diorama-calendar/manifest.webmanifest' }
    ]);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'w/diorama-calendar/manifest.webmanifest'), 'utf8'));
    assert.deepEqual(manifest.icons, [{ src: '../../assets/works/diorama-calendar/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }]);
    const icon = fs.readFileSync(path.join(root, 'w/diorama-calendar', manifest.icons[0].src));
    assert.equal(icon.subarray(1, 4).toString(), 'PNG');
    assert.equal(icon.readUInt32BE(16), 1024);
    assert.equal(icon.readUInt32BE(20), 1024);
});

test('CoffeeFactory keeps its existing iconless exception', () => {
    assert.deepEqual(links('?work=coffee-factory'), [{ rel: 'manifest', href: './w/coffee-factory/manifest.webmanifest' }]);
});

test('other work icons and invalid-route rejection remain unchanged', () => {
    assert.equal(links('?work=orbit')[0].href, './assets/works/orbit/icon.png');
    assert.deepEqual(links(''), []);
    assert.deepEqual(links('?work=../bad'), []);
});
