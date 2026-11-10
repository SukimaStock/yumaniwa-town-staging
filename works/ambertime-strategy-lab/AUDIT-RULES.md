# 現行経営ルールの棚卸し

対象は main `036df63c7fcb47373bc66f44f8fda6a4d0c9872e`。コードのコメントより呼出経路を優先する。参照先はすべて `../ambertime/` 配下。酒造り・担当者・保存の補足は別文書を参照。

| プレイヤーの判断 | 現在の計算 | ゲーム上の意味 | 関連コード | 判定 | 将来の必要情報 |
|---|---|---|---|---|---|
| どの酒をどの棚へ何本置くか | 手元在庫まで配置。配置そのものは無償で販売実績を増やさない。販売は翌月以降 | 配分と実販売の区別 | `store-market.mjs:storeMarketQuote/qualified`, `partner-orders.mjs:storeAssignmentTransaction/settleStoreMarket` | 維持 | 商品別・店別の現役在庫、契約開始月、瓶詰め月 |
| 自家販売と店の選択 | 月間機会は自家6・酒店8・スーパー12・バー4。価格と相性から購入率を計算 | 販路の規模と得意な味 | `market-sales.mjs:VENUES/planSales/acceptance` | 維持 | 現役酒の風味・価格、店ごとの端数ledger |
| 同じ酒を複数発売に分ける | 同profileKeyをまとめ、店全体の機会を配分。分割による客数増加なし | 発売IDに依存しない販売 | `market-sales.mjs:profileKey/planSales` | 維持 | 同風味・年齢・価格の集約、各現役在庫への配分 |
| 酒店・スーパー・バーの相性 | バーは煙+厚みの比率。酒店・スーパーは好みの香味比を .15〜.80 で0〜1へ写す | 造る酒と卸先を考える | `market-sales.mjs:affinity` | 維持候補 | 香味の固定値。全過去発売は不要 |
| スーパー・デパートに届ける | スーパー熟成12か月以上。デパート24か月以上かつroughness≤.30、企画5本 | 販路への酒の適格性 | `shop-model.mjs:SHOPS/shopProductCondition`, `department-projects.mjs:departmentReleaseEligible` | 維持 | 酒の熟成・粗さ、企画状態 |
| 新店の取扱いを目指す | 酒店自家40本・売れた発売2回、スーパー80本・3回、デパート40本・2回。ブランド経過2か月。適格在庫等を確認 | 初期実績から取扱開始 | `shop-model.mjs:shopEvidence`, `partner-orders.mjs:maybeStockistOffers` | 再検討 | 実売累計、実売月数、適格在庫、契約。発売回数は除外候補 |
| バーの取扱いを目指す | ブランド3か月、発売存在、自家24本または過去の対象ブランドのバーへの関心等 | 少量と口コミから別の入口 | `shop-model.mjs:shopEvidence` | 維持・整理 | 実績、対象ブランドの確定した接点 |
| デパートの企画へ応じる | 一度5本、同発売を再採用しない。seenSources/利益企画・在庫条件あり | 通常棚と異なる特別な取引 | `department-projects.mjs`, `partner-orders.mjs:deliverShopInto` | 再検討 | 企画ID、採用済み酒の識別。単純な発売ID増殖は避ける |
| 自家販売実績を積む | r.soldは店舗納品を差し引いた自家販売のみ。全販売数とは別 | 旧来の自家販売から取扱いが広がる設計 | `partner-orders.mjs:retailMirror/syncReleases` | 再検討 | 自家・店別の累計を別々に保持 |
| 店へ繰り返し届ける | 台詞は異なる納品月数で判定。酒店2か月repeat、6か月long。6か月空白でgap | 会話で付き合いが見える | `shop-remarks.mjs:shopRemarkFacts/classifyShopRemark` | 維持 | 異なる取引月数、最終月、開始月、総本数 |
| 店との深い関係を作る | 現行town rootは好みfit≥.5のreceiptのみ、四半期数・初回末回span・平均fit。量は直接寄与しない | 長期の好まれた接触を評価 | `experiments/town-simulation/v01/model.mjs:relationship` | 単純化候補 | 累計量と実売月数の別指標、平均相性。全receipt履歴不要 |
| 評判の広がる卸先を選ぶ | 店ごとの経路。rootedはroot≥.12、tasteは目的地fit≥.3、curatedはwood≥.5かつ目的地fit≥.5 | 卸先と酒で進路が変わる | 同 `edgeOpen`、`experiments/reputation/v05/core.mjs:EDGES` | 単純化候補 | 地域段階、条件を満たした酒、進行中伝播 |
| 口コミから接点を待つ | 到達・関心・問い合わせ・訪問は独立。関心はsignal×fit（fit≥.5）、訪問率 .14+.18fit、問い合わせ率 .2+.3fit | 到達だけで取扱開始しない | 同 `arrive/react/response` | 維持・単純化 | 段階・発生日・元の酒・次の予定と根拠 |
| 分割瓶詰めする | 1receiptごとstrength=1-exp(-count/4)。分割すると独立packetと抽選を増やす | 意図しない評判の水増しが可能 | 同 `receiveExternal`, `town-connection.mjs:receiveActual` | 再検討 | 店×月×同じ酒で集計してから判定 |
| 酒を後世へ残す | 本編外部townはresponses。memoryイベントはあるが、再登場予約のmode=memoryは研究用。正式回想は別collector | 記憶・回想・再登場を混同しない | 同 `createExternal/react/memories`, `recall/collector.mjs` | 接続範囲を再検討 | 代表酒の凍結情報、予約された再登場、確定回想 |

## 本編に接続済みの販売式

`shop-app.mjs:newNativeGame` は `newShopDialogueDistillery → newAlleyBarDistillery → newMarketRulesDistillery`。`market-sales.mjs` の冒頭に Candidate-only とあるが、本編新規ゲームはこの `planSales` を呼ぶ。旧方式を現行方式として説明しない。

- バー相性 = (煙+厚み)/(果実+麦+煙+厚み)。酒店も同じ好み、スーパーは果実+麦を好む。酒店・スーパーは `clamp((好み比率-.15)/.65)`。
- 購入率の基礎：バー `.12+.80×fit²`、酒店/スーパー `.025+.925×fit³`、自家 `.26`（6か月未満）/`.84`。`sqrt(参照価格/価格)` を掛け0〜1。
- 店の参照価格は酒店16・スーパー20・バー22。店の価格は標準価格×.8/1/1.1。自家は本編marketValueを参照。
- carry方式は販売機会の配分端数と購入端数を繰り越す。販売自体はseed非依存。seeded方式は本Labでだけ選択する研究条件。
- `SHOPS.monthlyLimit` の10/20/4およびスーパーminQuantity10は旧納品方式に由来する。現行棚配置は手元在庫まで、現行販売は上記機会数。架空の棚容量や最低10本を加えない。
- 瓶詰めは現役8商品まで。1本×54回を同時作成する現行プレイは成立しない。本Labの実行可能例は売れた枠を補充し、残樽を毎月実際のageCaskで熟成・蒸発させる。別の「発売IDだけ」診断は反実仮想であり、現行で54商品同時瓶詰めできるとは主張しない。

## 発売分割で変わるもの・変わらないもの

`shopEvidence.soldReleases` は `r.sold>0` の件数。54本の自家販売でも1発売と54発売で異なる。`brand-reputation` の継続項Sも `Σmin(1,r.sold/30)` のため1と1.8へ変わる。bonusは `.15×sold/(sold+300)×(.75+.25×S/(S+4))`。ただし現行marketRules販売ではこのbonusは需要へ掛けない。非バーの申出にbonus>0を求める条件・表示は残る。

同じprofileの販売機会は分割で増えない。一方、実販売が複数releaseへ分かれるとtown receipt/packet/反応抽選が増える。Labの診断は同じ6機会/月の実販売予定を二つのID構成へ配り、売上時刻と総本数を固定してこの違いを測る。

現行rootは好みに合うreceiptの四半期数Qと初回末回spanを用い、`(1-exp(-Q/24))×span/(span+48)×平均fit`。同じ月・同じfitの分割はrootを直接増やさない。店の台詞もdistinct月数なので増えない。問題箇所だけを変更候補にする。

## 口コミと研究の境界

本編外部townのfitは3軸距離 `exp(-Σ|軸-店の好み|×[1.1,1.3,1])` に香味一致+.08/不一致-.04を加える。age/priceの相性は本編fitへ含めない。Labの販売用合成香味は本編入力契約に合わせた固定プロフィール、瓶詰め比較は香味なしの実ageCask3軸モデルを使う。

`createExternal` には実際の本編売上だけを入力し、自動生産・在庫・契約を作らない。問い合わせから自動取扱開始する研究用コードは `!external` のみ。本編の長期記憶再登場・遠隔契約がこのLabで完成したとは扱わない。
