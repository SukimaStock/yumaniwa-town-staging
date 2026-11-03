# AmberTime R0 — リファクタリング受入基準

基準 `8fab526aec22a83b73147225c99e88e48188586e`。既存[BASELINE-TESTS](../structure-audit-2026-11-02/BASELINE-TESTS.md)の正式保存key・旧reader・oracle・基本契約を継承する。既存失敗の修復理由は[TEST-FAILURE-REVIEW](TEST-FAILURE-REVIEW.md)。本書はR0で追加した比較方法と実行範囲の追補であり、新runner/製品依存/CIは導入しない。

## 固定された正式操作列

`tests/r0-formal-trace.mjs`が既存公開APIから合法な操作を実行し、`tests/fixtures/r0-formal-traces.json`の固定期待値と比較する。新fixtureは本編未変更の開始mainから一度作成したもの。既存fixture・旧20状態JSONは再生成しない。

|操作列|途中状態数|検証内容|
|---|---:|---|
|manual-cut-seed42|41|カード選択・range開始・各step・採取開始/停止・樽詰め・瓶詰め。途中の味/量/RNGも含むserialize全体|
|staff-monthly-seed42|79|既存製法から担当者予約・各自動step・完了・月次。給与/予約/出荷/通知・記録順|
|market-adoption-monthly|9|既存の合法保存を正式採用・配分/店への割当・各月実売・在庫/資金/通知|
|合計|129|各行のserialize SHA256、operation配列SHA256、RNG、月、資金/stock/sold、担当者状態、構造化automaticEvents順|

`r0-formal-baseline.test.mjs`は129件の実serialize文字列を同process warm restoreと別Node processで照合する。cold側は1つの新processに129保存を渡すbatched replayであり、2件目以降の検証器内checkpoint共有まで排除した129個別processではない。必要な高リスク改修では既存の個別cold-saveテストと併用する。期待値のhashだけで原文比較を代用せず、再生結果のraw文字列も完全一致を要求する。

新fixture SHA256は `31605ce9633059b617d9e15a47cd3a5d6fed1401fe04a324ea3567e7f8d7ca79`。R1で表示だけを抽出する際に再生成しない。正式操作が変わる仕様採用PRの場合だけ、その根拠と旧保存保持を別途説明して扱う。

## 旧20状態と旧保存

蒸留統合は既存20raw/hashをそのまま実行。全20の同process厳密restoreに加え、20個の個別新processで各rawを再生するテストを追加した。129traceのbatched新process比較と区別し、正式保存/旧reader系の個別cold testsとも併用する。

正式モデルの静的依存38件は明示的にhash保護。UI7ファイルの古いsource pinは、実handler/geometry/DOM/copy/cache等の意味上のテストへ置換した。ソースの字面が変わっても同じ動作を比較できるよう、Canvas/appはimmutable開始mainの実methodとcandidateを制御された同一hostで走らせ、呼出trace・状態・保存結果を比較する。

wholesaleのv6→v7は合法なspecial/cool、funds、unmetを既存保存と公開操作から再現。origin/帳面・原文・pending・化学状態と、cold/warm復元、明示境界opcodeを保護する。合成dispatch境界は保存可能なfixtureとは扱わず、厳密serializeが拒否することもテストする。

既存のaroma560採取oracle、market-rules旧未採用月次hash、Lab sales source一致はそのまま維持する。旧Labをアーカイブしてもこのoracleと実行依存は外さない。

## 保存と時計の比較

`r0-app-baseline.test.mjs`は実sourceからsave/act/actMarket/scheduleとCanvas methodを取り出し、基準mainと候補の観測結果を比較する。DOM/storage/model/timer portsは制御されたadapterであり、全ゲームの合法保存やbrowserの代替とは区別する。

|条件|generic act|candidate actMarket/樽詰め|
|---|---|---|
|成功|memory更新、保存、通知、再描画/再開|candidateを条件付き保存後に公開・通知|
|quota/拒否書込/他タブ競合|memoryは更新済み、durable不変または他タブ内容維持、canSave=false。return trueの場合がある|candidateを公開しない。旧memoryを維持しfalse/停止|
|月次保存失敗|現行の非store経路は同一rollbackをしない|store-market月次だけbeforeMonth/elapsedへ戻す既存条件|
|preview|正式memory操作は実行、storageアクセスなし|storageを触らずcandidate確定。実保存の成功とは呼ばない|

この差をR0で統一しない。最終通知は保存後であること、失敗では成功通知を出さないこと、elapsed・month・通知順・quota/conflict/readbackを比較する。実writeCandidateと既存formal-save/placement-save/market-rules-uiも併用する。

月次は現行monthlyTimingの経済→在庫→記録→納品→発送→月次集計→自動瓶詰め→通知の順を維持。旧delegationの瓶詰め→発送という別順序も維持する。乱数消費順、operation挿入順、JSON property順を変えない。表示用読み取りの回数によって正式操作が増えないことを確認する。

`r0-notice-priority.test.mjs`は実render/syncModal選択前半と実通知関数を使い、試飲→decision→担当者→取引→店→世代→樽選択→地図の8境界を固定mainと比較する。notice要求→保存→公開、失敗rollbackとhidden/保存不可を確認する。正式モデル/保存portは合成境界用adapterであり、合法保存の再生証明ではない。129合法traceと個別cold再生を補完する。

## キャッシュ依存関係

`r0-cache-graph.mjs`は開始mainの106資産（HTML/CSS/JS/worker等）のpath・bytes hash・reachable URL identityをimmutable anchorとして持つ。実行時のGit履歴参照は不要。HTML module/style、JS import/re-export/literal dynamic import、Workerのnew URL、CSS @import等、現行buildless構文を走査する。

変更されたbodyが旧URLのまま到達可能なら失敗。子moduleの更新を読む親と、その親を読む入口まで古いcacheが残らないよう伝播を確認する。必須edgeの存在、版付きidentity、共有子の分裂も検査する。missing target、unversioned module、更新漏れ、依存欠落、template内loader等にはnegative fixtureがある。字句readerは汎用JavaScript parserではなく、未知loader構文はreviewが必要。template中のloaderを黙って省略せず拒否する。

これは8fab→候補の検査。今後の全配信間のcache安全性を自動で証明する仕組みではない。R1/R2の各PRでもその直前配信の親子identity、worker/CSS/画像を照合し、実browserのwarm旧cache更新試験を必要に応じて行う。graphが存在するだけで旧browserが最新bodyを読んだとは扱わない。

初発履歴の照合: font系はPR #668 `8ad110e8`の正当なCanvas query更新、他3cache系はPR #756 `0af0ba60`でdaily/sales/fieldsからroomsへ入口整理した後も旧queryを要求していた。

## 三層の実行範囲

以下は既存node:testを直接実行する。新runnerを追加しない。環境変数のパスは実在する実行環境に合わせる。保存/正式境界へ触れるPRほど広く確認し、表示だけのPRで無関係な全旧Lab画面試験を常時要求しない。

### 最小回帰

表示専用でも保存に影響していないことを確認する。従来60件にR0のapp/formal比較を加え、変更したview固有のテストを実行する。

```sh
node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/placement-save.test.mjs works/ambertime/tests/runtime-clock.test.mjs works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs works/ambertime/tests/r0-formal-baseline.test.mjs works/ambertime/tests/r0-app-baseline.test.mjs works/ambertime/tests/r0-notice-priority.test.mjs
```

### 機能別回帰

|変更対象|追加する既存資産|
|---|---|
|蒸留・道具|distill-cut-main-integration、distill-display、distill-learning、distill-tool-input、distill-tools-view、canvas-layout、rooms-stage1/2/3|
|貯蔵庫・熟成表示|cask-detail、tasting-view/tasting-flavor、aging-copy、flavor-feedback0253/0254、status-reactions-feedback、world-map-view|
|販売/店情報|market-ui-main、market-rules-model/ui、store-market-main、shop-order-view、retail-sale-events/cache、market compact/rules browser|
|担当者/瓶詰め/世代|staff系、bottling-policy/roles、generation系、monthly-timing-integration、wholesale-care|
|モーダル・表示更新|rooms/staff/比較/ledger/history、r0-app比較、実browserの取消・focus・hidden/reduced-motion|
|module/CSS/worker読込|4cache系、r0-cache-graph、対象機能、旧cache browser更新|

表は概念名も含む索引。正確なファイル名は`tests/`で確認して選び、存在しないコマンドを実行済みにしない。

### 広域回帰

```sh
node --test works/ambertime/tests/*.test.mjs
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium node --test works/ambertime/tests/market-compact-browser.test.mjs works/ambertime/tests/market-rules-browser.test.mjs
```

全root suiteはexperiments48 test filesや独立work Labを自動的には含まない。本編が依存する正式oracle・Labモデルを変える場合は該当参照元を追加する。今回モデルは変えず、既存560採取とmarket-rules等はroot suiteに含まれる。

## ブラウザー比較条件

固定seed42、同一の合法serialize、同じorigin、viewport/DPR/フォント読込状態を揃える。360×568、375×620、390×680、販売430×740を優先。画素比較ではanimation時刻と演出phaseも固定し、後付けのpixel許容差を広げない。今回のbaseline runnerはスクリーンショット・hit/DOM/操作結果の証拠を作るが、全画面のgolden pixel自動一致検査ではない。

`tests/r0-browser-baseline.mjs`は三室・レバー/グラス・統合樽選択・樽詰め・瓶詰めdraft/取消・担当者・店情報・地図・focus/keyboard/reduced-motion・cache再読込の基準を記録する。結果と未確認は`browser/`の実結果を優先する。物理iPhone Safari/VoiceOverや実OSのbackground動作をLinuxブラウザーから完了扱いしない。

## 各PRの共通受入条件

- 同じ正式操作列の各途中serialize文字列・操作履歴・RNG・月/経済/在庫/担当者処理・通知順が一致する。
- 合法旧保存の受理/拒否と移行、origin/帳面、原文・strict replayを維持する。UIに合わせた補正や旧fixture再生成をしない。
- generic/candidate/月次それぞれの保存失敗policy・回復条件・通知タイミングを保つ。
- 操作回数、tap/hit、gesture、取消/戻る/focus、a11y、reduced-motion/hidden、cache更新を該当範囲で比較する。
- テスト修復でskip追加、許容差拡大、重要ケース削除をしない。正式仕様が変わるなら別の仕様変更として扱う。
- 事前Plan Lock、独立レビュー、Scope→Risk→Impact、exact-head必須CI、通常merge/同SHA Pages確認を行う。Production変更なし。

## R0で観測したブラウザー結果

既存`market-compact-browser`/`market-rules-browser`は2/2成功。追加runnerは35項目成功・errors0、22画像。三室・レバーkeyboard/60px pointer pull・glass採取・統合結果/樽選択・実樽詰め保存一致・瓶詰め1→5→1のdraft/取消・担当者draft Escape・店情報/地図の読取不変・focus復帰を確認した。360/375/390の3幅と販売430、reduced-motion条件を記録。

制御したdocument.hidden/visibilitychangeでは7,000仮想ms経過しても正式状態が不変でclockPending=false、再表示時点でも不変。これは実OSのtab背景遷移の確認ではない。同一originで旧`063670d7`を一時間cacheとして読んだ後、currentへ切替して再読込した。旧107 resourceと更新後の102 cache hit、新しいaging=1付きshop-app/ui-text取得、正式snapshot一致を確認した。全ての過去配信からのcache移行を証明するものではない。

環境: `/tmp/count-browser/chrome-linux/chrome`はprocess-singletonのsocket制限で起動不能だったが、既存`/tmp/chromium`は起動した。Playwrightの既存runtimeを使用し、インストール・製品依存/CI変更はなし。実行例:

```sh
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium node works/ambertime/tests/r0-browser-baseline.mjs
```

runnerは意図的な証拠更新scriptで、通常root test globには含まれない。実行すると`browser/`の結果/画像を更新するので、将来PRはbaselineを無断再生成せず比較元を保全する。[結果](browser/results.json)、[画像hash](browser/screenshots.json)、[既存2テスト結果](browser/existing-market-tests.json)を参照。

## R0完了時の観測値

全156 test filesをbrowser環境変数付きで実行し1173/1173成功、失敗/skip0、231.463秒。追加browser35項目成功。正式runtime/旧fixture537パス不変。[集計](test-results.json)と[原典不変](source-invariance.json)を参照。基準はこのR0の開始mainと候補treeに対する観測であり、将来のmainへ確認なしで流用しない。
