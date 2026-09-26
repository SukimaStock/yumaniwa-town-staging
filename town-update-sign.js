// ==========================================
// 湯間庭町 / 更新履歴の立て看板
// 既存の TOWN_UPDATES を駅前の小さな看板から読めるようにする。
// prop / trigger の存在・配置は data/station-plaza.js だけを正本とする。
// この補助scriptは destination / menu behavior だけを提供する。
// ==========================================
(function () {
    'use strict';

    var maps = window.TOWN_SCENE_MAPS;
    var station = maps && maps.station_plaza;
    if (!station) return;

    var TRIGGER_ID = 'town_update_history_sign';
    var PROP_ID = 'station_update_history_signboard';
    var DESTINATION_ID = 'town_update_history';
    var PAGE_SIZE = 5;

    function formatDate(date) {
        return String(date || '').replace(/-/g, '.');
    }

    function getUpdateSource() {
        return Array.isArray(window.TOWN_UPDATES) ? window.TOWN_UPDATES : [];
    }

    function getPageCount() {
        return Math.max(1, Math.ceil(getUpdateSource().length / PAGE_SIZE));
    }

    function clampPageIndex(pageIndex) {
        var pageCount = getPageCount();
        var next = Number(pageIndex);
        if (!isFinite(next)) next = 0;
        next = Math.floor(next);
        return Math.max(0, Math.min(next, pageCount - 1));
    }

    function buildUpdateMenuItems(pageIndex) {
        var source = getUpdateSource();
        var page = clampPageIndex(pageIndex);
        var start = page * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, source.length);
        var items = [];

        for (var i = start; i < end; i++) {
            var entry = source[i] || {};
            items.push({
                label: formatDate(entry.date) + ' ' + (entry.title || '更新'),
                kind: 'message',
                text: entry.body || '記録だけが残っています。'
            });
        }

        if (source.length === 0) {
            items.push({
                label: 'まだ記録はありません',
                kind: 'message',
                text: '町は、静かに次の準備をしています。'
            });
        }

        items.push({ label: '', kind: 'update-nav' });
        items.push({ label: '駅前へ戻る', kind: 'back' });
        return items;
    }

    function getMenuTitle(pageIndex) {
        return 'どの記録を読みますか?';
    }

    function applyUpdatePage(pageIndex, shouldRender) {
        var dest = window.DESTINATIONS && window.DESTINATIONS[DESTINATION_ID];
        if (!dest) return;
        var page = clampPageIndex(pageIndex);
        dest.updatePageIndex = page;
        dest.menuTitle = getMenuTitle(page);
        dest.items = buildUpdateMenuItems(page);
        if (shouldRender && typeof window.renderDestination === 'function') {
            window.destinationViewMode = 'menu';
            window.renderDestination();
        }
    }

    function ensurePaginationStyle() {
        if (document.getElementById('town-update-pagination-style')) return;
        var style = document.createElement('style');
        style.id = 'town-update-pagination-style';
        style.textContent =
            '#scene-container.town-update-history .town-update-nav-row{' +
                'display:flex;align-items:center;justify-content:center;gap:18px;margin:8px 0 4px;padding:2px 0;' +
            '}' +
            '#scene-container.town-update-history .town-update-nav-spacer{' +
                'width:44px;height:44px;flex:0 0 44px;opacity:0;pointer-events:none;' +
            '}' +
            '#scene-container.town-update-history .town-update-nav-page{' +
                'min-width:56px;text-align:center;font-size:.78em;letter-spacing:.12em;opacity:.82;' +
            '}' +
            '#scene-container.town-update-history .town-update-nav-arrow{' +
                'width:44px;height:44px;padding:0;margin:0;display:flex;align-items:center;justify-content:center;font-size:1.05em;line-height:1;border-radius:12px;' +
            '}';
        document.head.appendChild(style);
    }

    function buildArrowButton(direction, targetPage) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'rpg-menu-item town-update-nav-arrow';
        button.textContent = direction === 'prev' ? '◀' : '▶';
        button.addEventListener('click', function () {
            applyUpdatePage(targetPage, true);
        });
        return button;
    }

    function decorateUpdateHistoryMenu() {
        var sceneContainer = document.getElementById('scene-container');
        if (!sceneContainer) return;
        var isUpdateHistory =
            window.currentDestinationId === DESTINATION_ID &&
            window.destinationViewMode === 'menu';
        sceneContainer.classList.toggle('town-update-history', isUpdateHistory);
        if (!isUpdateHistory) return;

        var dest = window.DESTINATIONS && window.DESTINATIONS[DESTINATION_ID];
        var list = sceneContainer.querySelector('.rpg-menu-list');
        if (!list || !dest || list.querySelector('.town-update-nav-row')) return;

        var buttons = list.querySelectorAll(':scope > .rpg-menu-item');
        var navPlaceholder = null;
        for (var i = 0; i < buttons.length; i++) {
            if ((buttons[i].textContent || '').trim() === '') {
                navPlaceholder = buttons[i];
                break;
            }
        }
        if (!navPlaceholder) return;

        var page = clampPageIndex(dest.updatePageIndex || 0);
        var pageCount = getPageCount();
        var row = document.createElement('div');
        row.className = 'town-update-nav-row';

        if (page > 0) row.appendChild(buildArrowButton('prev', page - 1));
        else {
            var prevSpacer = document.createElement('div');
            prevSpacer.className = 'town-update-nav-spacer';
            row.appendChild(prevSpacer);
        }

        var pageLabel = document.createElement('div');
        pageLabel.className = 'town-update-nav-page';
        pageLabel.textContent = (page + 1) + ' / ' + pageCount;
        row.appendChild(pageLabel);

        if (page < pageCount - 1) row.appendChild(buildArrowButton('next', page + 1));
        else {
            var nextSpacer = document.createElement('div');
            nextSpacer.className = 'town-update-nav-spacer';
            row.appendChild(nextSpacer);
        }
        navPlaceholder.replaceWith(row);
    }

    if (window.DESTINATIONS) {
        window.DESTINATIONS[DESTINATION_ID] = {
            id: DESTINATION_ID,
            title: '町の更新記録',
            subtitle: 'Town Updates',
            description: '駅前の小さな立て看板。町で起きたことが、新しい順に書き足されている。',
            flavor: '紙の端に、少しだけ雨染みが残っている。',
            menuTitle: getMenuTitle(0),
            returnScene: 'station_plaza',
            returnLabel: '駅前広場',
            updatePageIndex: 0,
            items: buildUpdateMenuItems(0)
        };
    }

    var originalOpenDestination = window.openDestination;
    if (typeof originalOpenDestination === 'function') {
        window.openDestination = function (destId) {
            if (destId === DESTINATION_ID) applyUpdatePage(0, false);
            return originalOpenDestination.apply(this, arguments);
        };
    }

    var originalRenderDestination = window.renderDestination;
    if (typeof originalRenderDestination === 'function') {
        window.renderDestination = function () {
            var result = originalRenderDestination.apply(this, arguments);
            decorateUpdateHistoryMenu();
            return result;
        };
    }

    ensurePaginationStyle();

    // Placement is intentionally not created or repaired here.
    // If the canonical prop/trigger is removed from station-plaza.js,
    // it must remain removed after reload.
})();