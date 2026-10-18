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

    "pumpoko": {
        "articleIds": ["note-n21f2389ac91d"],
        "schemaType": "VideoGame",
        "alternateNames": [],
        "ja": {
            "pageTitle": "PUMPOKO｜カボチャとルタバガの物理アクション｜湯間庭町",
            "heading": "PUMPOKO",
            "metaDescription": "地上ではカボチャを転がし、地下ではルタバガを跳ねさせる。ふたりが交代しながら5ステージを進む、小さなブラウザ物理アクションゲーム。",
            "body": "カボチャに触れると、いつの間にかその内側のような世界へ。地上をころころ、地下をぽよん。穴に詰まった相手を押し出して交代しながら、5つのステージを進みます。",
            "shareTitle": "PUMPOKO｜湯間庭町",
            "shareDescription": "地上をころころ、地下をぽよん。カボチャとルタバガの旅。",
            "imageAlt": "かぼちゃ色の文字とルタバガが描かれたPUMPOKOのロゴ",
            "genres": ["アクション", "物理"],
            "terms": ["PUMPOKO", "カボチャゲーム", "物理アクションゲーム", "ブラウザゲーム", "ルタバガ"]
        },
        "en": {
            "pageTitle": "PUMPOKO | A Pumpkin and Rutabaga Physics Game | Yumaniwa Town",
            "heading": "PUMPOKO",
            "metaDescription": "Roll as a pumpkin above ground and bounce as a rutabaga below. Switch between them in a five-stage browser physics game by SukimaStock.",
            "body": "Touch a pumpkin and slip into a tiny world. Roll above ground, bounce below, and push your partner out of a hole to switch places. Five little stages of momentum and timing await.",
            "shareTitle": "PUMPOKO | Yumaniwa Town",
            "shareDescription": "Roll above. Bounce below. A little journey with a pumpkin and a rutabaga.",
            "imageAlt": "The colorful PUMPOKO logo with a small rutabaga beneath the letters",
            "genres": ["Platformer", "Physics"],
            "terms": ["PUMPOKO", "pumpkin game", "rutabaga game", "physics platformer", "browser game"]
        }
    },
    "orbit": {
        "articleIds": ["note-20261009-n308001a6a00a"],
        "schemaType": "VideoGame",
        "alternateNames": [
            "ORBIT"
        ],
        "ja": {
            "pageTitle": "ORBIT — Silent Reboot｜静かな宇宙探索ゲーム｜湯間庭町",
            "heading": "ORBIT — Silent Reboot",
            "metaDescription": "小さな宇宙船で惑星を巡り、資源やデータを集めてHOMEへ帰る探索ゲーム。帰る場所を手がかりに、少しずつ遠い宇宙へ進みます。",
            "body": "静かな宇宙を漂い、星を訪ね、資源やデータを拾ってHOMEへ帰る。帰る場所があるからこそ、また遠くへ出かけられる。そんな往復を楽しむ小さな探索ゲームです。",
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
            "heading": "ORBIT — Silent Reboot",
            "metaDescription": "Drift through a quiet universe, visit planets, gather resources, and return HOME in ORBIT — Silent Reboot, a browser exploration game.",
            "body": "Drift between planets in a small spacecraft, collecting resources and data before returning HOME. Each journey lets you travel a little farther. A quiet exploration game about leaving and returning.",
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
        "alternateNames": ["Diorama Calendar"],
        "ja": {
            "pageTitle": "DioramaCalendar｜季節のミニチュアを眺めるWebカレンダー｜湯間庭町",
            "heading": "DioramaCalendar",
            "metaDescription": "12か月の季節を、小さな立体の景色にしたWebカレンダー。端末を傾けたり指で動かしたりして、ミニチュアの奥行きを楽しめます。",
            "body": "予定を詰め込むのではなく、季節の景色を眺めるカレンダー。12か月それぞれの小さな世界を、少し傾けたり覗き込んだりして楽しめます。",
            "shareTitle": "DioramaCalendar｜湯間庭町",
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
            "pageTitle": "DioramaCalendar | A Miniature Seasonal Web Calendar | Yumaniwa Town",
            "heading": "DioramaCalendar",
            "metaDescription": "Explore twelve miniature seasonal scenes in DioramaCalendar, an interactive web calendar that responds to device tilt and touch.",
            "body": "A calendar made for looking, not scheduling. Each month holds a little layered landscape. Tilt or drag to explore the miniature scene and enjoy the changing seasons.",
            "shareTitle": "DioramaCalendar | Yumaniwa Town",
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
        "articleIds": ["note-20260917-c12ade65"],
        "schemaType": "VideoGame",
        "alternateNames": [
            "路地裏マサラ",
            "ROJIURA MASALA"
        ],
        "ja": {
            "pageTitle": "路地裏マサラ｜夜の路地を走るカレー配達ゲーム｜湯間庭町",
            "heading": "路地裏マサラ — ROJIURA MASALA",
            "metaDescription": "夜の小さなカレー屋から、冷める前に注文を配達するブラウザゲーム。色のピンを頼りに路地を走り、障害物を避けながら届けます。",
            "body": "小さなカレー屋から、夜の路地へ。色のピンを目印に、冷める前にカレーを届けてください。自転車や猫、ときどき開く裏口。配達のたびに、少し違う夜になります。",
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
            "heading": "ROJIURA MASALA",
            "metaDescription": "Deliver curry through nighttime alleys before it gets cold. Follow colored markers, dodge obstacles, and explore a small browser delivery game.",
            "body": "Take orders from a tiny curry shop and head into the nighttime alleys. Follow colored markers, dodge bicycles, and find shortcuts before the curry gets cold. Every delivery tells a slightly different story.",
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
            "pageTitle": "SteamClock｜歯車と蒸気のスチームパンクWeb時計｜SukimaStock",
            "heading": "SteamClock",
            "metaDescription": "SukimaStock制作のスチームパンクWeb時計。歯車と蒸気が静かに動き、アナログ時計とニキシー管風の表示で時刻を眺められます。",
            "body": "歯車が回り、蒸気がゆっくり流れる、小さな機械仕掛けの時計です。時間を確認するだけでなく、時間が流れていく様子を眺めるためのWebアプリです。",
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
            "pageTitle": "SteamClock | A Steampunk Web Clock by SukimaStock",
            "heading": "SteamClock",
            "metaDescription": "SteamClock by SukimaStock is an animated steampunk web clock with turning gears, drifting steam, analog hands, and a Nixie-style display.",
            "body": "Gears turn, steam drifts, and time keeps moving. A little steampunk clock made not just for checking the hour, but for watching time pass.",
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
        "articleIds": ["5b5f9715572b4d8a894c06b220c9139c"],
        "schemaType": "SoftwareApplication",
        "alternateNames": [],
        "ja": {
            "pageTitle": "DotWeather｜世界の空をドット絵で眺める天気アプリ｜SukimaStock",
            "heading": "DotWeather",
            "metaDescription": "SukimaStockのドット絵Web天気アプリ。世界各地の天気と時間に合わせて、雨、雲、星、月などの景色が静かに変化します。",
            "body": "世界の空を、静かなドット絵で眺める天気アプリ。場所ごとの天気や時間に合わせて、雨や雲、星や月が移り変わります。数字の向こうにある空模様を楽しむための小さな窓です。",
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
            "pageTitle": "DotWeather | A Pixel-Art Weather App by SukimaStock",
            "heading": "DotWeather",
            "metaDescription": "Explore weather around the world through pixel art. DotWeather by SukimaStock changes its skies, clouds, rain, stars, and moon with real conditions.",
            "body": "Watch the world's weather through quiet pixel-art scenery. Clouds, rain, stars, and the moon change with local conditions and time, making each sky a little different.",
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
        "alternateNames": ["JUNKISSA DIVE","純喫茶ダイブ"],
        "ja": {
            "pageTitle": "純喫茶ダイヴ｜深夜の喫茶店でトッピングを飛ばすゲーム｜湯間庭町",
            "heading": "純喫茶ダイヴ — JUNKISSA DIVE",
            "metaDescription": "深夜の純喫茶で、さくらんぼや角砂糖などのトッピングを飛ばして注文を仕上げる、小さな物理アクションゲーム。",
            "body": "深夜だけ開く純喫茶で、トッピングをぽんと飛ばして商品を仕上げます。思いどおりに乗る日も、思わぬところへ跳ねる日も。その夜の結果を楽しむゲームです。",
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
            "pageTitle": "JUNKISSA DIVE | A Late-Night Japanese Cafe Physics Game | Yumaniwa Town",
            "heading": "JUNKISSA DIVE",
            "metaDescription": "Launch cherries, sugar cubes, and other toppings onto cafe orders in JUNKISSA DIVE, a small late-night physics action game by SukimaStock.",
            "body": "At a little Japanese cafe that opens after dark, launch cherries, sugar cubes, and other toppings to finish each order. Perfect landings and unexpected bounces are both part of the night.",
            "shareTitle": "JUNKISSA DIVE | Yumaniwa Town",
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
            "pageTitle": "真夜中コーラ｜クラフトコーラを仕込むすごろくゲーム｜湯間庭町",
            "heading": "真夜中コーラ — MIDNIGHT COLA",
            "metaDescription": "深夜の工房で王冠を弾き、材料を重ねて自分だけのクラフトコーラを仕込むすごろくゲーム。完成した一本には今夜だけの名前がつきます。",
            "body": "灯串横丁の「クラフトコーラ研究所」で、今夜の一本を仕込みます。王冠を弾いて進み、材料を重ね、ときにはこぼしながら、自分だけのコーラを完成させてください。",
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
            "pageTitle": "MIDNIGHT COLA | A Craft Cola Board Game | Yumaniwa Town",
            "heading": "MIDNIGHT COLA",
            "metaDescription": "Flick a bottle cap, choose your route, and layer ingredients to craft a unique bottle of cola in this small nighttime browser board game.",
            "body": "Visit the Craft Cola Laboratory in Yumaniwa Town. Flick a bottle cap, choose your route, and layer ingredients into tonight's bottle. Each finished cola gets its own name and flavor.",
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
        "articleIds": ["95d48e6613ce4037907364809ee3359f", "ea784083edc146d298ba5b7c33a1b7f1"],
        "schemaType": "VideoGame",
        "alternateNames": [
            "やきとり屋 ゆまど"
        ],
        "ja": {
            "pageTitle": "Yakitori Wars｜焼き加減を競う二人対戦ゲーム｜湯間庭町",
            "heading": "Yakitori Wars",
            "metaDescription": "焼き鳥の焼き加減と取りどきを読み合う二人対戦ブラウザゲーム。今取るか、もう少し焼くか。短い駆け引きを楽しめます。",
            "body": "灯串横丁の「やきとり屋 ゆまど」で遊べる二人対戦ゲーム。串の焼き加減と相手の動きを見ながら、ちょうどいい取りどきを狙います。もう少し待つか、今取るか。",
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
            "pageTitle": "Yakitori Wars | A Two-Player Yakitori Grilling Game | Yumaniwa Town",
            "heading": "Yakitori Wars",
            "metaDescription": "Compete over the perfect grilling moment in Yakitori Wars, a two-player browser timing game about watching and grabbing yakitori skewers.",
            "body": "At Yumado, a little yakitori shop in Yumaniwa Town, two players compete over the grill. Watch the skewers and your opponent. Take one now, or let it cook a little longer?",
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
        "articleIds": ["3fbab1d8a9b14123bfdb1461a94e8098"],
        "schemaType": "CreativeWork",
        "alternateNames": [],
        "ja": {
            "pageTitle": "雨の日の窓｜雨粒に触れるインタラクティブWeb作品｜湯間庭町",
            "heading": "雨の日の窓",
            "metaDescription": "SukimaStockの「雨の日の窓」は、窓を流れる雨粒に触れ、指でなぞりながら静かな景色を楽しむブラウザ作品です。",
            "body": "窓を流れる雨粒を、指でそっとなぞる。勝ち負けも、急ぐ理由もありません。雨の日の景色と、指先に残る小さな手触りを楽しむ作品です。",
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
            "pageTitle": "雨の日の窓 | An Interactive Rainy Window by SukimaStock",
            "heading": "雨の日の窓 — Rainy Window",
            "metaDescription": "Trace raindrops across a window in this quiet interactive browser artwork by SukimaStock, part of Yumaniwa Town.",
            "body": "Trace raindrops as they move across a window and watch the scene beyond. Nothing to win and nowhere to rush. Just a small interactive piece about rain, touch, and time.",
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
    "articleIds": ["a6e80d044f734d4693d0926541fcba22", "note-20260904-ddca9fa0", "fac8492827054dd8a3922c8b8396198a"],
    "schemaType": "SoftwareApplication",
    "alternateNames": [],
    "ja": {
        "pageTitle": "CoffeeFactory｜ハンドドリップを楽しむコーヒー抽出タイマー｜湯間庭町",
        "metaDescription": "豆を選び、準備し、注ぎ、一杯を完成させるコーヒー抽出タイマー。小さな工場のこびと達と一緒に、抽出の時間を楽しめます。",
        "body": "豆を選び、準備し、注ぎ、一杯を完成させるまでを一緒に進めるコーヒー抽出タイマーです。小さな工場で働くこびと達を眺めながら、ハンドドリップの工程と待つ時間そのものを楽しめます。",
        "shareTitle": "CoffeeFactory｜湯間庭町",
        "shareDescription": "こびと達と一緒に、一杯を淹れるコーヒー抽出タイマー。",
        "imageAlt": "CoffeeFactoryでコーヒーミルとケトルを動かす小人たち",
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
        "imageAlt": "Tiny workers operating a coffee grinder and kettle in CoffeeFactory",
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
    },
    "ogp": {"file":"ogp.jpg","mime":"image/jpeg","width":1200,"height":630,"version":"20261018-owner"}
}
};

function getWorkSearchMeta(workId) {
    if (!workId || !Object.prototype.hasOwnProperty.call(WORK_SEARCH_META, workId)) {
        return null;
    }

    return WORK_SEARCH_META[workId];
}
