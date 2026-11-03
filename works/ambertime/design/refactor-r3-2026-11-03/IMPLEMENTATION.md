# AmberTime R3 — 仕込み確認の一時状態を分離

基準main `f7ba8023706be803b1711b3e3374b7e1bf83c4d9`（R2 / PR #771）。着手時にorigin/mainを取得し、R2以降の変更なし。[構造監査](../structure-audit-2026-11-02/STRUCTURE-AUDIT.md)・[段階計画](../structure-audit-2026-11-02/REFACTOR-PLAN.md)・[R0受入基準](../refactor-r0-2026-11-03/REFACTOR-BASELINE.md)・[R1記録](../refactor-r1-2026-11-03/IMPLEMENTATION.md)・[R2記録](../refactor-r2-2026-11-03/IMPLEMENTATION.md)とPR #768〜#771の履歴を照合した。

事前Lock `.change-plans/ambertime-refactor-r3-20261103/r0.lock.json`、digest `7a7034f12e7c209d0198ac339fcde73ea768bd3a4791f07423091295bd96db58`。最初のcommitはLockだけ。Standard/WORK、Stagingのみ。過去資料・正式fixture・Productionは変更しない。

## 現在の10段階と実際の順序

参照行は変更前mainの`shop-app.mjs`。UIが理想的にあるべき順序ではなく、既存コードが実行する順序を記録する。

|段階/発生元|一時状態・正式操作と保存|描画・時計・modal・取消|
|---|---|---|
|1. `#start-distill` click（1063）|guard→message消去→現在のpreparedを記憶→prepared=false。正式操作/保存なし|`openModal('flavor-cards')`（611）でcountdown取消→stopClock→modal設定→render。成功したmodalにpreparedAtOpenを付ける|
|2. `handleModal` flavor-card（1166）|chooseManualCard→`act(D.selectFlavorCards)`。**カードクリックで正式状態・操作履歴・保存が変わる**|actがcountdown取消/clock停止→モデル→save→成功通知等→render→schedule。取消でこの正式選択を巻き戻さない|
|3. flavor-start「決める」（1167）|manualCardsのコピー+batchをconfirmationへ→prepared=true→preparedFor=batch。**正式操作も保存もない**|modal=null→render→schedule。rootがそのまま担当|
|4. currentDistillTools（597）|preparedかつ確認対象batch一致を読む。正式canStart、予約、phase等は既存view判定|modal/hidden/save可否・countdown等を使ってレバー表示/有効性を更新。DOM/Canvas経路は維持|
|5. inputのlever action（1302）→startFromLever（601）|leverEnabled guard。期限切れは既存restartのact。それ以外はprepareDistillation|guard→stopClock→modal=null→countdown.start。通常3秒、取消時に正式操作/保存はない。preparedも消さない|
|6. StartCountdown完了（80）|3→2→1→null→`act(start,after)`。stage4ではmanualCardsの発酵と正式cardsが違う場合に既存D.selectFlavorCardsを先に適用し、D.startRangeDistillation（旧方式はD.startDistillation）を適用。afterがuserPaused=false/prepared=false、**次に保存**|成功通知等→render→schedule。保存失敗でもgeneric actの更新済memory/afterは戻らない|
|7. inputのglass action→finishDistillation（591）|collection.enabled/未採取/canStartなら`act(D.beginCollection)`|座標・tap/slide・最小幅等は既存input/model。rootのact→save→通知→render→schedule|
|8. glass終了→finishDistillation|phase/modal/canStop（旧方式はminimumStop）guard→`act(D.stopDistillation,null,afterSave)`|message消去は保存成功後callback。最小採取12stepは正式API判定を保持。失敗時は成功通知/自動fillを出さない|
|9. render→syncModal（749）|正式notice/saveがある割込優先経路。試飲/decision→staff→trade→shop→generation→fill→map|手動filling・spirit・shownFillSpiritId・canSave/preview等の既存guardで統合結果を開く。閉じても正式spirit保持、同じspiritの再描画では自動再表示しない|
|10. fill-select（1225）→fill/commitFill（569）|樽選択はmodal.fillTypeのみ。commitはD.fillBarrel→serialize候補→writeCandidate→**成功後だけgame公開**→通知|modal=null→warehouse/新樽選択→message消去→render→schedule。失敗時は旧game/spirit/modalを維持し再開しない|

### 保持する取消・再読込の細部

- 仕込みを変更せず戻る場合、元preparedと有効confirmation・現在カード一致によってpreparedを復元する。
- カードを変更して戻る場合、正式選択とその保存は残り、prepared=falseになる。旧confirmationは消さないため、確認済みの旧表示が残る場合がある。今回これをUI改善として変更しない。
- 変更して元へ戻してから取消するとpreparedを復元できるが、2回の正式選択と保存履歴も残る。
- render（945）はphase/batch不一致で**confirmationだけ**を失効する。preparedやpreparedForDistillationは同時resetしない。
- reset（1247）/boot（1272）はpreparedとconfirmationを消すが、休止中のbatch markerは保持する。controllerのresetもその挙動を維持する。
- 復元済みfillingはboot（1290）がshownFillSpiritIdを設定し、未樽詰めspiritを保持するが、結果modalは自動再表示しない。既存open-fillから再開する。
- 別室移動・hidden/pagehide・storage競合・reset/bootの時計/保存/取消処理はrootに残る。reduced-motion、R2の18/36 CSS px・63論理px・44 CSS px hit・140ms/120msも一切変更しない。

## 分離対象と所有者

新しい`distill-room-controller.mjs`は、仕込み確認の一時状態だけを所有する。3つの旧root変数を二重に保持せず、所有場所を一つに移す。純粋な表示formatterとは異なり、小さな状態付きcontrollerだが、正式状態を所有しない。

|対象|変更後の所有者|境界|
|---|---|---|
|prepared / preparedForDistillation / confirmation|createDistillRoomControllerのclosure|必要なcards、batch、phase、有効confirmation projectionだけを引数で受ける|
|modal.preparedAtOpen / fillType / shownFillSpiritId|root|モーダルの一時状態をcontrollerへ重ねない|
|正式カード・開始/採取/終了・味/量・樽詰め・操作履歴|既存modelを呼ぶroot|正式API・dispatch・確定/保存順を移動しない|
|countdown / gesture途中 / Canvas演出|既存StartCountdown / DistillToolInput / CanvasScene|今回のcontrollerはタイマー、座標、描画を持たない|
|保存transaction、失敗policy、通知、時計、modal優先・部屋移動・初期化・担当者|root|既存effectful経路を保持|

controllerにはimport・callback・DOM・storage・時計・乱数・正式操作がない。factory一つ、getterと明示的な遷移だけで、イベントバスや汎用state frameworkを作らない。

- `beginEdit()`：旧preparedを返し、prepared=false。rootが従来どおりmodalへ旧値を記録する。
- `confirm(cards,batch)`：旧コードと同じcopy/代入順で確認状態を作る。
- `cancelEdit(preparedAtOpen,choice,draft)`：rootの既存brewingPanelStateで検証したprojectionと現在カードを比較し、preparedだけを変更する。
- `isPreparedFor(batch)` / `confirmation`：既存viewが読む値を提供する。
- `clearPrepared()`：正式開始のafter位置で、preparedだけを消す。
- `invalidate(phase,batch)` / `reset()`：上記の既存の失効/reset条件だけを実行する。

### 今回残した範囲と理由

レバー開始要求、countdown orchestration、採取dispatch、統合結果の優先順位、樽詰めtransactionは分離しない。これらを同時に移すとreadState/dispatch/stopClock/save/render/schedule/modal等のcallbackが増え、正式操作の所有者と保存順序を追いにくくなる。確認状態のライフサイクルだけならcallbackなしで境界が明確になる。R3で蒸留室全体を分割したとはしない。

`act`はモデルを先にmemoryへ適用し、after→save→成功時の通知/afterSave→render→schedule。一部の保存失敗ではmemoryを戻さずtrueを返す。`commitFill`等candidate方式は保存成功まで旧gameを維持する。例外の握り潰し、保存の再試行、両方式の共通化は行わない。

## 変更ファイルと依存

|ファイル|変更|
|---|---|
|`distill-room-controller.mjs`|一時的な仕込み確認だけの新規controller|
|`shop-app.mjs`|旧3変数の参照/代入だけを、同じ場所のcontroller呼出へ置換|
|`index.html`|app入口へpreparation=r3-1を追加|
|`tests/r0-distill-host.mjs`|実root関数のVMへ実controllerを接続。正式API/fixture/assertionは維持|
|`tests/distill-tools-view.test.mjs`|同じbatch gating検証へ実controllerを接続|
|`tests/r0-notice-priority.test.mjs`|candidate render前半へ実controllerを接続。immutable baseの旧globals/期待値は維持|
|`tests/r3-*.mjs`|新controller・実rootの差分/副作用順・ブラウザー比較|
|本R3資料・証拠|過去資料を上書きしない独立記録|

新依存はapp→`distill-room-controller.mjs?v=refactor-r3-1`だけ。controllerからの依存はゼロ。appのbody/import変更を入口queryへ伝播し、他の親・Canvas/input/tools/CSS/worker等の不変identityは更新しない。既存Labのsource/URLは変更しない。

## 検証

開始mainの全root158ファイル1,186件を、今回復旧したChromium140.0.7339.186で既存browser2件も含めて実行。全1,186成功、失敗/skip0（158.787秒）。R2記録のChromium153とは実行環境が異なるため版を記録し、今回の前後比較は同じengine/版/条件で行う。

以下に候補の実測結果と独立レビューを記録する。公開後の結果は最終SHAとともにPRへ残す。

### 全域・単体・副作用の順序

[test-results.json](test-results.json)と4つの実行ログを保存した。変更前158ファイル1,186/1,186成功（158.787秒）、候補159ファイル1,193/1,193成功（168.378秒）。いずれも失敗/skip/cancel/todo0。今回は新7件も含む単一root globで候補全域を実行した。既存販売browser2件も環境変数を指定して実行し、skipなし。

新7件はimmutable f7baのapp source SHA256 `604208174263d5a804b92e764a9eba0df76f0cb7b80b8dca95827dc8c8769913`を検証し、元の3変数/実handlerと実controllerへ置換したhandlerを比較する。StartCountdownも実class、正式操作・serialize・writeCandidate・通知eventも既存APIを使う。カード選択の正式記録、確認時の保存ゼロ、変更/変更戻しの取消、3tickと取消、採取12step、結果の閉/再開、樽選択/樽詰め/次月の次仕込み、quota/拒否書込/他タブ競合/modelthrow、hidden/別室、期限切れ、旧保存/実担当者trace/再読込で、各途中のmemory・durable・通知・描画/時計要求の順が一致する。正式計算をtest controllerへ再実装しない。

R0の129途中状態（serialize原文・operation履歴・RNG・月次・経済/在庫/費用・担当者・通知順）と旧蒸留20状態/20個別cold、旧保存の受理/拒否/再生を既存期待値・fixtureのまま成功。generic actとcandidate保存の失敗時の違いを維持した。

3つのVM portは既存assertion・ケースを維持。最初の接続で非stage4の合法な担当者状態にmanualCardsを余計に呼び失敗したため、旧portが持っていたprepared/batchだけを`confirm({},batch)`で用意する接続へ修正した。製品の初期化は空controllerのみであり、この読取を追加していない。新testの次の仕込みも同月可能と仮定せず、既存のD.tickDistillery境界を明示して比較した。これらの初期ハーネス問題を製品修正で通していない。

[source-invariance.json](source-invariance.json)で、rootの変更を宣言した状態操作への置換だけ逆変換すると基準appとbyte一致し、index変更もqueryだけであることを確認。許可したapp/index/3port以外の既存3,625path（runtime等508、tests/fixture477、過去design2,640）はGit blob完全一致。正式モデル・保存形式・入力・Canvas・R2 geometry・文言・CSS・Lab・過去資料を変更していない。

独立レビューでは新7件を別途実行し7/7成功。12の既存effectful/control関数（save/act/actMarket/commitFill/finishDistillation/startFromLever/selectRoom/openModal/syncModal/suspend/resume/schedule）のbyte不変、逆変換によるroot全体の一致、保護3,625path、Scope/Risk/Impactを独立に再確認し、重大未解決指摘なし。browser証拠の最終照合結果は下記に記録する。合法なformal gameは通常のplain fieldを持ち、controller引数の評価で時計・乱数・保存が発生しない。任意のgetter/proxyを付けた偽gameオブジェクトの短絡評価まで再現するためのcallback等は増やさない。

### ブラウザーの操作・画素・状態

Chromium140.0.7339.186 / WebKit26.5を使用。360×568/DPR1、375×620/DPR2、390×680/DPR3、390×680/DPR3 reduced-motionの4条件×2engine、各40状態で640取得/320前後比較。[browser/README.md](browser/README.md)、[全結果](browser/results.json)、8条件のcapture JSON、36代表PNGとmanifestへ固定した。全320組でCanvas内部RGBA hash・decoded PNG画素差0・PNG原文hash一致。DOM表示/実hit・aria・focus・pointer・正式snapshot・保存rawも前後で完全一致した。

初期未確認、麦芽/発酵選択、確認、再編集/取消、選択を戻しても未確認を維持する経路、確認後再読込、別室/hidden、実レバーと3→2→1→正式開始、採取開始/12step/終了、統合結果/樽選択/取消・再表示、正式樽詰め/貯蔵庫、同月の次仕込み不可/次月の確認、合法自動担当者、generic/card保存失敗とcandidate樽詰め保存失敗/他タブ競合を比較した。失敗時にはmemoryとdurableが異なる既存policyを比較しており、両者を常に同じにする検査ではない。UI以外の正式操作・計算は既存APIを使用する。

固定seed42、同じ合法rawと時刻、fontready、DPR、明示animation phaseで比較。R2と同じ時計登録順・既存amber-font-change→queue()・解放後neutral pointer・native pointer capture/up待機を使う。後付けの許容差は0のまま。合成hidden/取消等とOSの実発生は区別する。runner実行時SHA256は `dd829b6b52e5dac2169172afeb9f42df4a902369fe77e146eb53c8cbbc2a2e24`。

初期の比較用シナリオの誤りも記録した。countdownの採取frame分を含めた時刻計算、locked発酵の開始時の既存selectFlavorCards操作、樽詰め直後の同月canStart=falseを、元コードと公開APIに従って修正した。自動担当者のfixtureは3つの無効な構築を止め、独立したモデル確認で既存の合法なstaff progression→stage4→adoptPlacement→store→market rules移行を検証し、strict restoreとbyte一致を確認して使用した。新規ゲームの担当者条件を緩めたり、非合法なrawを書き換えて通したりしていない。[diagnostics](browser/diagnostics/)を参照する。

### 旧キャッシュと配信依存

両engineで同一originのf7baから一時間cacheを維持し、候補へreloadした。Chromium111資産中109cache hit、WebKit110中108hit。変更appのpreparation=r3-1と新controllerのv=refactor-r3-1だけが新規取得され、body SHA256も実候補sourceと一致。HTML入口から新importへの伝播を確認し、Canvas/input/tools/CSS/画像/workerの不変資産を一括無効化していない。正式状態・保存は不変。全歴代cacheや全Labを網羅したという意味ではない。

### 実行環境と未確認

この作業開始時には前回の一時browser実体が失われていた。既存Playwright runtimeを使用し、公式のscratch Playwright1.55.1 installerでChromium140 headless shellを取得した。WebKit26.5は公式installerの配布元から取得。OS依存の通常installerはsetgroups/seteuid制限で実行できなかったため、署名済みUbuntu InRelease/Packages/debのhashを確認し、必要なライブラリをscratchだけへ展開して起動した。製品依存・CI・OSのsandbox・TLS設定は変更しない。詳細はbrowserのenvironment記録を参照。

物理iPhone Safariの指追従、非ゼロsafe-area、VoiceOver、実OS toolbar/background、実BFCache保持復帰は未確認。過去R2のBFCache delegate制限を今回成功へ読み替えない。R3ではlifecycle処理はbyte不変、制御イベント/再読込/部屋移動を比較した。公開後の実配信と通常入口の操作は、同merge SHAのPages成功後にPRへ追記する。

### 次の段階

R3で分離したのは仕込み確認の一つのまとまりだけ。レバー/採取/結果/樽詰めをcontrollerへ移す拡張は保留した。今の所有境界でR4を検討できるが、貯蔵庫全体を一括分割せず、一つのUI責務から始める。正式試飲・予約・保存・時計・noticeは引き続きrootに残す。今回R4を実装せず、Productionも変更しない。

### 最終独立レビュー

実行runner、17base sourceのGit blob/候補SHA、新controllerのbefore不在とafter SHA、8captureのhash、640記録/320組の全projection、PNG hash、engine manifestとcache bodyを独立担当が再照合した。代表18組（36PNG）を別途decodeしてRGBA差分0。失敗policy7形状の112記録は、memory/durableが違う場合も各々の期待値と一致し、成功時へ統一していない。合法な自動担当者のmigrationも独立に再構築し、strict restore原文と16記録のhash/手動操作無効/modalなしを確認。probeを成功数に含めず、未確認を成功扱いしていない。重大未解決指摘なし。

最終Scope→Risk→Impact、Lock、構文、lifecycle、diff checkを再確認し、exact headの必須CI・補助CIとレビューを確認した後だけ通常マージする。検証したtreeと登録tree/merge treeを照合し、same-SHA Pagesと公開ファイル・実操作はPRへ追記する。


### 中断後の再開確認（2026-11-03）

GitHubの作業ブランチは `9c98e1b5606dfe0a3d09ec32e6529359c2d3876b`、最新mainは引き続き基準 `f7ba8023706be803b1711b3e3374b7e1bf83c4d9`。remote登録済み実装treeはローカル `89617218` と完全一致した。停止環境に残っていた検証commit `abc6f56a` を、remoteの正しい履歴へcherry-pickし、`a4411bca` に復元した。実装・Lock・既存成功済みテストを作り直さず、force pushやmain変更も行わない。両履歴のLockは同一blob/digestであり、復元treeは `abc6f56a` と完全一致。

再開時の別担当による独立レビューでは、新7件7/7成功、rootの許可10変換を逆変換したf7ba原文一致、入口queryだけの差分、正式モデル・保存・R2・Canvas/input・Lab不変を確認した。runner/controller/17 source provenance、8captureの640記録・320全projection、2engine artifact、36PNG hash/18組のdecode画素差0を再照合。cache requestAccountingもHTML/app/controllerだけの新取得と候補body hash一致を確認し、重大未解決指摘なし。既存ブラウザー成果の再照合と、再開後の再実行は区別する。

停止の直接原因を特定できるログは確認できなかった。ブラウザー復旧時の過去の依存問題を、Work停止の原因とは断定しない。物理iPhone Safari・VoiceOver・非ゼロsafe-area・実OS background/toolbar・実BFCache hitは引き続き未確認。DOM/ARIA一致をVoiceOver実音声の確認とは扱わない。

再開環境では同一runner/sourceを使用し、360×568/DPR1の両engineを再実行した。160取得・80前後比較はすべて画素差0/DOM/Canvas/hit/focus/ARIA/正式状態/保存一致、旧1時間cacheの2engine更新も成功、errors0。結果は `browser/resume/results.json` とcapture/PNG/実行ログに保存。既存全域1,193件の対象sourceと製品/テストsourceは同一のため、全域を無条件に繰り返さず既存成功を継承する。Lock/Scope/Risk/Impactを再確認しPASS。
