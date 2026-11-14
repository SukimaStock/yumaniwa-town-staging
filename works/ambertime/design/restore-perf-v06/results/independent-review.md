# v0.6 最終差分の独立レビュー

2026-11-12。実装担当とは別の担当が、読取専用で最終差分を確認した。

## 対象と判定

- 実際にレビューしたlocal commit: `1ce2b81801af161bc03230f9626e95091035bd7c`
- 実際に確認したGit tree: `3c64d9757127456f34eda153854c97751c9e60b5`
- 比較元local commit: `aacc112e`、tree `5999a11191b670195bf92f7d31b48f20bb57cade`（前段レビュー済み候補に対応）
- 対応先として主担当から提示されたremote commit: `695a70b8e3854624c1877f3e4518e02a74d2ac48`、PR #931
- **限定差分は承認。性能達成・Stagingマージの承認ではない。**

remote commitのGit objectはレビュー用checkoutになかったため、本担当の独立照合は上記local treeまで。remoteとlocal treeの一致は、主担当の別の照合証拠で紐付けること。本報告の追記後のcommitをレビュー済みruntimeと区別する。

## 確認した最終修正

1. Fresh Plan `ambertime-perf-v06c-20261112` はmain `0778bcf4555737ec45947a80aca8f761f39fa429`を基点とし、Plan-only commit `979aa2c2762c937cd53d0df55046318aba2d7ef6`が実装に先行している。
2. 比較元からの差分は新Plan、外部Labの6ファイルのimport/entry query URL、2テストのみ。本編`works/ambertime`のruntimeには追加差分がない。
3. 外部Labの修正はURLのみ。6入口の再帰cache更新検査を通過し、外部Labの変更集合全体を列挙・内容不変検査するよう補強されている。
4. rollback試験は実モデルと同じ`clone-data.mjs?v=restore-perf-v04&perf=v06`をimportし、URL identityとprivate scopeを明示的に確認する。別module instanceによる見かけ上の試験を防いでいる。
5. exact #927との経済ソース比較は元の期待SHA-256を維持。逆変換は既知のcodec分岐、helper import、clone alias、private replay loopに限定し、必要な置換箇所数を確認している。無関係な経済変更を正規化で消す変更は確認されない。

新しい阻害指摘はなし。上記は既存の全性能・ブラウザー結果を新たに認定するものではない。

## 実行した確認

```sh
git diff --stat aacc112e HEAD
git diff aacc112e HEAD -- .change-plans works/ambertime-small-memory-lab works/ambertime-strategy-lab works/ambertime/tests/clone-data.test.mjs works/ambertime/tests/consignment-integration-source.test.mjs
git diff --name-only aacc112e HEAD -- works/ambertime ':!works/ambertime/tests/clone-data.test.mjs' ':!works/ambertime/tests/consignment-integration-source.test.mjs'
node --test works/ambertime/tests/clone-data.test.mjs works/ambertime/tests/consignment-integration-source.test.mjs
```

- 対象テスト13/13成功、失敗・skipなし、約3秒、正常終了。
- 上記runtime差分列挙は空。
- 追加の読取専用graph走査で、同じ6入口から到達する`clone-data / economy / regional-deliveries / regional-partners / regional-consignment / partner-orders / placement-mode`の全import URLを集めた。各入口内の到達可能な対象はすべて単一identity。外部strategy modelのeconomyは本編と同じ`economy.mjs?v=bar-v01-1&perf=v06`。stage5入口はこの7対象に依存していない。走査約0.4秒。これは静的graph確認であり実ブラウザー表示試験ではない。

## cache probeと限界

別途、`cache-proof-probe.mjs`で実100年地元保存と翌月保存を使い、PR #929と今回のcanonical/SHA/cache関数を比較した。semantic readerは**明示的な模擬関数**であり、正式履歴再生・IndexedDB操作は実行していない。

2世代合計9,229,292 code unitsは旧8Mi上限を超える。2件登録後に同じ2件を再読すると、旧cacheはreader呼出しが2→4、新cacheは2→2だった。保持key量は旧4,615,699、新144 code units。強制head読込は両方でreaderを追加実行した。詳細なsource/wire/probe hashとコマンドは`cache-proof-probe.json`に記録している。

このprobeは旧cacheの追出しによる追加reader呼出しの再現であり、履歴再生時間・本編writer時間・総メモリ削減量の実測ではない。本担当が追加したprobeの独立レビューは主担当または別担当が行うこと。iPhone Safari、物理Quota、OS強制終了・電源断、100年性能の合否は本レビュー対象外。未解決の性能問題を理由にマージを止める条件は維持する。
