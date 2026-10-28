# 販売設計Labの本編Staging採用

2026-10-28。ユーザーの「ではこれをstagingに反映してみましょう」に基づき、PR667の候補販売ルールを本編Stagingで試す。Production・旧Lab・旧監査・価格・費用・初期資金・店解放条件は変更しない。

## 採用した動き

同じ経済プロフィールの発売回をまとめ、直販6・酒店8・スーパー12の客枠を共有。客枠と購入の端数を繰り越す。酒店は煙・厚み、スーパーは麦・果実を好む。直販は少量ずつ売る。`market-sales.mjs` はPR667の純粋関数と完全一致する固定コピーで、本編から実験ディレクトリへ依存しない。

瓶を直接選び、1本・5本・全部で渡す既存操作を維持。店の好みだけ短く表示し、aria-labelにも含める。通常画面の通し番号・銘柄dropdown・取扱前ラベル・デパート常時表示は戻さない。

## セーブの境界

- 新規ゲームだけ `newMarketRulesDistillery` を使用。旧 `newStoreMarketDistillery` の契約は維持する。
- 既存保存は旧ルールのまま起動する。メニュー→保存→「新しい販売ルールに切り替える」で明示的に選ぶ。
- 切替時に、元の正式保存envelopeを `.before-market-rules.v1.<length>.<digest>` へ検証付きで残し、正式保存の期待値が変わっていないことを再確認してから候補を保存する。成功した保存だけを画面へ反映する。
- `enable-market-rules` 操作に版・固定ルールID・境界月・事実digest・抽出進捗・試飲IDを記録。cash/在庫/予約/町/世代を変更せず、以後の月次だけ新計算。版不明・改ざんは旧ルールへfallbackせず復元拒否する。
- 端数台帳は切替時0。過去の待機を新しい需要へ換算しない。資金保護で月を戻すと端数も戻る。
- 保存キー・v2 envelope・v20形式は維持。旧履歴は旧計算で再生し、境界以降のみ新計算。FNV digest自体を暗号認証とは扱わず、全操作の厳密再生一致で整合を検証する。
- 切替後は保存画面から切替前を書き出せる。新ルール保存が存在するため、将来UIを戻す場合でもこのreaderを消さない。旧保存へ戻す操作は明示的な復元として行う。

納品・引取りの現金は0。販売確定時のみ既存の実納品処理で在庫減・入金。デパートの予約5本を別に守る。納品帳が満杯、または全提案を記録できないときは、その店の販売と台帳を一緒に止め、未納品の購入端数を消費しない。

## 検証

- 旧fixtureの完全復元、旧月次のserialized SHA256一致、既存予約/引取/保存/移行の関連回帰が成功。
- 新規テストは境界の前後、試飲/蒸留途中、改ざん拒否、cold replay、Labコピー一致、1/2/4/8分割、同月再試行、資金差戻し、納品帳満杯、デパート5本を確認。
- 独立担当がcore/UIをレビューし、関連70件を実行して成功。店の好みの読み上げ漏れを指摘し、aria-labelへ反映した。
- 実Chromium、DPR3、360×568・375×620・390×680・430×740で通常フォントと縦横はみ出しを確認。4サイズすべて販売室のscrollHeight=clientHeight。旧保存の無変更起動、バックアップ失敗、明示切替、元envelope保全、再読込、実月次売上・台帳・帳面を確認し、JS例外0。`browser-results.json`参照。
- キャッシュは本編entry→新モデル・販売UI・CSS・帳面/履歴/樽投影reader・workerまで更新。旧単独比較workerは現行本編で使われないため変更しない。

## 経済計算の照合

`validation.mjs` は本編の新constructorを正規APIで使い、PR667に保存済みの結果と24要約項目・月ごとの13経済項目を照合する。4条件・275か月すべて一致し、各末尾のcold serialize/replayも成功。`financial-results.json`へ保存した。全84条件の再実行ではない。

| seed42・条件 | 到達月 | 最低資金 | 期末資金 | 販売本数 |
|---|---:|---:|---:|---:|
| 1樽・6月・直販 | 72 | £944 | £1,824 | 332 |
| 4樽・6月・直販 | 72 | £68 | £764 | 291 |
| 2樽・12月・混合 | 72 | £332 | £2,673.60 | 412 |
| 2樽・24月・酒店優先 | 59・停止 | £3.60 | £3.60 | 94 |

停止例の在庫186本・次仕込み不足£387.40も同じ。販売先を戻さない長期品や過剰投資を自動救済しない。これらは現金であって会計利益ではない。全製法/価格/運用に対する安全性は未検証。

旧監査とPR667のnative source guardは当時のruntimeを固定しているため、採用後のmainをそのまま旧runnerで実行すると意図どおり停止する。検査を弱めず、旧証拠は該当checkoutで再実行する。新検証は本編採用専用の別成果とする。

## 再実行

```sh
node --test works/ambertime/tests/market-rules-model.test.mjs works/ambertime/tests/market-rules-ui.test.mjs
node works/ambertime/design/market-rules-adoption/validation.mjs
AMBER_BROWSER_MODULE=/absolute/playwright-core/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium node --test works/ambertime/tests/market-rules-browser.test.mjs
```

Planは `ambertime-market-rules-staging`。先行scopeでは既存formal-copy検査の更新pathが不足していたため、実装差分を一旦退避し、同じmainから新branch・新r0 lockを先行commitしてから差分を移した。旧lockの後付け書換えは行わない。

表現監査は短い店の好みと切替に必要な案内に限定し、重複説明/副題/情緒的結論を追加しない。物理iPhone Safari・VoiceOver・作者の採用・Productionは未確認/未実施。必須CI・公開後の結果はPRへ記録する。CIを作者実機確認やfinal VERIFIEDとは呼ばない。
