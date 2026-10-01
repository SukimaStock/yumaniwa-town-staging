'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', 'works/rojiura-masala', file), 'utf8');
const configSource = read('analytics-config.js');
const runtimeSource = read('analytics-runtime.js');
const currentBuild = read('sketch.js').match(/const ROJIURA_BUILD = "([^"]+)";/)[1];

function analytics(options = {}) {
    const requests = [];
    const root = {
        location: { hostname: 'sukimastock.github.io', pathname: '/yumaniwa-town/works/rojiura-masala/',
            search: '', hash: '', href: 'https://sukimastock.github.io/yumaniwa-town/works/rojiura-masala/', ...options.location },
        localStorage: { getItem: () => options.persistentDebug ? '1' : null },
        sessionStorage: { getItem: () => options.sessionDebug ? '1' : null },
        fetch(url, request) { requests.push({ url, ...JSON.parse(request.body) }); return Promise.resolve({}); }
    };
    const context = { window: root, URLSearchParams };
    vm.runInNewContext(configSource, context);
    if (options.config) root.ROJIURA_ANALYTICS_CONFIG = { ...root.ROJIURA_ANALYTICS_CONFIG, ...options.config };
    vm.runInNewContext(runtimeSource, context);
    return { root, requests };
}

for (const pathname of ['/yumaniwa-town-staging', '/yumaniwa-town-staging/', '/yumaniwa-town-staging/works/rojiura-masala/']) {
    test('staging suppresses initial pageview and gameplay events: ' + pathname, () => {
        const { root, requests } = analytics({ location: { pathname }, config: { captureOnLocalhost: true } });
        assert.equal(root.RojiuraAnalytics.canSend(), false);
        root.ROJIURA_BUILD = currentBuild;
        assert.equal(root.RojiuraAnalytics.track('Shift Start', {}), false);
        assert.equal(root.RojiuraAnalytics.pageview(), false);
        assert.equal(requests.length, 0);
    });
}

test('production initial pageview and later event use the current sketch build', () => {
    const { root, requests } = analytics();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].name, 'pageview');
    assert.equal(requests[0].props.build, currentBuild);
    root.ROJIURA_BUILD = currentBuild;
    assert.equal(root.RojiuraAnalytics.track('Shift Start', { count: 1 }), true);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].props.build, currentBuild);
    assert.equal(requests[1].props.count, '1');
});

test('staging path match keeps its existing path boundary', () => {
    const { requests } = analytics({ location: { pathname: '/yumaniwa-town-staging-preview/' } });
    assert.equal(requests.length, 1);
});

for (const options of [
    { location: { search: '?debug=1' } }, { location: { hash: '#debug' } },
    { persistentDebug: true }, { sessionDebug: true }, { location: { hostname: 'localhost' } },
    { location: { hostname: '192.168.1.2' } }, { config: { enabled: false } }
]) test('existing debug, private-host and disabled suppression survives: ' + JSON.stringify(options), () => {
    const { root, requests } = analytics(options);
    assert.equal(root.RojiuraAnalytics.track('Shift Start', {}), false);
    assert.equal(requests.length, 0);
});

test('standalone pageview opt-out and runtime build override remain supported', () => {
    const { root, requests } = analytics({ config: { standalonePageview: false } });
    assert.equal(requests.length, 0);
    root.ROJIURA_BUILD = 'future-build';
    root.RojiuraAnalytics.track('Shift Start', {});
    assert.equal(requests[0].props.build, 'future-build');
});
