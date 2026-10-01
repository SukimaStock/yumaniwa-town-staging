'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const work of ['orbit', 'steamclock']) {
    for (const file of ['WORKFLOW.md', 'PUBLISH-CHECKLIST.md']) {
        test(work + ' ' + file + ' labels the copied procedures historical and links canonical operations', () => {
            const source = read('works/' + work + '/' + file);
            assert.match(source.split('\n')[0], /履歴資料/);
            for (const target of ['OPERATIONS.md', 'CHANGE-OPERATIONS.md', 'RELEASE-WORKFLOW.md']) {
                assert.ok(source.includes('](../../' + target + ')'));
                assert.ok(fs.existsSync(path.join(root, target)));
            }
            assert.match(source, /本番mainへの直接編集.*旧記述は使用しません/);
        });
    }
}

test('retired SteamClock demo preserves a readable URL and points to maintained files', () => {
    const source = read('works/steamclock/index.demo.html');
    assert.match(source, /旧Starter Demoは終了/);
    assert.doesNotMatch(source, /<script\b|gameCanvas|sketch\.starter-demo\.js/);
    for (const match of source.matchAll(/href="([^"]+)"/g)) {
        const target = path.resolve(root, 'works/steamclock', match[1]);
        assert.ok(fs.existsSync(target), match[1] + ' must resolve');
    }
    assert.match(source, /href="\.\.\/_starter\/"/);
});

test('SteamClock README points new work to the maintained starter instead of the absent demo script', () => {
    const source = read('works/steamclock/README.md');
    assert.match(source, /\(\.\.\/_starter\/README\.md\)/);
    assert.match(source, /\(\.\.\/\.\.\/engine\/SUKIMASTOCK-NEW-WORK\.md\)/);
    assert.doesNotMatch(source, /examples\/\s*sketch\.starter-demo\.js/);
    assert.match(source, /作品runtime.*変更しません/);
});
