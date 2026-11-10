# 世界拡張 第1段階：取引先の読取り基盤

対象base: f7c2cd22（PR #901まで）。Staging限定。静的定義を読む段階であり、本編への解放・契約・納品・保存接続はない。

## 第0段階の確認

| 責務 | 正本と維持する境界 |
| --- | --- |
| 4店舗の識別・条件 | `shop-model.mjs` の `SHOPS`。ID・名称・熟成条件・価格率は変更しない |
| 取扱開始 | `shopEvidence` → `partner-orders.mjs` の `maybeStockistOffers` → `acceptShop`。定義の存在は申し出でも契約でもない |
| バー | `shopEvidence` の専用条件（有効化、発売あり、経過3か月、口コミ到達または24本販売）。棚契約はブランドをまたぐ。味による受入禁止は追加しない |
| 現在の割当 | `storeMarketQuote` → `assignStoreProduct` / `returnStoreProduct`。スーパーも1本から。`maxCount` は手元在庫 |
| 現在の販売 | `newNativeGame` → `newShopDialogueDistillery` はmarketRules方式。`planStoreMarketSales` → `planMarketRuleSales` → `market-sales.mjs` の `planSales` / `affinity` / `acceptance` |
| 月間販売機会 | 現在は酒店8・スーパー12・バー4。`SHOPS.monthlyLimit` の10・20・4とは別の意味 |
| 旧方式 | `normalShopOrders` / `planShopFulfillment`、marketRules以前の棚計算も残る。`minQuantity`（スーパー10）と月間上限は `legacyDemand` として区別する |
| 価格 | `normalShopUnitPrice` は `SHOPS.rate` を参照。酒店0.8・スーパー1・バー1.1。地理から算出しない。現在の販売確率にも使うreferencePaidPriceは共通モデルのpriceに保持 |
| デパート | `department-projects.mjs` / `shopOfferQuote` / `acceptShopDelivery` の企画取引。24か月以上、roughness 0.30以下、選定発売5本、標準価格×1.4。通常棚へ含めない |
| 確定 | `settleStoreMarket` → `deliverShopInto` と既存の保存成功境界。割当だけでは現金・販売実績を作らない |
| 自家販売 | `retail` は自身の販路。共通の外部取引先一覧には入れない。既存のretailMirror等による二重計上防止を維持 |
| 口コミ | `syncTown` / `receiveActual` / `townAffinity` と既存simulation。新窓口をNODESやAROMA_PLACESへ追加しない |

店舗IDの直接列挙・個別分岐は `placement-mode.mjs`、`partner-orders.mjs`（割当、旧自動出荷、企画取引、リプレイ）、`market-ui.mjs`、`shop-app.mjs`、`map-sales-view.mjs`、`map-daily-view.mjs`、`shop-ledger.mjs`、`town-connection.mjs` に残る。これらは実行・保存・表示の互換境界であり、今回は一括置換しない。旧shop-v*スナップショットも変更しない。

## 追加API

`trading-partners.mjs` は既存の `SHOPS`・`VENUES`・`NORMAL_SHOP_DEMAND`・`DEPARTMENT` から共通表現を作る。既存の店舗定義オブジェクトを `shop` として参照し、計算関数は移植しない。好みは `VENUES` を参照し、デパートには棚の相性計算を捏造しない。`acceptance` は熟成・刺激の静的条件、申し出の成立条件は引き続き `shopEvidence`。

- `TRADING_PARTNERS`: 既存4店舗＋定義のみの地域窓口1件。全件が契約済みという意味ではない。
- `tradingPartner(id)`: 厳密なID参照。未定義、自家販売は `null`。
- `PARTNER_REGIONS`: 地域IDと論理的な地図縮尺。既存M0を変更する定義ではない。
- `partnersForMap({regionId,mapScale,includeDefinitions})`: 同じ地域・縮尺の定義を選ぶ。未定義／不一致は空。地域窓口は明示指定しなければ返さない。既存店舗でも実際の契約・表示可否は別途判定が必要。
- `validateTradingPartners(partners,regions)`: ID重複、未知地域、縮尺不一致、既存店舗への偽参照、定義のみの相手による本編契約参照を拒否する。正式保存の検証ではない。

仮の `trial-region-desk` は個別小売店ではなく地域の仕入れ窓口。麦・穏やかな樽香、6か月以上、月間機会3、1本からプレイヤーが本数を選ぶ、価格率1という独立した仮定義。地域の広さを大量販売や高価格へ換算しない。`availability: definition-only`、本編shop参照なし・契約参照なし。実行系からこのモジュールをimportせず、契約・在庫・売上・自動販売・口コミ・UI・v8に影響させない。

## 次段階の接続境界

| 段階 | 読取りAPIと接続先 |
| --- | --- |
| 第2段階：相手情報付き申し出 | `tradingPartner(id)` → `shopEvidence` / `maybeStockistOffers` / `acceptShop` の既存境界。地域の申し出条件・承諾を明示的に設計し、定義の存在で承諾しない |
| 第3段階：酒・本数 | 同じID → `storeMarketQuote` / `assignStoreProduct` / `returnStoreProduct`。地域窓口用の確定処理は次段階の範囲で追加し、デパートは既存企画を維持 |
| 第4段階：地図 | `partnersForMap` → `mapSalesProjection` / `dailyMapProjection`。実契約のフィルタを併用。縮尺だけで解放しない |
| 第5段階：景色 | 同じIDと `shop.relations` / `shop.deliveries` / `buildShopLedger` の確定事実。花・蝶・段ボールは未実装 |

## PR #901：保存revisionの未解決事項

`works/ambertime-strategy-lab/internal/stage5/persistence.mjs` の `load()` は `{ok:true,...await restore(bundle,expected),...token}` により、元データrevisionが保存領域のCAS revisionで上書きされ得る。元revision 12を新規領域へ初回保存すると、復元結果revisionが1となり得る。今回、この処理を利用・修正していない。**未解決であり、Stage5保存処理の次回再利用前に修正必須**。

独立した小さな修正PRで以下を行う。

1. 元データrevisionとCAS revisionを別フィールドで返す。
2. 両revisionが異なるケースの回帰テストを追加する。
3. `save()` / `load()` / `restore()` の呼出側への影響を確認する。
4. 既存revision比較・競合検出・保存復元契約を維持する。

共通モデルからStage5 checkpoint・tail・loadへの依存はない。今回のPRをrevision修正済みの根拠にしない。

## 検証

新規テストは定義・参照の境界と、別プロセスでのadapter読取りあり／なしの6か月経営を比較する（保存バイト列、復元、UIの店舗一覧、割当見積、販売計画、店舗帳面）。依頼の既存回帰とバー・企画取引・会話・地図等の結果はPRへexact SHAとともに記録する。画面変更はなく、iPhone実機の確認は行っていない。
