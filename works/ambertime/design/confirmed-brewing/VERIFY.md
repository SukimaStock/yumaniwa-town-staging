# 確定後だけ見せる仕込みパネル

`tests/confirmed-brewing-browser.mjs`：Linux Chromium／WebKitとも37観測、エラー0。375×620は通常、360×568・390×680はreduced-motion。実機iPhone Safariは未確認。

- 初期・初回編集から戻る：simpleな仕込みボタンのまま。決めるとBパネル＋レバー有効になる。
- 確定後、同じ条件の編集から戻る：確定表示とarmingを保持。条件を変えて戻る：前の確定表示を保持し、レバーは無効。再び決めると新条件を表示して有効になる。既存のカード選択即保存は変更しない。
- 再読込：一時的な確認表示とarmingだけを解除し、保存済みのpeat/shortの選択は保持。実際の採取中は記録された仕込みを表示し、次のready保存を開くとsimpleボタンになる。
- 全状態で正式な保存・ゲーム状態は期待する既存APIの結果と一致。画面の縦横はviewport内。

A/B比較は同じ初期保存・plain/shortの決める操作。`375-confirmed-A.png`はda6d3c41の高さ60／価格下段、`375-confirmed-B.png`は高さ54／価格をラベルと同じ段に置く案。`375-old-main-initial.png`と`375-initial-simple.png`は確定前の違い。

## レバー矢印

Canvas実画素と描画状態を両エンジンで照合した。

- 初回確定：黄色い矢印が消えずに9px下へ移動。
- 完了経験1・2の表示fixture：6pxの控えめな移動。
- 完了経験3の表示fixture：仕様どおり非表示。
- 接触開始：移動offsetを0に戻して停止し、黄色い画素は残る。reduced-motionでも静止して残る。

旧版では、まだ決めていない時点で選択パネルが見えても`prepared=false`で、矢印は非活性の灰色になる。この見た目が「確定済みなのに矢印がない」と感じさせる可能性がある。経験3以上の意図的な非表示も別条件。今回の検証では描画が欠落する状態を再現しなかったが、作者の実機セーブの経験値は未確認のため、実際の報告原因を断定しない。

習熟fixtureは既存`DistillLearning.start/complete`から生成し、隔離したブラウザー設定にだけ読み込んだ。作者の履歴や正式ゲーム状態をリセットせず、誘導アニメーションが設定を書き換えないことも確認した。

主要画像：`375-first-guide-down.png`、`375-learning-motion-1.png`、`375-learning-3.png`、`375-changed-back-old-snapshot-inactive.png`、`375-reload-clears-only-confirmation.png`。結果JSONはminify。

再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/confirmed-brewing-browser.mjs`。WebKitは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定。
