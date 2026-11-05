# H1-A1 検証記録

対象repository: SukimaStock/yumaniwa-town-staging。
基準main: `7b138e2a78cefe258b780d8426a1b508e4cfb357`。
Plan Lock: `.change-plans/ambertime-h1-a1/r0.lock.json`。
Plan digest: `e7d4fbbd892c5d947a9054b0edb515cb2383d737e675d4a13035e1e28511c21e`。
計測コードfingerprint: `a617d45d6c7c9076cfe80ec754ce3e5f5a9309d85339b99ccca9c98beae89954`（run/measure/ledger-measureの連結SHA-256）。

## 実施結果

- 12条件の元保存SHA-256と容量がH2-4に一致。
- 各条件の正式復元3回＋独立instrumented復元1回、合計48回で正式再保存が元JSONとバイト単位一致。最初の正式復元はhost/cache primingとして統計から除外。
- instrumentedの再生操作数が全12条件で元のoperations.lengthと一致。
- 帳面生成前後とraw回想抽出前後で正式保存のJSON不変を確認。
- 各候補archiveの周年編集4回で採用ID順・seedが一致。初回を除外した3回を編集時間に使用。
- 集計scriptは全12条件・同一計測fingerprint・各復元sourceHash・再生件数・編集再現性をassertしてからREPORT/CSVを生成。
- 新規監査テスト2件成功。UTF-8/UTF-16と親子inclusive集計、計測処理が正式状態一致/改変検出を保つことを確認。
- 関連既存109件は108成功・1失敗。失敗は `r5-history-view.test.mjs` の「R5 moved function/formatter bytes and root after exact reviewed A1 reversal match immutable R4 main」。変更前mainの独立worktreeでも同じ期待/実値ハッシュ不一致を再現。対象の本編・既存テストは変更せず、本監査の成功へ読み替えていない。
- Scope → Risk → Impactのローカル検査成功。最終候補SHAのtrusted CIと機械検証は[PR #805](https://github.com/SukimaStock/yumaniwa-town-staging/pull/805)のchecks/本文を参照。
- 独立レビューで計測境界・cache条件・memory範囲・版固定・依存関係を照合し、指摘を修正。

関連回帰の実行コマンド:

```sh
node --test works/ambertime/save-audit/measure.test.mjs works/ambertime/chronicle-lab/*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*ledger*.test.mjs works/ambertime/tests/*history*.test.mjs
```

途中で実行接続が切れたため、完了済み11条件の保存ハッシュ・fingerprintを照合して再利用し、未完了のmixed-1200条件だけを新規processで再実行した。中断条件の部分計測は最終統計へ混ぜていない。入力の正式保存は上書き・削除していない。

## 保護と未確認

変更はPlan Lockとsave-audit内の研究コード・テスト・資料のみ。本編、正式保存形式、経済、乱数、帳面UI、C-3/D1.1/D1.2/H2-5、既存100年資料、Productionは変更していない。H1-A2は計画のみ。

iPhone Safari、DOM/worker転送/paint、保存先quota、新保存方式の同一性・容量削減・復元高速化は未確認。新方式を現行readerへ接続していない。

Change Verification契約のfinal状態は`UNVERIFIED`のまま。CIや本記録を作者実機確認・採用・Production公開承認として扱わない。
