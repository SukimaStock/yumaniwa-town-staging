# AmberTime — 時間操作の1倍／2倍

Base: `c5631d37b185ecd9b0a10364c1937426a36877e3`（PR #573）。AGENTS/Change OS/表現監査、PR #541（月次順序）、#419（最後の出荷と旧jump）、#561（HUD）、#571〜573と未解決レビューを確認。

## 実装

メニューの「3か月進める」を「倍速にする／通常速度に戻す」へ置換。旧jump状態・迂回処理・全参照を撤去。速度はcontroller内の一時変数playbackRateのみ。速度だけの切替では月・経過量・ゲーム・保存を更新しない。メニューを閉じ、現在の一時停止意思を維持して再予約する。

両速度でcallback1回につき既存の蒸留1ステップ・elapsed100、月境界で既存tick1回。待ち時間だけ100／50ms。月次関数・演算・順序・保存境界は変更しない。既存clearTimeoutとgeneration tokenで古い予約を無効化する。同じ初期状態と操作・論理callback列を与える限り、モデルへ渡す入力と呼出し列が同一なので経済結果も同一になる。

HUDは依頼の表どおり：進行1倍=再生、進行2倍=早送り、停止=停止。アクセシブル名は実行する停止/再開操作を示す。既存7×7 glyphと同じ大きさに早送りを追加し、位置・枠・色・時間バーは維持。モーダル中にHUD操作を隠す従来仕様も維持。速度は部屋・一時停止・判断・世代・非表示で保持、reload/newgameで1へ戻る。保存sessionの4項目・操作履歴は不変。

## 限定検証

`monthly-timing/delegation/generations/room-motion/canvas-layout` 計33テスト成功。構文/diff/Scope→Risk→Impact成功。

`browser-review.mjs` + `fixture.mjs`（既存の公開model操作だけで生成した正規状態）：Chromium390×844 touch相当／1024×768。

- メニュー往復、速度切替だけでsave/月進行なし、一時停止7秒不変、再開・部屋切替で速度保持、HUD3状態。
- 繰返し切替とメニュー停止、取消済みcallbackを明示再呼出ししてもgame/経過量不変。同時に有効なゲームタイマー最大1。
- 自動仕込みと自動瓶詰めの180callback=3か月、デパート納品待ちの60callback=1か月を両速度で実行。game全体・operations・RNG・資金・在庫・化学値・納品/採用・session elapsedが完全一致。タイマーdelay100/50と実callback数を確認。自動仕込み樽、自動発売回、デパート5本と入金を実際に確認。
- 資金判断（月104）・世代review（月312）も両速度で同じ状態へ停止。その後9秒進めても保存不変・有効timer0。
- 非表示中停止・復帰時2倍保持、保存競合停止、reloadでゲームとelapsed一致・速度1。
- pageerror0。browser-results.jsonに同一hashと観測値。通常/2倍同条件PNGの差分はアイコン内だけ：390幅135px（348,144〜362,164）、1024幅240px（681,74〜700,101）。before/afterと両サイズの状態画像を保存。

検証手順の調整：自動瓶詰めを済ませたfixtureでは新しい予約を再設定する必要があり、正規reserve操作を追加。旧世代fixtureは現在の正規career fixtureへ変更。判断モーダル中は従来HUD非表示のため、停止判定はtime-statusとtimer0/不変stateで確認（非表示HUDの古い観測属性は判定に使用しない）。製品コードの追加修正なし。

独立の読み取り調査・最終レビューに阻害事項なし。表現監査6点確認：必要な切替文言と状態だけ、説明・通知・画像は追加しない。原画・点滅・CSS・モデル・月次計算・帳面・保存形式は差分なし。

最終head/tree、必須CI、マージ、Staging公開確認はPRへ記録。verificationState: UNVERIFIED。実機iPhone Safari/VoiceOverと作者の操作感は未確認。全画面E2E・長時間プレイ・Productionは対象外。
