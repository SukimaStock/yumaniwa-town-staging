# グラスの象徴液面をゆっくり増やす

新しい`tests/gradual-glass-browser.mjs`で、Linux Chromium／WebKitとも22観測、エラー0。375×620は通常の動き、360×568・390×680はreduced-motionで確認した。全幅×両motion設定の総当たりではない。実機iPhone Safariは未確認。

正式APIから採取開始0、経過12／42／84stepと、それぞれの正式終了状態を作成し、停止中の保存として読み込んだ。Canvasの実画素から液体の3px行を数えた。

| 状態 | 表示fill | 実際の液体行 |
| --- | ---: | ---: |
| 採取開始 | 0 | 0/8 |
| 12step | 12/84（約14.3%） | 1/8 |
| 42step | 0.5 | 4/8 |
| 84step | 1 | 8/8 |
| 12stepで終了 | 12/84を保持 | 1/8 |
| 84stepで終了 | 1を保持 | 8/8 |

短い採取で終了しても、液面が突然満杯にならない。正式な量・品質・保存JSONは各native fixtureと一致し、変更前d69ebf42のviewを配信した比較でも同じ正式状態を保持した。正式モデル4ファイルの内容が基準版と一致することもハーネス内で確認した。375pxでは実タッチによる終了と追加タップの重複防止を確認。ページ寸法は各viewportに収まり、新しいスクロールなし。

各engineの`375-collect-12.png`・`375-collect-42.png`・`375-collect-84.png`・`375-end-12.png`が主要比較。変更前の`375-before-collect-12.png`・`375-before-end-12.png`では旧70%表示（実描画6/8行）を確認できる。360・390pxにも中間・長時間・短い終了の画像を残した。

既存の`distill-cut-main-browser.mjs`／`distill-pixel-browser.mjs`は、旧70%固定・8step満杯を前提としたfill期待値だけを更新し、入力・正式計算の検査を維持した。大きな既存ブラウザーマトリクスは再実行せず、今回の焦点検証を実行した。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/gradual-glass-browser.mjs`。WebKitは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定する。比較用viewはgit基準d69ebf42から読み取る。
