// ==========================================
// 湯間庭町 / 施設と固定文章
// 施設の世界観や固定メニューはここで管理します。
// 新しい作品・記事・更新履歴は他の data ファイルだけを触ります。
// ==========================================

var DESTINATIONS = {
    tourist_info_interior: {
        id: "tourist_info_interior",
        title: "観光案内所",
        subtitle: "Information",
        description: "木のカウンターの上に、手描きの地図と古いパンフレットが並んでいる。",
        flavor: "係の人が、少し眠そうにこちらを見ている。",
        menuTitle: "なにを見ますか?",
        items: [
            {
                label: "湯間庭町について",
                kind: "message",
                text: "湯間庭町は、湯気と余白のあいだにある小さな温泉町です。\n\n駅前から横丁、レジャーセンター、湯窓通りへ。まだ開いていない場所もありますが、町は少しずつ広がっています。"
            },
            {
                label: "町の案内",
                kind: "message",
                text: "駅前の掲示板には湯間庭新報。レジャーセンターには、触れるらくがき。灯串横丁には、今夜開いている二つの店があります。\n\n温泉へ続く石段は、もう少し先の話です。"
            },
            {
                label: "この町の作り手について",
                kind: "message",
                text: "この町は、SukimaStockが作った文章、ゲーム、触れるらくがきから少しずつできています。\n\n町を歩くたび、どこかに新しいものが運び込まれているかもしれません。"
            },
            {
                label: "町のお知らせ",
                kind: "message",
                text: ""
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    },
    shinpo_board: {
        id: "shinpo_board",
        title: "湯間庭新報",
        subtitle: "Town Bulletin",
        description: "掲示板には、その日ごとに違う読みものが何枚か貼られている。",
        flavor: "紙の端が、風で少しだけ揺れている。",
        menuTitle: "今日はどの記事を読みますか?",
        items: []
    },
    leisure_center_map: {
        id: "leisure_center_map",
        title: "湯窓レジャーセンター",
        subtitle: "Playable Works",
        description: "少し古びた遊技場。奥の筐体から、小さな光と音がこぼれている。",
        flavor: "入口近くの看板には『さわれるらくがき、稼働中』と書かれている。",
        menuTitle: "どの筐体で遊びますか?",
        items: []
    },
    tomogushi_alley_map: {
        id: "tomogushi_alley_map",
        title: "灯串横丁",
        subtitle: "Tomogushi Alley",
        description: "提灯の灯りが続く小さな横丁。\n炭のにおいと、柑橘やスパイスの甘い香りが混じっている。",
        flavor: "路地の奥では、今夜も誰かが何かを仕込んでいる。",
        menuTitle: "今夜はどこへ寄りますか?",
        items: []
    },
    yumado_street_map: {
        id: "yumado_street_map",
        title: "湯窓通り",
        subtitle: "Shopping Street",
        description: "湯気の向こうに、小さな店の看板が並んでいる。",
        flavor: "まだ開いていない店も多いが、通りの奥には少しだけ気配がある。",
        menuTitle: "どこを見ますか?",
        items: [
            { label: "喫茶まどべ", kind: "message", text: "窓際の席がよさそうな小さな喫茶店。準備中の札の向こうで、誰かがカップを磨いている。" },
            { label: "湯まんじゅう屋", kind: "message", text: "蒸し器から白い湯気が上がっている。開店までもう少しらしい。" },
            { label: "古道具屋", kind: "message", text: "入口の箱に、古いボタンや謎の部品が並んでいる。何に使うものかは分からないが、少しだけ気になる。" },
            { label: "駅前へ戻る", kind: "back" }
        ]
    }
};

function sortNotesNewestFirst(articles) {
    return articles.slice().sort(function(a, b) {
        var aDate = getNotePublishDate(a);
        var bDate = getNotePublishDate(b);
        if (aDate < bDate) return 1;
        if (aDate > bDate) return -1;
        return 0;
    });
}

function shuffleCopy(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }
    return copy;
}

function buildShinpoBoardItems(count) {
    var maxCount = count || 5;
    var articles = sortNotesNewestFirst(getVisibleNoteArticles());
    var featured = [];
    var newest = [];
    var remaining = [];

    for (var i = 0; i < articles.length; i++) {
        if (articles[i].featured) featured.push(articles[i]);
        else if (newest.length < 2) newest.push(articles[i]);
        else remaining.push(articles[i]);
    }

    var picked = featured.concat(newest);
    var mixed = shuffleCopy(remaining);
    for (var j = 0; picked.length < maxCount && j < mixed.length; j++) {
        picked.push(mixed[j]);
    }

    var items = [];
    for (var k = 0; k < picked.length; k++) {
        items.push({
            label: picked[k].title,
            kind: "external",
            url: picked[k].url,
            emptyText: "この記事はまだ掲示準備中です。掲示板には、白い押しピンだけが残っている。"
        });
    }
    items.push({ label: "駅前へ戻る", kind: "back" });
    return items;
}

function refreshShinpoBoard() {
    if (!DESTINATIONS.shinpo_board) return;
    DESTINATIONS.shinpo_board.items = buildShinpoBoardItems(5);
}

function refreshTownContent() {
    refreshShinpoBoard();

    if (DESTINATIONS.tourist_info_interior) {
        var infoItems = DESTINATIONS.tourist_info_interior.items;
        for (var i = 0; i < infoItems.length; i++) {
            if (infoItems[i].label === "町のお知らせ") {
                infoItems[i].text = buildTownUpdateHistoryText(6);
            }
        }
    }

    if (DESTINATIONS.leisure_center_map) {
        var leisureCenter = DESTINATIONS.leisure_center_map;
        var leisureItems = buildWorkMenuItems("leisure_center");

        // 稼働中の作品がない間は、準備中の筐体を選択肢として出さない。
        if (leisureItems.length === 0) {
            leisureCenter.description = "少し古びた遊技場。奥の筐体は、まだ開店準備中だ。";
            leisureCenter.flavor = "入口近くの看板には『次のらくがき、調整中』と書かれている。";
            leisureCenter.menuTitle = "稼働中の筐体はありません。";
        } else {
            leisureCenter.description = "少し古びた遊技場。奥の筐体から、小さな光と音がこぼれている。";
            leisureCenter.flavor = "入口近くの看板には『さわれるらくがき、稼働中』と書かれている。";
            leisureCenter.menuTitle = "どの筐体で遊びますか?";
        }

        leisureCenter.items = leisureItems;
        leisureCenter.items.push({ label: "駅前へ戻る", kind: "back" });
    }

    if (DESTINATIONS.tomogushi_alley_map) {
        var alleyItems = buildWorkMenuItems("tomogushi_alley");
        alleyItems.push({
            label: "灯串横丁について",
            kind: "message",
            text: "灯串横丁は、駅前のはずれにある小さな横丁です。\n\n炭火の店と、コーラを仕込む研究所が、提灯の下で今夜も開いています。"
        });
        alleyItems.push({ label: "駅前へ戻る", kind: "back" });
        DESTINATIONS.tomogushi_alley_map.items = alleyItems;
    }
}
