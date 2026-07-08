// ==========================================
// 湯間庭新報 / note記事データ
// 新しい記事は、配列の先頭に追加します。
// showInShinpo: true を付けると、湯間庭新報のカードラック候補になります。
// ==========================================

// ==========================================
// 湯間庭新報 / カードラック設定
// どの記事を町に出すか、どの役割で見せるかはこのファイルで管理します。
//
// 各記事の showInShinpo: true を付けたものだけが、ラックの候補になります。
// tags は「あなたへの一枚」の近さを判断する小さな目印です。
// ==========================================
var SHINPO_RACK = {
    slots: [
        // showInShinpo: true の中で、いちばん新しい記事。
        { label: "最新", mode: "latest" },

        // いま町に置きたい一枚。articleId を差し替えるだけで更新できます。
        {
            label: "今のピックアップ",
            mode: "fixed",
            articleId: "2c61e2a34d2540eaa1d74473329c573d",
            fallback: "random"
        },

        // showInShinpo: true の記事から、開くたびに一枚。
        { label: "ふらりと一枚", mode: "random" },

        // 町内で最近開いた記事と tags が近いものを選びます。
        {
            label: "あなたへの一枚",
            mode: "recommended",
            fallback: "random",
            fallbackLabel: "はじめましての一枚"
        }
    ]
};

var NOTE_ARTICLES = [
    // [NOTES:ADD_NEWEST_HERE]
    {
        id: "3fbab1d8a9b14123bfdb1461a94e8098",
        title: "ひねる、積む、なぞる。触れるらくがきの話",
        url: "https://note.com/hamamah/n/nca6b0ef9db94",
        publish_date: "2026-07-02",
        showInShinpo: true,
        tags: ["rakugaki", "making", "thoughts"]
    },
    {
        id: "db3cc8a5eab74e718453c2a25ae19f07",
        title: "コードを書く前に、手触りがある",
        url: "https://note.com/hamamah/n/n227910eaec3a?sub_rt=share_b",
        publish_date: "2026-06-26",
        showInShinpo: true,
        tags: ["making", "rakugaki", "thoughts"]
    },
    {
        id: "ea784083edc146d298ba5b7c33a1b7f1",
        title: "ゲームの中の焼き鳥を、焼き直した",
        url: "https://note.com/hamamah/n/n8a34c550580a",
        publish_date: "2026-06-19",
        showInShinpo: true,
        tags: ["game", "making", "yakitori"]
    },
    // {
    //     id: "unique-note-id",
    //     title: "記事タイトル",
    //     url: "https://note.com/...",
    //     publishedAt: "2026-07-04",
    //     showInShinpo: true,
    //     tags: ["app", "making"]
    // },
    {
        id: "2fb03b60589b4691b13c967a8b4e3563",
        title: "公開予定もないアプリを21個作っていた話",
        url: "https://note.com/hamamah/n/nb376b9a8c54d",
        publish_date: "2026-02-04",
        showInShinpo: true,
        tags: ["app", "making", "thoughts"]
    },
    {
        id: "1876c14202c5440789baa49e0d46bc65",
        title: "グラスの泡はすぐにあふれてしまう",
        url: "https://note.com/hamamah/n/n472b459f12cf",
        publish_date: "2026-03-17"
    },
    {
        id: "bf79ff3d74d44bb28004f875ba9debfc",
        title: "「予定を書かないカレンダー」毎日使うアプリを自分専用に作る",
        url: "https://note.com/hamamah/n/n3e720e82c744",
        publish_date: "2026-03-10"
    },
    {
        id: "bbcf187ae744449c81d9a2b62143bf77",
        title: "描く前に、書く前に、頭を整理するための自作アプリ",
        url: "https://note.com/hamamah/n/n38637b89aad0",
        publish_date: "2026-03-06"
    },
    {
        id: "a7fcb822af62450cb9a46d463bc21e44",
        title: "歯車の仕組みが少し見えてきた",
        url: "https://note.com/hamamah/n/nd470320454fd",
        publish_date: "2026-03-19"
    },
    {
        id: "f9ba30f8110642bfb09793ce4a6efea2",
        title: "時間を「確認」しないために作った、SteamClockという時計（自作アプリ）",
        url: "https://note.com/hamamah/n/n55f12e684c13",
        publish_date: "2026-02-25"
    },
    {
        id: "1951c6aa3a48495e85eef3b6352ad560",
        title: "塗り絵の前の色作り「IroMix」（自作アプリ）",
        url: "https://note.com/hamamah/n/n56034020d77b",
        publish_date: "2026-02-17"
    },
    {
        id: "d6139193e12e40e9adbbab80bf9219e1",
        title: "AI生成のドット絵「風」を整える「DotCleaner」（自作アプリ）",
        url: "https://note.com/hamamah/n/n91bbf97d02f7",
        publish_date: "2026-02-20"
    },
    {
        id: "c1fa369f4d3149a2a88d3da596c79f45",
        title: "ただ「気持ちいい」を磨く夜。目的のない自作アプリ",
        url: "https://note.com/hamamah/n/n419616ae3a94",
        publish_date: "2026-03-13",
        showInShinpo: true,
        tags: ["app", "rakugaki", "making"]
    },
    {
        id: "71b1ee79602a4757889f1f2e093d245a",
        title: "音楽知識ゼロ。コード進行で漂う音の宇宙「ChordDrift」（自作アプリ）",
        url: "https://note.com/hamamah/n/n7eb02ffd7581",
        publish_date: "2026-02-27"
    },
    {
        id: "fdf21ee42e0646d39d5164717d637bfb",
        title: "効率よりも手触り。自分専用アプリを作る時間",
        url: "https://note.com/hamamah/n/n9885a19fe14c",
        publish_date: "2026-02-27"
    },
    {
        id: "9c511d3731994686b4026e1a8d164019",
        title: "樽の中で時間を育てる、正解のない経営ゲーム「AmberTime」（自作アプリ）",
        url: "https://note.com/hamamah/n/n2123726a637c",
        publish_date: "2026-02-13",
        showInShinpo: true,
        tags: ["game", "making", "thoughts"]
    },
    {
        id: "a6e80d044f734d4693d0926541fcba22",
        title: "コーヒーが落ちるまでの、静かな時間「CoffeeFactory」（自作アプリ）",
        url: "https://note.com/hamamah/n/ndd00e6f70f55",
        publish_date: "2026-02-09",
        showInShinpo: true,
        tags: ["app", "making", "quiet"]
    },
    {
        id: "d761c2d720d54bd6b7fc3f595ea6120e",
        title: "指で隠れない、ゲーム機感覚のベクターツール「VectorBoy」（自作アプリ）",
        url: "https://note.com/hamamah/n/n85260d622984",
        publish_date: "2026-02-23"
    },
    {
        id: "edf0e5f28dfc4f26bc2b31a27c33d259",
        title: "機械と植物の組み合わせにときめいている",
        url: "https://note.com/hamamah/n/nc9ff3f987c93",
        publish_date: "2026-03-24",
        showInShinpo: true,
        tags: ["making", "thoughts", "quiet"]
    },
    {
        id: "cee35d30dc324a9e8f7cb846efb8acfa",
        title: "どうしても保存できない思い出がある",
        url: "https://note.com/hamamah/n/nd9c9a6fd9233",
        publish_date: "2026-03-26"
    },
    {
        id: "261119a7239f45288ced36b5b12fb81e",
        title: "誰に何を売るか考えている",
        url: "https://note.com/hamamah/n/nfcaa7634b41e",
        publish_date: "2026-03-27"
    },
    {
        id: "5b5f9715572b4d8a894c06b220c9139c",
        title: "正確な天気よりも外の空気が知りたい",
        url: "https://note.com/hamamah/n/n165c5c836b4a",
        publish_date: "2026-03-28"
    },
    {
        id: "41975cf05c7c4f9aa672fe09b344b6ed",
        title: "言葉がずっと回っている夜に",
        url: "https://note.com/hamamah/n/n0d370010316b",
        publish_date: "2026-03-29"
    },
    {
        id: "2c61e2a34d2540eaa1d74473329c573d",
        title: "自分専用アプリを21個つくって、最後に残ったもの。―正解を出さない時間",
        url: "https://note.com/hamamah/n/n05dba4e45d7b",
        publish_date: "2026-04-03",
        showInShinpo: true,
        tags: ["app", "making", "thoughts"]
    },
    {
        id: "219cf80c5d544ba0be86c053e28f8589",
        title: "AIに読ませたら、全部バレていた",
        url: "https://note.com/hamamah/n/n61d6591776bc",
        publish_date: "2026-04-07"
    },
    {
        id: "034a36b272674131b69145cb511272d3",
        title: "自分しか使わないのに、UIが気になる",
        url: "https://note.com/hamamah/n/na30ffdaf8f23",
        publish_date: "2026-04-10",
        showInShinpo: true,
        tags: ["app", "making", "ui"]
    },
    {
        id: "802bce9ec2f24c76b04e31c20a50348e",
        title: "アプリを作り始めたのに、ゲームになっていた",
        url: "https://note.com/hamamah/n/n2b62c102f13c",
        publish_date: "2026-04-14"
    },
    {
        id: "19fab0ad6cc44093b9d0301223bb9723",
        title: "公開するつもりもなく、なんとなく触っていた",
        url: "https://note.com/hamamah/n/n5bc807adf374",
        publish_date: "2026-04-18"
    },
    {
        id: "d2b3e1e412d04844a015c5bc30cce2c4",
        title: "公開しようとした瞬間、手が止まる",
        url: "https://note.com/hamamah/n/n58211bf9bdda",
        publish_date: "2026-04-21"
    },
    {
        id: "5b4f8c700516484bb87a64b6087ef6e5",
        title: "AIとの距離感を少しだけ",
        url: "https://note.com/hamamah/n/n803875bdf18a",
        publish_date: "2026-04-24"
    },
    {
        id: "fac8492827054dd8a3922c8b8396198a",
        title: "どうでもいい部分が、なぜか残る",
        url: "https://note.com/hamamah/n/n1c68d15e4d91",
        publish_date: "2026-04-28"
    },
    {
        id: "6e8ef699f4064249b01ab075e01c2279",
        title: "正しく動いていたのに触らなくなったもの",
        url: "https://note.com/hamamah/n/n3fb4aa385539",
        publish_date: "2026-05-01"
    },
    {
        id: "76c618e675164dd69317efd98f9aeca7",
        title: "タイトルは説明ではなく、入口なのかもしれない",
        url: "https://note.com/hamamah/n/nae5667f1c6ba",
        publish_date: "2026-05-04"
    },
    {
        id: "7aecde8afdfc4c30b8a4b9e5317c1c35",
        title: "そばにいるだけの道具",
        url: "https://note.com/hamamah/n/n52982f29b9cf",
        publish_date: "2026-05-08"
    },
    {
        id: "9bd60ef0ed0642438900bca1a2a52b9f",
        title: "削るほど、残るものがある",
        url: "https://note.com/hamamah/n/nd285947c017c",
        publish_date: "2026-05-15"
    },
    {
        id: "95d48e6613ce4037907364809ee3359f",
        title: "「ボードゲームの作り方」が分からなかったので、アプリで再現してみた",
        url: "https://note.com/hamamah/n/n0ca130319cac",
        publish_date: "2026-05-22",
        showInShinpo: true,
        tags: ["game", "making", "app"]
    },
    {
        id: "f8d60508184548129de83e6af79bd6a2",
        title: "iPhoneだけでアプリを作る｜Codea入門",
        url: "https://note.com/hamamah/n/nf466b33a95ec",
        publish_date: "2026-05-29",
        showInShinpo: true,
        tags: ["app", "making", "code"]
    },
    {
        id: "757c2ac5e1ca409eaee94225f3e2af59",
        title: "自作時計アプリ「SteamClock」を壊してみた｜Codea実験",
        url: "https://note.com/hamamah/n/nfa03567df1da",
        publish_date: "2026-06-05",
        showInShinpo: true,
        tags: ["app", "time", "code"]
    },
    {
        id: "31beb527cad14b72a2afdc57f4b986b4",
        title: "ゲーム未満、アプリ未満の心地よさ",
        url: "https://note.com/hamamah/n/n16f7a42c0b6a",
        publish_date: "2026-06-12",
        showInShinpo: true,
        tags: ["game", "app", "making", "rakugaki"]
    }
];


function getNotePublishDate(article) {
    return String((article && (article.publishedAt || article.publish_date)) || "");
}

function getVisibleNoteArticles() {
    var articles = [];
    var seenUrls = {};

    for (var i = 0; i < NOTE_ARTICLES.length; i++) {
        var article = NOTE_ARTICLES[i];
        if (!article || !article.title || !article.url) continue;
        if (seenUrls[article.url]) continue;
        seenUrls[article.url] = true;
        articles.push(article);
    }

    return articles;
}
