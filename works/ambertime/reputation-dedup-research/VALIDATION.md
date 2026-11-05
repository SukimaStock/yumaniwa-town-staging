# H1-B1 検証記録

基準main `fcc14b249733b6cccd598bcd2e567e64848bcd7f`。Plan Lock `.change-plans/ambertime-h1-b1/r0.lock.json`、digest `30d48effbe8fe6e7d55d4161345e7df8cdeb4394489743a8149e58428ded1d4b`。
実装前Lock-only local commit `6e51defe1fbcb3de1ac1b59625766b85b14bf0a0`、remote `a4e5fa1fb73e43eeb65d4e27eaa62ef17c506b64`。GitHub連携API経由で同じblob/treeを登録するためcommit SHAは別。

## 完了条件と証拠

- 12元保存は元scratch不在により既存H24 generatorで再生成。全12保存SHAと容量が既存H24に一致。旧入力を上書き・削除していない。
- 12×A/B/Cのwire変換→decodeが元の全JSONとbyte一致。ゲーム計算とarrivals以外の全項目、attempts、イベント順、ID/参照チェーンを保持。
- 新規759 API操作（短期702＋長期12＋製造45）×3案が全状態一致。短期完了証拠はfingerprintと元出力SHAを照合して再利用。製造45操作はunit testでも再実行。詳細FUTURE.md。
- 9世代境界×3案でmaterial再構成/編集27回を実行し、H1-A3完了materialのdigest・seed・採用順・文章に一致。元100年raw抽出は既存input SHA・完了状態・53依存blob不変を条件に再利用した。同じraw抽出を27回新規再生したとは扱わない。
- Chromium153で36条件のsession実書込・読戻・reload。B/C全24成功、A広域90/100年のみnative quota失敗。B/C広域100年のclean process再開一致。別originでnative quota拒否を観測。C完全2コピーは実quota不足、元1本保持。
- 研究envelopeを正式readerへ接続していない。広域100年CのlocalStorage余裕19.3%、展開後の旧内部reader余裕約3%。余裕が十分とは断定しない。runtimeメモリ削減も主張しない。
- iPhone Safari/WebKit、OS kill・電断・eviction・100年超の継続は未検証。

## テスト

研究13件成功。関連既存142件は141成功・既存R5固定hash1失敗。基準mainの別worktreeでもR5は4件中3成功で同じ失敗を確認。期待`c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5`、実`14b472590a731fa9a7fd17183f28af0cd107e6d9003f2b722e26a183179b5798`。既存期待値・本編を変更しない。

```sh
node --test works/ambertime/reputation-dedup-research/*.test.mjs
node --test works/ambertime/save-audit/measure.test.mjs works/ambertime/checkpoint-research/*.test.mjs works/ambertime/checkpoint-persistence/*.test.mjs works/ambertime/checkpoint-idb-research/*.test.mjs works/ambertime/chronicle-lab/*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*ledger*.test.mjs works/ambertime/tests/*history*.test.mjs
```

Lifecycle整合検査成功。Scope→Risk→Impact・構文、exact remote SHAの必須CIはPR結果へ固定する。Change Verificationの最終状態はUNVERIFIED。研究のStagingマージを正式採用・実機合格・Production公開へ読み替えない。

## 独立レビュー

歴史担当者が自分の担当以外のcodec・容量・browser・futureを独立レビュー。欠落/順序拒否、実API、保存namespace、headroomを確認しblocking問題なし。A失敗matrixの空状態保持と、quota探索/完全2コピー時の非空保持を区別する記述を追記した。別担当者が総合レポート・容量値・歴史証拠を独立レビューし、C-3確定の再利用と今回の編集実行の区別、長期追加arrival集計36件の記載を修正した。

表現監査は内部fixtureの必要な案内だけとし、本編UI・説明カード・新しい常設LAB入口を追加しない。新規計算・reader/writer・データ移行・過去記録削除なし。
