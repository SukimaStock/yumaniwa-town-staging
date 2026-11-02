# 三室の操作整理 — 第1段階

対象は `edda1ee26f4ed78ccfe6b7c4c6b977b405ec7a3e` (#755) からの蒸留結果／樽選択と販売室のタップ余白。第2・3段階、Production、正式モデルは含めない。先行r0 Lockは `.change-plans/ambertime-rooms-stage1/r0.lock.json`。

## 蒸留結果と樽選択

正式な手動 `stop` と保存成功後、既存 `filling` 原酒を同じ `fill` モーダルで表示する。結果（原酒量・既存2軸・既存風味名・確定色）と既存2樽・費用・確定操作を統合。背景の結果は隠し、重複表示しない。選択中の樽がない初回は、従来どおり樽を選んでから確定する。

`shownFillSpiritId` は一時UI状態。閉じても原酒は保持し、同じ原酒での再描画では再度開かない。保存済みの未樽詰め原酒を再読込／旧記録から復元した場合は、自動的に割り込まず既存の「たる詰め」入口から同じ統合画面へ戻れる。新しい保存項目・UI永続化は追加しない。

99stepで採取中ならグラス操作が正式成立するまで開かない。88step採取前の期限切れでも開かない。自動蒸留は既存の自動樽詰めを継続し、統合モーダルを割り込ませない。重要な判断モーダルの既存優先順位を保つ。

各樽の可否は既存の純粋 `D.fillBarrel` を試算し、その戻り値を破棄して正式な制約と同じ理由を表示する。正式モデル・費用計算は変更しない。3樽と資金852から正式に開始し、終了後732となる合法な記録で、バーボンは瓶詰め費用留保を満たさず選択不可、リフィルは選択可と確認。4樽満杯では正式な開始自体が不可であり、通常進行では「4樽＋新しい未樽詰め原酒」を生成できない。存在しない正式状態を捏造しない。

樽詰めは既存の `writeCandidate` 条件付き保存を利用し、成功後にだけ候補をliveへ反映してモーダルを閉じ、貯蔵庫へ移る。クォータ／他タブ競合時は未樽詰め原酒・選択・元の保存を維持し、モーダルのエラーと未保存表示を残す。このUI確定順序以外、正式 `fillBarrel` の結果は従来と同一。

## 販売室 A/B 比較

同じ表示専用fixture（3店舗・各2発売回）で比較。fixtureの架空の表示値を正式ゲームへ保存しない。別に実際の本編・合法な保存と配置／取消／引取りも検証。

| 375×620 の比較 | board高さ／内部scrollHeight | 判断 |
| --- | --- | --- |
| 変更前 | 288 / 288 | 2つの商品が右欄を占有し、指幅の置く領域がない |
| A：上側44pxのタップ余白 | 385 / 385 | 収まるが、上へ余白を足す構造 |
| B：商品横幅整理＋右側44px | 375 / 375 | 常に同じ右側へ置け、Aより10px低い。採用 |

文字サイズは維持。商品札から空の横方向の販売差分専用列を外し、実物の瓶＋本数＋年月をコンパクトにする。各商品の引取りボタンは44px以上を維持。右に44pxの連続した配置領域を確保し、`elementFromPoint` を6px間隔の格子で調べ、44×44px全域が正しい店舗の配置操作へ届くことを3店舗で確認。

販売時の `−n` は削除せず、同じ本数の真上の専用行へ配置する。各折り返し行が自分の差分行を持ち、前行の年月や瓶と重ならない。瓶移動の既存レールとも分離。1行あたりの余白確保は表示専用で、販売・配置の計算には使わない。

| 幅×高さ | 通常3店舗・各2商品 board client / scroll | ページのはみ出し |
| --- | --- | --- |
| 360×568 | 364 / 364 | なし |
| 375×620 | 375 / 375 | なし |
| 390×680 | 428 / 428 | なし |

3商品以上や12商品など情報量が多い場合は、既存board内部の縦スクロールを利用する。情報を隠さず、ページ全体はスクロールさせない。すべての多商品状態まで1画面に収まるとはしていない。

## 実行と証拠

- Node 51件：新しい樽詰めUI確定／クォータ／競合／試算非破壊／4樽上限、および既存 market-ui-main、formal-copy、market-rules-ui、count-linked-flight、distill-learning。
- focused browser：Chromium・Linux WebKit各57観測。360×568、375×620、390×680、実Canvas、実ポインター入力、通常motion／reduced-motion。
- 本編のレバー引下げ→3秒カウントダウン→グラス開始→終了→統合画面の自動表示を実操作。終了時の正式結果・保存をモデル再計算と完全一致で検査。
- 本編の合法な2発売回で配置、取消、引取り、資金・保存の完全一致を検査。
- 既存の販売／瓶移動テストを変更せず再利用する `rooms-stage1-sale-browser.mjs`：各engine10観測。正式な月次販売（自家・町の酒店・スーパー）、1本／複数、全店舗、3桁本数、reduced-motion、再読込・取消、描画中のテキスト／瓶／差分の衝突なし、正式保存一致。
- 既存 market-compact の12商品テストは、画面内の売れた商品IDを販売前の実測座標で導出し、その完全一致・12番商品の可視性・空でないこと・勝手にスクロールしないことを検証する形へ更新。正式には1番／12番の双方が売れ、各残数と資金を検査。後で1番へスクロールしても演出を再生しない。全商品が同時に画面内にあるという旧前提だけを更新し、通常2商品×3店舗の検査は維持。
- 正式モデル、保存・再生、費用、味、収量、時計、販売ロジックのソースは差分なし。プレビューの色・マーカー・液面・Cバー・レバーの基本入力と習熟は差分なし。

実行例（依存を製品へ追加しない）：

```sh
node --test works/ambertime/tests/rooms-stage1.test.mjs works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs works/ambertime/tests/count-linked-flight.test.mjs works/ambertime/tests/distill-learning.test.mjs
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell node works/ambertime/tests/rooms-stage1-browser.mjs
AMBER_TOOL_ENGINE=webkit AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_WEBKIT_EXECUTABLE=/absolute/webkit-wrapper node works/ambertime/tests/rooms-stage1-browser.mjs
AMBER_ALL_SHOP_BEFORE_ROOT=/absolute/base-checkout AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell node works/ambertime/tests/rooms-stage1-sale-browser.mjs
```

`chromium/results.json`、`webkit/results.json`、`sales-regression/*/results.json` に実測。各画像は同じディレクトリにある。

| 比較内容 | 画像 |
| --- | --- |
| 変更前の結果／旧樽選択 | `375-before-result.png` / `375-before-cask.png` |
| 統合画面／樽選択済み | `375-integrated-result-cask.png` / `375-integrated-refill-selected.png` |
| 本編の連続操作で自動表示 | `375-native-lever-glass-auto-fill.png` |
| 保存失敗／資金制約 | `375-fill-save-failure.png` / `375-insufficient-cask-funds.png` |
| 販売A/B | `375-sales-before.png` / `375-sales-A.png` / `375-sales-after.png` |
| 本編2発売回 | `375-native-sales-two-releases.png` |
| 多商品 | `375-sales-1-products.png` / `375-sales-3-products.png` / `375-sales-12-products.png` |
| 数量差分と瓶移動 | `375-sale-minus-bottle-all-shops.png`、`sales-regression/*/375-native-supermarket-delta-flight.png` |

## 調査・修正の記録

- 初回の純粋fixtureでは、資金制約の記録は3樽があるため起動時に貯蔵庫が選択される。テストが蒸留室へ移動せずモーダルを待って失敗したため、正式なナビゲーションを加えた。製品の起動仕様は変更しない。
- 古い自動蒸留fixtureは配分を持たず正式入口が拒否した。既存の新Delegated→手動樽詰め→雇用→自動完了→Stage4／配分／販売ルール採用という正式操作で対応した。保存検証を迂回していない。
- 3桁本数による折り返しで、第2商品の差分が前商品の年月に重なることを既存販売テストが検出。原因を行単位の差分領域不足と特定し、上記の各行専用領域で修正。既存の衝突検査はそのまま成功。
- 保存済み完了状態を読込ごとに自動表示しないよう、復元時に一時表示済みIDだけを初期化。新しい保存項目を作らず、明示的な入口は保持する。

## キャッシュ・未確認

HTML入口の `shop-app`、`room-scene.css`、`market.css` へ `rooms=stage1-r1` を付け、変更済みコード／CSSを別URLで取得する。Canvas描画モジュール自体は未変更。

実機iPhone Safariは未確認。アドレスバー変化・セーフエリア・実指の44px余白の触感、長い内容の内部スクロールを作者の実機で確認する。Linux WebKitの成功を実機成功とは扱わない。CI、マージ、Staging配信確認はPRの記録を参照。
