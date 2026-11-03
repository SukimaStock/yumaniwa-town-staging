# AmberTime R6 — Canvas更新経路の監査

基準: `2ff8aba1287f1e7aba7ceb902cfaef5df1c9dd79`（PR #774後main）。以下の行番号はこの基準の `works/ambertime/` 内ファイルを示す。監査時点の実装を記録し、望ましい新仕様へ読み替えない。R6では製品コードを変更しない。

## 所有責務

|区分|実在する所有者|境界|
|---|---|---|
|A 純粋な幾何・描画用計算|`canvas-layout.mjs:1–40`と後続notice/collection/feedback helpers|viewport、論理rect、CSS投影、hit判定、文字列を受ける配置計算。正式時計・保存・DOMなし|
|A 形・色・描画部品|`distill-tools-view.mjs`、`cut-bar.mjs`、art/symbol/text helpers|既存TOOL_GEOMETRYと3pxセル。描画部品は渡されたcontextへ描くが、正式モデル・保存へ効果を持たない|
|B フレームの開始・停止・再要求|`canvas-scene.mjs:22–58,133–227`|CanvasSceneの一つのRAF、3つのbounded timeout、font gate、visibility/page lifecycle、現在のviewを使う描画|
|B 到着演出の一時状態|`room-motion.mjs`|新しいcask/release IDだけをobserveし、表示状態とperformance時刻からsample。正式gameやsaveを参照しない|
|B フォント準備・回復|`font-loader.mjs`、`font-uniform.mjs`|既存Misakiのready/fallback/retryと表示metrics。新フォント・文字方式を導入しない|
|C アプリとの接続|`shop-app.mjs:926–1018`|正式状態とR3/R4 controllerを読み、DOM/ARIAを更新し、明示的なviewをscene.updateへ渡す|
|C 正式進行・保存・modal|`shop-app.mjs:499–543,575–595,686–687,1227–1229`、`runtime-clock.mjs`|操作・保存時点・割込順・ゲーム時計はroot。Canvasへ移さない|
|C 販売・地図の既存adapter|`market-ui.mjs`、root syncModal/地図label処理|販売DOMの演出・scroll RAFと地図Canvasは別経路。CanvasSceneのloopへ統合しない|

CanvasSceneクラス全体は純粋Aではない。DOMの移動、透明操作領域、ARIA、dataset、dialog位置、notice位置も扱う既存adapter/rendererである。Aのhelpers、Bのscheduler、Cのrootという境界を記録するが、形式的に3クラスへ再分割しない。`canvas-motion.mjs`は存在せず、実在するのは`room-motion.mjs`。

## 発生元から実描画まで

|発生元|正式状態・表示データ・DOMの経路|描画要求・実描画・時計|
|---|---|---|
|ゲーム起動|app1283でCanvasScene生成。boot(app1255)が復元/初期化しrenderへ。renderが正式game/controller/既存viewを読んでDOMとviewを作る|constructor resize→queue。scene.update→queue。fontSettled以前はdrawしない。正式時計はboot/root schedule|
|部屋切替|app591 selectRoomがmarket/countdown取消→stopClock→必要な手動pause/endTaste→room→save→render|scene56 updateでlayout/room/ARIA/summaryを更新→queue→draw。root scheduleが既存blocked条件で再開|
|蒸留開始|app585 startFromLever→既存仕込み確認/StartCountdown→正式act→save→render。countdown値変更(app83)もrender|Canvasは渡されたcountdown/phase/toolsを描く。3→2→1はStartCountdownの1000ms timerであり、Canvasの時計ではない|
|蒸留中・完了|app514 scheduleのtimeoutがD.distillStep/停止/月次/保存を実行。app529以降でrenderまたはrenderProgress|蒸留中は新cutRange/tools/readoutをscene.updateへ。停止/結果modalの決定はroot。Canvasのstill400ms演出で正式stepを進めない|
|レバー操作|app1286 DistillToolInput.onChange→scene54 setToolGesture。onActionだけroot startFromLeverへ|一時leverStepのqueue→draw。3姿勢/guide/復帰は既存TOOL_GEOMETRYと描画helper。正式開始・保存をsceneは呼ばない|
|グラス移動|同じinput→setToolGesture。root finishDistillation(app575)が正式採取開始/終了を決め、renderがglassPositionを渡す|dragはCSS offset/scale。view端点変更で140ms toolSlide、gesture解放時も既存transition→queue。移動中hitは既存endpointとpointer captureの契約|
|カットバー・液面|root1003–1015のreadout/collection/tools projection|scene.update→drawCutBar/既存liquid描画。Canvasは正式量・味を再計算しない|
|樽選択|app1030でR4 controller selectedIdとinspect modal設定、既存endTaste/save/render|rootからinspectId/cask selectedを渡す。scene.controlsでDOM hitを投影し、drawで現在の樽/グラス。選択IDの第二所有者を作らない|
|試飲|app687 trial→root act(sampleDistillery)/save→render。試飲終了も正式API/root|sceneは渡されたinspectId/樽だけ描く。帳面内容と正式履歴は既存projection/worker/root|
|瓶詰め|app1219–1224 guard→act(bottleBranded(endTasting(...)))。既存after/save policyでsales/選択/modalを処理|render→scene.updateの新release IDsをRoomMotion.observe。到着演出は正式瓶詰めを発行しない|
|販売室への移動|root selectRoom/render→scene viewとapp1017 marketUI.update|store-marketは主にDOM board。Canvas背景とDOM可視条件をrootが同期。marketUI自身の演出は別の既存経路|
|地図表示|root syncModal app893でpaintKey比較→必要時drawGameMap。label/hitもroot。app676 observeMapLabels|地図Canvasは固定art/markerを描く別経路。CanvasSceneはdialog.open観測で背景を再描画し演出を抑える。地図がscene RAFを所有しない|
|modal開閉|app595/686 openModal/closeModalがcountdown/clock/modal/render/restore focusを所有|scene30がdialog openを監視しqueue。drawのvisible=falseなら演出timeoutを予約しない。優先順や正式notice/saveはrootのまま|
|フォント準備完了|font-loaderがroot datasetを更新しamber-font-changeをdispatch。fontReadyはreadyまたはfallbackでsettle|scene31でfontSettled=true→queue、scene32で回復時もqueue。初期fallback→後のreadyは同じ既存fontへ描き直す|
|viewport変更|scene41–49 window resize、visualViewport resize/scroll。resizeがviewport/Canvas backing/CSS変数/typography/dialogを同期|resize末尾queue→同じ最新viewportでcontrols/draw。pinch時はsceneとvisible dialogの既存扱いを区別|
|DPR変更|computeViewportへdevicePixelRatioを渡し1..3にclamp。上記resize経路で再取得|専用DPR watcherは現行にない。DPRだけ変わりresize等が発生しない条件の自動更新を保証しない。今回追加しない|
|reduced-motion変更|scene25のMediaQueryList change→resetIdle→queue|drawがcurrent matchesを読む。still/guide/return/slide/blinkを既存static表現へ。RoomMotionもreducedをsample。正式時計の速度・条件を変更しない|
|hidden|scene27 visibilitychange→resetIdle→queue。root1227/1229は独立してsuspend|queueがhiddenを検出してRAF/3timeoutを停止。rootはcountdown/clock停止、必要なuserPaused更新、save/render。Canvas停止と正式停止を同義にしない|
|visible|同じscene listenerがidleを再設定。root1228 resumeがcurrent gameをrender/schedule|queue→drawで現在viewを再評価。複数resume要求もRAF一つへcoalesce。hidden中の要求はqueueせず停止する|
|pagehide|scene28 suspended=true→stopDrawing。root1229 suspend|RAF/timeout停止。正式pause/saveは既存rootに残す。破棄/保持のブラウザー判断はCanvasが所有しない|
|pageshow|scene29 suspended=false→resetIdle。rootはevent.persisted時だけresume|毎pageshowでCanvas要求、persisted復帰ではrootもrender/schedule。重複要求は同じqueueで一本化|
|BFCache復帰|pageshow.persistedと現在のvisibilityを上記経路で処理|実hit未確認なら合成persistedイベント/履歴移動と区別。BFCache専用の新しいtimer/復帰機構はない|
|保存・再読込|app saveが正式serialize/conflict/write/readback。bootで正式tastingId等からroot/controller/UI復元|reloadは新renderer/motion/cacheを生成。保存データへCanvas状態を加えない。R0 cold replayは別の正式検証|

## フレーム開始・停止・復帰の条件

`queue()`(scene58)はhiddenまたはsuspendedならstopDrawingしてreturn。既にframeがあれば追加予約しない。RAF callbackでframe=0にし、古いviewをclosureへコピーせず`draw()`で最新this.viewを読む。

`stopDrawing()`(scene57)はpending RAFをcancelしframe=0、hintTimer/selectionTimer/motionTimerをclearしてnullへ。`draw()`(scene134–135)も最初にstopDrawingし、viewなし/font未settled/hidden/suspendedならpaintしない。dialog.open時は背景の静止画は更新できるが、演出用visible=falseで次のtimeoutを予約しない。

|既存演出|次更新の条件・間隔|停止/代替|
|---|---|---|
|pause hint|pauseHint/visible/nonreduced/有効resume control。12,000ms待ち→1,200ms境界|入力/reduced/visibilityでidle再設定。非適格ならtimeoutなし|
|legacy sales選択|visible/sales/nonreduced/選択item。900ms境界|未選択・別室・modal・hidden・reducedでは予約なし|
|蒸留steam/stream|visible/nonreduced/distill/distilling/running。400ms境界|停止時frame0。正式蒸留stepとは別|
|到着|RoomMotionのpending IDs、300ms×6=1,800ms|非表示/別type/対象消失/期限切れでactive破棄。reducedではstaticIdsで示す|
|グラス矢印|既存glassArrowBlink/nonreduced、900ms境界|motionTimerの最小delay候補。visible時のみ予約|
|レバー誘導|visible/distill/tools.visible/arrow/非gesture/nonreduced、120ms|既存leverGuideOffsetとcompletedRuns条件を維持|
|レバー復帰|既存toolReturn、120ms未満、30ms|既存leverReturnStep。非適格/期限経過でclear|
|グラスslide|既存toolSlide、140ms未満、16ms|gesture直追従時または非適格/期限でclear。reducedは端点|

motionTimerはこれらeligible delayの最小一つだけを予約する(scene227)。全演出を常時RAFへ変更しない。`resetMotion()`は既存reset/bootから呼ばれ、通常のvisibility復帰ごとに呼ばれるわけではない。

停止は全animation timestampの強制resetではない。toolSlide/toolReturnとRoomMotionのactiveは、復帰後のperformance.nowとの差で期限判定する。非常に短い非表示では残りの演出を持つ場合がある。この現行挙動を「すべて古い演出を消す」と報告せず、R6で変更しない。

## 正式時計・保存との境界

appのRuntimeClockは整数の正式step用timeoutの遅延を計算する。scheduleはgeneration tokenとblocked guardで旧taskを無効化し、正式modelを呼び、保存/通知後にrenderまたはrenderProgressへ渡す。Canvasのperformance.nowは描画phase用であり、月次・熟成・経済・担当者・評判・RNG・操作履歴を進めない。

`renderProgress()`(app922)→`updateProgress()`(scene107–112)は既存の2 CSS px timebarだけを直接paintできる。fontSettled、!hidden、!suspended、pending RAFなしが条件。ARIAとview.monthProgressは表示用であり、正式elapsed/gameの所有者ではない。full drawとこの経路を統一して再描画頻度を増やさない。

root `suspend()`(app1227)は意図的にcountdown取消/stopClock、手動蒸留時userPaused=true、save/renderを行う。そのためhidden/pagehide前後の保存rawが常に同じという主張は誤り。Canvas自体の正式状態非変更と、rootの既存pause/save効果の前後一致を区別して検証する。generic actとcandidate保存の失敗policyの違いもR0〜R5から保持する。

## DOM・Canvas・フォント・cache

root renderが正式game/selectedId/tools/DOM textを読み、scene.update(view)へ明示的に渡す。scene.updateはlayout、roomラベル、summary、notice、月progress ARIAを同期。scene.controlsはlayout rectから実DOM hitをprojectし、既存44 CSS px最低領域を維持。toolInputはrootから有効条件とtravelを受ける。focus/aria-pressed/modal navigationはroot/DOMのままで、sceneは描画時に読む。

spriteCache(scene15–20)はmarkup/collection/active/frameのkey、size>100でclear。worldKey(scene69–72)はroom/layout/items/inspect/reduced/selection phase/arrival/tools/gesture等から作る。month progressは意図的に除外し、font文字はroom bitmapの外で描く。Canvasサイズ/DPR/文字metricsとDOM typographyは既存resize/font処理。長文のwrap/ellipsisも既存textPieces/measureを使う。

font-loaderは1800ms fallback、最大3回のload、1500/4000ms retryと既存font source再作成を持つ。fontReady後のamber-font-changeでready回復を反映する。visibility/pageshow/online/loadingdoneによるrecoverもfont-loader所有。これらをCanvas schedulerや正式時計へ移さない。

地図のCanvasには既存art/markerを描き、文字labelはDOM。scene font listenerだけを地図Canvas文字再描画の証明にしない。label ResizeObserverの既存同期と合わせて確認する。

## 調査で分かった保留事項

- DPR専用listenerや全componentのdispose APIは現行にない。単一bootの既存appに新しい抽象を追加する利益は今回確認できない。
- 実機iPhoneの指/toolbar/safe-area/VoiceOver、実OS background、実BFCache hitはbrowser合成試験から推定しない。
- fallback前/回復後を含むフォント経路は現行を保持し、フォントを新規取得しただけで全復帰条件を成功扱いしない。
- marketのWAAPI/scroll RAF、StartCountdown、font retryはそれぞれ既存owner。Canvas三timeoutの集計だけでページ全timerを監査済みにしない。
- R6の採用変更は監査記録とpost-R0依存閉包のテスト補強。上記の既存制限を新しい仕様変更として直さない。
