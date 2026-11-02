# 仕込みパネルの間隔とカウントダウン誘導

`tests/panel-countdown-browser.mjs`：Linux Chromium／WebKitとも27観測、エラー0。375×620は通常、360×568・390×680はreduced-motion。実機iPhone Safariは未確認。

375pxで同じplain/short確定状態を比較した。`375-panel-before.png`がb833a109、`375-panel-maintained.png`が312×54維持、`375-panel-compact.png`が表示専用288×54比較。compactはserverの応答だけを変更し、本編の配置・保存・新Labには反映していない。288案は短めと価格が密になるため、312維持が読みやすい。

新しい下線は実文字幅を3px単位で切り上げ、アイコンと名称の間は6px。2つの商品群と価格前の余白は、全3幅で3px以上かつ差3px以内に収まった。既存の312×54タップ領域を維持する。

実レバー操作から3／2／1を確認。通常375pxでは、3の開始時に黄色13画素、900ms後に減光13画素、2で減光、1で黄色を実Canvasから検出した。reduced-motionは黄色のまま静止。全カウントダウン中、`glassArrowBlink=true`でも`glassEnabled=false`・`glassArrowActive=false`。実タップでは保存や採取を変えず、2999msでは蒸留を開始しない。3秒後だけ正式開始し、受ける前は左、採取中は右、終了後は矢印なし。実際の採取・終了と正式保存JSONは既存APIの結果に一致した。

## 数字サイズの基準版比較

追加は375pxの同一fixtureの1検査だけ。数字3を含むlogical `(150,180,60,60)` のrawRGBA領域は、旧版／維持案ともhash `44ad624b`。両エンジンで一致し、文字画素の境界もminX74/minY91/maxX94/maxY139で同一だった。`375-digit-before.png`／`375-digit-maintained.png`と`375-countdown3-before.png`を保存した。

数字描画はsize48を渡すが、旧版から`textMetrics(size)`が共通フォント有効時に`BODY_SIZE`を使う規則であり、今回の文字サイズ回帰ではない。フォントや数字の描画仕様は変更していない。

主要操作画像は`375-countdown-3.png`・`375-countdown-2.png`・`375-collect-right.png`・`375-end-no-arrow.png`、RM例は`360-countdown-3.png`。結果JSONはminify。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/panel-countdown-browser.mjs`。WebKitは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定。`AMBER_PANEL_DIGIT_ONLY=1`は既存結果に数字比較1検査だけを追加する。
