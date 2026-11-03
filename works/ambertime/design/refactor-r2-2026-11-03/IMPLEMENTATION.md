# AmberTime R2 — 道具の座標参照を統一

基準main `1a86a3ce40eb5b5abadda162451d777a649ee855`（PR #770）。着手時にorigin/mainを取得し、R1後の追加変更がないことを確認した。[構造監査](../structure-audit-2026-11-02/STRUCTURE-AUDIT.md)、[段階計画](../structure-audit-2026-11-02/REFACTOR-PLAN.md)、[R0受入基準](../refactor-r0-2026-11-03/REFACTOR-BASELINE.md)、[R1実装記録](../refactor-r1-2026-11-03/IMPLEMENTATION.md)を継承する。過去資料・正式fixtureは更新しない。

事前Lock `.change-plans/ambertime-refactor-r2-20261103/r0.lock.json`、digest `8d94c6109e7075f8e5fc4972e243625cc571b639ee9575e689e151e6ef3d3005`。最初のcommitはLockだけ。Standard/WORK、Stagingのみ。今回の目的は既存値の参照統一であり、位置・形・操作条件・計算の変更ではない。

## 変更前の正本と重複

|対象|変更前の値・座標系|変更前の所在|変更後|
|---|---|---|---|
|レバー操作領域|論理x285,y279,w60,h66|TOOL_GEOMETRYとlayoutSceneで二重定義|layoutがTOOL_GEOMETRY.leverを参照|
|レバー描画基点|論理(300,315)、handleX321|drawDistillTools内の絶対座標|hit原点+(15,36)、handle相対x21|
|3姿勢|handleY294/312/330|drawDistillTools|基点y315+[-21,-3,15]。腕の階段・色・描画順は維持|
|誘導矢印|縦棒(324,261)、矢尻(318,270)+3px段階|drawDistillTools|同じ基点+(24,-54)と局所形状offset|
|グラス待機/採取|論理x237/174,y345|TOOL_GEOMETRYとlayout/Canvas複数箇所|TOOL_GEOMETRY.waitX/collectX/glassY|
|水平移動|論理63|view、app、input fallback|TOOL_GEOMETRY.travel。waitX=collectX+travel|
|グラス操作領域|論理x=絵x−9,y333,w54,h54|layoutの固定値|glass.hitOffsetX=-9,hitOffsetY=-12、既存w/hを参照|
|蛇口とグラス|論理spoutX192、採取口の中央174+18=192|TOOL_GEOMETRYの未参照spoutと既存art|collectX=spoutX−18として関係を明示。artは不変|
|引下げ姿勢/開始閾値|CSS clientY差18/36px|input|pointerCss.leverMiddle/leverDown。論理へ変換しない|
|ドラッグ判定|CSS距離>8px、成立min(24px,travelCSS×.45)|input|pointerCss.drag/glassCommitMax/glassCommitRatio|
|移動演出|140ms、レバー復帰120ms/60ms区切り|Canvas/view|変更なし|

レバーの姿勢間18**論理**pxと指の閾値18/36**CSS**pxは別契約。数字が似ていても統合・倍率適用しない。グラスoutlineは36×33論理px、hitは54×54論理pxであり、絵とhitの大きさを同一化しない。

蛇口のSVGは60×36のnative cellで、equipment原点(90,270)から3論理px/cellで描画する。stream x34は90+34×3=192、y24/26は342/348。採取口y345との既存の重なりを保持する。`room-object-art.mjs`の形状・色・receiver・streamは変更しない。局所の形を全て巨大な共通定数へ移さない。

## 参照関係と境界

既存`distill-tools-view.mjs`の`TOOL_GEOMETRY`を拡張する。新しい座標システムやファイルは作らない。旧exportと既存fieldを維持する。layout/inputが同じ版付きviewを読む依存2本を追加する。viewの既存`parameters.mjs`読取依存は増殖させず、循環はない。保存・時計・乱数を呼ばない。

- app: 正式操作、イベント、保存、modal、時計を引き続き担当。glassTravelだけ63直書きから`travel*scene.viewport.scale`へ置換。
- input: client座標を使う一時gesture。レバー閾値はCSSのまま。glassTravelが有効ならその値を使い、fallback63も従来どおりscale1相当で保持。capture/取消/互換click/keyboard/正式onAction位置は不変。
- layout: 同じ論理矩形を生成。`glassPosition===0`という厳密条件を維持。
- Canvas: 同じ論理位置を描画。従来のtruthiness条件を維持し、dragCSS/viewport.scaleで論理へ戻す。140ms補間・3px丸めの位置・更新時刻・復帰・guideを変えない。

透明hitは操作状態の待機/採取endpointに置かれる。ドラッグ中に絵だけが指に追従し、pointer captureで操作を継続する既存契約もそのまま。移動中のhitを絵に追従させるUI改善は含めない。

## 論理・CSS・Canvasの対応

既存`computeViewport`のscale=min(width/360,height/640)、center offset、DPR clamp1..3をそのまま使用。`projectRect`が論理rectをCSSに変換し、controlsが中央を維持して最低44×44CSS pxへ広げる。dataset.hitRegionsは拡張前の論理rectであり、実DOMのgetBoundingClientRectも別途比較する。

Canvas worldは120×214native、3論理pxのセルを描き、viewport scale/DPRを既存箇所で適用する。DPRをgestureへ掛けない。safe-area/CSS/visualViewport/zoom/offset/resize/hidden/pagehide/pageshow処理は変更しない。実OSのtoolbar/BFCacheや実機safe-areaと制御イベント試験は区別する。

## 配信と共有参照

index→app→scene→layout、およびapp→input、app/scene/layout/input→toolsの更新した親子URLへ`geometry=r2-1`を付ける。4親は同じtools identityを使う。CSS・画像・worker等の不変資産を一括無効化しない。

layoutは手札と場v07/v071/v072/v073、tools/inputはcut Labにも参照される。Labのsource/登録/公開URLは変更しない。旧unversioned URLのwarm cacheは旧実装が残る場合があるが、値・出力・操作契約は完全一致させ、新構成との意味上の混在を起こさない。主入口の新構成は実warm-cache試験で確認する。

## 検証記録

下記は実測結果。未実行の端末・OS条件は未確認として区別する。

### 差分テストと保護対象

`tests/r2-geometry.test.mjs`は基準mainのtools/input/layout/sceneの実ソースをGitから読み、4つの固定SHA256を検証してから候補と比較する。候補自身から期待値を作らない。既存node:testを使用する。既存R0のsource比較と同じく、基準commitを含むGit履歴が必要（浅いcheckoutではfetchしてから実行）。

7テストで、全3姿勢・矢印・液面・端点/途中の描画セル列、全室layoutと特殊なglassPosition、6viewport×5DPR/offset、レバー270境界操作、グラスの8px/24px/45%・fallback・左右条件、取消/capture/複数指/keyboard、Canvas実methodの端点遷移と140ms/120msのアニメーション分岐を比較した。レバーの画面外1000px移動も従来と同じ。入力側の合成Target試験は実タッチ端末の代替と呼ばない。

[source-invariance.json](source-invariance.json)で既存runtime等453パス、既存tests/fixture316パスが同一Git blobであることを確認した。appはgeometry関連import/queryとglassTravel式以外がbyte一致。正式計算・保存・操作順・通知・modal・clock・RNG・既存テストの期待値を変更していない。

独立担当がruntime/cache/テストをレビューし、別途関連29テストを実行して全成功、重大未解決指摘なし。最終browser証拠・資料も完成後に照合する。

### 全域回帰・正式記録

[実測集計](test-results.json)とbefore/afterExisting/additional-tests.logにコマンド・件数・時間を保存した。基準mainの既存157ファイル1,179件は全成功、失敗/skip0（389.990秒）。候補の同じ157ファイル1,179件も全成功、失敗/skip0（396.670秒）。新規7件は別途最終版を実行し全成功、失敗/skip0（19.553秒）。既存globの展開後に新ファイルを追加したため、今回の実測は既存全域+追加の2実行を合わせた158ファイル1,186件。単一globで1,186件を実行したとは記録しない。

R0の129途中状態（各serialize原文/hash、operation、RNG、月、経済/在庫、担当者、自動通知順）、旧蒸留20状態と20個別cold、合法旧保存の受理/拒否・warm/cold再生、generic/candidateの異なる保存失敗挙動、月次・正式通知優先を既存基準のまま成功。既存販売browser2件も環境変数を指定して実行し、skipなし。fixture再生成、閾値緩和、テスト削除はない。

### 配信用Lockの範囲修正

最初の作業branchでは、明示許可した`tests/r2-*.mjs`と、未使用の既存test用conditional `tests/*.test.mjs`が重なり、Scopeが条件付き停止になった。conditionalを成立扱いにせず、最新mainが同じ1a86a3ceであることを再取得し、新しい`refactor/ambertime-r2-delivery`を作成。未使用conditionalを除いた上記digestのLockを最初に登録し、その後に検証済み実装を再利用した。旧Lockは変更していない。runtime/テスト/fixtureは同じbytesなので、同じ検証条件の実行結果を引き継ぎ、最終配信treeを再照合する。元branchは未マージ。

## 変更ファイル

|ファイル|変更|
|---|---|
|`distill-tools-view.mjs`|既存TOOL_GEOMETRY拡張、leverを局所offsetで描画。色・形・順序・3px丸めは同一|
|`canvas-layout.mjs`|lever/glassの論理hitを同じ定義から生成|
|`canvas-scene.mjs`|端点参照と依存queryのみ更新。gestureCSS/scale・140ms・復帰は維持|
|`distill-tool-input.mjs`|既存閾値をCSS単位の名前で参照、travel fallbackを共通参照|
|`shop-app.mjs`|glassTravelの共通参照と親import/queryだけ更新|
|`index.html`|appの更新queryだけ追加|
|`tests/r2-geometry.test.mjs`|固定旧実装との独立差分テスト7件|
|`tests/r2-browser-tools.mjs`|明示実行する両engineの比較・旧cache・操作検証。通常root globには含めない|
|本R2資料/ログ/画像・Lock|今回の独立記録。過去の監査/R0/R1は変更しない|

### ブラウザーの前後一致

Chromium153.0.8010.0 / WebKit26.5。360×568/DPR1、375×620/DPR2、390×680/DPR3、390×680/DPR3 reduced-motionの4条件×2engine。固定seed42・正式状態・時刻・fontready・ポインター位置・animation phaseで、各43状態、計688取得/344前後比較。**全344組でCanvas内部RGBA hash・DOM実hit・読み上げ情報・focus・gesture・正式状態・保存hashが一致し、decoded PNG差分0、PNG原文hashも全344一致**。合成lifecycle/複数指と実mouse/viewport/history操作は区別する。[browser記録](browser/README.md)、[集計](browser/results.json)を参照。

実pointerで18/36CSS境界、下方向/逆方向/短いdrag、capture中の画面外、glass左右移動/タップ/途中位置/吸着・終了・再読込、countdown、guide、期限切れ、復帰、resizeを比較。実DOMの最低44CSS pxとCanvas描画位置の両方を観測する。cancel/lostcapture/複数指・hidden/pagehide/pageshowは合成イベントでも比較するが、実OS操作と呼ばない。

検証ハーネスで観測した差も残した。Playwright clockの登録順によるperformance時刻の揺らぎ、pointer captureイベントの配信待ち、WebKitでモーダルがpointer下に現れた際のhover背景10,780px、16ms timer→次RAFによる20msの描画採取のずれを、immutable base同士の自己比較で切り分けた。clock登録順/ネイティブイベント待ち/解放後のneutral cursorを両側で固定し、唯一の既存`amber-font-change→queue()`リスナーで同じanimation phaseのCanvas更新を待つ。70/140msの途中位置205.5も明示assert。自然なRAF時刻の揺らぎを製品差分とせず、許容差を広げない。[診断記録](browser/diagnostics/)に初回差分と根拠を保管する。製品コードはそのために変更していない。

### 旧キャッシュ

両engineで同一originの1時間cacheを持つ1a86a3ceからreload。Chromiumは110資産中105cache hit、WebKitは109中104hit。変更したapp/input/tools/scene/layoutの5資産だけ新しいgeometry queryで実取得され、配信bodyのSHA256も候補sourceと照合。index入口の更新と親import伝播、同一tools module identity、正式状態/保存の不変を確認した。全歴代URLや全Labのcacheを試したという意味ではない。

### 未確認と今後

実機iPhoneの指追従・safe-area・OS toolbar・VoiceOver、実OSの背景遷移は未確認。履歴へ実際に移動/戻る試験は成功したが、BFCacheはpersisted=false。さらにChromiumの既定BFCache無効化flagを外した実試行でも、CDPが`BackForwardCacheDisabledForDelegate` / `BrowsingInstanceNotSwapped`を報告した（[証拠](browser/bfcache-probe.json)）。別のfull Chromium141は環境socket制限で起動不能。実BFCache hitの成功と呼ばない。

正式モデル・保存・操作条件・絵・hitの変更はなく、R3に進むための機械的基準は満たした。次も一室/一責務に絞り、render→syncModalや保存/通知境界は移さず保護する。R3実装は今回行わない。Productionは変更しない。公開後のsame-SHA Pages・実配信/操作結果はPRに最終SHAとともに追記する。

最終の独立レビューで、688記録/344組、8captureファイルのSHA、source provenance、全344PNG hashを再照合。代表20組のRGBAも独立に再比較して差分0。旧cacheの実bodyとURL、自己比較診断が成功数に混ざっていないことを確認し、重大未解決指摘なし。Scope→Risk→Impact、Lock、構文、lifecycle、diff checkも成功した。最終SHAの必須CIと公開確認はPRで記録する。
