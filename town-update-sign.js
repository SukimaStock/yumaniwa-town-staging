// ==========================================
// 湯間庭町 / 更新履歴の立て看板
// 既存の TOWN_UPDATES を駅前の小さな看板から読めるようにする。
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

    function upsertById(items, item) {
        if (!Array.isArray(items) || !item || !item.id) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].id === item.id) {
                items[i] = item;
                return;
            }
        }
        items.push(item);
    }

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
        var pageCount = getPageCount();
        var start = page * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, source.length);
        var items = [];

        for (var i = start; i < end; i++) {
            var entry = source[i] || {};
            items.push({
                label: formatDate(entry.date) + '　' + (entry.title || '更新'),
                kind: 'message',
                text: entry.body || '記録だけが残っています。'
            });
        }

        if (source.length === 0) {
            items.push({
                label: 'まだ記録はありません',
                kind: 'message',
                text: '町は、静かに次の準備をしています。'
            });
        }

        if (page > 0) {
            items.push({
                label: '← 新しい記録へ',
                kind: 'update-page',
                page: page - 1
            });
        }

        if (page < pageCount - 1) {
            items.push({
                label: '古い記録へ →',
                kind: 'update-page',
                page: page + 1
            });
        }

        items.push({ label: '駅前へ戻る', kind: 'back' });
        return items;
    }

    function getMenuTitle(pageIndex) {
        var page = clampPageIndex(pageIndex);
        var pageCount = getPageCount();

        return 'どの記録を読みますか?' +
            '<span class="town-update-page-indicator">' +
            (page + 1) + ' / ' + pageCount +
            '</span>';
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
            '.town-update-page-indicator{' +
                'display:block;' +
                'margin-top:8px;' +
                'font-size:.72em;' +
                'font-weight:400;' +
                'letter-spacing:.12em;' +
                'opacity:.68;' +
            '}' +
            '#scene-container.town-update-history .town-update-page-nav{' +
                'display:flex;' +
                'gap:8px;' +
                'width:100%;' +
            '}' +
            '#scene-container.town-update-history .town-update-page-nav>.rpg-menu-item{' +
                'flex:1 1 0;' +
                'width:auto;' +
                'min-width:0;' +
            '}';

        document.head.appendChild(style);
    }

    function decorateUpdateHistoryMenu() {
        var sceneContainer = document.getElementById('scene-container');
        if (!sceneContainer) return;

        var isUpdateHistory =
            window.currentDestinationId === DESTINATION_ID &&
            window.destinationViewMode === 'menu';

        sceneContainer.classList.toggle('town-update-history', isUpdateHistory);
        if (!isUpdateHistory) return;

        var list = sceneContainer.querySelector('.rpg-menu-list');
        if (!list || list.querySelector('.town-update-page-nav')) return;

        var buttons = list.querySelectorAll(':scope > .rpg-menu-item');
        var navButtons = [];

        for (var i = 0; i < buttons.length; i++) {
            var text = (buttons[i].textContent || '').trim();
            if (text === '← 新しい記録へ' || text === '古い記録へ →') {
                navButtons.push(buttons[i]);
            }
        }

        if (navButtons.length === 0) return;

        var wrap = document.createElement('div');
        wrap.className = 'town-update-page-nav';
        list.insertBefore(wrap, navButtons[0]);

        for (var j = 0; j < navButtons.length; j++) {
            wrap.appendChild(navButtons[j]);
        }
    }

    if (window.DESTINATIONS) {
        window.DESTINATIONS[DESTINATION_ID] = {
            id: DESTINATION_ID,
            title: '町の更新記録',
            subtitle: 'Town Updates',
            description: '駅前の小さな立て看板。町で起きたことが、新しい順に書き足されている。',
            flavor: '紙の端に、少しだけ雨染みが残っている。',
            menuTitle: getMenuTitle(0),
            returnScene: 'station_plaza',
            returnLabel: '駅前広場',
            updatePageIndex: 0,
            items: buildUpdateMenuItems(0)
        };
    }

    // 更新履歴だけ、通常の施設メニューに「ページ移動」を足す。
    var originalHandleDestinationMenuItem = window.handleDestinationMenuItem;
    if (typeof originalHandleDestinationMenuItem === 'function') {
        window.handleDestinationMenuItem = function (destId, index) {
            if (destId === DESTINATION_ID) {
                var dest = window.DESTINATIONS && window.DESTINATIONS[destId];
                var item = dest && Array.isArray(dest.items) ? dest.items[index] : null;

                if (item && item.kind === 'update-page') {
                    applyUpdatePage(item.page, true);
                    return;
                }
            }

            return originalHandleDestinationMenuItem.apply(this, arguments);
        };
    }

    // 看板を開き直した時は、必ず最新ページから始める。
    var originalOpenDestination = window.openDestination;
    if (typeof originalOpenDestination === 'function') {
        window.openDestination = function (destId) {
            if (destId === DESTINATION_ID) {
                applyUpdatePage(0, false);
            }
            return originalOpenDestination.apply(this, arguments);
        };
    }

    // ページ移動ボタンが2つになる将来も、縦に伸びすぎないよう横一列にまとめる。
    var originalRenderDestination = window.renderDestination;
    if (typeof originalRenderDestination === 'function') {
        window.renderDestination = function () {
            var result = originalRenderDestination.apply(this, arguments);
            decorateUpdateHistoryMenu();
            return result;
        };
    }

    ensurePaginationStyle();

    var trigger = {
        id: TRIGGER_ID,
        label: '町の更新記録',
        actionLabel: '読む',
        type: 'menu',
        target: DESTINATION_ID,
        text: '町の更新記録が、新しい順に並んでいます。',
        area: { x: 14, y: 14, w: 3, h: 3 },
        tapPadding: 1
    };

    // 開発モードで調整した位置・大きさをそのまま反映する。
    var prop = {
        id: PROP_ID,
        src: 'assets/maps/props/common/standing-signboard.png?v=20260816-1',
        x: 14.375,
        y: 13.9375,
        w: 2.625,
        h: 2.625,
        footY: 16.5625,
        enabled: true,
        catalogKey: 'standingSignboard',
        collision: {
            enabled: true,
            x: 0.18,
            y: 0.72,
            w: 0.64,
            h: 0.28
        },
        interaction: {
            enabled: true,
            triggerId: TRIGGER_ID,
            x: 0.05,
            y: 0.20,
            w: 0.90,
            h: 0.80
        },
        tap: {
            enabled: true,
            x: 0.05,
            y: 0.12,
            w: 0.90,
            h: 0.88
        }
    };

    station.triggers = Array.isArray(station.triggers) ? station.triggers : [];
    station.props = Array.isArray(station.props) ? station.props : [];
    upsertById(station.triggers, trigger);
    upsertById(station.props, prop);

    // 初回表示中の駅前にも即時反映する。
    if (Array.isArray(window.triggers)) upsertById(window.triggers, trigger);
    if (Array.isArray(window.stationPlazaProps)) upsertById(window.stationPlazaProps, prop);

    if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
        window.activeTownSceneDef.triggers = Array.isArray(window.activeTownSceneDef.triggers)
            ? window.activeTownSceneDef.triggers
            : [];
        window.activeTownSceneDef.props = Array.isArray(window.activeTownSceneDef.props)
            ? window.activeTownSceneDef.props
            : [];
        upsertById(window.activeTownSceneDef.triggers, trigger);
        upsertById(window.activeTownSceneDef.props, prop);
    }
})();
