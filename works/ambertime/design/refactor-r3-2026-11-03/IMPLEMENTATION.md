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

候補の全域・新controller・副作用順・browser・cache・独立レビュー・公開結果は、実測完了後に下記へ追記する。未実行を成功としない。

### 全域・単体・副作用の順序

[test-results.json](test-results.json)と4つの実行ログを保存した。変更前158ファイル1,186/1,186成功（158.787秒）、候補159ファイル1,193/1,193成功（168.378秒）。いずれも失敗/skip/cancel/todo0。今回は新7件も含む単一root globで候補全域を実行した。既存販売browser2件も環境変数を指定して実行し、skipなし。

新7件はimmutable f7baのapp source SHA256 `604208174263d5a804b92e764a9eba0df76f0cb7b80b8dca95827dc8c8769913`を検証し、元の3変数/実handlerと実controllerへ置換したhandlerを比較する。StartCountdownも実class、正式操作・serialize・writeCandidate・通知eventも既存APIを使う。カード選択の正式記録、確認時の保存ゼロ、変更/変更戻しの取消、3tickと取消、採取12step、結果の閉/再開、樽選択/樽詰め/次月の次仕込み、quota/拒否書込/他タブ競合/modelthrow、hidden/別室、期限切れ、旧保存/実担当者trace/再読込で、各途中のmemory・durable・通知・描画/時計要求の順が一致する。正式計算をtest controllerへ再実装しない。

R0の129途中状態（serialize原文・operation履歴・RNG・月次・経済/在庫/費用・担当者・通知順）と旧蒸留20状態/20個別cold、旧保存の受理/拒否/再生を既存期待値・fixtureのまま成功。generic actとcandidate保存の失敗時の違いを維持した。

3つのVM portは既存assertion・ケースを維持。最初の接続で非stage4の合法な担当者状態にmanualCardsを余計に呼び失敗したため、旧portが持っていたprepared/batchだけを`confirm({},batch)`で用意する接続へ修正した。製品の初期化は空controllerのみであり、この読取を追加していない。新testの次の仕込みも同月可能と仮定せず、既存のD.tickDistillery境界を明示して比較した。これらの初期ハーネス問題を製品修正で通していない。

[source-invariance.json](source-invariance.json)で、rootの変更を宣言した状態操作への置換だけ逆変換すると基準appとbyte一致し、index変更もqueryだけであることを確認。許可したapp/index/3port以外の既存3,625path（runtime等508、tests/fixture477、過去design2,640）はGit blob完全一致。正式モデル・保存形式・入力・Canvas・R2 geometry・文言・CSS・Lab・過去資料を変更していない。
