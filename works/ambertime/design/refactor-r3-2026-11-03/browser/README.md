# R3 ブラウザー前後比較

基準main `f7ba8023706be803b1711b3e3374b7e1bf83c4d9`。R2の採取方法を再利用し、今回は仕込み確認の一時状態と、既存の正式操作・保存との境界を比較した。[最終結果](results.json)はengine別の結果、8つのcaptureファイル、source provenance、キャッシュ試験へSHA256で結び付く。診断中のprobeは最終成功数へ含めない。

## 結果

Chromium **140.0.7339.186** / WebKit **26.5**。各engineで次の4条件を実行した。

|viewport|DPR|reduced-motion|
|---|---:|---|
|360×568|1|no-preference|
|375×620|2|no-preference|
|390×680|3|no-preference|
|390×680|3|reduce|

各40状態、変更前後で**640取得・320組**。全320組で、Canvas内部RGBA hash・DOM表示/実client矩形/論理hit・ARIA・focus・pointer trace・正式状態と保存envelopeのhashが一致。スクリーンショットをRGBAへdecodeした画素差はすべて0、PNG原文hashも全320一致。許容差0。代表36 PNG（375px、両engine、before/after）を[screenshots.json](screenshots.json)に記録した。

捕捉した正式状態は、基準mainの公開APIから生成した合法な期待値とdeepEqualし、保存gameもserialize原文に厳密一致させた。quota/conflictは意図的にmemoryとdurableが異なるため、それぞれに別の正式期待値を要求し、差を成功時へ統一しない。元fixture・正式モデル・保存形式・既存テストの期待値は変更しない。R0の129途中状態/旧20/個別cold/旧保存/乱数/月次/通知の広域回帰は親の実装記録を参照する。

## 40状態の操作経路

- 初期、仕込みopen/取消、確認、再編集でdisarm、Escape取消で確認復帰。
- カード選択が既に正式act/saveされること、変更して取消しても正式選択が戻らないこと。旧確認labelは残るがレバーは無効、選択を戻しても未確認のまま、再確認と再読込の差。
- 実36CSS pxレバー→3/2/1では正式startなし→完了後に正式start/save。現行callbackのferment正規化も既存manualCards/selectFlavorCardsの公開APIで期待値へ含める。
- 実glass pointerによる採取開始、既存clockで12stepまで進行、明示pauseによる途中保存、右24CSS px slideによる正式停止と保存後の統合結果。
- 樽選択はUIだけ、取消で未樽詰め原酒を保持、再描画で重複openしない、明示再open、refillの正式保存成功で貯蔵庫へ移動。
- 同じ月の次仕込みは既存仕様で無効。clockを再開して次月まで進めてpauseし、公開tickDistilleryと比較してから、長い発酵の選択・次仕込み確認。
- 合成hiddenによるcountdown取消、実別室移動での取消、蒸留室へ戻った時の準備状態。
- card/startのgeneric保存失敗はmemory更新済み・durable旧状態。既存retry-saveでの回復。candidate樽詰めの失敗は未樽詰め状態・modal・durableを保持。別タブ競合は相手の正式保存を保護し、reloadでdurableへ復帰。
- 合法な旧progressionから明示的な公開migrationを通した自動担当者の稼働状態では、手動レバー/グラスが無効で不要な割込がないこと。

自動fixtureは手書きのflags/opcodeではない。独立したmodel/source確認を経た `newStaffProgression→manual65→fill→month→hire→reserve/begin→stage4→adoptPlacement→store→rules` の合法操作列をrunner内で再現し、strict serialize/restore原文一致も要求する。新しい巨大fixtureは追加していない。

## 同じ描画phaseの採取

固定seed42・2026-11-03T10:00:00Z・fontready。Playwright時計を先にinstallし、ページごとの明示的なperformance.now phaseを設定する。R2と同じく、各phaseの前に既存`amber-font-change→queue()`を通してCanvas更新を待つ。この唯一のlistenerは描画要求だけで、正式状態・保存・font状態を変えない。自然なOS/RAF配信順の認証ではなく、同じphaseの実画素比較である。

capture中はpointerを動かさず、pointerupとcapture解放の実配信を待つ。解放後は両側のcursorを(1,1)へ揃え、button:hoverなしで採取する。native focus処理の50ms実待機では仮想時刻を進めない。3pxグリッド・DPR処理・レバー閾値・140ms/120ms演出は製品で変更していない。

## キャッシュとsource

基準mainの17ファイルをGit blobと実bytesで検証した。新controllerは基準には存在せず、候補のbody hashを別途記録する。公開入口と親importが変わったapp、新controllerの実取得とSHA256を同一origin旧1時間cacheから確認した。

|engine|reload後resource|cache hit|freshな変更資産|
|---|---:|---:|---|
|Chromium|111|109|shop-app `preparation=r3-1`、controller `v=refactor-r3-1`|
|WebKit|110|108|同上|

R2のtools/input/layout/scene等の不変資産を一括無効化しない。両側の正式snapshotも一致。これは今回直前のmainからの更新試験であり、全歴代入口や全Labのcacheを試したとは扱わない。

## 環境・診断・未確認

実行環境のbrowser binariesは前回から失われていた。公式Playwright installerでChromium140（scratchのPlaywright1.55.1 CLI）とWebKit26.5を復元し、各々で実launch・button clickを確認した。WebKitの不足ライブラリはUbuntuの署名付きInReleaseとPackages/debのSHA256を検証し、scratchへ22packageを展開してLD_LIBRARY_PATHで使用した。製品依存/CIやOS packageは変更せず、apt sandbox・proxy・TLSの保護を無効化していない。[環境記録](environment/runtime.json)、[依存の出所](environment/webkit-dependencies.json)を参照する。

初期のハーネス前提違い（旧自動保存の明示migration、countdown採取ms、手動start時のferment正規化、同月2回目の仕込み不可）は[診断](diagnostics/harness-review.json)へ記録した。製品をテストに合わせて変更していない。自動fixtureの反復は3回で止め、独立レビューが確認した合法chainを使用した。

物理iPhone Safariの指感覚、非ゼロsafe-area、OS toolbar/background・VoiceOver・実BFCache hitは未確認。合成hiddenと実room navigation/reloadを、それらの実機成功と呼ばない。R2の座標/入力モジュールは不変で、その3姿勢/短い・逆方向drag/cancel/multitouch/keyboard/geometryテストもroot suiteで維持する。

再実行例（実在するbrowser/runtime/immutable checkoutを指定する）:

```sh
AMBER_R3_BEFORE_ROOT=/absolute/immutable-main \
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs \
AMBER_BROWSER_EXECUTABLE=/absolute/chromium-headless-shell \
AMBER_WEBKIT_EXECUTABLE=/absolute/webkit-wrapper \
node works/ambertime/tests/r3-browser-distill.mjs
```

`AMBER_R3_ENGINES=chromium` と `AMBER_R3_RESULTS_FILE=results-chromium.json` 等でengine別に独立実行できる。runnerは通常root test globとは別の明示実行scriptであり、過去R0/R1/R2の証拠を再生成しない。最終実行runner SHA256: `dd829b6b52e5dac2169172afeb9f42df4a902369fe77e146eb53c8cbbc2a2e24`。
