# AmberTime L1 — 実装・検証

基準main `632968a80b81ea1478012073b2de9a0f6e525183`。分類・運用は[計画](LAB-ARCHIVE-PLAN.md)、全件と依存根拠は[棚卸し](LAB-ARCHIVE-INVENTORY.md)。[R6総括](../../REFACTOR-SUMMARY.md)のゲーム／描画／キャッシュ境界を変更しない。

## 実装

- `data/lab-rooms.json`：歴史表示の登録入口21件を既存storedへ配置。登録を削らない。従来自動追加されていたAmberTime系入口も明示配置し、研究記録化後の自動再表示を防ぐ。
- `data/ambertime-research.json`：39資産の目的・結果・採用・保留・保護・参照資料。4現役／5要確認／30研究記録、保護24。研究表示の分類はlifecycleのactiveや作者の採用とは別。
- `tools/ambertime-research.cjs`：既存work IDから名称と公開入口を解決。内部版の実体URLと根拠の存在を検査し、研究ページを生成。重複・欠落・unsafe参照・コピーされたlifecycle状態を拒否。
- `tools/lab-renderer.cjs`：研究記録扱いのstored項目は通常の奥棚へ重複表示せず、AmberTimeの既存欄から「研究記録」へ案内。未登録のcontinuous-tradeは実在する内部URLを通常欄に補う。
- `tools/work-lifecycle.cjs`：既存の `--write-lab` / `--check` が通常一覧と研究ページの両方を管理する。
- `lab/ambertime-research.html` / CSS：6テーマ、各版の開閉、元Labと根拠資料、LABへ戻る。同じタブの通常リンクで、ブラウザーの戻るも利用できる。JS・新しいアニメーションなし。

通常一覧は本編＋現役4＋要確認5。元のAmberTime関連登録29入口はすべて保持し、現在表示8登録＋研究記録21登録。内部版continuous-tradeは別に通常表示。資産全体39と登録29の単位を混同しない。研究ページには現役・要確認も含む39資産を載せる。蒸留とカット、味と熟成、販売と取扱店、評判と地域拡大、地図と視覚表現、操作・画面設計へまとめた。

## 保護と検証

`tests/test-ambertime-research.cjs` 6件＋既存lifecycle24件＝30成功、失敗・skip0（`focused-tests.log`）。新規負例は重複、unsafe/欠落source、欠落evidence、状態複製、無関係work、表示不整合。通常と研究記録の生成一致、全39・登録29・保護24・分類件数を確認。他作品のカードと他6室の生成HTMLはbyte一致。互換検査の初回では空行1行の差を検出し、rendererの条件出力を直して完全一致させた。

基準時点に存在する本編と既存Labの全ファイルをGit blobとbyte比較し、差分0。7つの本編依存ファイル、import元、import query、正式モデル、旧保存reader、fixtures、R1〜R6の実体はすべて維持。単なる7ファイルの存在確認に留めていない。

本編全域1,216件を既存期待値で実行し、1,216成功、失敗・skip/cancel/todo0（199.238秒、`formal-tests.log`）。R6の基準件数から増減なし。R0の129途中状態、蒸留20状態、旧保存cold replay、RNG・月次・経済・在庫・通知順・保存失敗・R1〜R6の回帰を含む。新規LAB6テストはこの1,216件の外。

旧URLは39実体＋29登録入口の68 URLを変更前後のHTTP200と応答SHA256一致で確認。reputation/indexの既存v03転送、独立v01、cask-aroma、販売室v073、cutの代表5入口を両engineで再読込・転送先・PNG一致まで確認（10組）。初回はWebKit販売室のfont後RAFが未settleで画素不一致。製品を変更せず、font-ready後の固定1秒時計進行を両側へ揃えて再実行し、全10組一致。初回診断とfinal結果を保持した。全38画面の全操作をE2Eしたという意味ではない。

## ブラウザー

Chromium140 headless shell／WebKit26.5、360・375・390・430px、各reduced-motion有無＝16条件。研究39項目・6テーマ・横overflowなし、テーマ移動、summaryのキーボードEnter、リンクfocus、旧Labへ進む、reload、ブラウザーで戻る、明示LABへ戻るを確認。両engineでJS無効の研究閲覧・開閉も確認。結果は `browser/results.json`、runnerは `browser/run.mjs`。

通常フォント条件のPNGを保持する。このLinux環境には日本語system fontがないため、日本語が四角になる。追加の `*-research-font-preview.png` だけ既存の美咲フォントをブラウザー内CSSで一時適用し、日本語の折返し・密度を補助目視する。製品CSSは既存LABと同様にsystem fontを利用し、製品へfont依存を追加していない。この補助画像をiPhoneの実フォント表示とは呼ばない。

物理iPhone Safari、VoiceOver音声、OS toolbar/safe-areaの実機確認は未確認。自動WebKitは代替の実機証拠ではない。

## 独立レビューと範囲

実装者以外が設計と実装をレビューし、生成・互換性の30テストを別実行。研究説明の取り違え、旧v01と転送の混同、目的欄の資料前文コピーをP2として検出。原典へ戻して全39の目的と版別結果を修正し、独立再レビューで解消を確認。コード・URL維持の公開阻害事項なし。表現監査では目的・根拠・移動に必要な文だけを残し、装飾・評価点・進捗率を追加しなかった。

Scope → Risk → Impactはすべて成功。exact SHAの再実行結果、必須CI、マージ・Pages配信はPRへ記録する。正式verificationStateはChange OSの現行契約どおりUNVERIFIEDであり、CI成功を作者の採用・実機確認・Production承認と扱わない。

## キャッシュ・公開・保留

研究CSSは内容hash query付き。既存LAB CSS/JS、全Lab・本編のbodyとURL identityは変更なしで、既存warm cacheを壊すためのquery変更や削除は不要。研究ページは静的HTMLでmetadata更新時に再生成する。

contest最新版、decision、continuous-trade、取扱関係v02、word-craftingは継続判断が要確認のまま通常表示を維持。古いという理由で作者の終了判断に置換していない。本編に採用された要素と当時の比較仮説は区別した。Productionは変更しない。L1で今回の構造整理を区切り、追加のリファクタリング・ゲーム機能へ進まない。
