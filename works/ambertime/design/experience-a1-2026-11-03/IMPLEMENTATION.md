# AmberTime A1 — 帳面の応答と採取完了の一拍

基準 main `341f2865ff44af97bfb99e76450b6db17cac9511`（L1 / #776）。root/AmberTime AGENTS、Change OS、R0〜R6 / #769〜#775、L1 / #776、REFACTOR-SUMMARY、実際の帳面 worker/view と蒸留/save/syncModal/CanvasScene を照合した。Standard / WORK / staging-only。Production、正式モデル、旧fixture、Lab、情報構成は変更しない。

初期の実装前 Lock `.change-plans/ambertime-experience-a1-20261103/r0.lock.json`、digest `b80254c50d5f485f4261fd847ce52522bc403cfe9c7833742251f75f941de387`。local lock-only commit `4c83f9166ce3e182a26d1548a34ef9b5b44781ba` の tree と、remote lock-only `0e652073ae282f5c99083a425e33e5531bba5948` の tree `cdb871989e4a72bddb3ceed6f7e5d82d135e3da6` が一致。通常 git push が認証エラーのため接続 GitHub API で同じ blob/tree を保存した。後付け Lock ではない。

## A1-1 — 独立した原因・変更

仕込み・歩みとも、最初の要求で module Worker を作成し、応答直後に破棄していた。小さい保存でもモジュール依存グラフの初期読込が可視待機を増やしていた。計測用の実ソース計装でイベント受付、Worker作成/送信/計算/応答、DOM更新、2RAF後の内容完成を分離した。診断初回の300〜700msは全域テストと同時実行で大きく揺れたため、最終の速度比較には別途 paired run を使う。

変更は既存2 Workerの寿命だけ。boot・既存fontReady完了後の最初の描画機会を経て、一度だけモジュール読込を準備し、状態送信・再生・履歴計算は要求時に行う。正常応答では破棄せず再利用する。既存のgame参照によるprojection無効化、requestId、snapshot/current workerの確認、原文・HTML・並び・戻る/focus/scrollを維持する。古い応答は破棄し、異常Workerだけterminateして明示再読込で再生成する。新しいprojection cacheは追加しない。長い履歴の正式再生自体を変更したとは扱わない。

`prepareLedgerWorkers`の最初の候補はcomputed new URLだったが、既存の厳密cache readerが認めないため、既存同様のliteral Worker URL 2本へ直した。graphや期待値は変更せず18関連テスト成功。読込先/worker本体/正式検証は不変。

## A1-2 — 独立した表示変更

手動採取の正式終了→味/量確定→既存save→成功通知/到達処理→afterSaveの順を維持し、afterSaveだけでCanvasSceneの一時completionを開始する。syncModalを丸ごと遅延させない。decision/担当者/取引/店/世代の既存正式通知・save・優先をその場で処理し、待たせるのは自動fill表示と、その後順位の地図表示だけ。completion中は従来fillモーダルと同じく正式時計を止める。正式保存を演出終了まで遅らせない。

CanvasSceneがspiritId、世代token、開始performance時刻、callbackを一時所有する。既存の単一RAF・motionTimerへ有限の描画時刻を追加し、新しいloop/timerを作らない。既存140msのグラス移動後、rim上の2 native cells（各3論理px）を150msから短く明るくし、元の縁に戻して250msで既存fillへ進む。250/300/400ms比較を別記録する。形/液面色/味色/lever/TOOL_GEOMETRY/hit領域は不変。文章、音、button、tapは追加しない。

callbackは有効tokenを確認し、rootでfilling/same spirit/distill room/!modal/visible/save可能を再確認してrenderする。直接モーダルを開かない。割込/部屋/hidden/pagehide/reset/再読込/競合で破棄し、古いcallbackを実行しない。自動蒸留、取消/期限切れ、保存失敗は開始しない。reduced-motionは開始せず従来の即時fill。途中でreduceに変えた場合も短絡する。

独立レビューでfont未確定時の不可視演出がfallbackまでfillを遅らせる境界を再現した。修正1回目としてfont未確定では演出を省略する方針を採用し、実Canvas methodの回帰で検証する。正式処理は変えない。

## 既存基準・キャッシュ・表現

R4/R5のwhole-root proofはリファクタリング限定のbyte基準なので、意図的なA1差分だけを正確に戻すtest adapterを追加した。root/indexの限定hunksを一意照合し、復元後の全byte hashをimmutable L1へ照合する。元のR4/R5 oracleとfixture/表示関数のbyte比較はそのまま。新A1の実動作は別テストで保護する。独立レビューで内側/外側の任意変更が拒否されることを再確認した。

CanvasSceneの親app URLにcompletion=a1-1、HTMLのapp URLにexperience=a1-1だけを追加する。worker/view/tools/layout/font等の不変依存へ一括query更新しない。R0/R6依存閉包に加え、旧1時間cacheを保持したbrowser reloadで変更bodyを取得することを確認する。

表現監査: 作者が指定した局所の光だけを追加する。常設説明・成功文・スピナー・新操作はない。既存の操作案内/ARIA/読み上げ用内容は維持する。

## 検証と未確認

着手時の全域: 1,216成功、失敗0、skip/cancel/todo0（186.976秒）。`baseline-tests.log`。正式129途中状態・蒸留20状態・旧保存cold replay・乱数/月次/経済/在庫/通知/save failure/R1〜R6を含む。

候補の最初の全域は1,228件中1,223成功・5失敗・skip/cancel/todo0（265.374秒）。失敗はR2のCanvas部分描画fakeにsampleDistillCompletionがない1件、R4の実root VM接続にscene portがない4件だった。正式計算や保存期待値の不一致ではない。初回ログはcandidate-initial-tests.logへそのまま保持する。

この2つの既存adapter pathが初期Lockの許可範囲になかったため、変更する前に同じmainからfresh branchとr0 Lockを作った。最終Lockは `.change-plans/ambertime-experience-a1-ports-20261103/r0.lock.json`、digest `f365d0344b5c775f5085b8b53e10933ccecaefebef86e5cdd9b1737edb17cc59`、local lock-only `b535a423` / remote `b2a35fb5d21f2dc2aab3f2fbb8aca4c0f110adae`、両tree `1c659d0a09823a686151bfd5a6232b41f18d67a7`一致。初期成果はbinary diffで再利用し、製品3ファイルは初期検証時とbyte一致。旧Draft PR777はこのscope修正で置換する。既存Lockは書き換えず、範囲外を後付け承認しない。

Lock後の修正1回目はR2 fakeへinert sampleDistillCompletion、R4 VMへinert scene methodsを追加するだけ。oracle・assertion・fixtureは不変。該当2ファイルの11件は成功、失敗/skip/cancel/todo0（4.290秒）。初回成功1,223件を維持し、失敗5件が再実行成功した最終unique outcomeは1,228成功・失敗0・skip0。最初から単一実行で全緑だったとは記録しない。R0正式129途中状態、蒸留20状態/個別cold、旧保存cold、RNG/月次/経済/在庫/通知/save failure/R1〜R6は元の期待値で成功。

Chromium140/WebKit26.5の360×568DPR1・375×620DPR2・390×680DPR3・390reduced、各26状態×両side＝416取得/208前後比較は、対象外画素差0・PNG byte一致、Canvas/DOM/実hit/focus/ARIA/正式state/save一致。old1hcache upgrade2engineも成功。既存R6 runnerをimmutable L1 baseline/今回のsettled phaseへ限定適用し、旧資料は変えない。regression-browserの8gzipは可逆でraw/圧縮hashをresults.jsonへ保存した。glintは14固定phase比較＋16自然時間/取消caseで確認し、自然時間中央値Chromium256.7ms/WebKit263ms。2world cellsだけに光を追加し、その範囲外差0・hit不変。保存はarm前にfillingで確定、演出中の正式raw/時計は不変。

独立レビューはfont未準備のP2を検出し、修正1回後に解消確認。正式状態/cache/worker順序/旧oracle逆変換とmutation拒否、実行runner/projection/hash/scrollを別担当が照合した。現時点の未解決P1/P2なし。最終必須CIとStaging配信は取得後にPRへ記録する。

速度の最初の複数matrixには、終了したと思われていた古い長期fixture調査がCPUを消費し続けていたことが後から判明した。元の実行sessionから停止しPID消滅を確認した。これらの数値は高負荷条件の参考として残し、内容・保存・操作一致と速度の因果判断を分ける。最終のclean-host再計測を別に行い、数値/制約はledger記録を正本にする。

物理iPhone Safariの指触感、VoiceOver実音声、実OS背景、実BFCache、非zero safe-areaは未確認。Linux WebKit/合成visibility/pageshowで代用しない。旧保存・長期fixtureは実際に通した形式/operation数を明記し、全セーブ・全端末の速度保証とはしない。

## 最終の帳面計測（残留調査停止後）

残留Node処理がないことを確認し、他の全域/描画runnerを止めた条件で、最終製品の同じ288観測（2engine×4fixture×3fresh load×2side×3open×2view）を再実行した。内容144組・worker projection48組・非zero scroll復帰12probeは一致し、ページエラー/保存変化0。全平均/中央値/max/phaseと生traceはledger-summary.json、ledger-paired-results.json.gz、比較表を参照する。古い高負荷matrixは区別して残した。

|条件|仕込み 初回中央値 ms（前→後）|歩み 初回中央値 ms（前→後）|
|---|---:|---:|
|Chromium 新規|128.7→62.7|128.0→60.7|
|WebKit 新規|183→122|155→86|
|Chromium 120か月/153操作|465.8→340.5|250.4→162.8|
|WebKit 120か月/153操作|451→413|315→251|

再表示中央値はおよそ42〜46msで、大きな改善を主張しない。全条件の改善ではなく、Chromiumの3記録fixtureの仕込みは261.8→344.9msと遅い。WebKit長期のmaxも仕込み493→863ms/歩み397→685msと揺らぐ。初回n=3の共有環境の測定であり、端末全体やtailの安定した高速化を保証しない。正式再生の削減や新cacheは今回採用していない。

起動readyの集計中央値はChromium465.5→468ms/font480.2→488.8ms、WebKit554.5→532.5ms/font581.5→559ms。この集計から起動高速化は主張しない。準備開始は既存fontReadyと最初の描画機会の後で、初期描画を準備完了待ちにしない。
