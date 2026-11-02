# 蒸留室の仕込みパネル

`tests/brewing-panel-browser.mjs`：Linux Chromium／WebKitとも19観測、エラー0。375×620は通常、360×568・390×680はreduced-motionで確認した。実機iPhone Safariは未確認。

- 全幅の変更前後画像と、375pxのmodal・選択変更後・採取中・採取終了・期限切れを保存。変更前は40a572b2の表示モジュール5ファイルを配信した比較。
- 待機パネルの既存開始操作がx24/y174/w312/h60の全体を使用する。左端付近の実タッチで既存の仕込みmodalが開き、表示中の「ふつう／短め」と選択状態が一致する。
- ピートを選んで戻ると、既存の即時保存方針どおり選択を保持。再読込も一致。最初の正式な樽詰めで解放された長めを選んだ保存では、modalの長めが有効・選択済みになる。
- 採取中・終了後は実際の仕込み記録を表示。旧方式の正式な開始状態では、実batchは長め、次回の未解放manual表示は短めとなる合法な差も確認し、実batchの長めを表示した。
- readonlyパネルはy54〜108。今回の期限切れ・旧方式の状態説明は、実Canvasの文字上端y114でパネル下端から6px離れている。各選択の48pxアイコンをCanvas実画素と既存sprite色から確認した。
- 同月に既に樽詰めした正式な保存で、無効化された待機パネルを確認。低資金そのもののfixtureは追加していない。
- 採取中42stepの象徴液面0.5、正式状態と保存JSONの一致、ページの追加縦横スクロールなしを確認した。レバーや採取操作の大きな総当たり検査は重複実行していない。

`375-idle-after.png`／`375-idle-before.png`、`375-modal-matching.png`、`375-peat-back.png`、`375-active-batch.png`、`375-filling-batch.png`、`375-expired-summary.png`が主要画像。360・390pxにも待機の前後画像を保存。結果JSONはminifyしている。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/brewing-panel-browser.mjs`。WebKitは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定。今回runtime変更なし。
