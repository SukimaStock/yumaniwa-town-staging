# AmberTime A5 — 初回ブランド設定と最初の一本

## 作者が決定した体験

- 初回限定で「最初のビン」。中央の既存Codea瓶を大きく表示し、「ビンの形（4種類）→ラベル（2色の色見本）→ブランド名」の順に編集する。
- 形とラベルは選択と同時に中央プレビューへ反映。ブランド名は入力中にDOMの出力を直接更新し、日本語IMEの変換を中断しない。キーボードは自動表示しない。
- 「次へ」はUI上の仮決定のみ。数量・費用・残量は既存quoteを使用。初回の「ビン詰め」の直前に「名前・ビン・ラベルは、あとから変更できません。」を一度だけ表示する。
- `bottleBranded` の正式操作、名前・形・ラベル確定、保存は既存どおり。保存成功後だけ初回の完成モーダルを出す。瓶が150msで現れ、その後250msかけてラベルが横からピタッと貼られる。
- 完成した瓶とブランド名を静止表示し、自動では進まない。瓶自身が操作可能なボタンとなり、タップ・Enter・Spaceで販売室へ。reduced-motionでは動きを省略して完成状態を表示。2回目以降と既存ブランドは従来の流れ。

## データ・描画の境界

- `first-bottle-view.mjs` は描画専用。ラベルに使うセルは `codea-object-art.mjs` の元のCodea配列から導出し、完成後は全4形×2ラベル×価格3段階で通常の`codeaBottle`とのピクセル色一致を静的テストで確認する。
- `partner-orders.mjs`、`brand-identity.mjs`、`codea-object-art.mjs`、`room-object-art.mjs`、正式保存のキー／形式は変更しない。
- 完成モーダルは非永続のUI状態。reload後の二重完成演出なし、保存失敗時の成功演出なし。閉じる操作で誤って飛ばさず、瓶のクリックだけで販売室へ進む。
- デバッグ分離A4、本編A1の蒸留、A2取扱店、A3数量は変更しない。

## 検証対象と限界

- 新規 `works/ambertime/tests/first-bottle-ui.test.mjs`：4×2×3のラベル合成画素、プレビュー操作要素と順序、完成タップ、正式保存後境界、reduced-motion/キャッシュ参照。
- 既存 `first-brand.test.mjs` / `first-brand-art.test.mjs` / `r0-formal-baseline.test.mjs` / 販売UI・正式保存の回帰は引き続き保護。
- Chromium/WebKitでは4幅、名前入力とキーボード、無効値、確定前の戻る、完了画面、reduced-motion、保存失敗・reload・2回目を確認する。物理iPhone SafariとVoiceOverでの作者確認は別途。
- この資料はCI成功や実機確認の完了を事前に宣言しない。結果はPRの実際の検査を確認して報告する。

## PR・Plan

Plan Lock: `.change-plans/ambertime-a5-first-bottle/r0.lock.json`。
Productionへの反映は作者の別判断とする。
