// ==========================================
// 湯間庭町 / 作品データ
// 新しいゲーム・触れるらくがきは、この配列の先頭に追加します。
//
// status: "open" | "preparing" | "hidden"
// open      : 町に表示し、実際に遊べる
// preparing : 制作中。データは残すが、町にはまだ表示しない
// hidden    : データは残しつつ、町には置かない
//
// launch: "embedded" | "itch_embed" | "external"
// embedded   : 町の共通プレイヤー内で開く。entry に作品の index.html を指定
// itch_embed : itch.ioの埋め込みURLを、町の共通プレイヤー内で開く。embedUrl を指定
// external   : 外部ページを別タブで開く。url を指定
//
// frameTitle  : 湯間庭フレーム上部に表示する町内での呼び名
// returnLabel : 左側の戻り先表示(例: "灯串横丁")
// frameMode   : "standard" | "soft" | "phone-cola" | "phone-yakitori"
//   phone-cola / phone-yakitori は、iPad・PCでは縦長の小型ゲーム機として中央に表示する。
// playerLayout / playerWidth / playerHeight は、作品の本来の表示器サイズのメモとして残す。
//
// menuCategory    : 施設メニューで作品名の上に表示する分類
// menuDescription : 施設メニューで作品名の下に表示する短い説明
// ==========================================

var WORKS = [
    // [WORKS:ADD_NEWEST_HERE]
    // {
    //     id: "work-id",
    //     title: "作品名",
    //     venue: "leisure_center" | "tomogushi_alley",
    //     kind: "work" | "game",
    //     status: "preparing",
    //     launch: "embedded",
    //     entry: "./works/work-id/index.html",
    //     embedUrl: "",
    //     url: "",
    //     frameTitle: "",
    //     returnLabel: "",
    //     frameMode: "standard",
    //     menuCategory: "",
    //     menuDescription: "",
    //     emptyText: "この作品は準備中です。"
    // },

    // 作品プレイヤーの動作確認用。
    // 必要なときだけ status を open に変更してください。
    {
        id: "rakugaki-template-test",
        title: "新しい筐体の見本",
        venue: "leisure_center",
        kind: "work",
        status: "hidden",
        launch: "embedded",
        entry: "./works/_template/index.html",

        menuCategory: "触れるらくがき",
        menuDescription: "次の作品を置くための、空の筐体。",

        emptyText: "この筐体は、次のらくがきのために空けてあります。"
    },

    {
        id: "midnight-cola",
        title: "クラフトコーラ研究所【MIDNIGHT COLA】",
        venue: "tomogushi_alley",
        kind: "game",
        status: "open",

        launch: "itch_embed",
        embedUrl: "https://itch.io/embed-upload/18206711?color=743f39",

        // 町内表示で問題が出た際に確認できる通常ページURL。
        url: "https://sukimastock.itch.io/midnight-cola",

        frameTitle: "クラフトコーラ研究所",
        returnLabel: "灯串横丁",
        frameMode: "phone-cola",

        playerLayout: "phone",
        playerWidth: 360,
        playerHeight: 660,

        menuCategory: "仕込みゲーム",
        menuDescription: "材料を重ねて、今夜の一本を仕込むすごろく。",

        description: "夜の研究所で、クラフトコーラを仕込む小さなゲーム。",
        emptyText: "真夜中の工房は、いま次の仕込みを整えています。"
    },

    {
        id: "yakitori-wars",
        title: "やきとり屋 ゆまど【Yakitori Wars】",
        venue: "tomogushi_alley",
        kind: "game",
        status: "open",

        launch: "itch_embed",
        embedUrl: "https://itch.io/embed-upload/17899376?color=3f2832",

        // 町内表示で問題が出た際に確認できる通常ページURL。
        url: "https://sukimastock.itch.io/yakitori-wars",

        frameTitle: "やきとり屋 ゆまど",
        returnLabel: "灯串横丁",
        frameMode: "phone-yakitori",

        playerLayout: "phone",
        playerWidth: 360,
        playerHeight: 660,

        menuCategory: "対戦ゲーム",
        menuDescription: "焼き加減と取りどきを読み合う、二人対戦ゲーム。",

        emptyText: "やきとり屋 ゆまどは、今夜の炭火を整えています。"
    },

    {
        id: "rainy-window",
        title: "雨の日の窓",
        venue: "leisure_center",
        kind: "work",
        status: "open",

        launch: "embedded",
        entry: "./works/rainy-window/index.html",

        frameTitle: "雨の日の窓",
        returnLabel: "湯窓レジャーセンター",
        frameMode: "soft",

        menuCategory: "触れるらくがき",
        menuDescription: "雨粒を指でなぞり、窓の向こうを眺める作品。",

        description: "窓についた雨粒を、指でなぞる小さな作品。",
        emptyText: "この筐体は現在調整中です。ガラスの向こうで、雨音だけが聞こえます。"
    },

    {
        id: "unpushable-button",
        title: "絶対に押せないボタン",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",

        launch: "embedded",
        entry: "./works/unpushable-button/index.html",

        menuCategory: "触れるらくがき",
        menuDescription: "押そうとすると逃げていく、警戒心の強いボタン。",

        emptyText: "この筐体は現在調整中です。ボタンだけが、こちらを警戒しています。"
    },

    {
        id: "notification-badge",
        title: "通知バッジ増殖",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",

        launch: "embedded",
        entry: "./works/notification-badge/index.html",

        menuCategory: "触れるらくがき",
        menuDescription: "赤い通知バッジが、画面いっぱいに増殖する作品。",

        emptyText: "この筐体は現在調整中です。赤い丸が、まだ眠っています。"
    },

    {
        id: "someone-pedometer",
        title: "誰かの歩数計",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",

        launch: "embedded",
        entry: "./works/someone-pedometer/index.html",

        menuCategory: "触れるらくがき",
        menuDescription: "画面の向こうの誰かと歩数を重ねる、小さな歩数計。",

        emptyText: "この筐体は現在調整中です。小さな数字だけが、ときどき動きます。"
    },

    {
        id: "fast-forward-clock",
        title: "Fast-Forward Clock",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",

        launch: "embedded",
        entry: "./works/fast-forward-clock/index.html",

        menuCategory: "触れるらくがき",
        menuDescription: "時間を早送りし、空に残る光の軌跡を眺める時計。",

        emptyText: "この筐体は現在調整中です。針だけが、少し先の時間を見ているようです。"
    }
];

function getWorkById(workId) {
    for (var i = 0; i < WORKS.length; i++) {
        if (WORKS[i] && WORKS[i].id === workId) {
            return WORKS[i];
        }
    }

    return null;
}

function getVisibleWorksForVenue(venue) {
    var result = [];

    for (var i = 0; i < WORKS.length; i++) {
        var work = WORKS[i];

        // 町の一覧には、実際に起動できる作品だけを並べる。
        if (
            !work ||
            work.venue !== venue ||
            work.status !== "open"
        ) {
            continue;
        }

        result.push(work);
    }

    return result;
}

function buildWorkMenuItems(venue) {
    var works = getVisibleWorksForVenue(venue);
    var items = [];

    for (var i = 0; i < works.length; i++) {
        var work = works[i];

        items.push({
            label: work.title,
            kind: work.kind || "work",
            workId: work.id,

            // 施設メニューの作品棚で使う補足情報。
            menuCategory: work.menuCategory || (
                work.kind === "game"
                    ? "ゲーム"
                    : "触れるらくがき"
            ),

            menuDescription:
                work.menuDescription ||
                work.description ||
                "",

            launch: work.launch || (
                work.url
                    ? "external"
                    : "embedded"
            ),

            entry: work.entry || "",
            embedUrl: work.embedUrl || "",
            url: work.url || "",
            frameTitle: work.frameTitle || work.title,
            returnLabel: work.returnLabel || "",
            frameMode: work.frameMode || "standard",
            emptyText: work.emptyText || "この作品は、まだ準備中です。"
        });
    }

    return items;
}
