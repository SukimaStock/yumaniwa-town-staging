# AmberTime R0 — 既存失敗の調査と修復

基準main: `8fab526aec22a83b73147225c99e88e48188586e`（PR #768）。#768以降の本編変更なし。事前Plan Lock `.change-plans/ambertime-refactor-r0-20261103/r0.lock.json` を最初のcommitに固定。本編・正式計算・保存形式・既存fixture・CIは変更しない。[前回基準](../structure-audit-2026-11-02/BASELINE-TESTS.md)を上書きせず本書で追補する。

## 再現と分類

指定11ファイルを最新mainで一括再実行: 69件、58成功・11失敗・skip0（12.504秒）。前回の失敗11件すべてを再現した。過去の全root結果1147件/1134成功/11失敗/2skipと、この11ファイル部分実行の件数は区別する。

A=旧期待値/表示・source固定、B=古いハーネス、C=正式互換の疑い。Cとして開始したwholesaleも合法な旧保存で独立確認し、正式モデル不具合と断定する証拠は得られなかった。

|対象|現在の失敗と原因|最初の原因候補・仕様根拠|判定・安全な修復|保存/互換性|
|---|---|---|---|---|
|bottling-policy|「ビン詰め8本」期待、実際は「ビン詰め完了8本」|`6403577d` / PR #645。uniform-messagesの完了/入金表示|A。完了文言、構造化event ID/count、入金80、発送/販売数量・未発送非表示を検証|正式event/数量/順序は維持。表記だけ追従|
|brewing-panel|過去の`daily=panel-countdown-r1`固定|`0af0ba60` / PR #756、現在のHTML/import graph|A。旧queryの復活を避け、入口・必要edge・版付きidentity・更新伝播を検証|計算/保存に変更なし|
|distill-cut-cache|過去entry/query固定、正当に更新した親を拒否|`0af0ba60` / PR #756で旧daily queryからroomsへ更新|A。旧bodyと同一URLで配らないこと、必要描画/gesture依存と入口までの更新を検証|正式source/旧20状態は別に保護|
|distill-cut-main-integration|削除済みDistillLearning importで全体停止|`fa11fd31` / PR #754。manualCompletedRunsによる正式手動履歴判定|B。実save/act/lever/finish/commitFill/syncModalのVM hostへ接続。旧20状態比較を維持し実行復旧|旧JSONのchecksum、全20raw/hash、warm/cold再生。preview/保存失敗時のmemoryとdurableを区別|
|distill-display|finish単独抽出が即時modal設定を要求|三室PR #756以降、停止→saved render→syncModalの統合結果/樽選択|B。実停止とsyncModal、統合結果、取消/再表示抑制、樽詰め保存を通す|未完原酒と樽代/選択/保存確定の順を維持|
|flavor-feedback-0254|Canvas/layout全体を`74d845cf`のsourceへ固定|初期の差分候補`da9c8b94`（font比較）、#645/#648以降も承認UI更新|A。キャッシュ100回1計算、旧正式状態と10個の不変model/clock等のpinは維持。Canvasは現行behavior/geometry/cache検証へ置換|旧placement before/afterのraw、計算不変を維持。UI全bytesを正式不変と混同しない|
|font-uniform|古いCanvas import文字列固定|`8ad110e8` / PR #668で正当なCanvas reader更新|A。CSS scope/全text root/geometry条件を維持し、入口から実readerへ届くgraph検証|フォントを正式セーブへ混入させない|
|retail-sale-cache|過去`count-linked-r1`等を固定|`0af0ba60` / PR #756の入口query整理|A。販売表示/通知依存、parent identities、cache更新漏れの拒否を検証|配置/実売/保存成功後演出の別契約は維持|
|shop-order-view|economyとCanvas/appの全sourceまたは大きなsliceを#616へ固定|`8ad110e8` / PR #668は将来のみのnative market rules採用。道具/三室で描画も更新|A。未変更9source/不変method pin、旧月次raw/1776監査行/価格・数量の意味を維持。変更経路はR0の実操作/実method結果比較で保護|旧未採用月次hashと現行market分岐、表示前後不変を別テストで保護|
|wholesale-care|合成downgrade境界でpending=nullを参照|`ad006c24` / PR #538。通常予約last/bottle-readyを観察へ。親`2b7daedd`で成功、該当commitで失敗を実測|C→A/B。合法v6 special/cool・funds・unmetの冷/温再生と、通常予約/未予約の合成dispatchを分離。下記参照|合法旧保存の実不具合は確認されず。受理条件/reader/モデルは変更なし|
|world-map-view|貯蔵庫選択にもidle点滅timer1を要求|`d72cf15f` / PR #756、貯蔵庫は静的選択、販売は必要時の演出|A。貯蔵庫静止/販売選択点滅/無選択/ダイアログ/reduced-motion/hiddenの実drawを検証|地図解放/履歴/表示時点/通知metadataの全既存ケースを維持|

原因「候補」は意味が変わった履歴の照合で、各失敗について全commit二分探索をしたという意味ではない。wholesaleは実際に前後snapshotで初発を確認した。cacheの詳しいedge/履歴は[基準](REFACTOR-BASELINE.md)とhelperを参照。

## 蒸留統合の復旧

- `design/cut-main/model-baseline.json`は変更なし、SHA256 `9bdd784a50879b74e4a25c7c54b565122d0be22419075104c5f5046789120261`。4操作列×採取前/開始/終了/樽詰め/瓶詰めの20状態を元のraw/hashと完全比較する。
- 旧formalSources146件はUI/App/テストも含んでいた。正式モデルの依存38件を明示し、37件は旧hash、partner-ordersのみ採用済み`3323b4eb`を含む開始mainのhashを保護。UIをcurrent bytesへ固定し直す方法は採らない。
- 初回/手動1〜3回/習熟後/再読込/別新規ゲーム/実世代交代、自動予約・取消・完了の除外を確認。countdown開始や採取開始では完了回数は増えず、正式stopで増える。
- previewもmemoryの正式履歴では手動stopを数える。廃止された独立storage counterがpreviewで進まないという旧仕様は復活させない。previewのstorageアクセス0を検証する。
- generic actの保存失敗時はmemoryが進み、durable journalは進まず、canSave=falseで止まる既存挙動。candidate樽詰めは保存成功前にgame/room/modalを公開しない。容量拒否・競合を両方式で区別する。

## wholesaleの合法旧保存と合成境界

元テストはすでにv7のfourCasksをversion/rulesだけv6へ戻し、帳面にないpendingを注入していた。この状態は厳密serializeで拒否されるため、合法な旧セーブの証拠にできない。

修復では実在するv6 `partners-assigned/accepted/unmet` と `v08-legal-funds` を読み、origin+operationsからwarm/coldで完全再構築した。v7への明示enable-promised-careも再生する。assignedから公開月次操作で月133の特別注文wood/coolへ到達し、pending/decisions/chemistry/promisesの保持と境界opcode1件だけの追加を確認した。

通常予約のlast/bottle-readyが観察になる合成dispatchと、資金停止/未予約最終判断の保持は別の境界テストで残す。注入後のstateが保存として拒否されることも明示している。テスト15/15成功。モデル修正の別PRを要する合法な再現例は今回得られなかった。

## 保存基準の追加

新しい固定seed操作traceは129途中状態（手動41・担当者79・market9）。serialize全体SHA、操作履歴SHA、RNG、月/資金/在庫/売上、通知列を固定し、実raw文字列はwarmと別process coldで完全一致させる。既存fixtureや20状態JSONの再生成は行わない。詳細と実行方法は[REFACTOR-BASELINE](REFACTOR-BASELINE.md)。

## 修復結果・残る制限

最終の全域集計は下の結果欄に記録する。物理iPhone Safari/VoiceOver、実OSの背景復帰は機械検査の成功と区別する。旧期待値の修復のためにruntimeを変えたりskipを追加したりしていない。

## 最終結果

|範囲|修復前|修復後|
|---|---|---|
|前回監査の全root基準|1147件/1134成功/11失敗/2skip|1173件/1173成功/0失敗/0skip|
|指定11ファイル|69件/58成功/11失敗/0skip|全root成功に含む。元の11失敗は全件解消|
|旧蒸留20状態|import不能で未到達|元20raw/hash一致＋20個別process cold一致|
|追加正式途中状態|未固定|129状態のbyte/RNG/月次/経済/通知＋warm/batched新process一致|
|既存販売browser|前回は2skip|2/2成功（全rootにも含む）|
|追加browser基準|なし|35項目成功・errors0、22画像|

最終全域は156 test files、231.463秒、Node v24.22.1。26件の集計増加はimport不能な蒸留file内の復旧、wholesale分割、追加R0ケースによる。skipを増減して成功率を調整していない。元の2 opt-in browserが実行可能な既存Chromiumで実行されたためskip0になった。詳細集計は[test-results.json](test-results.json)。

原因分類はA8件、B2件、Cから調査して旧ハーネス/期待値へ確定した1件。11既存ファイルを修復し、正式モデル不具合として保留する失敗は0件。合法旧保存の不具合を否定し尽くしたという意味ではない。未確認は物理iPhone/VoiceOver・実OS背景遷移・全歴代cache移行。

独立レビューでcacheのtemplate内loader見逃しを修正し、20旧保存は同processだけでなく各row新process再生を追加、正式notice優先順の境界比較を補強した。レビュー担当の独立実行25/25と12/12も成功。重大な未解決指摘なし。

変更: 上表の既存11テスト、`r0-cache-graph.mjs`/同test、`r0-distill-host.mjs`、`r0-formal-trace.mjs`/`r0-formal-baseline.test.mjs`、`r0-app-baseline.test.mjs`、`r0-notice-priority.test.mjs`、`r0-browser-baseline.mjs`、新`fixtures/r0-formal-traces.json`、本書/REFACTOR-BASELINEと検証証拠。事前Lockを含む範囲だけを登録する。

本編/Lab実体/既存保存fixtureの537パスを開始mainのGit blobと比較し変更ゼロ。runtime直下156ファイルも同一。[source-invariance.json](source-invariance.json)。旧監査資料、旧20状態JSON、正式計算・保存形式・操作仕様・CI・Productionは変更なし。

R1の表示専用projection抽出へ進める。今回の比較基準を利用し、一部分だけを抽出して操作/通知/保存順を保護する。正式モデル変更・保存policy統一・Lab整理へ自動的には進まない。
