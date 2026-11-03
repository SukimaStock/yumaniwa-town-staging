# A1-2 蒸留完了の短い手応え

正式な手動採取終了は既存の `act(D.stopDistillation, …, afterSave)` のまま処理する。保存成功後のcallbackだけがCanvasSceneに一時演出を要求する。味・量・乱数・操作履歴・保存形式・ゲーム時計を演出側へ渡さない。自動担当者、期限切れのやり直し、保存失敗は開始しない。

CanvasSceneが原酒ID、開始時刻、終了callback、失効tokenを所有する。既存の単一RAFとmotionTimerに、有限の描画境界だけを追加する。新しいtimer/常時loopなし。既存140msグラス移動の後、150〜220msにグラス上縁の6×3論理pxを二箇所へ順に描く。全体250msで通常の樽選択へ進む。色は既存の控えめなクリーム色。TOOL_GEOMETRY、グラス・液面色・レバー・hit領域は変更しない。

250/300/400msを同じ描画段階で比較した。250msでも移動後に二つの光の段階があり、最短候補として選ぶ。視認性の最終採否は物理iPhoneで確認する。300/400msの比較画像と実測はglint-browser-results.jsonへ保存する。

syncModal全体を遅延しない。既存のdecision、staff、trade、shop、generationの優先処理と必要な正式通知・保存はその場で実行する。これらがモーダルを開けば演出を取り消す。演出中だけ自動fillと、その後順位の地図表示を保留する。従来fillモーダルが止めていた時計は、演出中もblocked条件で止める。演出の終了callbackは現存する同じ原酒、filling、蒸留室、可視、modalなし、保存可能を再確認してrender/scheduleするだけで、直接モーダルを開かない。

hidden、pagehide、部屋変更、別モーダル、reset/reload、保存競合は演出を失効させる。古いmicrotaskはgenerationが異なれば何もしない。自然終了でだけtokenを保持し、終了callbackを一回発行する。stopDrawingは毎draw呼ばれるため、ここで演出を取り消さない。reduced-motionは開始時に省略し、途中で有効になれば即終了して通常fillへ進む。フォント準備前・Canvas停止中も演出を省略して、不可視の待ち時間を作らない。

## 検証の区別

- `tests/a1-glint.test.mjs`: 実CanvasSceneの一時状態と実root採取/保存境界を使用する7件。保存成功後開始、追加保存なし、最小合法カット、期限切れ、quota/conflict、自動担当者、再読込、reduced-motion、フォント未準備、割込、失効callback、3pxグリッドと対象外描画なしを検査する。offer割込は明示した合成境界であり合法保存と称しない。
- `tests/a1-browser-completion.mjs`: Chromium/WebKit、360/375/390/430、DPR1/2/3、reduced。固定phase測定と、performance.nowを上書きしない自然時間のpointer操作測定を分ける。前者は250/300/400msと対象rim以外の画素差0、後者は既存motionTimer/RAFによる実終了時刻を確認する。
- hidden/pagehideはブラウザー内の合成イベントで検査する。実OS背景・BFCache・VoiceOver音声・iPhone触感とは区別する。

ブラウザーrunner初期診断: import文の空白を許さないrunner正規表現を修正した。最初のWebKit起動はgit内wrapperの実行属性がなくEACCESだったため、同じwrapperを一時ディレクトリへコピーして実行属性を付ける方式に変更した。製品や既存wrapperのmodeは変更していない。

## 実測結果

固定phase14ケース・自然時間16ケースが両engineで成功、pageerror0。自然時間では各engine3回の実pointer採取終了を計測した。開始時に保存済みfillingを観測し、二つのrim描画・終了callback・fill公開がこの順に一度ずつ発生した。

|Engine|実測の完了時間ms|中央値ms|
|---|---|---|
|chromium|256.7, 256.4, 258.7|256.7|
|webkit|263.0, 265.0, 256.0|263.0|

自然時間のhidden/pagehide（合成）、部屋変更、別モーダル、実reload各5ケース×2engineで古い終了callbackが発生しない。全ケースの演出前後で保存rawが一致。固定phaseでは150msの変更がグラス上縁の2 native cellsだけで、対象外のworld画素差0、hit領域一致。reducedは一拍なしで既存fillへ進んだ。

追加harness診断: clock.pauseAtによってRAFを止めた状態でwaitForFunction既定RAF pollingが非同期font完了を取り逃がすことがあった。document.fonts.readyの待機、制御clock40ms進行、100ms pollingへ変更した。製品font処理・期待値は変更しない。自然時間測定はfake clockもperformance.now上書きも使わず、これとは独立している。
