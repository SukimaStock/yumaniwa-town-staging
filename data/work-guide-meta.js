// ==========================================
// 湯間庭町 / 展示ガイド端末メタデータ v1
//
// WORKS の identity / venue / launch / status は data/works.js が正本。
// このファイルは「どう案内するか」だけを持つ。
// 画像は assets/works/<id>/ogp.jpg -> icon.png の順で自動参照する。
// ==========================================

var WORK_GUIDE_MOODS = [
    { id: "short", label: "ちょっとだけ" },
    { id: "play", label: "ちゃんと遊ぶ" },
    { id: "quiet", label: "静かなもの" },
    { id: "two", label: "二人で遊ぶ" }
];

var WORK_GUIDE_FEATURED = [
    "orbit",
    "diorama-calendar",
    "rojiura-masala"
];

var WORK_GUIDE_META = {
    "orbit": {
        duration: "10〜20分",
        moods: ["play", "quiet"],
        guideLine: "静かな宇宙を、少し長めに漂いたいときに。"
    },
    "diorama-calendar": {
        duration: "1〜3分",
        moods: ["short", "quiet"],
        guideLine: "小さな季節を、少し傾けて眺めてみる。"
    },
    "coffee-factory": {
        duration: "3〜5分",
        moods: ["short", "quiet"],
        guideLine: "小さな工場を眺めながら、一杯を淹れる。"
    },
    "steamclock": {
        duration: "1分くらい",
        moods: ["short", "quiet"],
        guideLine: "歯車と蒸気が動く時計を、少し眺めていく。"
    },
    "dotweather": {
        duration: "1〜3分",
        moods: ["short", "quiet"],
        guideLine: "どこかの空を、ドット絵で覗いてみる。"
    },
    "rainy-window": {
        duration: "1〜3分",
        moods: ["short", "quiet"],
        guideLine: "雨粒を指でなぞって、しばらく窓の外を見る。"
    },
    "rojiura-masala": {
        duration: "5〜10分",
        moods: ["play"],
        guideLine: "夜の路地を走って、カレーを届ける。"
    },
    "junkissa-dive": {
        duration: "3〜5分",
        moods: ["play"],
        guideLine: "深夜の喫茶店で、トッピングを飛ばしてみる。"
    },
    "midnight-cola": {
        duration: "5〜10分",
        moods: ["play"],
        guideLine: "今夜の材料を集めて、一本のコーラを仕込む。"
    },
    "yakitori-wars": {
        duration: "3〜10分",
        moods: ["two", "play"],
        guideLine: "焼きどきを見ながら、二人で串を取り合う。"
    }
};

function getWorkGuideMeta(workId) {
    if (!workId || !Object.prototype.hasOwnProperty.call(WORK_GUIDE_META, workId)) {
        return null;
    }

    return WORK_GUIDE_META[workId];
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        WORK_GUIDE_MOODS: WORK_GUIDE_MOODS,
        WORK_GUIDE_FEATURED: WORK_GUIDE_FEATURED,
        WORK_GUIDE_META: WORK_GUIDE_META,
        getWorkGuideMeta: getWorkGuideMeta
    };
}
