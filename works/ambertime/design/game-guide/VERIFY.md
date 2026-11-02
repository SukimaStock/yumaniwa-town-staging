# 正式なゲーム履歴によるレバー誘導

`tests/game-guide-browser.mjs`：Linux Chromium／WebKitとも55観測、エラー0。375×620は通常、360×568・390×680はreduced-motion。実機iPhone Safariは未確認。

既存APIで手動採取終了0／1／2／3回の正式なready保存を生成した。1〜3回は蒸留・採取・終了・樽詰め・月次処理だけで再現し、担当者や新しい経済fixtureは追加していない。保存の復元後も同じ回数になる。

- 0回：決める前は矢印なし。決めると黄色い矢印が9px下へ動く。
- 1・2回：決めると6pxの控えめな動き。
- 3回：決めても矢印なし。
- 接触中は移動を止め、reduced-motionでは静止。カウントダウン・採取中・採取終了後・期限切れ・再読込直後の未確定状態では、黄色／灰色の矢印画素とも0。

375pxでは実際にレバーを引き、カウントダウン、グラス採取開始・終了まで操作。最初の正式stopで1回となり、樽詰め前・再読込後も1回。全状態の正式保存JSONと期待するnative API結果が一致し、追加スクロールなし。

旧UI設定に「3回」の有効な既存値を事前配置し、アプリ起動前からそのキーのget/set/removeを監視した。アプリによるアクセスは全観測0、値はそのまま。旧値3が残っていても正式ゲーム0回の9px誘導が表示される。fixtureの設置・検査は隔離したブラウザー内だけで行った。

## 履歴の区別

手動完了は正式`stop`で数え、樽詰めを待たない。自動蒸留は内部stop/fillを取り除き`complete-usual`だけを記録する。V08／V081／V09には自動蒸留がなく、自動出荷は瓶の処理だけ。移行時は新operationsを空にして元の履歴をoriginに保存し、世代交代は履歴を保持する。関連Node検査は別途61件成功し、旧版origin連鎖・現行2/3回・実際の世代交代も確認された。検証済み旧保存への推測fallbackは追加せず、欠落・循環など不正な履歴は拒否する。

主要画像：`375-new-game-before-confirm-old-key-three.png`、`375-zero-guide-down.png`、`375-native-1-guide.png`、`375-native-3-confirmed.png`、`375-countdown-no-guide.png`、`375-real-first-stop-filling-no-guide.png`。結果JSONはminify。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/game-guide-browser.mjs`。WebKitは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定。
