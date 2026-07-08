// ==========================================
// 湯間庭町 / 更新履歴データ
// 新しい更新は、この配列の先頭に追加します。
// ==========================================

var TOWN_UPDATES = [
    // [UPDATES:ADD_NEWEST_HERE]
    {
        date: "2026-07-06",
        title: "湯間庭町を公開",
        body: "駅前から、町を歩けるようになりました。",
        tags: ["station-plaza", "open"]
    },
    {
        date: "2026-07-06",
        title: "灯串横丁に二つの店が開店",
        body: "クラフトコーラ研究所と、やきとり屋　ゆまどが今夜から営業しています。",
        tags: ["tomogushi-alley", "open"]
    },
    {
        date: "2026-07-05",
        title: "レジャーセンターに『雨の日の窓』を設置",
        body: "窓の雨粒を、指でなぞれるようになりました。",
        tags: ["leisure-center", "rakugaki", "open"]
    },
    {
        date: "2026-06-16",
        title: "湯間庭新報を設置",
        body: "掲示板に、その日ごとに違う読みものが届くようになりました。",
        tags: ["shinpo"]
    },
    {
        date: "2026-06-15",
        title: "駅前広場を開放",
        body: "観光案内所、湯間庭新報、湯窓レジャーセンター、灯串横丁、湯窓通り入口を歩けるようになりました。",
        tags: ["station-plaza"]
    }
];

function buildTownUpdateHistoryText(limit) {
    var maxCount = typeof limit === "number" ? limit : 6;
    var entries = TOWN_UPDATES.slice(0, maxCount);

    if (entries.length === 0) {
        return "まだ更新履歴はありません。町は、静かに次の準備をしています。";
    }

    var lines = [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var date = String(entry.date || "").replace(/-/g, ".");
        lines.push(date + "　" + (entry.title || "更新"));
        if (entry.body) lines.push("　" + entry.body);
        if (i < entries.length - 1) lines.push("");
    }
    return lines.join("\n");
}
