# 自家販売の配置・販売演出のブラウザー確認

`tests/retail-sale-browser.mjs` をLinux Chromium／WebKitで実行し、各14チェック、エラー0。実機iPhone Safariは未確認。

正式な既存セーブ `placement-established-six.json` を復元し、既存APIでStage4・店別在庫・採用済み販売ルールを有効化した。自家販売に2／3／4／5本を割り当てると、次の正式な `tickDistillery` で1／2／3／4本が実際に売れる。売上16／32／48／64、残数・現金・保存を含む正式状態をそのままブラウザーへ渡し、保存成功後に実際のMarket UIへ通知した。架空の売上は使っていない。

- 飛ぶ瓶は1／2／3／4本。210ms、1〜3本は45ms間隔、4本群は130ms間隔で、右の数量から左の実際の店舗アイコンへ向かう。段階移動・縮小・消失と画面内の軌道をWAAPIの実キーフレーム／矩形で確認。
- 保存文字列・正式状態は演出前後で完全一致。通常再描画、同じ販売通知、再読込、配置、取消では販売演出を再発しない。キャンセル・非表示・画面外の始点は残留演出を作らず、reduced-motionでは飛ぶ瓶を作らない。
- 既存樽から既存APIで追加瓶詰めした2発売回を使い、本数と瓶詰め年月（26/12・27/1）が別々のまま表示されることを確認。通常店舗のHTMLは前版と一致。
- 360×568・375×620・390×680・430×740・360×500・375×620の125%文字でページの縦横はみ出しなし。店舗アイコンは自家販売名の上、商品本数は瓶詰め日の上。全条件で本数・年月の矩形は商品ボタン内に収まる。
- 360×568の3店舗×2商品は、既存の表示専用ストレスfixtureで別途確認。これは正式進行データではない。Chromiumはboard client/scroll=324/324、WebKit=328/328で、縦スクロールなし。

前版はPR #746を保持する`cut-range-ticks`。各engineの`375-layout-before.png`／`375-layout-after.png`が本編の前後画像。`375-flight-1.png`・`375-flight-3.png`・`375-flight-4-grouped.png`は実際のUI・店舗アイコン・瓶画像を使った独立描画ハーネスの途中画像。`360-three-shops-two-releases.png`、`360-short-height.png`、`375-font125.png`も保存した。

補足：初回の3店舗検証で4pxの内部スクロールを検出した。自家販売側の商品札の最小列幅を4.5emに整理した後、同じ条件の両エンジンで上記の一致を確認した。文字サイズ・操作領域は縮小していない。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/retail-sale-browser.mjs`（`webkit`へ変更可能）。前版ルートは`AMBER_RETAIL_BEFORE_ROOT`で指定可能。既存の本編時計での販売・保存操作は、別途維持されている必須market browser 2件が担当する。
