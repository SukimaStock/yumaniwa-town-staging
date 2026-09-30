'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const guide = require('../work-guide-terminal.js');
const guideData = require('../data/work-guide-meta.js');

function readActualWorks() {
    const context = {};
    vm.createContext(context);
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, '..', 'data', 'works.js'), 'utf8'),
        context,
        { filename: 'data/works.js' }
    );
    return context.WORKS;
}

test('guide metadata covers the current open town works across both venues', () => {
    const works = readActualWorks();
    const openWorks = works.filter((work) => work && work.status === 'open');
    const eligible = guide.getEligibleWorks(works, guideData.WORK_GUIDE_META);

    assert.deepEqual(
        eligible.map((work) => work.id).sort(),
        Array.from(openWorks, (work) => work.id).sort()
    );

    assert.ok(eligible.some((work) => work.venue === 'leisure_center'));
    assert.ok(eligible.some((work) => work.venue === 'tomogushi_alley'));
});

test('featured works preserve the manually curated order and remain launchable', () => {
    const works = readActualWorks();
    const featured = guide.getFeaturedWorks(
        works,
        guideData.WORK_GUIDE_META,
        guideData.WORK_GUIDE_FEATURED
    );

    assert.deepEqual(
        featured.map((work) => work.id),
        guideData.WORK_GUIDE_FEATURED
    );
    assert.ok(featured.every((work) => work.status === 'open'));
});

test('mood ids are declared and works may belong to multiple moods', () => {
    const knownMoodIds = new Set(guideData.WORK_GUIDE_MOODS.map((mood) => mood.id));

    for (const [workId, meta] of Object.entries(guideData.WORK_GUIDE_META)) {
        assert.ok(meta.duration, workId + ' requires duration');
        assert.ok(meta.guideLine, workId + ' requires guideLine');
        assert.ok(Array.isArray(meta.moods) && meta.moods.length > 0, workId + ' requires moods');

        for (const moodId of meta.moods) {
            assert.ok(knownMoodIds.has(moodId), workId + ' uses unknown mood ' + moodId);
        }
    }

    assert.deepEqual(
        guideData.WORK_GUIDE_META['yakitori-wars'].moods,
        ['two', 'play']
    );
});

test('mood filtering returns only eligible matching works', () => {
    const works = readActualWorks();
    const quiet = guide.getMoodWorks(works, guideData.WORK_GUIDE_META, 'quiet');
    const two = guide.getMoodWorks(works, guideData.WORK_GUIDE_META, 'two');

    assert.ok(quiet.some((work) => work.id === 'orbit'));
    assert.ok(quiet.some((work) => work.id === 'rainy-window'));
    assert.deepEqual(two.map((work) => work.id), ['yakitori-wars']);
});

test('carousel wraps at both ends', () => {
    assert.equal(guide.wrapIndex(0, 3), 0);
    assert.equal(guide.wrapIndex(3, 3), 0);
    assert.equal(guide.wrapIndex(-1, 3), 2);
    assert.equal(guide.wrapIndex(99, 1), 0);
    assert.equal(guide.wrapIndex(2, 0), 0);
});

test('image convention is derived from work id with ogp then icon fallback', () => {
    assert.deepEqual(
        guide.getWorkGuideImageCandidates('orbit'),
        [
            './assets/works/orbit/ogp.jpg',
            './assets/works/orbit/icon.png'
        ]
    );
    assert.deepEqual(guide.getWorkGuideImageCandidates('../bad'), []);
});

test('browse state keeps mode, filter, and index until explicitly changed', () => {
    const works = readActualWorks();
    const data = {
        works,
        meta: guideData.WORK_GUIDE_META,
        moods: guideData.WORK_GUIDE_MOODS,
        featured: guideData.WORK_GUIDE_FEATURED
    };

    guide.showBrowse('mood', 'quiet');
    const quiet = guide.getBrowseWorksFromData(data);
    guide.move(1, quiet.length);

    assert.deepEqual(guide.getStateSnapshot(), {
        screen: 'browse',
        browseMode: 'mood',
        moodId: 'quiet',
        index: 1
    });

    guide.enter();

    assert.deepEqual(guide.getStateSnapshot(), {
        screen: 'home',
        browseMode: '',
        moodId: '',
        index: 0
    });
});

test('shared runtime delegates leisure_catalog to work_guide and restores it after close', () => {
    const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

    assert.match(
        mainSource,
        /destId === "leisure_catalog"\s*\? "work_guide"/
    );
    assert.match(
        mainSource,
        /getDestinationListViewMode\(workPlayerReturnDestinationId\)/
    );
    assert.match(
        mainSource,
        /YUMANIWA_WORK_GUIDE\.handleKeyboard/
    );
});


test('physical guide terminal does not get forced back to generic menu mode', () => {
    const interactionSource = fs.readFileSync(
        path.join(__dirname, '..', 'town-interaction-flow.js'),
        'utf8'
    );

    assert.match(
        interactionSource,
        /target !== "shinpo_board"\s*&&\s*target !== "leisure_catalog"/
    );
});
