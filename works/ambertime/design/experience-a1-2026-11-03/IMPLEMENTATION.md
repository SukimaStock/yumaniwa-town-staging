# AmberTime A1 — 帳面の応答と採取完了の一拍

基準 main `341f2865ff44af97bfb99e76450b6db17cac9511`（L1 / #776）。root/AmberTime AGENTS、Change OS、R0〜R6 / #769〜#775、L1 / #776、REFACTOR-SUMMARY、実際の帳面 worker/view と蒸留/save/syncModal/CanvasScene を照合した。Standard / WORK / staging-only。Production、正式モデル、旧fixture、Lab、情報構成は変更しない。

実装前 Lock `.change-plans/ambertime-experience-a1-20261103/r0.lock.json`、digest `b80254c50d5f485f4261fd847ce52522bc403cfe9c7833742251f75f941de387`。local lock-only commit `4c83f9166ce3e182a26d1548a34ef9b5b44781ba` の tree と、remote lock-only `0e652073ae282f5c99083a425e33e5531bba5948` の tree `cdb871989e4a72bddb3ceed6f7e5d82d135e3da6` が一致。通常 git push が認証エラーのため接続 GitHub API で同じ blob/tree を保存した。後付け Lock ではない。

## A1-1 — 独立した原因・変更

仕込み・歩みとも、最初の要求で module Worker を作成し、応答直後に破棄していた。小さい保存でもモジュール依存グラフの初期読込が可視待機を増やしていた。計測用の実ソース計装でイベント受付、Worker作成/送信/計算/応答、DOM更新、2RAF後の内容完成を分離した。診断初回の300〜700msは全域テストと同時実行で大きく揺れたため、最終の速度比較には別途 paired run を使う。

変更は既存2 Workerの寿命だけ。boot完了後に一度だけモジュール読込を準備し、状態送信・再生・履歴計算は要求時に行う。正常応答では破棄せず再利用する。既存のgame参照によるprojection無効化、requestId、snapshot/current workerの確認、原文・HTML・並び・戻る/focus/scrollを維持する。古い応答は破棄し、異常Workerだけterminateして明示再読込で再生成する。新しいprojection cacheは追加しない。長い履歴の正式再生自体を変更したとは扱わない。

`prepareLedgerWorkers`の最初の候補はcomputed new URLだったが、既存の厳密cache readerが認めないため、既存同様のliteral Worker URL 2本へ直した。graphや期待値は変更せず18関連テスト成功。読込先/worker本体/正式検証は不変。

## A1-2 — 独立した表示変更

手動採取の正式終了→味/量確定→既存save→成功通知/到達処理→afterSaveの順を維持し、afterSaveだけでCanvasSceneの一時completionを開始する。syncModalを丸ごと遅延させない。decision/担当者/取引/店/世代の既存正式通知・save・優先をその場で処理し、待たせるのは自動fill表示と、その後順位の地図表示だけ。completion中は従来fillモーダルと同じく正式時計を止める。正式保存を演出終了まで遅らせない。

CanvasSceneがspiritId、世代token、開始performance時刻、callbackを一時所有する。既存の単一RAF・motionTimerへ有限の描画時刻を追加し、新しいloop/timerを作らない。既存140msのグラス移動後、rim上の2 native cells（各3論理px）を150msから短く明るくし、元の縁に戻して250msで既存fillへ進む。250/300/400ms比較を別記録する。形/液面色/味色/lever/TOOL_GEOMETRY/hit領域は不変。文章、音、button、tapは追加しない。

callbackは有効tokenを確認し、rootでfilling/same spirit/distill room/!modal/visible/save可能を再確認してrenderする。直接モーダルを開かない。割込/部屋/hidden/pagehide/reset/再読込/競合で破棄し、古いcallbackを実行しない。自動蒸留、取消/期限切れ、保存失敗は開始しない。reduced-motionは開始せず従来の即時fill。途中でreduceに変えた場合も短絡する。

独立レビューでfont未確定時の不可視演出がfallbackまでfillを遅らせる境界を再現した。修正1回目としてfont未確定では演出を省略する方針を採用し、実Canvas methodの回帰で検証する。正式処理は変えない。

## 既存基準・キャッシュ・表現

R4/R5のwhole-root proofはリファクタリング限定のbyte基準なので、意図的なA1差分だけを正確に戻すtest adapterを追加した。9 root hunksと1 index hunkを一意照合し、復元後の全byte hashをimmutable L1へ照合する。元のR4/R5 oracleとfixture/表示関数のbyte比較はそのまま。新A1の実動作は別テストで保護する。独立レビューで内側/外側の任意変更が拒否されることを再確認した。

CanvasSceneの親app URLにcompletion=a1-1、HTMLのapp URLにexperience=a1-1だけを追加する。worker/view/tools/layout/font等の不変依存へ一括query更新しない。R0/R6依存閉包に加え、旧1時間cacheを保持したbrowser reloadで変更bodyを取得することを確認する。

表現監査: 作者が指定した局所の光だけを追加する。常設説明・成功文・スピナー・新操作はない。既存の操作案内/ARIA/読み上げ用内容は維持する。

## 検証と未確認

着手時の全域: 1,216成功、失敗0、skip/cancel/todo0（186.976秒）。`baseline-tests.log`。正式129途中状態・蒸留20状態・旧保存cold replay・乱数/月次/経済/在庫/通知/save failure/R1〜R6を含む。

候補の全域、最終paired速度、Chromium/WebKit画素/DOM/hit/focus/ARIA/save、自然時刻と固定phaseの演出、独立レビュー、必須CI、Staging配信は取得後に追記する。途中結果を完了扱いしない。

物理iPhone Safariの指触感、VoiceOver実音声、実OS背景、実BFCache、非zero safe-areaは未確認。Linux WebKit/合成visibility/pageshowで代用しない。旧保存・長期fixtureは実際に通した形式/operation数を明記し、全セーブ・全端末の速度保証とはしない。
