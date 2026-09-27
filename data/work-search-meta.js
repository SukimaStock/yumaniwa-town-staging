// ==========================================
// 湯間庭町 / Search・Share Master Metadata v1
//
// Search / Share v2 の生成入力として使う正本。
// Phase 4.1 では metadata を定義するだけで、既存の /w/ ページ、sitemap、runtime は変更しない。
//
// 責任分離:
// - data/works.js              : 町内 runtime / identity / launch の正本
// - data/work-search-meta.js   : Search / Share 用の日英文面・検索語彙・schemaType の正本
//
// このファイルは公開状態を決めない。
// metadata が存在しても production 公開対象にはならない。
// production 公開集合は Release Operations の明示対象だけを採用する。
//
// terms は編集・生成・監査用の語彙台帳。
// <meta name="keywords"> を生成するための値ではない。
//
// Phase 4.2 で generator が導入されるまでは、現行の w/<id>/ HTML が配信物として有効。
// ==========================================

var WORK_SEARCH_META_SCHEMA = 1;

var WORK_SEARCH_META = {
    "orbit": {
        "schemaType": "VideoGame",
        "alternateNames": [
            "ORBIT"
        ],
        "ja": {
            "pageTitle": "ORBIT — Silent Reboot｜宇宙を漂う探索ゲーム｜湯間庭町",
            "metaDescription": "小さな宇宙船で静かな宇宙を漂い、資源を集めながら遠くへ進む探索ゲーム。帰る場所を手がかりに、少しずつ航続距離を伸ばしていきます。",
            "body": "小さな宇宙船で静かな宇宙を漂い、惑星を巡りながら資源やデータを集め、HOMEへ帰還して少しずつ遠くへ進む探索ゲームです。帰る場所があるからこそ、また宇宙へ出ていける。その往復を静かに楽しむ作品です。",
            "shareTitle": "ORBIT — Silent Reboot｜湯間庭町",
            "shareDescription": "帰る場所を手がかりに、静かな宇宙を漂い続ける探索ゲーム。",
            "imageAlt": "宇宙を漂う小型宇宙船を描いたORBIT — Silent Rebootの画面",
            "genres": [
                "探索",
                "SF"
            ],
            "terms": [
                "宇宙探索ゲーム",
                "ブラウザゲーム",
                "ドット絵ゲーム",
                "インディーゲーム",
                "SFゲーム"
            ]
        },
        "en": {
            "pageTitle": "ORBIT — Silent Reboot | A Quiet Space Exploration Game | Yumaniwa Town",
            "metaDescription": "A quiet browser-based space exploration game. Drift through space, gather resources, return home, and gradually travel farther into the unknown.",
            "body": "Drift through a quiet universe in a small spacecraft, visiting planets to gather resources and data before returning HOME. Each return lets you reach a little farther the next time. ORBIT is a small exploration game built around the feeling that having a place to return to makes it possible to keep drifting.",
            "shareTitle": "ORBIT — Silent Reboot | Yumaniwa Town",
            "shareDescription": "A quiet space exploration game about drifting farther with a place to return to.",
            "imageAlt": "A small spacecraft drifting through space in ORBIT — Silent Reboot",
            "genres": [
                "Exploration",
                "Science Fiction"
            ],
            "terms": [
                "space exploration game",
                "browser game",
                "pixel art game",
                "indie game",
                "sci-fi game"
            ]
        }
    },
    "diorama-calendar": {
        "schemaType": "SoftwareApplication",
        "alternateNames": [],
        "ja": {
            "pageTitle": "Diorama Calendar｜傾けて眺めるジオラマカレンダー｜湯間庭町",
            "metaDescription": "12か月の小さな季節の景色を、端末の傾きや指の動きで立体的に眺めるインタラクティブカレンダー。",
            "body": "12か月それぞれの小さな季節の景色を、端末の傾きや指の動きで立体的に眺めるカレンダーです。予定を詰め込むためではなく、月ごとに変わるミニチュアの景色を少し覗き込むように楽しめます。",
            "shareTitle": "Diorama Calendar｜湯間庭町",
            "shareDescription": "季節の小さな景色を、傾けて眺めるカレンダー。",
            "imageAlt": "季節の小さな景色を立体的に眺めるDiorama Calendarの画面",
            "genres": [
                "カレンダー",
                "インタラクティブ"
            ],
            "terms": [
                "ジオラマカレンダー",
                "インタラクティブカレンダー",
                "パララックス",
                "季節のカレンダー",
                "ミニチュア"
            ]
        },
        "en": {
            "pageTitle": "Diorama Calendar | An Interactive Seasonal Calendar | Yumaniwa Town",
            "metaDescription": "An interactive calendar with twelve miniature seasonal scenes that shift with device tilt and touch.",
            "body": "Diorama Calendar turns each month into a small seasonal scene. Tilt your device or drag with a finger to look into the layered miniature landscape, then move from month to month as the scenery changes around you.",
            "shareTitle": "Diorama Calendar | Yumaniwa Town",
            "shareDescription": "A calendar of miniature seasonal scenes that move as you tilt and touch.",
            "imageAlt": "A miniature seasonal scene displayed in Diorama Calendar",
            "genres": [
                "Calendar",
                "Interactive"
            ],
            "terms": [
                "diorama calendar",
                "interactive calendar",
                "parallax calendar",
                "seasonal calendar",
                "miniature scene"
            ]
        }
    },
    "rojiura-masala": {
        "schemaType": "VideoGame",
        "alternateNames": [
            "路地裏マサラ",
            "ROJIURA MASALA"
        ],
        "ja": {
            "pageTitle": "路地裏マサラ｜夜の路地を走るカレー配達ゲーム｜湯間庭町",
            "metaDescription": "夜の小さなカレー屋から注文を受け、冷める前に路地の奥へ届けるブラウザ配達ゲーム。",
            "body": "夜の小さなカレー屋から、路地の奥にいるお客さんへ注文を届ける配達ゲームです。障害物を避けながら走り、カレーが冷める前の到着を目指します。静かな夜の路地を舞台にした、小さなブラウザゲームです。",
            "shareTitle": "路地裏マサラ - ROJIURA MASALA｜湯間庭町",
            "shareDescription": "夜の路地を走って、冷める前にカレーを届ける配達ゲーム。",
            "imageAlt": "夜の路地を走ってカレーを届ける路地裏マサラの画面",
            "genres": [
                "配達",
                "アクション"
            ],
            "terms": [
                "カレーゲーム",
                "配達ゲーム",
                "路地裏ゲーム",
                "ブラウザゲーム",
                "インディーゲーム"
            ]
        },
        "en": {
            "pageTitle": "ROJIURA MASALA | A Nighttime Curry Delivery Game | Yumaniwa Town",
            "metaDescription": "A small browser game about delivering curry through a quiet nighttime alley before the food gets cold.",
            "body": "ROJIURA MASALA is a small delivery game set in a quiet nighttime alley. Carry curry from a tiny shop to customers deeper in the neighborhood, dodging obstacles and trying to arrive before the food gets cold.",
            "shareTitle": "ROJIURA MASALA | Yumaniwa Town",
            "shareDescription": "Deliver curry through a quiet nighttime alley before it gets cold.",
            "imageAlt": "A nighttime curry delivery scene from ROJIURA MASALA",
            "genres": [
                "Delivery",
                "Action"
            ],
            "terms": [
                "curry delivery game",
                "delivery game",
                "browser game",
                "curry game",
                "nighttime game"
            ]
        }
    },
    "steamclock": {
        "schemaType": "SoftwareApplication",
        "alternateNames": [],
        "ja": {
            "pageTitle": "SteamClock｜歯車と蒸気を眺めるスチームパンク時計｜湯間庭町",
            "metaDescription": "歯車と蒸気が静かに動き続けるWeb時計。アナログ時計とニキシー管の時刻を眺めながら、機械仕掛けの時間を楽しめます。",
            "body": "歯車と蒸気が静かに動き続ける、スチームパンクのWeb時計です。アナログ時計とニキシー管の時刻表示を眺めながら、小さな機械仕掛けが時間を刻み続ける様子を楽しめます。",
            "shareTitle": "SteamClock｜湯間庭町",
            "shareDescription": "歯車と蒸気が静かに動き続ける、スチームパンクの時計。",
            "imageAlt": "歯車と蒸気が動くSteamClockのスチームパンク時計画面",
            "genres": [
                "時計",
                "スチームパンク"
            ],
            "terms": [
                "スチームパンク時計",
                "Web時計",
                "歯車時計",
                "ニキシー管",
                "アニメーション時計"
            ]
        },
        "en": {
            "pageTitle": "SteamClock | A Steampunk Web Clock | Yumaniwa Town",
            "metaDescription": "A steampunk web clock with moving gears, steam, an analog clock, and a Nixie-style time display.",
            "body": "SteamClock is a small steampunk web clock where gears turn and steam drifts while time keeps moving. Watch the analog clock and Nixie-style display as the little mechanism quietly works in the background.",
            "shareTitle": "SteamClock | Yumaniwa Town",
            "shareDescription": "A quiet steampunk clock of moving gears, steam and glowing time.",
            "imageAlt": "The moving gears and steam of the SteamClock web clock",
            "genres": [
                "Clock",
                "Steampunk"
            ],
            "terms": [
                "steampunk clock",
                "web clock",
                "gear clock",
                "Nixie clock",
                "animated clock"
            ]
        }
    },
    "dotweather": {
        "schemaType": "SoftwareApplication",
        "alternateNames": [],
        "ja": {
            "pageTitle": "DotWeather｜世界の空をドット絵で眺める天気アプリ｜湯間庭町",
            "metaDescription": "世界の天気と時間を、静かなドット絵の景色で眺めるWeb天気アプリ。雨、雲、星、月などが実際の空模様に合わせて変化します。",
            "body": "世界の空を、静かなドット絵の景色で眺める天気アプリです。場所ごとの天気や時間に合わせて、雨や雲、星、月などの小さな景色が変化します。数字を確認するだけでなく、その場所の空模様を眺めるためのWebアプリです。",
            "shareTitle": "DotWeather｜湯間庭町",
            "shareDescription": "世界の空を、静かなドットで眺める天気アプリ。",
            "imageAlt": "ドット絵の空模様を表示するDotWeatherの画面",
            "genres": [
                "天気",
                "ピクセルアート"
            ],
            "terms": [
                "ドット絵天気",
                "天気アプリ",
                "世界の天気",
                "ピクセルアート天気",
                "Web天気"
            ]
        },
        "en": {
            "pageTitle": "DotWeather | A Pixel-Art Weather App | Yumaniwa Town",
            "metaDescription": "A quiet pixel-art weather app where rain, clouds, stars, the moon and scenery change with real weather and time around the world.",
            "body": "DotWeather turns weather around the world into a quiet pixel-art scene. Rain, clouds, stars, the moon and other details shift with local weather and time, making it a place to watch the sky as well as check the forecast.",
            "shareTitle": "DotWeather | Yumaniwa Town",
            "shareDescription": "A quiet pixel-art weather app for watching skies around the world.",
            "imageAlt": "A pixel-art weather scene displayed in DotWeather",
            "genres": [
                "Weather",
                "Pixel Art"
            ],
            "terms": [
                "pixel weather",
                "pixel art weather app",
                "weather visualization",
                "world weather",
                "weather app"
            ]
        }
    },
    "junkissa-dive": {
        "schemaType": "VideoGame",
        "alternateNames": [],
        "ja": {
            "pageTitle": "純喫茶ダイヴ｜深夜の喫茶店で遊ぶ物理アクションゲーム｜湯間庭町",
            "metaDescription": "深夜だけ開く純喫茶で、さくらんぼや角砂糖などのトッピングを飛ばして商品を仕上げる小さな物理アクションゲーム。",
            "body": "深夜だけ開く純喫茶で、さくらんぼや角砂糖などのトッピングを飛ばして商品を仕上げる物理アクションゲームです。狙いどおりに乗っても、思わぬ方向へ跳ねても、その一回ごとの結果を楽しめます。",
            "shareTitle": "純喫茶ダイヴ｜湯間庭町",
            "shareDescription": "深夜だけ開く純喫茶で、トッピングを飛ばして商品を仕上げる小さなゲーム。",
            "imageAlt": "深夜の純喫茶でトッピングを飛ばす純喫茶ダイヴの画面",
            "genres": [
                "物理アクション",
                "喫茶店"
            ],
            "terms": [
                "純喫茶ゲーム",
                "喫茶店ゲーム",
                "物理アクションゲーム",
                "ブラウザゲーム",
                "レトロ喫茶"
            ]
        },
        "en": {
            "pageTitle": "純喫茶ダイヴ | A Late-Night Kissaten Physics Game | Yumaniwa Town",
            "metaDescription": "A small physics game set in a late-night Japanese kissaten. Launch cherries, sugar cubes and other toppings to finish each order.",
            "body": "Set inside a kissaten that opens only late at night, this small physics game asks you to launch cherries, sugar cubes and other toppings onto each order. A perfect landing is satisfying, but the unexpected bounces are part of the fun too.",
            "shareTitle": "純喫茶ダイヴ | Yumaniwa Town",
            "shareDescription": "A small physics game set inside a late-night Japanese kissaten.",
            "imageAlt": "A topping being launched inside the late-night cafe of 純喫茶ダイヴ",
            "genres": [
                "Physics",
                "Cafe"
            ],
            "terms": [
                "kissaten game",
                "Japanese cafe game",
                "physics game",
                "browser game",
                "retro cafe"
            ]
        }
    },
    "midnight-cola": {
        "schemaType": "VideoGame",
        "alternateNames": [
            "真夜中コーラ",
            "MIDNIGHT COLA"
        ],
        "ja": {
            "pageTitle": "真夜中コーラ｜深夜の工房でクラフトコーラを仕込むゲーム｜湯間庭町",
            "metaDescription": "深夜の工房で材料をひとつずつ重ね、自分だけのクラフトコーラを仕込む小さなすごろくゲーム。完成した一本には、その夜だけの名前がつきます。",
            "body": "深夜の小さな工房で、材料をひとつずつ重ねながら今夜のクラフトコーラを仕込むすごろくゲームです。進むたびに材料が増え、最後にできあがった一本には、その夜だけの名前がつきます。",
            "shareTitle": "真夜中コーラ｜湯間庭町",
            "shareDescription": "材料を重ねて、今夜の一本を仕込むすごろく。深夜の工房で自分だけのコーラを作るゲーム。",
            "imageAlt": "深夜の工房でクラフトコーラを仕込む真夜中コーラの画面",
            "genres": [
                "すごろく",
                "クラフトコーラ"
            ],
            "terms": [
                "クラフトコーラゲーム",
                "コーラゲーム",
                "すごろくゲーム",
                "仕込みゲーム",
                "ブラウザゲーム"
            ]
        },
        "en": {
            "pageTitle": "MIDNIGHT COLA | A Craft Cola Brewing Game | Yumaniwa Town",
            "metaDescription": "A small nighttime game about gathering ingredients and brewing your own bottle of craft cola in a curious little workshop.",
            "body": "MIDNIGHT COLA is a small board-game-like experience set inside a workshop after dark. Move forward, gather ingredients, and gradually build tonight's bottle of craft cola. At the end, the finished drink receives a name that belongs only to that run.",
            "shareTitle": "MIDNIGHT COLA | Yumaniwa Town",
            "shareDescription": "Gather ingredients and brew tonight's bottle of craft cola.",
            "imageAlt": "A nighttime craft cola workshop scene from MIDNIGHT COLA",
            "genres": [
                "Board Game",
                "Craft Cola"
            ],
            "terms": [
                "craft cola game",
                "brewing game",
                "browser game",
                "board game",
                "nighttime game"
            ]
        }
    },
    "yakitori-wars": {
        "schemaType": "VideoGame",
        "alternateNames": [
            "やきとり屋 ゆまど"
        ],
        "ja": {
            "pageTitle": "Yakitori Wars｜焼き加減を読み合う二人対戦ゲーム｜湯間庭町",
            "metaDescription": "焼き鳥の焼き加減と取りどきを読み合う二人対戦ゲーム。焼きすぎる前に取るか、もう少し待つか、短いターンで駆け引きを楽しめます。",
            "body": "焼き鳥の焼き加減と取りどきを読み合う二人対戦ゲームです。今取るか、もう少し焼くか。短いターンの中で相手の動きと串の状態を見ながら、焼きすぎる前のちょうどいい瞬間を狙います。",
            "shareTitle": "Yakitori Wars｜湯間庭町",
            "shareDescription": "焼き加減と取りどきを読み合う、二人対戦ゲーム。",
            "imageAlt": "焼き鳥の焼き加減を読み合うYakitori Warsの対戦画面",
            "genres": [
                "二人対戦",
                "タイミング"
            ],
            "terms": [
                "焼き鳥ゲーム",
                "二人対戦ゲーム",
                "タイミングゲーム",
                "料理ゲーム",
                "ブラウザゲーム"
            ]
        },
        "en": {
            "pageTitle": "Yakitori Wars | A Two-Player Grilling Game | Yumaniwa Town",
            "metaDescription": "A two-player timing game about watching the grill and deciding exactly when to grab each skewer of yakitori.",
            "body": "Yakitori Wars is a two-player timing game built around the grill. Take a skewer now or leave it a little longer? Watch the food and the other player, then try to grab the yakitori at just the right moment before it goes too far.",
            "shareTitle": "Yakitori Wars | Yumaniwa Town",
            "shareDescription": "A two-player timing game about knowing exactly when to grab the yakitori.",
            "imageAlt": "Two players watching skewers cook in Yakitori Wars",
            "genres": [
                "Two Player",
                "Timing"
            ],
            "terms": [
                "yakitori game",
                "two-player game",
                "timing game",
                "cooking game",
                "browser game"
            ]
        }
    },
    "rainy-window": {
        "schemaType": "CreativeWork",
        "alternateNames": [],
        "ja": {
            "pageTitle": "雨の日の窓｜雨粒を指でなぞるインタラクティブ作品｜湯間庭町",
            "metaDescription": "窓を流れる雨粒を指でなぞりながら、雨の日の景色を静かに眺めるWeb作品。勝ち負けではなく、手触りと時間を楽しむための小さな場所です。",
            "body": "窓を流れる雨粒を指でなぞりながら、雨の日の景色を静かに眺めるインタラクティブ作品です。ゲームの勝ち負けではなく、雨粒に触れる感覚と、少しだけゆっくり流れる時間を楽しむための小さな場所です。",
            "shareTitle": "雨の日の窓｜湯間庭町",
            "shareDescription": "雨粒を指でなぞり、窓の向こうを眺める作品。静かな雨の日を触って楽しめます。",
            "imageAlt": "窓を流れる雨粒を指でなぞる雨の日の窓の画面",
            "genres": [
                "インタラクティブアート",
                "雨"
            ],
            "terms": [
                "雨の窓",
                "インタラクティブ作品",
                "Web作品",
                "雨粒",
                "静かなWeb体験"
            ]
        },
        "en": {
            "pageTitle": "雨の日の窓 | A Quiet Interactive Rainy Window | Yumaniwa Town",
            "metaDescription": "A quiet interactive web piece where you trace raindrops across a window and spend a little time watching the rain.",
            "body": "This small interactive piece lets you trace raindrops as they move across a window and quietly watch the rainy scene beyond. There is nothing to win or finish; it is simply a place to spend a little time with the touch and rhythm of rain.",
            "shareTitle": "雨の日の窓 | Yumaniwa Town",
            "shareDescription": "A quiet interactive piece for tracing raindrops across a rainy window.",
            "imageAlt": "Raindrops moving across the interactive window in 雨の日の窓",
            "genres": [
                "Interactive Art",
                "Rain"
            ],
            "terms": [
                "interactive rain",
                "rainy window",
                "web toy",
                "interactive web experience",
                "interactive art"
            ]
        }
    },
    "coffee-factory": {
        "schemaType": "SoftwareApplication",
        "alternateNames": [],
        "ja": {
            "pageTitle": "CoffeeFactory｜ハンドドリップを楽しむコーヒー抽出タイマー｜湯間庭町",
            "metaDescription": "豆を選び、準備し、注ぎ、一杯を完成させるコーヒー抽出タイマー。小さな工場のこびと達と一緒に、抽出の時間を楽しめます。",
            "body": "豆を選び、準備し、注ぎ、一杯を完成させるまでを一緒に進めるコーヒー抽出タイマーです。小さな工場で働くこびと達を眺めながら、ハンドドリップの工程と待つ時間そのものを楽しめます。",
            "shareTitle": "CoffeeFactory｜湯間庭町",
            "shareDescription": "こびと達と一緒に、一杯を淹れるコーヒー抽出タイマー。",
            "imageAlt": "小さな工場のこびと達とコーヒーを淹れるCoffeeFactoryの画面",
            "genres": [
                "コーヒー",
                "抽出タイマー"
            ],
            "terms": [
                "コーヒー抽出タイマー",
                "ハンドドリップ",
                "コーヒータイマー",
                "4:6メソッド",
                "ドリップコーヒー"
            ]
        },
        "en": {
            "pageTitle": "CoffeeFactory | A Pour-Over Coffee Brewing Timer | Yumaniwa Town",
            "metaDescription": "A pour-over coffee brewing timer that guides you through beans, preparation, pouring and finishing a cup alongside a tiny animated factory.",
            "body": "CoffeeFactory is a brewing timer that follows the process from choosing beans and preparing the setup to pouring and finishing a cup. Tiny workers move around the factory as you brew, turning the practical timing of pour-over coffee into something to watch as well as use.",
            "shareTitle": "CoffeeFactory | Yumaniwa Town",
            "shareDescription": "A coffee brewing timer set inside a tiny animated factory.",
            "imageAlt": "Tiny workers preparing coffee inside the CoffeeFactory brewing timer",
            "genres": [
                "Coffee",
                "Brewing Timer"
            ],
            "terms": [
                "coffee brewing timer",
                "pour-over timer",
                "coffee timer",
                "4:6 method",
                "hand drip coffee"
            ]
        }
    }
};

function getWorkSearchMeta(workId) {
    if (!workId || !Object.prototype.hasOwnProperty.call(WORK_SEARCH_META, workId)) {
        return null;
    }

    return WORK_SEARCH_META[workId];
}
