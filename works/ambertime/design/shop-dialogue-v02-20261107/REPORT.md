# 店舗会話 v0.2 第1段階：町の酒店

## 結論

町の酒店への接続を実装。**Draft PRで停止し、マージ・Staging公開・Production変更はしない。実画面の受入は未完了。**

原稿9文を分離し、日常は画像なし、記憶は過去の発売回のパッケージ付き。実売・納品と配置予定を区別し、元のゲーム、経済、風味、乱数、履歴、回想、正式v8形式を変更しない。

## 基準と資料

- 基準main：`d8f31510837c8ee07369ff2270fe46b9698edf99`（作業開始時の最新main）。Work Lifecycleはactive。
- 先行Plan-only commit：`3620f38a73b97fdd675647c48bcdcc51993b6e8e`（ローカル）。Lock digest：`efbafb678aa9a9f0a167c97c903cc40377ecae6d29be57143acaafb580a6a698`。
- 作者の「店舗会話システム v0.2：段階的な本編実装」全文と `AmberTime-Shop-Dialogue-10Year-Comparison-Lab-v02-20261107.html` を確認。B「ほどよい」は密度の参考であり、固定確率の仕様として転記していない。
- root/AmberTime AGENTS、Change OS、EXPRESSION-AUDITを確認。
- `shop-remarks.mjs`、`shop-model.mjs`、`shop-app.mjs`、`market-ui.mjs`、`partner-orders.mjs`、`shop-ledger.mjs`、`store-market.mjs`、`release-package.mjs`、`event-notices.mjs`、`placement-mode.mjs`、`map-sales-view.mjs` を参照。

## 実装ファイルと原稿の編集場所

| ファイル | 役割 |
|---|---|
| `shop-dialogue-text.mjs` | 作者原稿9文。文章変更はここだけで可能 |
| `shop-dialogue.mjs` | 実績候補、日常／記憶、機会の選択、最新会話の導出 |
| `shop-dialogue-view.mjs` | 共通パッケージ描画、受動通知と延期・中断 |
| `shop-dialogue.css` | 小さな通知と店内最新会話の表示 |
| `shop-app.mjs` | 保存成功後の通知予約、既存店名モーダル、session切替 |
| `index.html` | CSS読込とappのキャッシュ版更新 |
| `tests/shop-dialogue*.test.mjs` | 純粋条件・保存境界・通知・ブラウザー受入 |

バー、他店、販路、注文、報酬、信頼ポイント、返信、納品を求める新操作は追加していない。既存の店情報・好み・累計・販売操作は保持。

## 発生条件と暫定頻度

選択はゲームRNGでなく、固定名前空間・seed・年月による決定的hashを使用する。店舗ごとの個別抽選を積み上げず、まずゲーム全体の機会を1回だけ判定する。今回は町の酒店1店のみ。

暫定policy v1：
- 全体の月次機会：hashを12分割したうち1枠。毎月必ず出る方式ではない。
- 会話間隔：最低9か月。同文：最低36か月。
- 記憶：適格候補がある機会の4分割中1枠、記憶同士は最低36か月。
- 記憶の発売・最初の実取引から最低24か月。
- 「この間のお酒」：前月末までの直近3か月に実績あり。
- 「新しいお酒」：前月末までの直近3か月の発売あり、酒店との関係あり。
- 「ご無沙汰」：実取引が存在し、最後から12か月以上。
- 「久しぶりに見ました」：同じ発売回が12か月以上空いて再取引され、再取引から3か月以内。

納品量・金額・放置年数を加点しない。一度だけの実取引も、途絶えた取引も記憶候補に残る。「青い箱」は保存プロフィールの共通packageFamilyがsmokeの発売回だけ。欠落したrelease、異なるshop/product/brand、画像を復元できないprofileは除外する。

この暫定値を最終的な体験調整済みとはしない。2店舗10年のLabと同じ回数を本編に強制していない。将来の店舗追加では全体枠の中で店の選定を追加し、店ごとに枠を増やさない。

## 最新会話の保存・再開

正式v8に新しいフィールドを加えず、**保存済みの不変事実から発行済み会話を再構成**する。保存容量増加はゼロ。読了・実際に画面へ表示したという履歴を保存する方式ではない。

月mの候補はmより前の納品・発売・関係だけを見る。月mの後続操作や未来の納品によって過去の会話を再抽選しない。店内は最新1件だけを表示する。画像データは保存しない。ポリシーv1を変更すると過去の導出も変わるため、今後の調整はこの互換性を明示して扱う。

保存成功後の新しい月次遷移だけ通知を予約する。書込失敗・競合では発行しない。import、新規開始、session切替では待機通知と導出cacheを破棄し、別の保存の会話を混ぜない。reloadでは最新会話を再構成するが通知を再送しない。未表示の通知を後日まとめて積み上げない。

モーダル・試飲・蒸留・樽詰め・瓶詰め・世代交代・重要判断・配置操作・既存通知・保存警告中は表示を延期。表示中に割り込まれたら退き、安全になった後に再表示する。新しい会話が待っているときは古い会話で上書きしない。表示時間6.5秒。ボタン・クリック要求はなく、pointer-events:none。店名から同じ一言を読める。

## 過去パッケージの再構成

共通 `packageArt` を使用し、E案の箱形状・底位置・画素を変更しない。release.profileとブランドの瓶・ラベルを使い、キャップは**瓶詰め完成時**のstandardを再現する。現在の販売価格tierによって昔の画像を変えない。

根拠：`partner-orders.mjs` のbottleBranded→bottleTransaction→`economy.mjs` bottleNowで新商品のselectedPriceはstandard。既存ブランドの瓶・ラベル変更は禁止され、ブランド再設定は発売ゼロの場合だけ。release.profileは複製される。「納品当日の価格キャップ」の復元を主張するものではない。

## 検証

環境：Linux、Node v24.22.1。100年全プレイの再実行はしていない。

- 新規Node試験：17件成功。原稿、候補条件、青箱、時間差、取引中断、同月／未来による過去改変防止、無変更、最新のみ、延期・中断、再読込、保存成功／失敗の実関数境界、古い表示による新通知上書き防止。
- 既存回帰：shop-remarks、release-package、formal-save、store-market-main、placement-saveの計53件成功。
- 必須UI3ファイル：37件中32件成功、5件失敗。別の変更前main作業ツリーでも同じ5件が失敗。期待値や既存テストは変更していない。
- Scope、Risk、Impact、Plan Lock確認：成功。
- 実ブラウザー：**未確認**。Chromiumはページ表示前に `process_singleton_posix.cc socket() failed: Operation not permitted (1)`。比較画像なし。詳細は `browser-results.json`。
- ブラウザーテストの未指定時skipを成功として数えていない。記憶の視覚fixtureは合成表示であり、自然発生や正式保存の証拠にしない。
- iPhone Safari実機：未確認。

既存失敗5件：
1. staff and ledger displays keep contextual short labels and important operation distinctions
2. cache reader chain updates every changed helper and worker entry
3. main entry and all main projection readers refresh the new rules closure
4. native market commits live state and receipt presentation only after exact conditional save
5. quota, conflict and invalid state never publish market inventory or success receipts

読み取り性能の参考：1200か月・200発売・2048取引の合成projectionをNodeで5回測定し、初回39.3ms、その後20.2〜23.6ms。実セーブ／本編100年／ブラウザーの測定ではない。`projection-performance.json`参照。同じgame参照の再描画は導出cacheを再利用するが、月次処理や低速端末の性能は別途受入が必要。

## 再現手順

```sh
node --test works/ambertime/tests/shop-dialogue.test.mjs works/ambertime/tests/shop-dialogue-view.test.mjs
node --test works/ambertime/tests/shop-remarks.test.mjs works/ambertime/tests/release-package.test.mjs works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/store-market-main.test.mjs works/ambertime/tests/placement-save.test.mjs
node --test works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium node --test works/ambertime/tests/shop-dialogue-browser.test.mjs
```

ブラウザー試験は独立したlocalhost preview fixtureだけを使用。既存プレイヤーの保存には触れない。360×568／375×620／390×680／430×740、日常・記憶、店内最新、重要UI中断、reload、reduced-motionの手順を用意しているが、今回は実行できていない。

## 次の最小段階

1. このDraftの差分を隔離ブラウザーで動作・表示確認し、日常／記憶／店情報の比較画像を取得する。
2. iPhone Safariで読みやすさ、表示位置、店名→最新会話、重要操作中の延期を確認する。
3. ほどよい頻度か作者が確認する。調整が必要なら導出互換性を含めてpolicy変更を判断する。
4. 第1段階の受入後にのみ、別依頼でバーや複数店へ進む。

実画面未確認のため、今回を「そのままマージ可能」とは判定しない。
