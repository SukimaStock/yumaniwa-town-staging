# 採取区間の補助目盛りだけを削除

`tests/distill-cut-range-browser.mjs` でPR #745の前版（`cut-mark-refine`）と比較。正式APIから同じseed42・plain／long・24→52stepの完成原酒を生成し、停止状態で読み込んだ。

Chromium／Linux WebKitとも360×568・375×620・390×680の前後6比較、エラー0。各幅の`*-before.png`／`*-after.png`と実画素観測`results.json`を保存した。

Canvas実画素で、開始・終了・現在の縦印が復元され、採取範囲の下に9px間隔で並んでいた3pxの補助目盛りだけがなくなることを確認。短い印、連続下線、3px縦列グラデーションは維持。グラス色と香り文の左の12×12色印も同一profile由来の同じ画素色のまま。

全幅でページ幅・高さはviewportと一致。表示・再読込前後の保存文字列は完全一致し、正式状態と保存JSONは同じnative fixtureに一致した。入力操作は変更していないため全入力マトリクスは重複実行していない。実機iPhone Safariは未確認。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/distill-cut-range-browser.mjs`。`webkit`へ変更可能。前版のルートは`AMBER_RANGE_BEFORE_ROOT`で指定できる。
