# AmberTime コード構造監査

基準main: `23f20504f81282c5c9161995758660be092156dc`（PR #767、2026-11-02）。本編・Lab・テストは読取専用。事前Lockは `.change-plans/ambertime-structure-audit-20261102/r0.lock.json`。本監査は4資料のみを追加し、実装や削除は行わない。

## 結論

変更負荷は正式計算よりUIに集中している。最初の改修対象は、表示用projection、蒸留道具の座標、三室のUI責務、モーダル表示、Canvas更新の順が妥当。ただし、現在の描画処理には正式な通知操作と保存が含まれる。単純な関数移動では操作履歴を変えるおそれがある。

本編の静的依存にはLab配下の計算・地図が含まれる。Labという名前を理由に移動・削除できない。削除可能と確定した関数・ファイルは今回ゼロ。古い入口、旧保存reader、検証用oracleは明示して保存する。

## 調査方法と経緯

最新main、root/AmberTimeのAGENTS、Change OS、Plan Lock群、OPERATIONS、CI、全git履歴、現行HTML入口、static import/export from、Worker入口、Lab登録/実験/資料を照合した。正規表現による静的グラフはqueryを除去したfilesystemパスに正規化。これはbrowserのURL identityとは別で、動的import全般を完全証明する解析ではない。

|段階|根拠|現在との関係|
|---|---|---|
|2026-10-14 再構築|最初のpath commit `f1e424d5`、PR #365、初期DESIGN/BALANCE|一樽の熟成・試飲・販売判断から開始。古いHTMLは公開/旧保存入口として残存|
|並列進行・経済・旧保存の積層|PR #405、`design/v06`〜`v09`、partners/aroma/shop資料|正式モデルは旧操作の再解釈を避けるreader/移行/再生境界を積層|
|風味と町の接続|PR #592/#593、`lab-flavor`/`town-connection`|Lab内モデルが本編の実依存になった。過去資料の「未採用」を現在へ適用しない|
|手札と場・販売ルール|PR #623〜#634、#666/#667、`design/placement-027`/`market-rules-adoption`|研究UIと正式販路の採用を分ける。現在はnative market rules + placement入口|
|評価/評判/視覚/マップ|#673/#677/#678/#681/#687/#691、`design/map-sales-028`|C表示案を本編接続。#681の店の記憶や#687の店内情景の計算全体を採用したわけではない|
|蒸留道具と三室|#741→#742/#743、#756〜#758/#762|採取UI・描画・hit・モーダルが複数モジュールにまたがる|
|最新の状態/変化表示|#766/#767|熟成の状態と前回試飲からの変化を表示adapterで区別。記録原文・正式判定は保護|

PR番号はGitのmerge履歴と資料を照合。最新#767はGitHubのPR本文/コメントとも確認した。全履歴の作者の試遊・採否は網羅的には確認できておらず、Lab別の未確認は棚卸しへ残した。

## 責務と変更集中

圧縮された長い行が多く、LOCだけを複雑さの指標にしない。変更数は基準HEADへ到達するpath commit数で、PR件数や不具合件数ではない。「最近」は2026-10-27以降。

|ファイル|行/bytes|全履歴/最近|集中する責務・評価|
|---|---:|---:|---|
|`shop-app.mjs`|1308 / 182628|145 / 44|43 static import。三室操作、正式操作dispatch、保存、clock、モーダル、通知、DOM/Canvas projection、イベント登録が集中。最優先の境界整理対象|
|`canvas-scene.mjs`|229 / 36935|63 / 19|13 import。三室描画、sprite/background cache、controls DOM読取、hit、font/resize、更新timers。行数以上に責務が多い|
|`partner-orders.mjs`|1386 / 140287|39 / 3|正式操作・月次・移行・再生・厳密検証。大きいがUIほど高頻度で変わらない。初手の分割は利益が小さい|
|`market-ui.mjs`|262 / 26373|17 / 17|販売室の一時選択・商品/店表示・通知・commit adapter。既存の分離を活用する|

### shop-appの責務境界

|責務|現行の所在/参照行|分離判断|
|---|---|---|
|蒸留・仕込み・採取|`prepareDistillation` 79〜、`finishDistillation`/開始600前後、action handlers1165〜|UI controller候補。正式カード選択と未確定confirmationを区別する|
|貯蔵庫・樽・試飲・瓶詰め|`render`941〜、cask/detail/tasting、`commitFill`568|選択と画面遷移を段階抽出。正式試飲/瓶詰め操作はモデルに残す|
|販売室|`createMarketUI`69〜、`actMarket`553、`commitPlacement`579|既存adapterを明示。新controllerの重複追加はしない|
|担当者設定|195〜、policy draft713〜/1079〜、保存1132〜|draft/focus/markupだけ抽出可能。明示保存時の正式化を保持|
|モーダル|`syncModal`748〜|family単位の表示抽出。割込選択と正式効果は後段|
|通知・反応|`automaticNews`、feedback view、staff/shop/generation notice|可視/読み上げ/履歴/正式noticeを同義にしない|
|保存・再読込|`save`515、act552、schedule529、placement-save|失敗の巻き戻し条件が異なる。共通化前にtransaction matrixを固定|
|描画データ|`renderSpirit`914〜、`render`941〜1033|DOM更新後にDOMを読みCanvasへ渡す。純粋projectionへ一部分ずつ移す|
|イベント|下部のbutton/action委譲、pointer/keyboard、page/visibility|登録・解除・重複発火・clock停止順を比較してから移す|

### 描画から正式状態へ進む経路

`render:941 → syncModal:748 → showStaffOpportunity:195 / showShopOffer:613 / showGeneration:306` は `D.notice…` と保存を実行する。正式計算をCanvasが書き換えているという意味ではないが、描画を繰り返すだけで常に正式状態不変とは言えない。試飲/既存decisionを先に扱い、staff→trade→shop→generation→fill→mapへ進む優先、ゲーム停止、保存成功後のmodal確定を保護する。

### Canvas・入力・レイアウト

`canvas-layout.mjs`はhit/座標、`distill-tools-view.mjs`は道具projection/paint、`distill-tool-input.mjs`はgesture、`RoomMotion`は演出、`CanvasScene`はpaint/lifecycleを担う。分離は既にあるが、rootのDOMをcontrolsが読み、rootがDOM経由でsceneデータを組む三角形の結合が残る。

`TOOL_GEOMETRY`がある一方、layout29〜32のlever285/279/60/66・glass174/237、scene50/52/144のglass174/237、app1301の移動距離63が分散。sceneはTOOL_GEOMETRYをimportするが使用しない。描画とhitとgestureを同じ定数へ接続する限定PRは効果がある。操作判定`rangeRestartAvailable`は正式guard（partner-orders163）のprogress88/99等と並存し、表示側だけ更新されるリスクがある。正式guardを権威とし、必要ならread-only capabilityを別PRで検討する。

## 正式状態・一時状態・保存の保護

|領域|正本/境界|現行判断|
|---|---|---|
|蒸留/カット/味・量|D操作、model/economy/lab-flavor、採用Lab model|UIに再実装しない。量固定案34.35Lは研究条件で正式採用ではない|
|熟成/瓶詰め|model/monthly/character、partial/bottle/policy|観察の表示変換と保存済み原文を分ける|
|販売/在庫/評判/地域|store-market/market-sales/shop/town-connection|UI選択draftを正式在庫の複製にしない。渡すだけで売上計上しない|
|担当者/世代/時計|D正式予約/設定・月次処理、RuntimeClock/elapsed|UIドラッグ/animation時間とゲーム月を分ける。elapsed/userPausedはsession保存対象なので捨てられるUI状態ではない|
|正式保存/再生|placement-save、partner-orders origin+operations/apply/strict replay|キー・version・property順序・操作payload・乱数・checkpointとcold replayを保護|
|仕込み確定|app77〜、manualCards、D.selectFlavorCards1165、confirmation1166、開始600〜|確認状態と正式に選択済みのカードは別。reloadでconfirmationが消えることも現行仕様|
|レバー/グラス|DistillToolInput、tool view、countdown|一時drag/guideを正式操作へ余計に記録しない|
|樽選択/採取終了|selected IDs、shownFillSpiritId89、正式still.filling|自動の樽選択を一度表示するガードと正式な未完作業を混同しない|
|販売選択|marketUIのselection/draft/marketEditing|取消可能な仮置きと保存成功済みの配置を区別|
|担当者modal|planDraft等|保存前の入力を正式状態へ反映しない|
|地図閲覧位置|mapBrowse/sessionStorage、map revealの独立metadata|正式保存の原文を上書きしない。metadata失敗で正式セーブを復旧しない|

月次の重要順序は `partner-orders:1217〜1227` の economicMonthly→在庫調整→syncRecords/releases→settleDepartmentDeliveries→automaticShipping→summarizeMonthlySales→automaticBottling→notices。これは現行monthlyTiming経路の順序。旧delegation経路ではautomaticBottlingがautomaticShippingより先であり、旧保存の各分岐の順序を別々に保持する。並列化・順序変更は不可。

## 重複・旧実装候補

|候補|証拠|扱い|
|---|---|---|
|HTML escape|app62、market-ui5、placement-ui3、shop-order-view5|work内の小純粋helper候補。これだけで抽象UI frameworkを作らない|
|保存transaction|app515/552/553/568/579、月次529|generic act552はgameを先に代入し、save失敗でも自動rollbackせずtrueを返す。candidate方式とは失敗policyが異なる。削除/統合不可、まず比較表を固定|
|旧DOM `legacy-interface`|index.html、render/controls/vaultPanels|hiddenでも更新・DOM読取・panel移設先に使う。不可視＝未使用ではない|
|`placementEnabled=true`のfalse側|app58〜|局所到達不能候補。placement-uiは1097〜で旧product modal処理に使用。ファイル削除不可|
|TOOL_GEOMETRY unused import|canvas-scene importと全利用箇所照合|単一importの候補。geometry統一と一緒に判断、資産削除根拠にはしない|
|古いcache query|複数親import/HTML、旧テストのpin|タグの古さだけで失効扱いしない。browserはquery全体で別instanceになる。親依存の閉包を照合|
|旧モデルreader/HTML|wholesale-v08/trade/旧入口19|旧保存・cold replay・公開URL用。保護|

呼ばれない関数を網羅的に証明する完全なcall graphは未作成。イベント委譲・HTML ID・Worker等があるため、grepで呼出が少ないだけでは削除候補にしない。

## Cacheと更新タイミング

appのserial cache49〜はseed/operations長/末尾操作、staff cache932〜は月/資金/phase/担当者/予約/空き容量も見る。rack/shelf/artのDOM key、履歴/樽workerのsnapshot/request IDが別にある。scene15〜20のsprite cacheはmarkup/collection/active/frame、100件超でclear。drawWorld65〜68はprojection keyでbackground再描画を抑え、54〜56/142〜228はvisibility/font/timerを管理する。

正式replay checkpoint（partner-orders1292〜1326）は描画memoとは性質が異なる。UI cache整理へ含めない。Workerの`history-worker.mjs`/`cask-ledger-worker.mjs`（app157/415）、間接comparison workerはstatic closureとは別rootで調べる。

## Labへの実行依存

5 Lab群・7ファイル: flavor-lab-v02のmodel/bridge、town-simulation/v01/model、reputation/v03/model、reputation/v05/core/model、world-map/v01/map。`lab-flavor`と`town-connection`と`world-map-view`から到達する。研究完了でもB+CとしてURL・パス・計算・再生を維持する。その他のCは他Lab/テスト/oracleの逆参照を含むため[棚卸し](LAB-INVENTORY.md)で区別する。

## 現在のリスクと制限

高: render内の正式効果、transaction失敗差、旧再生/乱数/月次、Lab内正式依存。中: DOM→Canvas二重projection、座標/cache同期、旧期待値に固定されたUIテスト。実行した既存1147テストは1134成功・11失敗・2skip。失敗は[検証基準](BASELINE-TESTS.md)へ原因と未確認を残し、今回の資料追加では修正しない。実機・全旧Labのブラウザー動作は未確認。

## 現行モジュール一覧

以下はshop-appからのstatic閉包86パス（入口含む）。root直下MJSは117あり、残りは旧入口/実験等を含む。表の直接test importは参照証拠で、網羅率や成功保証ではない。依存列はqueryを外したfilesystemパス、履歴列はpath commit数。Workerは前述の別root。

| Module | Role | LOC | Bytes | Path commits | Direct test importers | Dependencies |
|---|---|---:|---:|---:|---|---|
| works/ambertime-flavor-lab-v02/bridge.mjs | 風味標本転送の一方向bridge | 33 | 3446 | 1 | 直接importなし/他経路未集計 | works/ambertime-flavor-lab-v02/model.mjs |
| works/ambertime-flavor-lab-v02/model.mjs | 採用済み風味計算モデル | 117 | 6972 | 2 | stage4-flavor.test.mjs, adjust-c.test.mjs, adjust-b.test.mjs |  |
| aroma-extraction.mjs | モデル/描画補助（詳細はソース参照） | 41 | 3070 | 2 | aroma-model.test.mjs, ui-details.test.mjs, aroma-compatibility.test.mjs, aroma-browser.mjs | model.mjs, economy-parameters.mjs |
| bottle-storage.mjs | 構成値/契約 | 5 | 424 | 6 | 直接importなし/他経路未集計 | generations.mjs |
| brand-identity.mjs | モデル/描画補助（詳細はソース参照） | 17 | 2029 | 1 | first-brand.test.mjs, first-brand-art.test.mjs |  |
| brand-reputation.mjs | モデル/描画補助（詳細はソース参照） | 42 | 2254 | 2 | stockists.test.mjs, bottle-simulate.mjs, cross-inventory.test.mjs, cross-simulate.mjs (+11) |  |
| brewing-cards.mjs | 仕込みカード表示/確認projection | 71 | 4908 | 4 | adjust-c.test.mjs, brewing-panel-browser.mjs, touch-refinements-browser.mjs, brewing-panel.test.mjs (+4) |  |
| canvas-layout.mjs | 表示座標・hit・レイアウト | 68 | 4772 | 25 | flavor-feedback-0253.test.mjs, map-daily-ui.test.mjs, distill-display.test.mjs, adjust-b-view.test.mjs (+7) | text-metrics.mjs |
| canvas-scene.mjs | Canvas描画・DOM hit同期・表示timer | 229 | 36935 | 63 | 直接importなし/他経路未集計 | brewing-cards.mjs, cut-bar.mjs, distill-tools-view.mjs, font-uniform.mjs, room-motion.mjs, scene-input.mjs, canvas-layout.mjs, cask-glass-art.mjs, room-object-art.mjs, font-loader.mjs, text-metrics.mjs, pixel-symbols.mjs, ui-text.mjs |
| cask-detail-view.mjs | 表示/読み取りprojection | 10 | 597 | 4 | cask-detail.test.mjs | flavor-types.mjs, flavor-view.mjs, ui-text.mjs |
| cask-glass-art.mjs | モデル/描画補助（詳細はソース参照） | 12 | 1258 | 3 | visual-polish-art.test.mjs, rooms-stage2-browser.mjs, room-object-art.test.mjs, pixel-art.test.mjs | codea-object-art.mjs |
| cask-serials.mjs | モデル/描画補助（詳細はソース参照） | 20 | 1129 | 19 | cask-serials.test.mjs, ui-details.test.mjs, staff-repeat.test.mjs | partner-orders.mjs, trade.mjs |
| character.mjs | モデル/描画補助（詳細はソース参照） | 93 | 10280 | 6 | stage4-flavor.test.mjs, aging-copy.mjs, monthly.test.mjs, free-aging.test.mjs | model.mjs |
| codea-object-art.mjs | モデル/描画補助（詳細はソース参照） | 100 | 4698 | 4 | codea-object-art.test.mjs, first-brand-art.test.mjs | brand-identity.mjs |
| cut-bar.mjs | モデル/描画補助（詳細はソース参照） | 48 | 3768 | 4 | cut-pixel-render.test.mjs, distill-cut-mark.test.mjs, flavor-color.test.mjs, distill-cut-bar.test.mjs |  |
| department-projects.mjs | モデル/描画補助（詳細はソース参照） | 22 | 2263 | 8 | 直接importなし/他経路未集計 | partial-bottling.mjs, bottle-storage.mjs |
| distill-learning.mjs | モデル/描画補助（詳細はソース参照） | 14 | 819 | 2 | rooms-stage2-browser.mjs, distill-learning.test.mjs, distill-cut-main-integration.test.mjs, distill-tools-view.test.mjs (+2) |  |
| distill-tool-input.mjs | lever/glass pointer/keyboard gesture | 78 | 4934 | 1 | distill-tool-input.test.mjs |  |
| distill-tools-view.mjs | 道具表示projection・pixel paint | 45 | 5507 | 8 | cut-pixel-render.test.mjs, distill-cut-main-integration.test.mjs, distill-tools-view.test.mjs, rooms-stage2.test.mjs | parameters.mjs |
| distiller.mjs | 構成値/契約 | 4 | 352 | 3 | 直接importなし/他経路未集計 | partial-bottling.mjs |
| distillery-parameters.mjs | 構成値/契約 | 2 | 357 | 1 | 直接importなし/他経路未集計 |  |
| distillery.mjs | 構成値/契約 | 38 | 12815 | 3 | distillery.test.mjs, compatibility-v06.test.mjs, parallel.test.mjs, distillery-ui.test.mjs | monthly.mjs, model.mjs, character.mjs, parameters.mjs, distillery-parameters.mjs, distillery-parameters.mjs |
| economy-parameters.mjs | 構成値/契約 | 5 | 540 | 1 | bottle-simulate.mjs, partners-ui.test.mjs, aroma-simulate.mjs, cross-simulate.mjs (+10) | parameters.mjs, parallel-parameters.mjs |
| economy.mjs | 経済・生産・月次model | 93 | 18695 | 10 | v07-ui.test.mjs, market-rules-model.test.mjs, aroma-compatibility.test.mjs, aroma-simulate.mjs (+7) | market-sales.mjs, model.mjs, distillery.mjs, character.mjs, monthly.mjs, parameters.mjs, economy-parameters.mjs, economy-parameters.mjs, economy-parameters.mjs |
| event-notices.mjs | モデル/描画補助（詳細はソース参照） | 45 | 4883 | 9 | ui-details.test.mjs, message-view.test.mjs, bottling-policy.test.mjs, bottling-roles.test.mjs (+2) | player-news.mjs |
| experiments/reputation/v03/model.mjs | 本編間接依存・評判基礎/相性 | 82 | 9225 | 1 | 直接importなし/他経路未集計 |  |
| experiments/reputation/v05/core.mjs | モデル/描画補助（詳細はソース参照） | 128 | 14015 | 1 | 直接importなし/他経路未集計 | experiments/reputation/v03/model.mjs |
| experiments/reputation/v05/model.mjs | 本編間接依存・評判/ゲスト | 63 | 7879 | 1 | 直接importなし/他経路未集計 | experiments/reputation/v05/core.mjs, experiments/reputation/v03/model.mjs |
| experiments/town-simulation/v01/model.mjs | 本編が依存する町反応モデル | 282 | 30920 | 4 | 直接importなし/他経路未集計 | works/ambertime-flavor-lab-v02/bridge.mjs, experiments/reputation/v03/model.mjs, experiments/reputation/v05/core.mjs, experiments/reputation/v05/model.mjs |
| experiments/world-map/v01/map.mjs | モデル/描画補助（詳細はソース参照） | 115 | 10675 | 5 | 直接importなし/他経路未集計 |  |
| flavor-color.mjs | モデル/描画補助（詳細はソース参照） | 24 | 1949 | 1 | distill-cut-range-browser.mjs, distill-cut-mark-browser.mjs, distill-pixel-browser.mjs, flavor-color.test.mjs |  |
| flavor-feedback-view.mjs | 表示/読み取りprojection | 74 | 5325 | 5 | status-reactions-feedback.test.mjs, flavor-feedback-0253.test.mjs, aging-copy.test.mjs, rooms-stage3.test.mjs (+4) | player-news.mjs, tasting-view.mjs, ui-text.mjs |
| flavor-types.mjs | モデル/描画補助（詳細はソース参照） | 24 | 1807 | 2 | flavor-types.test.mjs |  |
| flavor-view.mjs | 表示/読み取りprojection | 26 | 2447 | 5 | tasting-flavor.test.mjs, cask-detail.test.mjs | lab-flavor.mjs, model.mjs, tasting-view.mjs |
| font-loader.mjs | モデル/描画補助（詳細はソース参照） | 54 | 2599 | 2 | 直接importなし/他経路未集計 |  |
| font-uniform.mjs | モデル/描画補助（詳細はソース参照） | 19 | 963 | 2 | font-uniform.test.mjs | text-metrics.mjs |
| generations.mjs | モデル/描画補助（詳細はソース参照） | 47 | 3387 | 5 | partial-bottling.test.mjs | recipe-book.mjs |
| lab-flavor.mjs | 本編風味接続 | 44 | 3733 | 1 | stage4-flavor.test.mjs, flavor-color.test.mjs | works/ambertime-flavor-lab-v02/model.mjs |
| ledger-view.mjs | 表示/読み取りprojection | 72 | 5453 | 1 | ledger-view.test.mjs, stage4-integration.test.mjs, cask-ledger.test.mjs |  |
| map-daily-view.mjs | 表示/読み取りprojection | 51 | 2894 | 2 | map-initial-display-browser.mjs, map-daily-view.test.mjs, map-stable-browser.mjs | shop-model.mjs, map-sales-view.mjs, world-map-view.mjs |
| map-sales-view.mjs | 表示/読み取りprojection | 64 | 5495 | 2 | map-department-audit.test.mjs, map-sales-regression.test.mjs, map-sales-view.test.mjs, map-stage2-view.test.mjs (+1) | shop-model.mjs, placement-mode.mjs, shop-remarks.mjs, world-map-view.mjs, player-news.mjs |
| market-sales.mjs | 現行販路sales rules | 63 | 6192 | 1 | market-rules-model.test.mjs |  |
| market-ui.mjs | 販売室DOM操作・一時選択・通知 | 262 | 26373 | 17 | retail-sale-events.test.mjs, market-ui-main.test.mjs, market-rules-ui.test.mjs | pixel-symbols.mjs, retail-sale-motion.mjs, model.mjs, flavor-types.mjs |
| message-view.mjs | 表示/読み取りprojection | 32 | 1894 | 2 | visual-14.test.mjs, message-view.test.mjs |  |
| model.mjs | 初期正式原酒・熟成・瓶詰めmodel | 148 | 15073 | 5 | cask-serials.test.mjs, flavor-types.test.mjs, ui-details.test.mjs, shop-order-view.test.mjs (+18) | parameters.mjs, lab-flavor.mjs |
| monthly.mjs | モデル/描画補助（詳細はソース参照） | 74 | 5142 | 5 | monthly.test.mjs, monthly-browser.mjs | model.mjs, character.mjs |
| nearby-comparison.mjs | モデル/描画補助（詳細はソース参照） | 37 | 4793 | 20 | nearby-simulate.mjs, tasting-flavor.test.mjs, nearby-comparison.test.mjs | partner-orders.mjs |
| parallel-parameters.mjs | 構成値/契約 | 2 | 352 | 2 | 直接importなし/他経路未集計 |  |
| parameters.mjs | 構成値/契約 | 13 | 850 | 1 | opening.test.mjs, simulation.test.mjs, model.test.mjs, journey.test.mjs |  |
| partial-bottling.mjs | 構成値/契約 | 5 | 466 | 2 | 直接importなし/他経路未集計 |  |
| partner-orders.mjs | 正式操作・再生検証・担当者・販路 | 1386 | 140287 | 39 | brands.test.mjs, aroma-model.test.mjs, status-reactions-feedback.test.mjs, map-department-audit.test.mjs (+135) | market-sales.mjs, lab-flavor.mjs, town-connection.mjs, brand-identity.mjs, brand-identity.mjs, placement-mode.mjs, placement-mode.mjs, store-market.mjs, store-market.mjs, shop-demand.mjs, partial-bottling.mjs, partial-bottling.mjs, distiller.mjs, distiller.mjs, recipe-book.mjs, recipe-book.mjs, generations.mjs, generations.mjs, bottle-storage.mjs, bottle-storage.mjs, trade.mjs, economy.mjs, model.mjs, character.mjs, economy-parameters.mjs, wholesale-parameters.mjs, partner-parameters.mjs, aroma-extraction.mjs, shop-model.mjs, shop-model.mjs, department-projects.mjs, department-projects.mjs, brand-reputation.mjs, partner-parameters.mjs, economy.mjs |
| partner-parameters.mjs | 構成値/契約 | 15 | 1113 | 1 | 直接importなし/他経路未集計 | trade-parameters.mjs |
| pixel-symbols.mjs | モデル/描画補助（詳細はソース参照） | 13 | 2481 | 11 | map-daily-ui.test.mjs, pixel-symbols.test.mjs, rooms-stage2.test.mjs, hud-controls.test.mjs |  |
| placement-draft.mjs | モデル/描画補助（詳細はソース参照） | 10 | 1512 | 1 | placement-draft.test.mjs |  |
| placement-mode.mjs | 構成値/契約 | 13 | 972 | 2 | 直接importなし/他経路未集計 |  |
| placement-save.mjs | 正式session/旧keyコピー/条件付き書込 | 64 | 4851 | 2 | formal-save.test.mjs, market-rules-browser.test.mjs, rooms-stage1.test.mjs, placement-save.test.mjs (+1) |  |
| placement-ui.mjs | モデル/描画補助（詳細はソース参照） | 45 | 7881 | 6 | placement-0271.test.mjs | model.mjs, placement-draft.mjs |
| player-news.mjs | モデル/描画補助（詳細はソース参照） | 151 | 9196 | 2 | flavor-feedback-0253.test.mjs, flavor-feedback-0253-fixtures.mjs, flavor-feedback-0254.test.mjs, flavor-feedback-0254-comparison.mjs (+1) | town-connection.mjs |
| recipe-book.mjs | 構成値/契約 | 8 | 566 | 4 | 直接importなし/他経路未集計 | distiller.mjs |
| retail-sale-motion.mjs | 数量変化演出 | 64 | 3756 | 3 | count-linked-flight.test.mjs, retail-sale-motion.test.mjs, all-shop-flight.test.mjs |  |
| room-motion.mjs | 入室・到着演出timer | 31 | 2143 | 2 | room-motion.test.mjs |  |
| room-object-art.mjs | モデル/描画補助（詳細はソース参照） | 49 | 4196 | 11 | visual-polish-art.test.mjs, room-object-art.test.mjs, distill-tools-view.test.mjs, first-brand-art.test.mjs | codea-object-art.mjs, brand-identity.mjs |
| runtime-clock.mjs | wall-clock遅延計算 | 14 | 691 | 1 | runtime-clock.test.mjs |  |
| scene-input.mjs | scene pointer制御 | 27 | 2247 | 1 | scene-input.test.mjs |  |
| shop-app.mjs | 本編統合・UI・保存・時計・モーダル | 1308 | 182628 | 145 | 直接importなし/他経路未集計 | staff-status-view.mjs, distill-learning.mjs, distill-tool-input.mjs, distill-tools-view.mjs, flavor-color.mjs, message-view.mjs, placement-save.mjs, market-ui.mjs, placement-ui.mjs, pixel-symbols.mjs, flavor-feedback-view.mjs, shop-order-view.mjs, runtime-clock.mjs, cask-detail-view.mjs, start-countdown.mjs, world-map-view.mjs, map-sales-view.mjs, map-daily-view.mjs, brewing-cards.mjs, player-news.mjs, lab-flavor.mjs, shop-ledger.mjs, ledger-view.mjs, brand-identity.mjs, ui-details.mjs, shop-remarks.mjs, event-notices.mjs, canvas-scene.mjs, partner-orders.mjs, shop-model.mjs, work-context.mjs, cask-serials.mjs, spirit-view.mjs, brand-reputation.mjs, economy-parameters.mjs, model.mjs, cask-glass-art.mjs, room-object-art.mjs, tasting-view.mjs, flavor-types.mjs, flavor-view.mjs, nearby-comparison.mjs, ui-text.mjs |
| shop-demand.mjs | モデル/描画補助（詳細はソース参照） | 41 | 4697 | 3 | shop-order-view.test.mjs, market-rules-model.test.mjs, shop-demand.test.mjs | shop-model.mjs, economy.mjs, economy-parameters.mjs |
| shop-ledger.mjs | 表示/読み取りprojection | 25 | 2744 | 2 | shop-order-view.test.mjs, store-market-main.test.mjs, shop-ledger.test.mjs, placement-mode.test.mjs | shop-model.mjs |
| shop-model.mjs | 構成値/契約 | 38 | 3409 | 9 | shop-order-view.test.mjs, bottle-simulate.mjs, market-rules-model.test.mjs, cross-simulate.mjs (+6) | bottle-storage.mjs, department-projects.mjs |
| shop-order-view.mjs | 表示/読み取りprojection | 43 | 3197 | 2 | shop-order-view.test.mjs, formal-copy.test.mjs |  |
| shop-remarks.mjs | 表示/読み取りprojection | 44 | 3536 | 1 | shop-remarks.test.mjs, map-stage2-view.test.mjs |  |
| spirit-view.mjs | 表示/読み取りprojection | 58 | 3979 | 6 | aroma-model.test.mjs, distill-display.test.mjs, aroma-compatibility.test.mjs, adjust-b-view.test.mjs (+6) | lab-flavor.mjs, model.mjs, aroma-extraction.mjs, economy-parameters.mjs |
| staff-status-view.mjs | 表示/読み取りprojection | 10 | 955 | 1 | status-reactions-staff.test.mjs |  |
| start-countdown.mjs | 表示countdown | 25 | 1194 | 2 | start-countdown.test.mjs |  |
| store-market.mjs | 店在庫/見積/販売計画 | 64 | 6818 | 2 | market-rules-model.test.mjs, store-market-main.test.mjs | market-sales.mjs, placement-mode.mjs, shop-model.mjs, shop-demand.mjs, town-connection.mjs |
| tasting-view.mjs | 表示/読み取りprojection | 18 | 1650 | 2 | status-reactions-feedback.test.mjs, tasting-flavor.test.mjs, tasting-view.test.mjs | character.mjs |
| text-metrics.mjs | モデル/描画補助（詳細はソース参照） | 15 | 1781 | 2 | font-uniform.test.mjs, distill-display.test.mjs |  |
| town-connection.mjs | 正式瓶・実販売→町反応adapter | 34 | 2864 | 2 | stage4-integration.test.mjs, stage4-town.test.mjs, flavor-feedback-0254-comparison.mjs | experiments/town-simulation/v01/model.mjs |
| trade-parameters.mjs | 構成値/契約 | 5 | 374 | 1 | 直接importなし/他経路未集計 |  |
| trade.mjs | 旧v0.9正式卸売model/reader | 130 | 18262 | 4 | partners-replay.test.mjs, partners-ui.test.mjs, v09-ui.test.mjs, aroma-compatibility.test.mjs (+4) | wholesale.mjs, economy.mjs, model.mjs, character.mjs, economy-parameters.mjs, wholesale-parameters.mjs, trade-parameters.mjs, economy.mjs |
| ui-details.mjs | モデル/描画補助（詳細はソース参照） | 34 | 1857 | 2 | ui-details.test.mjs | economy-parameters.mjs, model.mjs |
| ui-text.mjs | モデル/描画補助（詳細はソース参照） | 64 | 5456 | 8 | status-reactions-feedback.test.mjs, aging-copy.test.mjs, rooms-stage3.test.mjs, rooms-stage3-browser.mjs (+2) | character.mjs |
| wholesale-parameters.mjs | 構成値/契約 | 6 | 529 | 1 | 直接importなし/他経路未集計 |  |
| wholesale-v08.mjs | 旧v0.8卸売model | 72 | 12009 | 4 | v09-ui.test.mjs, distill-learning.test.mjs, wholesale.test.mjs, wholesale-ui.test.mjs (+3) | economy.mjs, model.mjs, character.mjs, economy-parameters.mjs, wholesale-parameters.mjs, economy.mjs |
| wholesale.mjs | モデル/描画補助（詳細はソース参照） | 81 | 13398 | 5 | v09-ui.test.mjs, aroma-compatibility.test.mjs, partners-model.test.mjs, shop-compatibility.test.mjs (+3) | wholesale-v08.mjs, economy.mjs, model.mjs, character.mjs, economy-parameters.mjs, wholesale-parameters.mjs, economy.mjs |
| work-context.mjs | モデル/描画補助（詳細はソース参照） | 10 | 726 | 2 | cask-serials.test.mjs, cross-context.test.mjs |  |
| world-map-view.mjs | 既存町記録→地図projection | 84 | 5825 | 8 | map-department-audit.test.mjs, map-daily-ui.test.mjs, world-map-view.test.mjs, map-initial-display-browser.mjs (+8) | experiments/world-map/v01/map.mjs, town-connection.mjs |

Correction: initial 81-path metric traversed only top-level module edges. Recursive static traversal gives 86 paths, including experiment dependencies and the external flavor-lab bridge; use 86 in final inventory. Worker roots remain separate.
