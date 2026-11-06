# AmberTime L100-4B-2 隔離研究

正式本編の変更なし。Draft PRのみ。マージ禁止。

基準 main: 6a1707c106afb4bf0658a274edf404bbc541de64。
先行#837: d674cb58b14ad1c7f45819694cd2367dfd11ccc8。
B1 adapter SHA256 f2049523f1e412bfa06ae37863ad87c48eaf1ec1cf77e27376fadb16c4ca4ace。
先行研究コードは別checkoutを参照し、正式mainへ取り込まない。

実行 Node v24.22.1 / Linux / --expose-gc。

```sh
node --test works/ambertime/l100-4b-2/trust.test.mjs
node --expose-gc works/ambertime/l100-4b-2/run.mjs INPUT_V8 OUTPUT_JSON
node --expose-gc works/ambertime/l100-4b-2/baseline.mjs PRIOR_B1_ADAPTER INPUT_V8 PRIOR_CHECKPOINT OUTPUT_JSON
node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/recall-save.test.mjs works/ambertime/tests/h1-b2-codec.test.mjs
```

PR #837 exact checkoutの研究sourceとLibrary evidenceのcheckpointを組にする。
B1 dependency fingerprintは全研究mjsも含むので、そのcheckoutのcodeを変更しない。
新測定もfingerprint生成後にcodeを変更しない。fixtureと証拠のSHAはresultsに記録。

baselineはB1 cold→月次→正式save1→月次→save2→warm正式再読込。
runは安全なfull admission→月次→save1→月次→save2→same-process再読込→翌月。
後者のadmission費用は必ず総費用に含める。これを高速checkpoint復元とは呼ばない。
全processを逐次実行。OS file cacheは制御していない。外部共有host負荷は排除できない。
計測期間に小規模の独立test/reviewが重なる場合は結果報告に明記する。

12か月・9世代への新規拡張はcold初回保存の保証が成立する場合に限る。
今回のgate判定と結果はREPORT.md。旧B1の成功は再利用証拠として区別する。
