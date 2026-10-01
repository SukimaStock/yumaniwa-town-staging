(function (root, factory) {
    "use strict";

    var api = factory(root || {});

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.YUMANIWA_WORK_GUIDE = api;
    }
})(
    typeof window !== "undefined"
        ? window
        : (typeof globalThis !== "undefined" ? globalThis : this),
    function (root) {
        "use strict";

        function createState() {
            return {
                screen: "home",
                browseMode: "",
                moodId: "",
                index: 0
            };
        }

        var state = createState();

        function escapeHtml(value) {
            return String(value == null ? "" : value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function wrapIndex(index, count) {
            if (!count || count < 1) return 0;
            var next = Number(index);
            if (!isFinite(next)) next = 0;
            while (next < 0) next += count;
            return next % count;
        }

        function getEligibleWorks(works, meta) {
            var source = Array.isArray(works) ? works : [];
            var guideMeta = meta || {};
            var result = [];

            for (var i = 0; i < source.length; i++) {
                var work = source[i];

                if (
                    !work ||
                    !work.id ||
                    work.status !== "open" ||
                    !Object.prototype.hasOwnProperty.call(guideMeta, work.id)
                ) {
                    continue;
                }

                result.push(work);
            }

            return result;
        }

        function getFeaturedWorks(works, meta, featuredIds) {
            var eligible = getEligibleWorks(works, meta);
            var byId = {};
            var result = [];
            var ids = Array.isArray(featuredIds) ? featuredIds : [];

            for (var i = 0; i < eligible.length; i++) {
                byId[eligible[i].id] = eligible[i];
            }

            for (var j = 0; j < ids.length; j++) {
                if (byId[ids[j]]) result.push(byId[ids[j]]);
            }

            return result;
        }

        function getMoodWorks(works, meta, moodId) {
            var eligible = getEligibleWorks(works, meta);
            var result = [];

            for (var i = 0; i < eligible.length; i++) {
                var work = eligible[i];
                var item = meta && meta[work.id];
                var moods = item && Array.isArray(item.moods) ? item.moods : [];

                if (moods.indexOf(moodId) !== -1) {
                    result.push(work);
                }
            }

            return result;
        }

        function getWorkGuideImageCandidates(workId) {
            var id = String(workId || "").trim();

            if (!/^[a-z0-9-]+$/.test(id)) return [];

            return [
                "./assets/works/" + id + "/ogp.jpg",
                "./assets/works/" + id + "/icon.png"
            ];
        }

        function getVenueLabel(venue) {
            if (venue === "leisure_center") return "湯窓レジャーセンター";
            if (venue === "tomogushi_alley") return "灯串横丁";
            return "湯間庭町";
        }

        function getMoodLabel(moodId, moods) {
            var source = Array.isArray(moods) ? moods : [];

            for (var i = 0; i < source.length; i++) {
                if (source[i] && source[i].id === moodId) {
                    return source[i].label || moodId;
                }
            }

            return moodId || "";
        }

        function enter() {
            state = createState();
        }

        function getStateSnapshot() {
            return {
                screen: state.screen,
                browseMode: state.browseMode,
                moodId: state.moodId,
                index: state.index
            };
        }

        function showHome() {
            state.screen = "home";
            state.browseMode = "";
            state.moodId = "";
            state.index = 0;
        }

        function showMoods() {
            state.screen = "moods";
            state.browseMode = "";
            state.moodId = "";
            state.index = 0;
        }

        function showBrowse(mode, moodId) {
            state.screen = "browse";
            state.browseMode = mode || "all";
            state.moodId = moodId || "";
            state.index = 0;
        }

        function getRuntimeData() {
            return {
                works: root.WORKS || [],
                meta: root.WORK_GUIDE_META || {},
                moods: root.WORK_GUIDE_MOODS || [],
                featured: root.WORK_GUIDE_FEATURED || []
            };
        }

        function getBrowseWorksFromData(data) {
            var input = data || {};
            var works = input.works || [];
            var meta = input.meta || {};

            if (state.browseMode === "featured") {
                return getFeaturedWorks(works, meta, input.featured || []);
            }

            if (state.browseMode === "mood") {
                return getMoodWorks(works, meta, state.moodId);
            }

            return getEligibleWorks(works, meta);
        }

        function getBrowseTitle(data) {
            if (state.browseMode === "featured") return "おすすめ";
            if (state.browseMode === "mood") {
                return getMoodLabel(state.moodId, data.moods || []);
            }
            return "すべての作品";
        }

        function move(delta, count) {
            state.index = wrapIndex(state.index + delta, count);
            return state.index;
        }

        function renderShell(inner) {
            return (
                '<div class="rpg-window work-guide-terminal">' +
                    '<div class="work-guide-machine-label">YUMANIWA GUIDE / TERMINAL 01</div>' +
                    inner +
                '</div>'
            );
        }

        function renderHome() {
            return renderShell(
                '<div class="rpg-window-header work-guide-header">' +
                    '<div class="rpg-title">展示ガイド</div>' +
                    '<div class="rpg-subtitle">Yumaniwa Town</div>' +
                '</div>' +
                '<p class="work-guide-intro">町で遊べるものをご案内します。</p>' +
                '<div class="rpg-menu-list work-guide-home-menu">' +
                    '<button type="button" class="rpg-menu-item work-guide-primary" data-guide-action="featured">おすすめを見る</button>' +
                    '<button type="button" class="rpg-menu-item" data-guide-action="moods">気分から探す</button>' +
                    '<button type="button" class="rpg-menu-item" data-guide-action="all">すべて見る</button>' +
                    '<button type="button" class="rpg-menu-item rpg-back" data-guide-action="exit">レジャーセンターへ戻る</button>' +
                '</div>'
            );
        }

        function renderMoods(data) {
            var html =
                '<div class="rpg-window-header work-guide-header">' +
                    '<div class="rpg-title">気分から探す</div>' +
                '</div>' +
                '<div class="rpg-menu-list work-guide-mood-menu">';

            var moods = data.moods || [];

            for (var i = 0; i < moods.length; i++) {
                var mood = moods[i];
                if (!mood || !mood.id) continue;

                html +=
                    '<button type="button" class="rpg-menu-item" data-guide-action="mood" data-guide-mood="' +
                    escapeHtml(mood.id) +
                    '">' +
                    escapeHtml(mood.label || mood.id) +
                    '</button>';
            }

            html +=
                '<button type="button" class="rpg-menu-item rpg-back" data-guide-action="home">戻る</button>' +
                '</div>';

            return renderShell(html);
        }

        function renderImage(work) {
            var candidates = getWorkGuideImageCandidates(work && work.id);
            var title = work && (work.menuTitle || work.title) ? (work.menuTitle || work.title) : "作品";
            var src = candidates[0] || "";

            return (
                '<div class="work-guide-image-row">' +
                    '<button type="button" class="work-guide-arrow" data-guide-action="prev" aria-label="前の作品">◀</button>' +
                    '<div class="work-guide-thumb-frame">' +
                        (src
                            ? '<img class="work-guide-thumb" src="' + escapeHtml(src) + '" data-guide-icon-src="' + escapeHtml(candidates[1] || "") + '" alt="' + escapeHtml(title) + 'の画像">'
                            : '') +
                        '<div class="work-guide-thumb-fallback" aria-hidden="true">' + escapeHtml(title) + '</div>' +
                    '</div>' +
                    '<button type="button" class="work-guide-arrow" data-guide-action="next" aria-label="次の作品">▶</button>' +
                '</div>'
            );
        }

        function renderBrowse(data) {
            var works = getBrowseWorksFromData(data);
            var title = getBrowseTitle(data);

            if (!works.length) {
                return renderShell(
                    '<div class="rpg-window-header work-guide-header">' +
                        '<div class="rpg-title">' + escapeHtml(title) + '</div>' +
                    '</div>' +
                    '<p class="work-guide-empty">いま案内できる作品はありません。</p>' +
                    '<div class="rpg-menu-list">' +
                        '<button type="button" class="rpg-menu-item rpg-back" data-guide-action="back">戻る</button>' +
                    '</div>'
                );
            }

            state.index = wrapIndex(state.index, works.length);

            var work = works[state.index];
            var itemMeta = data.meta[work.id] || {};
            var workTitle = work.menuTitle || work.title || work.id;
            var guideLine = itemMeta.guideLine || work.menuDescription || work.description || "";
            var duration = itemMeta.duration || "";
            var venue = getVenueLabel(work.venue);

            var imageHtml;

            if (works.length === 1) {
                imageHtml =
                    '<div class="work-guide-image-row work-guide-image-row-single">' +
                        '<span class="work-guide-arrow-spacer" aria-hidden="true"></span>' +
                        '<div class="work-guide-thumb-frame">' +
                            '<img class="work-guide-thumb" src="' +
                                escapeHtml(getWorkGuideImageCandidates(work.id)[0] || "") +
                                '" data-guide-icon-src="' +
                                escapeHtml(getWorkGuideImageCandidates(work.id)[1] || "") +
                                '" alt="' +
                                escapeHtml(workTitle) +
                                'の画像">' +
                            '<div class="work-guide-thumb-fallback" aria-hidden="true">' +
                                escapeHtml(workTitle) +
                            '</div>' +
                        '</div>' +
                        '<span class="work-guide-arrow-spacer" aria-hidden="true"></span>' +
                    '</div>';
            } else {
                imageHtml = renderImage(work);
            }

            return renderShell(
                '<div class="work-guide-browse-head">' +
                    '<div class="work-guide-browse-title">' + escapeHtml(title) + '</div>' +
                    '<div class="work-guide-position">' + (state.index + 1) + ' / ' + works.length + '</div>' +
                '</div>' +
                imageHtml +
                '<div class="work-guide-copy">' +
                    '<div class="work-guide-work-title">' + escapeHtml(workTitle) + '</div>' +
                    (guideLine ? '<div class="work-guide-line">' + escapeHtml(guideLine) + '</div>' : '') +
                    '<div class="work-guide-meta-row">' +
                        (duration ? '<span>' + escapeHtml(duration) + '</span>' : '') +
                        '<span>' + escapeHtml(venue) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="rpg-menu-list work-guide-actions">' +
                    '<button type="button" class="rpg-menu-item work-guide-primary" data-guide-action="play">遊ぶ</button>' +
                    '<button type="button" class="rpg-menu-item rpg-back" data-guide-action="back">戻る</button>' +
                '</div>'
            );
        }

        function render() {
            var data = getRuntimeData();

            if (state.screen === "moods") {
                return renderMoods(data);
            }

            if (state.screen === "browse") {
                return renderBrowse(data);
            }

            return renderHome();
        }

        function requestRender() {
            if (typeof root.renderDestination === "function") {
                root.renderDestination();
            }
        }

        function goBack() {
            if (state.screen === "browse") {
                if (state.browseMode === "mood") {
                    showMoods();
                } else {
                    showHome();
                }
                requestRender();
                return true;
            }

            if (state.screen === "moods") {
                showHome();
                requestRender();
                return true;
            }

            return false;
        }

        function bindImages(container) {
            var images = container.querySelectorAll(".work-guide-thumb");

            for (var i = 0; i < images.length; i++) {
                (function (image) {
                    image.addEventListener("error", function () {
                        var iconSrc = image.getAttribute("data-guide-icon-src") || "";

                        if (iconSrc && image.dataset.guideIconTried !== "true") {
                            image.dataset.guideIconTried = "true";
                            image.src = iconSrc;
                            return;
                        }

                        image.hidden = true;

                        var frame = image.closest(".work-guide-thumb-frame");
                        var fallback = frame && frame.querySelector(".work-guide-thumb-fallback");

                        if (fallback) {
                            fallback.setAttribute("aria-hidden", "false");
                            fallback.classList.add("visible");
                        }
                    });
                })(images[i]);
            }
        }

        function handleAction(action, target) {
            var data = getRuntimeData();

            if (action === "featured") {
                showBrowse("featured");
                requestRender();
                return;
            }

            if (action === "moods") {
                showMoods();
                requestRender();
                return;
            }

            if (action === "all") {
                showBrowse("all");
                requestRender();
                return;
            }

            if (action === "mood") {
                showBrowse("mood", target.getAttribute("data-guide-mood") || "");
                requestRender();
                return;
            }

            if (action === "home") {
                showHome();
                requestRender();
                return;
            }

            if (action === "back") {
                goBack();
                return;
            }

            if (action === "exit") {
                if (typeof root.backToDestinationReturnScene === "function") {
                    root.backToDestinationReturnScene("leisure_catalog");
                }
                return;
            }

            if (action === "prev" || action === "next") {
                var browseWorks = getBrowseWorksFromData(data);
                move(action === "prev" ? -1 : 1, browseWorks.length);
                requestRender();
                return;
            }

            if (action === "play") {
                var works = getBrowseWorksFromData(data);
                if (!works.length) return;

                state.index = wrapIndex(state.index, works.length);

                if (typeof root.launchYumaniwaGuideWork === "function") {
                    root.launchYumaniwaGuideWork(works[state.index]);
                } else if (typeof root.launchWork === "function") {
                    root.launchWork(works[state.index]);
                }
            }
        }

        function bind(container) {
            if (!container) return;

            bindImages(container);

            if (container.dataset.workGuideBound === "true") return;
            container.dataset.workGuideBound = "true";

            container.addEventListener("click", function (event) {
                var target = event.target && event.target.closest
                    ? event.target.closest("[data-guide-action]")
                    : null;

                if (!target || !container.contains(target)) return;

                event.preventDefault();
                event.stopPropagation();

                handleAction(target.getAttribute("data-guide-action"), target);
            });
        }

        function handleKeyboard(event) {
            if (!event) return false;

            var key = event.key;

            if (state.screen === "browse") {
                if (key === "ArrowLeft") {
                    event.preventDefault();
                    event.stopPropagation();
                    var previousWorks = getBrowseWorksFromData(getRuntimeData());
                    move(-1, previousWorks.length);
                    requestRender();
                    return true;
                }

                if (key === "ArrowRight") {
                    event.preventDefault();
                    event.stopPropagation();
                    var nextWorks = getBrowseWorksFromData(getRuntimeData());
                    move(1, nextWorks.length);
                    requestRender();
                    return true;
                }

                if (
                    key === "Escape" ||
                    key === "Backspace" ||
                    key === "x" ||
                    key === "X"
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    return goBack();
                }
            }

            if (
                state.screen === "moods" &&
                (
                    key === "Escape" ||
                    key === "Backspace" ||
                    key === "ArrowLeft" ||
                    key === "x" ||
                    key === "X"
                )
            ) {
                event.preventDefault();
                event.stopPropagation();
                return goBack();
            }

            return false;
        }

        return {
            createState: createState,
            wrapIndex: wrapIndex,
            getEligibleWorks: getEligibleWorks,
            getFeaturedWorks: getFeaturedWorks,
            getMoodWorks: getMoodWorks,
            getWorkGuideImageCandidates: getWorkGuideImageCandidates,
            getVenueLabel: getVenueLabel,
            getStateSnapshot: getStateSnapshot,
            enter: enter,
            render: render,
            bind: bind,
            handleKeyboard: handleKeyboard,
            showBrowse: showBrowse,
            showMoods: showMoods,
            showHome: showHome,
            move: move,
            getBrowseWorksFromData: getBrowseWorksFromData
        };
    }
);
