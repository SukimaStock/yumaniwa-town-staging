# H1-A4 検証記録

基準main `00e6a0090d068b5d917dd806244a654dfa09bba3`。Plan Lock `.change-plans/ambertime-h1-a4/r0.lock.json`、digest `912ae971e3f622e47d55d350e1b9cc34aee19ed80ece5fd372b420f1144433cc`。最初のlocal commit `766d1b9f`はLock一件だけ。remoteもbaseからLockだけのcommit `ded4ee301bc7c2b70b111a028dca3a45ef25effc`を先に作成した。

[PR #808](https://github.com/SukimaStock/yumaniwa-town-staging/pull/808)。Git CLIにはwrite credentialが無いため、GitHub連携Git Data APIで同じblob/treeを登録する。Scope/Risk/Impactと必須CIはremote exact SHAで確認する。

## 既存回帰

研究Node31件成功（H1-A2/A3の29件＋新trust2件）。関連既存回帰109件は108成功・R5固定hash1失敗。最新baseの独立worktreeでもR5の4件中3成功・同じ1失敗を再現した。

期待値 `c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5`、実値 `14b472590a731fa9a7fd17183f28af0cd107e6d9003f2b722e26a183179b5798`。期待値・shop-app・正式readerは変更しない。

## 独立レビューと修正

- IDB transaction内の非IDB crypto awaitを除去。hashはtransaction開始前に完了。
- 最新1件保持でslice(-0)が全件を残す問題、hashの辞書順を時系列扱いする問題を修正。
- ABAをhead IDだけで判定せず、単調revisionを保存/rollbackで比較。
- prepare後のGCで部品が消えても、公開transactionで全部品を再配置。
- rollbackの事前検証後にGCが対象を消したら、公開transaction内の全record比較で拒否。
- 分岐別の歴史IDをimmutable hash indexへ固定し、過去payloadの書換を拒否。
- GitHub P2 #4480294138：readのheadとpayloadを同一readonly transactionへ変更。
- GitHub P2 #4480294146：A/Bで保持された古い公開commitも復旧候補として探索。

browserの失敗試行は、低heap用fixture gate、quota実験originの隔離を修正した。繰返し文字payloadがquotaを消費しない可能性から非圧縮payloadへ変更し、quotaが実際に拒否されない場合は未検証とした。前の失敗・source変更中のinvalidated計測を最終成功へ混ぜない。

## 実行結果の範囲

修正前の前P2 Chromium実測は`476b8134f10c6ce0bdb4ef7865d29a5269cfd2ae8b9b10d99540171c2cbbf10d`で40正常protocol、39小heap protocol、100維持cycle、9全歴史境界の往復を確認。大きいfixtureの128MiB pipeline crashは失敗したresource条件として保持し、正常heap再起動で旧commitを復旧した。native quota/WebKit/Safari/電断は未検証。

P2修正後のcurrent-source protocol再検証は別fingerprintとしてresults.jsonへ記録する。前P2の100維持cycleを再実行せず、修正前の性能として表示する。現在版の性能へ改名しない。H1-A3の100年全再生も繰り返していない。

研究専用DBの原子commitは正式採用を意味しない。Change Verification最終状態は`UNVERIFIED`を維持し、CIやStaging mergeをiPhone実機確認・Production公開として扱わない。

P2修正後は実Chromium 153で42/42成功。既存40件（3正式bundle/9歴史境界を含む）に、読込・公開・GCの20回競合と、A/Bの保持commit復旧を追加。current fingerprint `cc4533ea5053651bae4075ec72023202831838054653cb5a20ce57efe65f8927`、fixture SHA `9ae474b6357b87d13ed5c8d0a92381d2e5e6b807cd186c40b018519fba8ae4ef`のend guardに一致。前P2の100cycle性能・低heap試験は元fingerprintのまま別provenanceへ保持した。
