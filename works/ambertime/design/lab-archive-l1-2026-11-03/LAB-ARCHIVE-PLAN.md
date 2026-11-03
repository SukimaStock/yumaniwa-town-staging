# AmberTime L1 — Labの研究記録化

基準main `632968a80b81ea1478012073b2de9a0f6e525183`（R6 / PR #775）。原典は[構造監査の棚卸し](../structure-audit-2026-11-02/LAB-INVENTORY.md)、[構造監査](../structure-audit-2026-11-02/STRUCTURE-AUDIT.md)、[段階計画](../structure-audit-2026-11-02/REFACTOR-PLAN.md)、[R0〜R6総括](../../REFACTOR-SUMMARY.md)。実装前Lockは `.change-plans/ambertime-lab-records-l1-20261103/r0.lock.json`、digest `c8d0358b24aa57aec252ac38a51c114ff9429828202d10d9bbf90fb0c388a3da`。

## 現行登録と公開

`data/work-lifecycle.json` が作品ID・名称・path・状態の正本。`data/lab-rooms.json` は部屋と説明、既存の `stored:true` は奥棚表示。`tools/lab-renderer.cjs` は未配置のactive/candidateを作業台へ自動追加する。登録を削る方式は採らない。凍結と研究記録は別の判断で、lifecycleは変更しない。

`tools/work-lifecycle.cjs --write-lab` で通常一覧と研究記録を同時生成、`--check` で両方の生成一致を検査する。GitHub Pagesの既存静的公開対象に `lab/` とすべての `works/` が含まれる。新しい公開処理・常駐bot・部屋は追加しない。Productionへ移送しない。

## 分類と表示

39資産・38実画面・29登録入口、保護対象24件は原典から増減なし。現役再比較4件を維持。従来B候補のうち、contest最新版、decision、continuous-trade、shop-expansion v02、word-craftingの5件は継続判断が曖昧なため、要確認として通常表示を維持する。研究記録30件。これは実験継続や作者採用を確定する分類ではない。

研究記録の登録済み入口は `stored:true` のまま配置を保持し、通常の奥棚から研究記録へ表示先を分ける。未配置だった登録済みLabも明示配置し、自動追加で再表示されることを防ぐ。通常一覧には4現役＋5要確認の入口を残す。未登録のcontinuous-tradeは元の内部版へ直接リンクし、架空のworkを作らない。

AmberTime本編の既存欄に「研究記録」リンクを置き、`lab/ambertime-research.html` へ進む。6テーマに各版をまとめ、目的・結果・本編採用・見送りや保留・根拠・元Labを短く表示する。記録ページには39資産すべてを含め、現役と要確認も状態を示して振り返れるようにする。既存の凍結保管庫は変更しない。

## 正本と互換性

`data/ambertime-research.json` は研究の表示・根拠だけを持つ。登録済みの名称と公開入口はwork IDからlifecycleを参照する。sourceは原典の実験資産との対応であり公開入口を置き換えない。未登録の内部版だけ名称を記録する。未知の採用は未確認、当時のLab内採用と本編採用を分ける。

URL・wrapper・meta refresh・import query・保存key・コードの実体は据え置く。39資産、登録入口29、本編旧入口19、補助QA/report画面も削除しない。7つの本編依存ファイル、他Labやテストからの参照は移動・複製・改名しない。正式依存の解消はこのL1の範囲外。

## 更新時の運用

新しいLabは従来どおりlifecycleとLAB配置へ接続する。研究記録へ入れるときは実際の資料と採用PRを確認し、metadataへ対応資産・結果・未確認を追加する。登録済みの履歴は配置を維持してstoredへ切り替え、通常一覧と研究記録を同時生成・検査する。不確実なものは通常表示を残す。版をまとめてもURLを最新版へ付け替えない。

検査は生成一致、unsafe/欠落/重複metadata拒否、他作品HTML一致、旧URLと転送、保護ファイルと本編source一致、正式保存回帰、Chromium/WebKitのモバイル幅とキーボード・往復。実装者以外のレビューと必須CIを通して通常PRでStagingへ反映する。戻す場合はL1の表示・資料だけを通常revert PRで戻せる。データ移行は不要。

表示には見出しと開閉だけを使う。装飾カード・点数・進捗・新しいアニメーションは追加しない。表現監査は根拠のある研究内容と移動に必要な案内だけを残す。
