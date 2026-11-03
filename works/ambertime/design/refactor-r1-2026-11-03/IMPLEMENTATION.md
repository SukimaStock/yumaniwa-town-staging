# AmberTime R1 — 蒸留表示値の純粋な整形処理を分離

基準main: `5c04a4fd17e8cac954acf798485085721f261d8b`（R0 / PR #769）。着手時点でR0以降の本編変更なし。[構造監査](../structure-audit-2026-11-02/STRUCTURE-AUDIT.md)・[計画](../structure-audit-2026-11-02/REFACTOR-PLAN.md)・[旧テスト基準](../structure-audit-2026-11-02/BASELINE-TESTS.md)・[R0修復](../refactor-r0-2026-11-03/TEST-FAILURE-REVIEW.md)・[R0受入基準](../refactor-r0-2026-11-03/REFACTOR-BASELINE.md)を継承する。過去資料/fixtureは上書きしない。

事前Lock: `.change-plans/ambertime-refactor-r1-20261103/r0.lock.json`、digest `16b4f5d9ee7b164002f4de0cececd6af693d03f3755309552f2d4114965edd33`。最初のcommitはLockのみ。今回の実装は表示整形の一部分に限定する。

## 抽出対象の比較

|候補|現行の責務・依存|判断|
|---|---|---|
|renderSpiritの表示整形|既存readoutのphase/litres/phrase/axes、cut/modal/collection表示条件→文字/hidden/meter属性。DOM書込と混在|採用。正式状態を直接渡さず小さなprojectionを整形でき、実rendererと独立に比較できる|
|仕込み表示|brewingPanelStateが既に独立。確認前後とcountdownは一時UI状態に関わる|今回は維持。再度抽出しても利益が小さい|
|Canvasへのデータ生成|state→DOM→Canvasの読戻し、stale値/固定label/ratio変換を含む|今回は維持。DOMとCanvas全体を同時に整理しない|
|既存spirit-viewへ追加|正式profile/見込み値の表示APIを持つが現行+旧版7入口で共有|変更しない。旧入口のcache親まで波及させる利益が小さい|

新しい`spirit-readout-view.mjs`は、既存readoutを画面用の値へ整形するだけの小さな専用module。大きな共通UI基盤やstate管理を増やさない。責務の境界と単体検証可能性が利益であり、行数削減を目的にしない。

## 入出力と呼出関係

`renderSpirit()`は従来どおりpanel存在を確認し、既存`distillationReadout(game)`を呼ぶ。その結果と明示的な表示条件を`spiritReadoutView(readout, {cutInProgress, modalKind, collectionVersion})`へ渡す。

入力はゲーム全体ではなく、既に生成したreadout（phase/litres/phrase/axes）と表示条件3つ。出力は`hidden`、`kind`、`phrase`、`gaugesHidden`、`volume`、axesのid/aria値/読み上げ文字/比率。DOMやCanvasの参照を渡さない。

新関数は保存・正式操作・時計・通知・乱数・DOM/Canvas・storageを呼ばず、入力を書き換えない。既存`uiText`をapp/Canvasと同じURL identityで読み、従来と同じ日本語変換を使う。stateのcacheやmutableな共有状態を新設しない。

appは返された値を元の順でDOMへ書き込む。panelがなければreadout計算前にreturn。hiddenなら他の文字/属性/バーを書き換えず、古い内容を保持する。estimate時は空のphraseと非表示gaugesを設定し、従来同様axesがあれば属性更新は行う。`toFixed(1)`、`toFixed(2)`、String変換、比率、単位や空白も維持する。

CanvasへのDOM読戻し行はそのまま。制御・イベント・正式操作・save・syncModal・通知優先・時計・部屋移動は元のappに残る。render/syncModal全体を純粋だと扱わない。

## 変更ファイル

|ファイル|変更|
|---|---|
|`spirit-readout-view.mjs`|表示整形のみの新しい純粋関数|
|`shop-app.mjs`|新import1件とrenderSpirit内の整形呼出のみ。DOM更新の位置/順序を維持|
|`index.html`|app入口に`readout=r1-1`を追加するcache更新だけ|
|`tests/r1-spirit-readout.test.mjs`|固定した元rendererとのDOM操作列・Canvas入力比較、純粋関数、旧保存/自動担当者、入力不変・次の正式操作|
|`tests/formal-copy.test.mjs`|renderSpirit内のliteral検査1箇所を実表示出力2件へ変更。他の検査は維持|
|`tests/r1-browser-spirit.mjs`|immutable baseと候補を両engine/3幅で比較する明示実行script|
|本資料・browser証拠|R1の独立した記録。R0の証拠を更新しない|

`spirit-view`、Canvas/geometry、道具/gesture、全正式モデル、旧fixture、Lab、CI、他の室のUI、Productionは変更しない。

## 単体・DOM・Canvas比較

元のrendererは開始mainから抽出してtest oracleに固定し、そのSHA256も検証する。候補から期待値を生成し直さない。

- 初期/ready、仕込みからrange開始前、採取開始前/中、完了/樽詰め待ち、樽詰め後、legacyの採取前/後/確定、旧保存、実自動担当者を対象にする。
- null/missing readout、進行値不正、profile不正、未来採取開始など、既存APIがnullへ落とす状態でも比較する。合成境界と保存可能な状態を区別する。
- 14状態×3modal条件で、実際の元/新renderSpiritのDOM書込順序と、変更しないCanvas読戻し結果が一致する。estimate/forecast/confirmed/filledの古い分岐、axes欠落/空/2本も比較する。
- hidden時の古いDOM値保持、panel不在ならreadoutを呼ばないこと、freezeしたreadout/context/gameの不変、繰返し表示前後のserialize、復元後と次stepの完全一致を検査する。
- 古い保存は既存bottling-policy-legacyの実raw、自動処理はR0の合法公開操作traceから取得する。新しい巨大fixtureは不要。

formatterの入力契約は既存readout projection。数値のない任意の偽readoutを回復/補正しない。偽readoutがthrowするまでの部分DOM書込まで再現するlazy getter等は導入しない。合法な旧保存や既存APIが生成する有効値/nullの表示結果を比較する。

## 正式状態・保存の保護

R0の129途中状態・20旧cut状態/個別cold・合法旧保存・RNG/月次/経済/通知・generic/candidate保存失敗policy・notice優先順のテストを、その期待値/fixtureを変えずに使用する。正式計算の途中値と操作履歴/serialize文字列も比較する。表示関数がゲームを直接参照しないことに加え、appの変更範囲外が元のsourceと完全一致することも確認する。

## キャッシュ

新しいapp importは`./spirit-readout-view.mjs?v=refactor-r1-1`。入口HTMLのappには`&readout=r1-1`を加える。新moduleのuiText importはapp/Canvasと同じ`?v=stage4-r2&rooms=stage3-r1&aging=1`。正式model・CSS/画像・旧7入口は更新しない。

R0の依存graphをそのまま使い、新moduleまでの到達、版付きidentity、更新伝播と既存shared identityを確認する。old1h-cacheからの実browser reloadでは、旧5c04のappを読んだ同一originを候補へ切替し、新app/新viewの取得と正式state不変を検証する。cache全消去や強制全無効化は行わない。

## ブラウザー比較条件

ChromiumとLinux WebKit、360×568・375×620・390×680、seed42、固定日時・仮想時計・font ready・DPR3・reduced-motion条件を揃える。beforeRootは開始mainの独立git archive。単にBASEというlabelを記入せず、source/描画/font等のbefore bytesとGit blobの一致を検証する。

ready、仕込み前後、レバー/countdown、採取中、終了/統合樽選択、選択変更、樽詰め、保存/再読込を比較する。nativeの採取中はreadoutが意図的にhiddenなので、合法な旧モードを正式な境界操作で採用したlegacy estimate/confirmedの実可視表示も含める。原酒の値をブラウザーへ注入して見た目だけ作る方法は使わない。

PNGのencodingが違う可能性を考慮し、decoded RGBAで差分pixel数を比較し許容差は0。DOM/読み上げ、Canvas描画値、hit、focus、正式stateも比較する。画素不一致が残る場合は公開しない。結果・画像・固定条件はbrowser証拠を参照する。

## 残るリスク

物理iPhone Safari・VoiceOver・実OSのbackground・作者による触感は未確認。Linux WebKit成功を実機成功へ読み替えない。全歴代配信からのcache移行を網羅する試験ではない。今回の抽出利益は表示整形の局所化と検証可能性であり、DOM→Canvasの結合や三室controller分離まで解消したとはしない。

## 最終結果

|検証|結果|
|---|---|
|全root回帰|157 test files、1179/1179成功、失敗/skip0、294.905秒。既存販売browser2件も有効環境で実行|
|R0基準|129途中serialize/RNG/月次/経済/通知、20旧状態と20個別cold、旧保存/移行、保存失敗policyと正式通知優先順は期待値を変えず成功|
|新表示単体|6テスト成功。14状態×3modal、古い表示phase/axes、panel不在/hidden、実旧保存/自動処理と次stepを比較|
|独立レビュー|22/22成功、skip0。純粋性/書込順/hidden旧値/format/cacheの重大未解決指摘なし|
|Chromium + WebKit|13状態×3幅×2engineの156取得。78組のdecoded差分pixel0、encoded PNG hashも全78一致|
|DOM/Canvas/操作|78組でreadout/メーター/a11y/Canvas/hit/focus/正式state/保存bytes一致|
|旧1時間cache|両engine成功。Chromium110resources中108cached、WebKit109中107cached、新app/readout=r1-1と新view/refactor-r1-1取得|
|原典不変|app/index以外の既存536パス不変、appの新import/renderSpirit以外不変、indexはapp queryのみ|

[全域集計](test-results.json)、[原典不変](source-invariance.json)、[browser結果とprovenance](browser/results.json)、[代表36画像のhash一覧](browser/screenshots.json)、[実行ログ](browser/run.log)を参照。

browserの比較元11ファイルはGitの開始main blobと実bytes/SHA256を照合した。新viewはbeforeに存在せず、afterのhashを記録。候補自身を比較元にしていない。

検証scriptの初回修正は製品不一致ではなく、復元済みfillingは自動再表示しないためopen-fillを明示、warehouseで存在しないtool datasetをnullとして記録、dialog.closeのnative focus task完了前の取得を避ける共通待機、の3点。focusはimmutable base同士の13状態自己比較も成功。両側に同じ50ms実event-loop待機と40ms仮想frameを用い、固定ゲーム時刻・focusの完全比較を維持した。許容差や対象除外は追加していない。

実行例（既存ブラウザーと、開始mainを展開した独立checkoutを指定）:

```sh
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium AMBER_R1_BEFORE_ROOT=/absolute/immutable-base node works/ambertime/tests/r1-browser-spirit.mjs
```

runnerは明示的な比較/証拠生成scriptで、通常test globに含まれない。前後の入力/描画条件を揃え、生成する証拠の保存先を今回のR1に限定する。Playwrightやブラウザーのインストール・製品依存/CI変更は行っていない。cloud-runtime skillのenvironment_status toolとnetwork-policyファイルは当環境では提供されておらず、接続準備を推測せず実際のGit/ブラウザー実行結果に基づいて確認した。

R2の道具geometry整理へ進める比較基準と小さな抽出例を得た。今回R2は実装しない。R2でも正式モデル/保存/gestureを変えず、描画・hit・入力の同一座標という別の責務を一PRで扱う。
