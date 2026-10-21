# 帳面整理 第1段階：入口と発売履歴

基準: main `77cfcc11f5774f6c65acba70c34439790fcfe6fd`、[監査原典](../ledger-information-audit.md)（PR #564）。Stagingのみ。正式なverificationStateはUNVERIFIED。

## 変更

- 帳面モーダル内を「仕込み／樽と熟成／発売／取扱店」で切替。既存の製法選択・保存・担当者への再依頼、熟成記録、取扱履歴、蒸留所の歩みを接続。
- 発売一覧は瓶・年月・発売ID・元樽・瓶詰本数・状態。同月・同じ親樽の部分瓶詰めもIDで区別。ブランド名・瓶形・ラベルと既存ブランド実績は冒頭に一度だけ表示。
- 一覧から共通の発売詳細を開く。熟成・風味、元記録、小売、実納品、在庫、価格、過去の試飲・観察・選択、前回比較を確認。帳面へ戻るとスクロール位置と展開状態を復元。
- `ledger-view.mjs` は既存factsを受け取る使い捨て投影。recordsの同product鏡像を重複表示せず、旧卸売とID欠損記録は保持。小売はreleases、納品は実shop.deliveriesを参照。欠損はnull→「記録なし」。不完全な配送合計は「確認できた納品／入金」と区別。
- 保存キー・形式・operations・releases・records・ブランド実績計算・ゲーム処理・ドット絵は変更なし。以前の卸取引履歴は取扱店分類から確認可能。

参照: `shop-app.mjs` の `ledgerView / ledgerReleaseView / rememberLedger / restoreLedger`、`ledger-view.mjs` の `buildReleaseLedger`。表示だけの状態はmodal内に置き、保存しない。

## 確認

- `node --test works/ambertime/tests/ledger-view.test.mjs works/ambertime/tests/nearby-comparison.test.mjs`: 26/26成功。部分瓶詰め、欠損・明記0、旧origin、酒店5本＋デパート5本と小売の分離、別Nodeプロセスでの冷復元一致。
- [browser-review.mjs](browser-review.mjs) / [結果](browser-results.json): 同一の公開操作由来セーブ、固定時計、390×844／1024×768。4分類、同月の部分発売、共通詳細・元記録・比較から戻る、スクロール、歩み、再読み込み後の発売ID一致、閲覧前後の保存文字列一致。製法保存→選択→担当者への依頼確認→取消も確認。
- 対応済み旧v20セーブを既存APIで有効化し、4発売回と小売・実納品数を画面で照合。v09の旧卸売は読み取り投影・冷復元テストで保持を確認。旧v5/v6を現行ブラウザへ新たに取り込む機能は追加していない。
- 構文・差分検査、Scope→Risk→Impact、必須CIはPRの対象SHAに固定して記録。独立したコード・390px実画像レビューで阻害事項なし。
- 表現監査: 説明カードや装飾、常設UIを追加せず、短い一覧と選択時の詳細へ整理。

## 同条件画像

| 条件 | 変更前 | 変更後 |
| --- | --- | --- |
| iPhone相当 | [入口](before-390-entry.png) | [入口](after-390-entry.png) / [発売一覧](after-390-releases.png) / [詳細](after-390-detail.png) |
| PC | [入口](before-1024-entry.png) | [入口](after-1024-entry.png) / [発売一覧](after-1024-releases.png) / [詳細](after-1024-detail.png) |
| 対応済み旧保存 | — | [発売一覧](after-390-old-save.png) / [取扱店](after-390-shops.png) |

## 未検証・対象外

実機iPhone Safari／VoiceOver、作者の採用判断は未確認。包括的E2E・長時間プレイは実施しない。仕込み・熟成・取扱店の詳細再設計、世代交代、Productionは変更しない。既存の欠けた過去情報を復元・推測することはしない。
