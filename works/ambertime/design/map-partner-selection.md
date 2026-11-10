# 世界拡張 第4段階：地図から取引先を選ぶ

地図は既存の6段階を自由に閲覧する。閲覧上限6と、実際の口コミ・販売に基づく `mapProgress().max/reached` は別物。閲覧、選択、パン、拡大は正式操作を作らず、契約・在庫・売上・口コミを変えない。

## 地図と販売室

| 視点 | 取引先の範囲 | 販売室 |
| --- | --- | --- |
| 蒸留所 | 自家販売 | 自家販売 |
| 近所・町 | 既存の町の店舗。近所は既存位置のある店のみ | 自家販売＋契約済みの通常店舗 |
| 地方 | trial-region の地域窓口 | 自家販売＋正式契約・納品方式が有効な地域窓口 |
| 日本・地球 | 地理の閲覧のみ | 自家販売 |

`mapPartnerProjection(game,stage)` が M0 と日常地図の共通表示正本。静的定義は `partnersForMap()`、権利は既存の店舗関係・申し出と `regionalContract()/regionalOffers()/regionalDeliveryPartners()` から読む。未接点は取引先ピンを作らず、申し出は情報確認のみ。デパートは既存の企画取引へ渡し、通常の棚を作らない。

地域窓口の位置は地方地図の既存の北東集落 `[86,36,12,12]`、中心 `[92,42]`。地理的な実在県・国を追加しない。町の店舗・蒸留所も描画済み建物の bounds を共用し、四隅枠と操作位置を一致させる。バーは既存の試作位置、デパートは既存の家 `[24,48,12,16]` を表示上の位置として使う。旧 `mapSalesProjection()` の座標 API は旧読取側用に保持し、新しい2画面は共通 projection の座標を利用する。

`marketPartnersForMap(game,view,availableMarketShops(game))` は自家販売を必ず残し、視点と選択IDで既存の販売室の行だけを絞る。相手未選択なら範囲内、選択済みならその相手だけ。自家販売を選べば自家販売のみ。取引処理は変更しない。M0上部は実際の販売室の読取専用複製で、操作は「販売室へ」から従来の酒・本数・配分・納品・取消へ戻す。

## 表示状態と通知

M0と日常地図はアプリの `mapBrowse` を共有する。既存sessionStorageキー `.map-view.v1` の旧version1を読み、version2で視点・選択ID・縮尺別カメラを保存。存在しない相手や別縮尺の相手は無選択へ戻す。同じ縮尺の相手選択では位置を変えず、縮尺変更時はその縮尺のカメラへ移る。保存不可ならセッション中の表示を継続する。

地図通知の既存キーはversion3。地理の閲覧で既読を進めず、正式進行で新しい事実が届いた時だけ通知する。旧version1/2・旧キーなしで復元する場合、現在の事実まで既読として移行し、過去の通知を再送しない。version3の既読・通知済みは個別に保持する。正式v8エンベロープ、操作帳、リプレイは変更しない。

## 第5段階への接点

- `mapPartnerProjection()`：取引先ID、地域・縮尺、bounds、offer/contract/delivered、選択可能性。
- `mapPartnerDetail()`：地域契約ID、保留中申し出、未納品本数、累計納品、最近の保持済み納品記録。
- `pin.activity`：`contractId/cumulativeDelivered/pendingCount/recentDelivered/latestMonth/customerSales`。地域の最近分は保持済み最大8件（`recentLimit:8`, `recentWindow:'retained-receipts'`）で、12か月全件の合計とは呼ばない。累計は `totalsByPartner` が正本。町の顧客実売は納品活動から分離する。
- 正式な履歴が必要な場合は既存の `regionalDeliveryHistory()/regionalDeliveryReceipt()/regionalProductTotals()` を用途に応じて使う。毎描画で操作帳全件を走査しない。

地域納品の顧客実売は `null` のまま。地図表示も納品receiptも新しい口コミを発生させない。段ボール・花・蝶は未実装。

## 検証

自然seed3・6の実際のnear-wide問い合わせ・正式契約から共通地図選択、既存UIの1本/5本/全部、取消・納品、cold restoreを検証する。人工入力はテスト内で明記する。関連の既存地図・販売・保存・地域納品回帰を実行し、既知失敗は基準main d639f541と照合する。実ブラウザーの起動可否・未確認範囲はPRへ別記する。Node harnessを画面確認とは扱わない。

## 保存再利用前の必須修正

PR #901のStage5 `persistence.mjs load()` における元データrevisionとCAS revisionの混同は**未修正**。今回そのcheckpoint/tail/loadに依存しない。将来の再利用前に独立PRで別フィールド化、異なるrevisionの読込み回帰、save/load/restore呼出側、競合検出と復元契約を確認する。Productionは対象外。
