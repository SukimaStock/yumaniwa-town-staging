# カット印と結果色印の表示確認

`tests/distill-cut-mark-browser.mjs` で、前版PR #744（`cut-pixel`）と今回の表示を、同じ正式モデルの採取24→52step、plain／long、seed42で比較した。正式APIだけで生成した検証用セーブを停止状態で読み込む。

| 環境 | 画面 | 結果 |
| --- | --- | --- |
| Chromium／Linux WebKit | 360×568・375×620・390×680 | 各6比較、エラー0 |

Canvas実画素で、バーの長い縦線がなくなり、現在・開始・終了の短い印と下線が残ることを確認。結果色印は旧右上から最後の香り文の左へ移り、12×12、3pxグリッド、グラスと同色。色印の上下左右には同色のはみ出しがない。文の左端は54px、色印の右端48pxで分離している。

各幅ともページ実寸はviewportと一致し、縦横スクロール増加なし。同じfixtureの正式状態と保存JSONは一致し、表示・再読込前後の保存文字列も完全一致。入力・計算の変更はないため、今回は既存の全操作マトリクスを重複実行していない。

`chromium/`・`webkit/` の `*-before.png`／`*-after.png` が実寸比較。`results.json` に画素・位置・保存一致の観測値を記録した。実機iPhone Safariの色差・指の触感は未確認。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/distill-cut-mark-browser.mjs`。エンジンを`webkit`へ変更可能。前版ルートは`AMBER_MARK_BEFORE_ROOT`で指定できる。
