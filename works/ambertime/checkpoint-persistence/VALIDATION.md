# H1-A3 検証記録

基準main: `74eb99ec28102c67b9e765684cfaf072a2a1c2e5`。
Plan Lock: `.change-plans/ambertime-h1-a3/r0.lock.json`。
Digest: `c4b0bd72e7c46581e4e54761646cb7f03676f2e2e4d5b145551a317be4e539be`。
PR: [#807](https://github.com/SukimaStock/yumaniwa-town-staging/pull/807)。

## テストと独立比較

H1-A2研究12件＋H1-A3研究15件の27件成功。後続のcoverage6件拡張も成功（12の正式条件で資料比較を追加）。製品コードと既存期待値は変更していない。

- 別Node PID、JSON経由のcheckpointと非空tail、正式状態・乱数・contextの完全一致。
- seeds101/202各2銘柄、保留申し出受諾/納品/月次と辞退/月次、再び元分岐を開く操作、担当者と委任中/完了、通常蒸留37step/試飲overlay、v08から正式移行した旧origin、世代交代前後。
- 上記12条件のcollectorも、prefix時点だけからMap/Setを保存し、再開後の全資料を新しい全再生collectorと比較。樽・歩み・発売・店舗帳面は未変更の正式関数と独立比較。この拡張matrixの資料比較は同process、長期3条件の資料比較は別processである。
- wide60ではraw歴史事実も独立H25抽出processと一致。finish前後でcollectorのpayload不変。同じ過去から、元の未来と新しく選んだ月次分岐を再生して全資料が一致。
- envelope破損と、再sealしたmodel/context/version/prefix不正、tail欠落/改変/誤対応、異seed/同seed異prefix、checkpoint欠落、commit欠落、中断tmpを拒否。旧commitの正常復元と元正式保存fallbackを比較。自己hashを改変できる主体に対する認証とはしない。
- fallback APIは直接observerを拒否し、失敗した部分再生collectorの副作用が外部へ残る経路を防ぐ。
- 元保存・全prefixが失われた場合は復旧不能という負例を保持する。hashをbackup扱いしない。

## 既存回帰

```sh
node --test works/ambertime/chronicle-lab/*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*ledger*.test.mjs works/ambertime/tests/*history*.test.mjs
```

109件中108成功・1失敗。失敗は既存`r5-history-view.test.mjs`固定hash検査。期待値`c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5`、実値`14b472590a731fa9a7fd17183f28af0cd107e6d9003f2b722e26a183179b5798`。

変更前mainを独立worktreeへcheckoutし同testを実行、4件中3成功・同じ1失敗を再現。shop-app/test/a1基準は変更なし。この失敗を隠すための期待値更新はしていない。

## 長期結果と信頼境界

H1-A2既存60本の全同値フラグ・入力12SHA/容量・model fingerprintを照合して再利用した。H1-A3では100年3方針の5方式15cold状態復元、3cold資料継続、9不変交代境界を全件一致した。条件別のsourceHash・codeFingerprintと詳細内訳はresults.json。未完了条件をcompleteへ混ぜず、同一fingerprintの完了JSONのみ再利用する。

新規実装は研究ディレクトリのみ。Scope → Risk → Impact、研究全mjs構文、Lifecycleを確認する。独立レビューで検出した「意味検査へ届かない異常テスト」「中断時の旧commit」「fallback observer副作用」は追加試験とAPI制約で対応した。計測のJSON解析内訳、GC、並行host負荷、独立prefix保証未実装をREPORTへ記載する。

最終CI・対象remote SHAはPR #807のcheck結果を参照。ローカルgit pushにcredentialがないため、同じblob/treeをGitHub連携のGit Data APIで登録した。remoteでも最初のcommitは固定baseからLock一件だけ、その子孫へ実装と集計を追加する。CIはremote exact SHAを検査する。

Change Verificationの最終状態は`UNVERIFIED`。研究一致・Staging CI・mergeをSafari実機確認、作者採用、新しい正式保存形式の承認、Production反映として扱わない。

最終状態計測fingerprint: `841ad0baf3e33f40464ddb2a50eba6e50d455cf59d59ffe3125b72ab5f9a4957`。fallback observer制約の確定前に始まった地元条件は最終集計へ含めず、確定コードの別出力先で再計測した。3方針とも同一fingerprint。全input SHA/容量は最後にもbaselineで再照合する。local条件の再実行は`reused:true`で重い計測なしに完了し、完了JSON再利用を確認した。

context-probeは15方式で別NodeのdecodeContext単体を追加観測した。統合localVerifyMsはcontext decodeを既に含むため、この追加時間を合算しない。
