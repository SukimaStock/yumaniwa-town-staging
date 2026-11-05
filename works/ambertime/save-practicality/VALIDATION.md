# H1-A5 検証記録

基準main `306524e1e7df3a5b2e2ba27310fb269d6e15aa4a`。
Plan `.change-plans/ambertime-h1-a5/r0.lock.json`、digest `5e87bfafc298d96d0d22516c27cef4a433f47fb01f6ae1f9fe11949e090a11b6`。
実装前local Lock-only commit `ff5d6235`、remote Lock-only commit `50b8ba46fcd38990690f0b360902350b3d84e187`。Git CLI以外のGitHub連携APIで同じblob/treeを送るためcommit SHAは異なる。

## 測定と証拠

- Chromium 153、12元入力H24 SHA照合。raw/sessionの実localStorage書込・読戻、reload、clean process再開。広域90/100年のnative quota失敗、広域60年正常session保持を確認。全12raw IDB往復一致。fingerprintはbrowser-results.jsonと3ファイル連結を検査。
- WebKitはhost依存不足で起動不能。iPhone Safari、ロック・background・OS kill・保存中中断・eviction・実IDB quotaは未検証。
- Node JSON/clone/hash/copy/Worker比較12条件、正式wide100のcold復元/再保存一致、月次12条件の決定性と元状態不変を確認。
- 再利用証拠は既存A1の入力SHA・計測fingerprint・静的推移依存blobを照合。ルート集合により43/45/53依存の照合範囲が異なり、同じ1個の全体fingerprintだとは扱わない。A4の588MB heapと128MiB失敗は元fingerprintの歴史的観測であり再計測していない。
- 広域formal測定は実行後、未変更のformal分岐とmodelへhashを付記した。全scriptの実行時fingerprint/end guardではなく、run分岐変更と区別した再構成provenanceとして保持。formalの測定branchはperformance-formal.jsonのformalBranchSha256に対応。実行後に非formal集計branchを整理したためファイル全体の最新hashを当時の実行hashと呼ばない。formal branch/model/inputと依存照合をevidence.testが確認する。日付は研究実施日の2026-11-05、Node v24.22.1/Linux。
- 性能値は共有hostの少数試行。Node process maxRSS、worker isolate heap、Chromium sample heapを区別。同期heap瞬間peakは未計測。Workerの巨大state返却・ブラウザframe性能・正式全経路自動保存を測定したとは扱わない。

## テスト

研究7件＋既存保存失敗11件、計18件成功。

```sh
node --test works/ambertime/save-practicality/*.test.mjs works/ambertime/tests/r0-app-baseline.test.mjs works/ambertime/tests/placement-save.test.mjs
```

関連142件は141成功・既存R5固定hash1失敗。基準mainの独立worktree `/tmp/h1-a5-base`でも同じR5失敗（4件中3成功）を再現。期待`c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5`、実`14b472590a731fa9a7fd17183f28af0cd107e6d9003f2b722e26a183179b5798`。本編・期待値を変更しない。

```sh
node --test works/ambertime/save-audit/measure.test.mjs works/ambertime/checkpoint-research/*.test.mjs works/ambertime/checkpoint-persistence/*.test.mjs works/ambertime/checkpoint-idb-research/*.test.mjs works/ambertime/chronicle-lab/*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*ledger*.test.mjs works/ambertime/tests/*history*.test.mjs
```

Scope→Risk→Impact、syntaxとremote exact SHAの必須CIはPRの結果へ固定する。Change Verification最終状態はUNVERIFIEDを維持する。Staging mergeを作者の採用・実機合格・Production公開としない。

## 表現・独立レビュー

内部検証fixtureはファイル選択・書込・読込・研究キー削除の必要な操作だけ。常設本編UI・説明カード・LAB作品登録を追加していない。研究と正式採用、観測と未検証を分離した。独立レビューでnamespace・証拠fingerprint・失敗保持・計測境界・報告を確認した。formalの再構成provenanceの限定とREADMEの未対応引数記載を修正。独立reviewと研究7件の再検査でblocking問題なし。
