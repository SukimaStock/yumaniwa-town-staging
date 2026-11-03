# AmberTime R6 — Canvasライフサイクル監査とキャッシュ依存の保護

基準main `2ff8aba1287f1e7aba7ceb902cfaef5df1c9dd79`（R5 / PR #774）。root/AmberTime AGENTS、Change OS、構造監査・REFACTOR-PLAN・R0基準、R1〜R5の実装/検証記録と実ファイルを照合した。実在しないcanvas-motionを前提にせず、CanvasScene、canvas-layout、RoomMotion、font-loader、root render/schedule/modal、market/mapの別経路を調査した。

Standard / WORK / staging-only。事前Lock `.change-plans/ambertime-refactor-r6-20261103/r0.lock.json`、digest `86953b49578a1b11a2a897327a08ca94343167073c636d9934b31b40fa22b578` を実装前のローカルcommit `3e2529d4` に登録し、同じLock blobをremoteの最初のcommit `0fdddf66d75d7fb2a7c975040bc9c4ca220ded9e` へ保存（Git push認証不可のためGitHub接続APIを使用）。製品コード・既存fixture・過去資料・Lab/公開URL/分類・Productionを変更しない。今回の作者指示は独立レビュー・必須CI後の通常Stagingマージと公開確認まで含む。

## 採用した最小範囲

Canvasの既存schedulerを再分割せず、現在の責務・依存を文書化し、R0以降に追加されたモジュールを含む直前mainのcache閉包をテストで保護する。[LIFECYCLE-AUDIT.md](LIFECYCLE-AUDIT.md)に全要求イベント、A/B/C分類、起動/停止/復帰、DOM/正式時計との接続、既存の注意点を記録した。

|候補|安全性・効果|判断|
|---|---|---|
|RAF/タイマーを新schedulerへ抽出|既に一つのqueueと3 bounded timer。callback/clock/environment portが増え、font/updateProgress/observerの順序を巻き込む|採用しない。再描画頻度を変えず現行ownerを明示|
|hidden/復帰条件の変更|root suspendの正式pause/saveとCanvas停止の差があり、既存体験への影響が大きい|採用しない。前後一致と合成/実BFCacheの区別を検証|
|font readinessの移動|font-loaderが既にready/fallback/retry/recoverを所有し、Canvasはpromise/eventを購読|採用しない。新しいフォント/描画方式/常時timerは不要|
|rootのCanvas view生成を一括抽出|DOM読戻し、正式状態、R3/R4選択、modalとmarket同期が横断|採用しない。CをCanvas側へ移さず、既存明示viewを維持|
|キャッシュ依存閉包の補強|R0 anchor106資産だけではR1/R3/R4/R5で後から追加された4moduleのbody変更を同じ強さで固定しない|採用。直前R5の110資産を独立baselineとして保護し、更新漏れnegative casesを補う|

行数削減や新module追加を成果にしない。現在の絵・操作・正式結果を最も確実に守るのは、今回必要のないruntime編集を行わず、更新時の見落としを検出できる範囲を広げることである。

## そのまま残す所有者

- CanvasScene: 一つのcoalesced RAF、hint/selection/motionのbounded timeout、font gate、resize/DOM observer、現在viewの描画。hidden/suspendedで止め、visible/pageshow/font/observer/update等で要求する。
- canvas-layout/描画helpers: 既存幾何・形・色・3px grid。R2 TOOL_GEOMETRYを唯一の道具座標参照として保持。
- RoomMotion: IDとperformance時刻を用いる到着演出。game/saveなし。
- font-loader: 同じMisaki、fallback/ready/retryと回復イベント。Canvasは既存順の購読だけ。
- root: 正式状態・save/失敗policy・clock・modal優先・部屋・focus、R3/R4 controllerの値を表示へ渡す。renderの副作用を「純粋描画」と呼ばない。
- marketUI/地図: 既存DOM演出と別Canvas。CanvasScene schedulerへ集約しない。

updateProgressの2px直接描画、modal中の静止背景、hidden中要求の抑制、短いhideで残る可能性のあるpresentation timestamp、root suspendのpause/saveを保持する。正式時計と描画時計を統合しない。

## モジュール・キャッシュ依存

本編入口はindex.htmlの版付きshop-app。rootからCanvasScene、R1 readout view、R3 distill controller、R4 warehouse controller、R5 history view、既存views/workersへ到達する。CanvasSceneはlayout/RoomMotion/font/input/art/tools等へ依存し、R2 tools identityをroot/layout/inputと共有する。CSS/ローカルfont/画像、literal dynamic import、worker new URLを含む現行buildless依存は既存graph方式を活用する。

R0の106資産anchorはR0→現在の伝播保護として維持し、弱めたりfixtureを再生成したりしない。R6は直前R5で到達する110資産のbody/URL identityを別baselineに固定する。これによりR0時点では存在しなかった4moduleについても、次の更新で旧URLのままbodyだけ変えた場合や、その親から入口までの更新漏れを検出できる。

既存URL/queryの管理方法そのものは変更しない。R6では製品bodyが変わらないため、HTML/app/Canvas/worker/CSS/fontのqueryを更新しない。不変依存の不要な無効化、全query付替え、cache削除、bundler/Service Worker/配信構成の導入を行わない。

テストの閉包走査は現行構文に対する検査であり、任意の将来のJavaScript loaderを完全解析する汎用parserではない。未知のloader構文を追加する際はgraphへの適用を確認する。旧cache実browser試験は実際のrequest/bodyと比較し、静的graph成功だけで取得成功を主張しない。

## 変更ファイルと保護範囲

実装差分は事前Lock、新しいR6 tests/固定直前baseline、本R6監査/検証記録、`works/ambertime/REFACTOR-SUMMARY.md`。個々の最終ファイルとhashは最終差分/検証記録で確定する。

shop-app/index/Canvas/layout/RoomMotion/font-loader/R1〜R5製品module、正式model/save/clock、既存tests/fixture、過去designは不変を照合する。新しい描画loop・常時timer・表示状態の複製・正式操作/通知/保存はゼロ。新製品moduleも作らない。

## 検証記録

着手基準のR5は全域1,205成功/失敗0/skip0。R6の実測全域、新単体、129正式途中状態/蒸留20状態/旧保存cold、Chromium/WebKit画素/DOM/hit/focus/ARIA/animation/save、hidden/reduced/font/viewport/page lifecycle、旧cache、独立レビュー、Scope→Risk→Impact、CIは各実行結果を取得後に追記する。未実行を成功扱いしない。

変更前後の製品bodyはbyte一致を独立に確認する。browser比較でも同一seed/状態/viewport/DPR/font/時刻/animation phaseを固定し、画素差0を基準とする。既存runtimeが不変でも実lifecycle比較と旧cache観測は別の証拠として記録する。

## 未確認・区切りの判断

物理iPhone Safariの指追従、VoiceOver実音声、非zero safe-area、実OS toolbar/background、実BFCache hitは実測がない限り未確認。合成hidden/pageshow.persistedやDOM/ARIA一致で置換しない。DPR専用watcherがない等の既存条件は[LIFECYCLE-AUDIT.md](LIFECYCLE-AUDIT.md)のとおりで、R6の新規欠陥として数えず変更もしない。

R0〜R6の保守効果とroot/controller/viewの境界は`REFACTOR-SUMMARY.md`へ別途総括する。機械的な回帰・独立レビュー・配信確認が揃えば、今回の段階的リファクタリングは一区切りにできる。保存policy統合や正式モデル分割、UI/絵の改善は別の具体的な必要が生じたときの作業とする。L1のLab研究記録化をこのPRへ混ぜない。

## 実測結果と製品不変の確認

新cache5件・lifecycle6件は各単体で成功、独立レビューでも11件成功。全域はR5の1,205件に新11件を加えた1,216件。最初の単一glob実行は1,214成功・2失敗・skip0（168.762秒）。失敗2件はfull Chromiumがページ起動前にprocess_singletonのUNIX socket権限制約で終了したもの。同じ140版の既存headless shellを環境変数で指定し、その2件だけを再実行して2成功・失敗0・skip0（26.000秒）。製品・既存test・期待値・権限設定は変更していない。最終のunique outcomeは1,216成功・失敗0・skip/cancel/todo0であり、最初から単一実行で全緑だったとは記録しない。

`full-tests.log` / `browser-retry-tests.log` と `test-results.json` に両実行を保持。正式129途中状態、蒸留20状態の個別cold、旧保存cold replay、操作履歴/RNG/月次/経済/在庫/担当者/通知順/保存失敗/R1〜R5は既存fixture/期待値で成功。R0の129coldはbatched process、蒸留20は個別processという基準の違いも維持する。

`product-invariance.json` は基準Git objectと現在の到達110製品ファイルを直接byte比較し、hashと全edgeも一致した記録。独立reviewも再構築して一致を確認。font retryの動的URLは既存CSSのTTFと同じことを実関数VMで補完した。実到達workerはhistory-worker/cask-ledger-worker、literal動的importは0。comparison-workerは本編入口から未到達なので、存在だけで実到達と呼ばない。既存の複数URL identityも一括正規化しない。

Chromium140 headless shellとWebKit26.5の3幅/DPR/reduced全8条件、26状態ずつ、416取得/208前後比較はすべてdecoded pixel差0・PNG byte一致。Canvas内部RGBA、地図Canvas、DOM/実hit/focus/ARIA、演出状態、正式snapshot/保存rawも前後一致。20要求の1RAF集約、hidden/suspended中のRAF/3timer停止と描画抑制、visible/合成persisted pageshow、resize/reduced変更を確認。rootの既存pause/saveも同じ結果を維持した。実際のBFCache hitではない。

旧1時間cache互換性は両engineで成功。R6はbody/URL不変なので、cached modulesの再利用が正しい。reloadではHTMLのみ再取得した。変更bodyを新URLで取得したupgrade検証とは区別し、R5の変更版warm-cache証拠と新graphのnegative/positive検査を併記する。cache削除や不要なquery更新はしない。

ブラウザーrunnerと各captureのhash、実行環境、初回harness診断と未確認は `browser/README.md` / `browser/results.json` / `INDEPENDENT-REVIEW.md`。font未準備画面の実画像・実network retryは今回再現せず、実constructorのfont gate/回復イベントと実renewSourceの単体検査を補完にする。複数DPRはcontext別で、monitor由来のlive DPR変化は未確認。

独立reviewは製品不変、fixture原典一致、11テスト、runner/208比較を確認し、修正要求なし。Scope→Risk→Impactは作業treeで全成功。最終commitのexact SHAでも再確認し、必須CIと同SHA Pages公開をPR #775へ固定する。CI・配信確認は取得前に完了扱いしない。

補足のcapture-aware tools runnerでは、実際のleverStep=0/1/2を各captureでassertし、グラスの移動中/settledも前後比較した。両engine全8条件で128取得/64比較、decoded pixel差0・PNG byte一致。主runnerのpointer移動を伴うgesture sampleを3姿勢の証明に読み替えず、この独立補足で確認する。合計544取得/272前後比較すべて一致。主runner hash `8e395dc01a33a40bf36f493fbaf06534c883c509b79512096587d703870bdf4b`、補足 `1e962fb0d685b223618c4ca65c04251923ecf0da41dedb45e8cfea4e2336ee37`。両方とも実行開始時に固定し途中不変。16capture JSONのgzipは可逆圧縮で、原文/圧縮hashをresultsへ残した。
