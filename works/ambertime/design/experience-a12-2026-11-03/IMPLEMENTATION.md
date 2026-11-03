# A1-2 — 蒸留完了のグラス演出

## 対象と原因

開始mainは `aabc77cb54f10838b8b9975161fda29b84977b51`。PR #779まで取り込み済みで、#778以降の製品変更なし。作者の物理iPhone Safariで光が見えなかったことを不具合の再現条件とし、旧ブラウザー成功を視認性の十分条件にしない。

旧実装は250ms中150〜220msだけ、上縁の2 native cellsが35msずつ2段階で光る。終了は経過時間だけで、光の描画成立を確認していなかった。自然時間の基準測定では、Chromiumの光を保持した期間66.6ms／WebKit106ms、実Canvas更新は各2回だった。ブラウザーの描画機会と物理ディスプレイの提示は区別する。

Plan Lock digest `b58f4328e14b2006f5c067d9eec46cd76553d31ad1c0c96b8c9972f7cc9001ed` をlocal lock-only `93f36c76`、remote lock-only `da59110e665da3690e04ba9c3f60fd72926e4398` へ固定。CLI pushは認証なしで失敗したため、同一Lock blob/treeを接続済みGitHub APIで保存した。製品実装の前にlocal Lockを固定している。

初回全域1234件では、正式状態不一致はなく、旧shop-order-viewのstopDrawingソース不変pinだけが失敗。元Lockは変更せず、新branch `fix/ambertime-a12-glint-reviewed`、新Lock-only local `577e509c` / remote `233186a0a5aff03e5d93dcee6ea44918b678ecc1`、digest `ee5216023bbc8c4525549e67646a719759bd299f849830c157e7db33c970b9a2` を固定してテストscopeへ当該ファイルを追加した。製品3hashは同一のまま再利用。承認済みstopDrawingメソッド全文1件のみを厳密に逆変換してから、元の古いソース比較をそのまま実行する。queue改変は旧pinで、メソッド改変は逆変換で拒否される。独立再レビュー24件成功。初回失敗はdiagnosticsへ保持。

## 比較と採用

350/400/450/500msは、実アプリに対する試験用prototypeのsample/paintだけを差し替えて比較した。正式操作・保存はそのまま、performance.nowや時計は上書きせず実pointerで採取を終了した。基準250msは元の実装を使用。試験用候補は最終フレーム成立ガードを持たないため、最終製品の検証とは分ける。全10条件の正式snapshot・保存が期待値と一致、pageerror0。生フレームは `candidate-timings.json`、画像・実行source・条件は `candidates/`。

|候補|移動待ち|光|消灯後の余韻|判断|
|---|---:|---:|---:|---|
|350ms|150ms|170ms|30ms|採用、最短候補でも3段階と表示機会を得た|
|400ms|150ms|200ms|50ms|光が30ms長いが全体の待ちも増える|
|450ms|150ms|200ms|100ms|主に空白が増える|
|500ms|150ms|200ms|150ms|主に空白が増える|

光は明るいクリーム色 `#f0e6c8`、横4 native cells（12×3論理px）。既存3pxグリッドに合わせ、グラス上縁をx+2→+4→+6の3段階で短く横へ動く。グラス形状・液面色・蒸留機・入力領域は変更しない。新しい文字・確認・音・星・粒子は追加しない。表現監査の6点を確認し、依頼された小さな光以外の装飾を追加しない。

## 正式処理と描画の順序

採取終了→D.stopDistillation→正式保存→保存成功afterSave→startDistillCompletion→既存render/scene.update→既存140msグラス移動→光3段階→消灯後30ms→終了callback→現存状態を再確認したrender/syncModal→既存の結果・樽選択。この正式操作・保存・syncModal・callbackガードの製品コードは不変（app差分はキャッシュqueryのみ）。保存を演出後へ遅らせず、一時状態を正式保存へ追加しない。

source paintではなく、worldを表示用CanvasへdrawImageした直後に異なる時刻の成功フレームを記録する。3段階・最低3成功フレームを要求。遅いフレームで段階を飛ばさず、各段階に170/3ms以上の描画機会を与える。終了は最後の光を描いた同じフレームでは行わず、最終段階の保持後に消灯し30msの余韻を置く。基準350msは最小の構成値で、RAF/タイマー遅延や描画機会の不足分は実時間へ加わる。

これは物理ディスプレイの提示保証ではない。実ブラウザー検証では、光のCanvas画素が残り、モーダルが閉じている間の独立RAF機会も記録する。open属性の変更と、可視CSS/非zero boundsを持つ次RAFを別時刻として保存する。

期限は開始からduration+250ms（通常600ms）。既存のmotionTimerだけをwatchdogとして兼用し、RAF停止・描画例外でも無期限に待たない。通常は有限の描画境界だけを既存RAFへqueueし、常時描画loopを作らない。world cache keyは従来のcompletionStepを利用するため、光が変わらない時に背景worldを不要に再生成しない。演出後の更新は既存の他の動きが必要なものだけになる。

## 中断とレビュー

reduced-motionは開始時に省略、途中で有効になれば終了し追加待機を入れない。フォント未準備は開始を省略、途中の未準備やcontext lossは安全終了。hidden/pagehide・部屋変更・別モーダル・reset・保存不可/競合は既存のtoken取消と正式優先順位に従う。reloadは保存済みfillingを復元し、光を再演しない。同じ原酒の重複開始はrunを作り直さない。終了callbackは一度のみで、原酒ID・phase・部屋・可視・modalなし・保存可能を既存app側で再確認する。

独立レビューは明示stopDrawingでwatchdogが消え待機が残るP2を発見。修正1回で、通常のdraw内部cleanupだけpreserveCompletion=true、明示停止は安全終了とした。draw内部例外の合成検証でも同じwatchdogが生存するよう、cleanup直後に再設定する。詳細は `INDEPENDENT-REVIEW.md`。

## 検証資料と未確認

基準全域は1228pass／fail0／skip0。正式129途中状態、蒸留20状態と独立cold replayを含む。最新候補の全域・ブラウザー結果と公開後の記録は本ディレクトリへ追記する。新たな失敗を成功扱いせず、検証中にsourceが変化した試行や測定器の誤った閾値は診断として保持する。

キャッシュ更新はHTML→appのexperience=a12-1とapp→Canvasのcompletion=a12-1のみ。モデル、保存、worker、帳面速度、Lab/研究記録/Productionは変更しない。旧R4/R5の不変L1 source証明は、この2つのキャッシュqueryを単一一致で厳密に戻してから元の不変hashを照合する。期待値・画素許容値は広げない。

物理iPhone Safariの視認性と触感、VoiceOver実音声、実OS背景・BFCacheは作者確認として未確認。Stagingではグラスが戻ってから光を認識でき、消えた後に樽選択が開くこと、待ちが長すぎないことを確認していただく。

## 最終自然時間ブラウザー検証

Chromium140/WebKit26.5、360×568・375×620・390×680・430×740、DPR1/2/3、通常/reducedを含む40ケースが成功、pageerror0。製品source hashは開始/終了で一致。通常の終了はChromium382.4〜419.6ms、WebKit387〜480ms。光をCanvasへ描画した回数はChromium5回、WebKit3〜5回、光を残した独立RAF機会は各12〜13回／3〜11回。全3段階がモーダルより先にあり、各段階のworld画素差は4native cells・対象外0、操作DOM/hit/focus/ARIA不変。共有hostの負荷と同期render時間を含み、物理表示時刻を保証しない。

hidden/pagehide/room/modal/reload/reset/mid-reduce/conflict/連打/font loss/context loss predicate/RAF停止の12条件×2engineを実行。意図したreset以外は保存raw・正式snapshotが完全一致。reduceは演出受理false、active frame/finish/callbackなしの通常render経路で確認し、同期renderのCPU時間を追加待機と混同しない。時刻/全draw/RAF/open/次RAF・画像はbrowser/README.mdとresults.jsonを参照。
