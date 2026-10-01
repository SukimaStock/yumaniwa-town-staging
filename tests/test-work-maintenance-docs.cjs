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
