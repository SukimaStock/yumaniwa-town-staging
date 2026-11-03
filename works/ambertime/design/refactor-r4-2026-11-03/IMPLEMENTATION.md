# AmberTime R4 — 貯蔵庫の樽選択状態を単一所有へ

基準main `75843aa2b6a3b9bf1040970602a4fb4364678ddc`（R3 / PR #772）。着手時にorigin/main取得、R3以降の追加変更なし。PR #768〜#772のmerged/head/merge情報と本文、root/AmberTime AGENTS、Change OS、[構造監査](../structure-audit-2026-11-02/STRUCTURE-AUDIT.md)、[段階計画](../structure-audit-2026-11-02/REFACTOR-PLAN.md)、[R0基準](../refactor-r0-2026-11-03/REFACTOR-BASELINE.md)、[R1](../refactor-r1-2026-11-03/IMPLEMENTATION.md)/[R2](../refactor-r2-2026-11-03/IMPLEMENTATION.md)/[R3](../refactor-r3-2026-11-03/IMPLEMENTATION.md)と実controller/testsを参照した。過去資料・正式fixtureは変更しない。

Standard / WORK / staging-only。事前Lock `.change-plans/ambertime-refactor-r4-20261103/r0.lock.json`、digest `848812146ae28f74056af9c8e345c209cea6c7a0cb9cc906047872aebcaa3203`。最初のcommitはLockのみ。今回の明示的指示に基づき、レビュー・必須CI後の通常Stagingマージまで実施する。R5とProductionは対象外。

## 現行の12操作経路

参照位置は基準mainのshop-app.mjs。理想的な順序へ整形せず、実際の順序を記録する。選択ID自体は非保存だが、選択操作のhandlerには正式試飲終了とsaveがあり、その効果は残す。

|段階/発生元|一時UI・modal|正式操作/保存・通知|描画・時計・戻る/再読込|
|---|---|---|---|
|1 貯蔵庫へ nav→selectRoom(608)|roomのみ更新、選択ID維持。modal中はguardで移動不可|endTaste→save。room/選択IDは保存envelopeに含まれない|market/countdown取消→stopClock、手動蒸留中はuserPaused=true→render→schedule。部屋だけで時計を止め続ける仕様ではない|
|2 cask-rack click(1047)|実樽存在/!modal guard→selectedID→inspect modal|endTaste→save。選択操作でも既存saveは実行|stopClock→状態設定→save→render→schedule。inspect中はblocked|
|3 render(948〜1006)|選択不在なら先頭樽/null→formal tastingIdがあれば上書き→syncModal内decision選択。その後DOM/Canvas|熟成/蒸発/feedback/前回情報は正式stateと既存viewから読取。選択補正自体に正式操作/保存なし|選択はrack/inspect/Canvasへ同じ値。部分瓶詰め後は現存樽維持、消失時は先頭へ。空ならnull|
|4 情報/履歴(1162〜)|inspectは選択と同時。帳面はmodal.caskId/parent/scroll/returnFocusIdを別責務として保持|履歴表示自体は正式操作/保存なし。worker/projection読取を維持|openLedgerDetail→render/scroll、戻るはparentとfocus復帰。選択IDへ帳面の全対象を同期しない|
|5 trial(id)(704)|実樽guard→選択ID/warehouse/inspect|別樽試飲中ならendTaste→act(sampleDistillery)。正式samples/history/tastingIdをmodelが更新|stopClock→actの正式操作/保存→render→schedule。選択対象の複製履歴は作らない|
|6 試飲結果/end(1068)|inspectを維持。通常end-tastingはact(endTasting)。ledgerParent付きは既存復帰|generic actはmemory→after→save→成功時のみ通知/noteMap/afterSave。試飲結果/費用/前回は正式model|tasting/modalでblocked。inspect閉/Escapeはact(endTasting,modal=null)。再読込は正式tastingIdから選択/inspect復帰|
|7 前回/別樽比較(172/999〜)|前回はD.comparisonのcurrent/previousで独立UI選択なし。別樽比較はmodal.otherId/parent/returnFocusId|nearby/comparisonの読取のみ。選択/戻るで正式操作/保存なし|stopClock→cask-picker/comparison→render。戻るcloseComparison→parent/render/schedule/restoreLedger|
|8 quoteModal(705)|実樽guard→quote modal|active瓶詰め予約だけact(pauseBottling(endTasting(...),true))で正式操作/保存。それ以外は試飲を終えずmodal切替だけ|stopClock→renderまたはact→render。正式tastingIdをUI draftとして消さない|
|9 本数/条件(729/1093/1230)|modal.bottleCount/brandDraft/brandDraftConfirmed/committing。初期本数は正式operationDefaultsまたは既存default|quote/max/affordable/cashは既存API。select/+/-/全部は一時値だけで保存なし|既存updateBottleSelectionでDOM更新、正式量/費用/在庫/担当者条件は再計算しない|
|10 瓶詰め確定/取消(1236)|guard→quote→selection copy→committing=true。afterはproduct選択/sales/modal=null|generic act(bottleBranded(endTasting(...)))。afterは保存より前。失敗時もmemory/room進行済の場合あり。model throw時だけ同quoteのcommitting解除|取消はmodal=null→render→schedule。tastingIdが残ればrenderがinspect再open。試飲なしなら通常貯蔵庫へ|
|11 貯蔵庫へ戻る|瓶詰め成功はsalesへ。navの既存selectRoomでwarehouseへ。部分残量ならID維持、消失なら先頭/null|在庫/費用/履歴は正式操作結果。表示のために樽順序を変更しない|save/render/scheduleの既存順。選択値は保存せずreload時はtastingId??先頭|
|12 別樽へ切替|modalを閉じてからrack clickの既存経路|選択ID以外の正式識別/順序は不変|樽なし/1本/複数は同じ整合規則。focusはorigin→同object→現navの既存復帰|

### 保存とlifecycleの既存差

`save`はserialize→旧raw照合→setItem→readback照合。失敗時はcanSave=false/stopClock/既存エラー表示。generic actは正式memoryとafterを保存前に適用するため、quota/拒否write/readback/他タブ競合で失敗してもmemoryを常にrollbackするわけではない。瓶詰めをcandidate方式へ改めない。一方commitFillは保存成功後にのみ新gameと最新樽選択を公開する。両方式の違いを保持する。

hidden/pagehideはsuspend→market/placement/countdown取消→stopClock→必要pause→save→render。復帰はrender/schedule。storageイベントはcanSave=false後suspend。選択IDはこれらの入口で独自resetしない。boot開始でもresetせず、成功箇所だけtastingId??先頭??null。preview bootはrenderによる整合に任せる。reset handlerは元の位置でnullにする。

## 分類と今回の所有者

|状態/責務|変更前|変更後/判断|
|---|---|---|
|selectedCaskId|rootのlet、複数の明示代入|warehouseRoom closureのselectedId一つ。read-only getter、select(id)、reconcile(casks,tastingId)|
|樽不在fallbackと試飲対象の選択|renderの連続2処理|同位置でreconcile。strict ID一致のfind→先頭/null→tastingId非null上書き。同じ順|
|正式tastingId/samples/comparison根拠|正式model|移さない。controllerへtastingIdの値だけを渡す|
|識別/量/熟成/蒸発/味/費用/在庫/operations/save|正式modelとrootの既存正式操作|移さない。casks配列は読取のみ、保持/コピー/並べ替えなし|
|inspect/帳面/比較対象とparent/focus|root/modal/既存view|移さない。選択と違う寿命・復帰経路を持つため無理に統合しない|
|quoteの本数/brand draft/committing|root/modal|維持。正式operationDefaultsとの関係・保存前後の効果があり今回まとめない|
|decision/正式notice/全modal優先|root syncModal|維持。reconcileより後にdecisionが選択を上書きする旧順序|
|clock/save/lifecycle/部屋移動/DOMCanvas|root/既存runtime/view|全て維持。新controllerはこれらへの参照・callback・importを持たない|

既存のcask-detail-view/tasting-view/nearby-comparison/comparison-modelは表示projectionを担当し、選択所有者ではない。既存viewへ状態を混ぜず、13行の専用controllerでIDだけを所有する。rootへ同じIDの永続mirrorは置かない。選択のguard/正式操作/保存位置を共通helperで動かさず、元の位置からselectを呼ぶ。

### 変更ファイル

製品は新`warehouse-room-controller.mjs`、rootの所有者参照置換、indexのapp query追加だけ。既存`r0-distill-host`/`r0-notice-priority`/`r3-preparation-controller`/`rooms-stage1`のVMへ実controllerを接続し、元のimmutable側globals・期待値・ケースは維持。`rooms-stage3`の既存fulltext-route検査は同じopenModal経路の新所有者名へ追従。新R4単体・実root副作用比較・browser scriptを追加。既存fixture/model/view/R0〜R3資料/Canvas/R2座標/R3controller/Lab/CSS/CIは変更しない。

app body/import変更をindexの`warehouse=r4-1`へ伝播し、新importは`warehouse-room-controller.mjs?v=refactor-r4-1`。不変view/Canvas/CSS/画像/workerのidentityを一括無効化しない。

## 検証結果

開始mainのroot159ファイル、1,193/1,193成功、失敗/skip/cancel/todo0、154.937716秒。Chromium140の既存販売browser2件も環境変数を指定して実行した。[before-tests.log](before-tests.log)。R3からテスト数の差はない。

選択単体4件は、immutable app SHA256を固定した元inline状態と、empty/one/multiple/stale/string ID/試飲強制/取消後維持/消失fallbackの全列を比較。合法な正式APIで作った樽・試飲・部分/全部瓶詰め・旧保存restoreの前後serialize/order不変と復帰を確認。effect依存をthrowするhostでも動作し、setter禁止/インスタンス独立を検査する。rootの宣言・代入・render整合を逆変換すると基準main原文とbyte一致、indexもquery以外一致。[source-invariance.json](source-invariance.json)で既存保護pathのGit blob一致を記録。

追加の実root比較、全域、ブラウザー、独立レビュー、CI・公開結果は実測後に追記する。未実行を成功としない。

## 保留と次段階

比較modalのotherId/parent、帳面対象、quote draft、正式試飲/瓶詰め、保存helper、通知/clockは今回移さない。選択と同時に移すとcallbackと同期箇所が増え、既存の正式effectを追いにくくなる。R5はこの境界を維持して読取専用modal familyから検討できるが、今回実装しない。

物理iPhoneの指感覚、VoiceOver実音声、非ゼロsafe-area、OS toolbar/background、実BFCache hitは、実際に観測しない限り未確認。ARIA一致を実音声成功とは呼ばない。R3で公開Chromiumが証明書エラーだったことを今回の成功へ読み替えない。
