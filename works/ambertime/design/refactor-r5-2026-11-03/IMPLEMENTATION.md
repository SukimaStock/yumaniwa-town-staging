# AmberTime R5 — 履歴マークアップの純粋化

基準main `a94ceadafd5920c0a447f7b392e7db983c910575`（R4 / PR #773）。開始時のfetchでR4後のmain追加変更なし。root/AmberTime AGENTS、Change OS、PR #768〜#773と構造監査・REFACTOR-PLAN・R0基準・R1〜R4記録、実際のledger/modal/worker/focus経路を照合。過去資料・fixtureは変更しない。

Standard / WORK / staging-only。事前Lock `.change-plans/ambertime-refactor-r5-20261103/r0.lock.json` は最初のcommit `a690baf54d583276f6b958d8a9e42ce33c52c41e` に単独登録。今回の作者指示は実装・検証・独立レビュー・必須CI・通常Stagingマージと公開確認まで。R6/Productionは対象外。

## 実経路に基づく分類

modal名全体を一分類へ押し込まない。同じ帳面内に読取表示と正式操作へのボタンが混在している。

|区分|基準rootの実経路|所有者・今回の扱い|
|---|---|---|
|A 読取表示|ledgerProfile、caskTimeline、recordText、recordTimeline。発売/店舗/世代/歩み本文、既存ledger projection|履歴・profileのHTML生成familyだけ抽出。既存projectionは再分割しない|
|B 一時選択|openCaskComparison/openReleaseComparison/closeComparison、rememberLedger/restoreLedger、openLedgerDetail、parent/otherId/listPage/scroll/openDetails/focus|すべてroot。帳面の参照樽とR4選択IDを混同しない|
|C 正式操作|recipe-select/save/request、ledger-cask-taste、試飲/瓶詰め/担当者/取扱店/世代handlers|すべてroot。表示ボタンを生成することと実行することを区別|
|D 正式通知・割込|render→syncModal、showStaffOpportunity/showShopOffer/showGenerationとnotice/save、decision/fill/map|既存優先・guard・save前後の順序ごとrootに保持|

## 候補比較と選択理由

- ledgerView全体：caskDataによるworker生成/取消や非同期再描画があり、純粋表示の境界として大きい。採用しない。
- ledgerRecipeDetail/ledgerCaskDetail：製法保存・依頼・試飲・比較への条件付き導線、gameとmodal参照を含む。root orchestrationを維持する。
- 既存ledger-view/shop-ledger/cask-ledger：既に読取projectionとして独立済み。重ねたmoduleは不要。
- **履歴マークアップfamily**：caskTimeline/recordTimeline/recordText/ledgerProfile/knownProfileはgame/modal/worker/時計/保存を参照せず、既存入力からHTMLを作る。既存formatterを同じversion/queryで直接importでき、新しい状態・callback・template engineが不要。採用。

rootから履歴の重複除去・年代順整列・過去試飲との差・原文escape・風味markupの責務を取り出した。関数本文・欠損分岐はそのまま。行数削減や全modalの汎用化は目的にしない。

## 所有者と入力・出力

|処理|変更前|変更後|
|---|---|---|
|caskTimeline(c)|root|ledger-history-view。samples/history/observations/choices/volumeHistoryを読んでHTML文字列|
|recordTimeline(samples,observations,choices,withChanges)|root|同module。発売記録の既存年代グループ・文・差分表示を維持|
|recordText(text)|root|同module exported。既存escape式・空文字判定を維持|
|ledgerProfile(profile,previous)|root|同module exported。既存uiText/flavorMeter/flavorTypeViewと同じversion/query|
|knownProfile|root|同module private。FLAVOR_AXESの既存finite判定|
|worker/projection取得・modal・DOM適用・操作・focus/scroll|root/既存view|そのまま。追加状態なし|

新moduleは4exports、DOM/event/localStorage/正式操作/save/通知/clock/modal開閉/focus/乱数を持たない。rootの汎用esc/knownは他表示にも使われるため移さず、同じ純粋primitive式をmodule内で再利用する。広い共通formatter改修を混ぜない。

## 正式操作とworker境界

syncModal全体・render・save・generic act・candidate transaction・handlersはbyte不変。試飲→decision→staff→trade→shop→generation→fill→mapの優先、通知確定/save、quota/競合/readback、hidden/pagehide、時計、旧restoreを変更しない。元から正式操作がある入口を削除しない。

caskDataはsnapshot identity/cache、request ID、worker生成/terminate、stale応答破棄、error、redrawとfocus復帰を所有する。worker入口は `{requestId,state}`、出力は `{requestId,ledger}` またはerror。cask-ledger-workerは既存nearbyComparisonFacts/buildCaskLedger/正式replayを使う。history-worker/comparison-workerにも独立した既存経路がある。worker本体・通信形式・replay・依存は一切変更しない。

帳面内の樽参照・parent/otherIdはR4controller選択とは別。表示生成後のDOM書込は従来のsyncModal。Escape/戻る、詳細open、openDetails、scroll、focus、ARIAは同じroot経路に残す。

## sourceとキャッシュ

変更は新ledger-history-view.mjs、rootのimportと定義除去、indexのapp query `history=r5-1`、R4 whole-source proofのreinlining adapter、新R5 tests/資料のみ。app→新moduleは `?v=refactor-r5-1`。新moduleの5既存依存はrootと完全に同じURL identityを使う。既存帳面view、worker、CSS/画像/Canvas、R3/R4controllerを一括無効化しない。

`tests/r5-history-source.mjs` は現在の新moduleに実在する関数を元の位置へ戻すadapter。R4の旧baseline/期待値は変更せず、その上でR5の新テストが移動関数・formatter式のimmutable原文一致とroot全体のinverse一致を検査する。R4保護のための無条件skipや期待値更新はない。

## 検証・既存成果の継承

開始mainの製品・既存testはR4最終headと同じtree。R4のroot161ファイル・1,201pass/0fail/0skipログを基準として継承し、同じ基準全域を再実行しない。候補の全域でR0の129途中状態・蒸留20状態・旧保存cold replay・RNG・月次・経済/在庫/費用・通知順・R1〜R4・保存失敗を同じfixture/期待値で確認する。

新4テストはimmutable R4 rootで実行した元関数をoracleにし、関数本体/formatter/完全inverse、正式APIからempty/one/multi/tasted/previous/partial/full/60か月/legacy状態、freeze入力・同一入力反復、長文/特殊文字/欠損profile/未知age/重複historyとvolume/withChanges双方を比較。正式モデルは再実装しない。

初回の新unit harnessは旧cask projectionのnull配列をrelease用recordTimelineへ直接渡しTypeErrorとなった。既存本体も同じ例外であり、製品のnull許容を変えず、両実装のHTMLまたは例外name/messageの一致を比較するようharnessだけ修正。初回ログはdiagnostics/initial-unit.log、修正後4passはunit-tests.log。正式保存への改変はない。

候補全域・ブラウザー・独立レビュー・最終CIと公開の結果は実測後に追記。未実行を成功としない。

## 保留と次段階

ledger取得cache/worker、rootのmodal familyのnavigation/draft/focus、正式save/notice/clockは保留。既存方式で動いている読取projectionも変更しない。R6は構造監査のCanvas lifecycle/cache候補を次の独立調査として扱えるが、今回実装しない。

実機Safari/VoiceOver音声・実OS背景・非zero safe-area・実BFCacheは実測がない限り未確認。公開Chromiumの既知の証明書問題をTLS緩和で回避しない。

## 完了したブラウザー・独立レビュー

Chromium140.0.7339.186/WebKit26.5の360×568DPR1・375×620DPR2・390×680DPR3・390×680DPR3 reduced-motion、8条件×24状態。384取得/192前後比較すべてdecoded pixel差0、PNG原文hash一致、Canvas内部RGBA・DOM・hit・focus・ARIA・scroll・正式snapshot/保存raw一致。帳面→archive/live樽→履歴/元仕込み/profile/発売/試飲記録/前回→戻る、keyboard/Escape、scroll、別樽参照で選択ID不変、reloadを実操作。2engineとも旧1hcacheからappと新表示moduleの新body取得成功。各workerの要求/応答payload・件数・順序hashも一致。独立worker間の非同期到着順は固定しない。

[browser/README.md](browser/README.md)と[results](browser/results.json)に固定。runnerは起動時hashを凍結し両engine同一、途中変更なし。CSSは既存animation500ms、Canvasは同じphaseで比較。CSS解像度のPNGとDPR内部Canvasを別に検査。実機読み上げはARIA一致で代用しない。

別agentのコード・unit・runner独立レビューは修正要求なし。[INDEPENDENT-REVIEW.md](INDEPENDENT-REVIEW.md)。親はcombined8構成のcapture/hash/countと製品hashを照合する。ブラウザー実行時のHEADはLock commitだが製品は未commit作業treeであり、provenanceのafterSHA256が実際の検証対象。最終commitでこのsource closure一致を検証し、同じ条件の完成済み操作を再実行しない。

## 全域集計と最終source照合

候補root162ファイルの単一glob実行は1,205/1,205成功、fail/skip/cancel/todo0、168.516202秒。[after-tests.log](after-tests.log)、[test-results.json](test-results.json)。新4件以外の既存1,201件・R0の129途中状態/蒸留20状態とcold・旧保存cold/RNG/月次/経済/在庫/費用/通知順/保存失敗/R1〜R4は同じfixture/期待値で成功。販売実browser2件も環境変数で実体を指定しskipなし。

親が最終8gzip captureの圧縮/展開SHA256・件数384、比較192のzero pixels、cache2/errors0、全provenanceのafterSHA256と現在の製品source一致を独立に照合した。圧縮はJSON原文を可逆に保存する出力整理だけで、比較操作を再実行しない。実行runnerの起動時hashは変更していない。

最終commitはこの製品とtestsのsource closureへ固定し、Scope→Risk→Impact、exact-head必須/補助CI後に通常Stagingマージする。公開後の同SHA Pages・HTTP body・操作の結果はPRへ固定する。R6は新規依頼時にCanvas更新/cacheの限定調査へ進める機械的基準が整ったが、R5成功を未検証のCanvas変更の採用とは扱わない。
