# A1-3 公開後確認 — 独立レビュー

対象はPR #782のmerge `0c3473f4f604888fcdb581874ad73f3436dfbb9a`、Pages run `41668668880`、公開確認Lock digest `9af2b8fa85bc5d0c658c17ceb261eb6d0ac27b9084426ffe7da44cb7f4f61f51`。検証実行担当とは別agentがrunner・adapter・results・最終provenanceを読み、記録の計算とGit blob照合を独立実行した。製品やテストの変更はない。

## 結果と描画順

Chromium140/WebKit26.5 ×通常/reducedの全4条件、375×620・DPR2が揃っている。全fontState=ready、pageerror/request failure/transport failure各0、4screenshotが存在する。run.logはpassed=true/cases=4。

通常2条件は各11個の異なる時刻のdestination Canvas提出を持ち、step1〜11が順番どおり存在する。全frameでmodalOpen=false、全frameが一度のfinishより前。元の縁3段階と十字8段階それぞれの最初の提出間隔をレビュー側で再計算し、最小でも設定保持時間より3.8ms長い。最後の微光も保持されてから一度だけfinishし、その後に既存fill条件が観測される。reduced2条件は受理false、frame0、finish0で、演出待機へ入らない。

|Engine|通常start→finish|通常start→fill条件の観測|提出回数|
|---|---:|---:|---:|
|Chromium|868.8ms|944.7ms|11|
|WebKit|881ms|908ms|11|

fillAtはpollingで条件を観測した時刻であり、厳密なopen属性変更時刻や物理表示時刻とは呼ばない。詳細なmodal-open/次RAF・固定段階pixel・代表画像・全画面幅・中断条件は本体browser検証を参照する。

## 保存・配信・provenance

runnerは公開アプリの正式snapshotと保存gameを同じ公開操作に対応するD.stopDistillation期待値へ完全一致で照合している。全4件の保存raw hashは同じ `9bb15332ebc8a35dd346ebdf48dfaf42bbc672eabd002e3c27c6747c01871d97`。start/finish時点で保存済みphase=fillingが観測されている。

配信HTML/app/Canvasのhash計12件を、レビュー側で再計算した現在のlocal bytesおよびmerge0c3473f4のGit blobと照合し、すべて一致した。最終provenanceを更新後に読み直し、executed-passed、対象base0c3473f4、現行Lock digest、Pages run/successを確認。製品3件・runner・adapter・resultsのhashも再計算して一致した。初期のprepared-not-executed記述を実行済み証拠として採用していない。

## 通信経路と限界

adapterはPR #779に保存された版とbyte一致。構成済みproxyとCA trustを使うroute.fetchが実公開HTTPS responseを取得し、同じoriginのbrowser requestへbody/headerを返す。ローカル製品body代用、ignoreHTTPSErrors、TLS検証無効化はない。失敗promiseはcacheから除去され、現在の失敗はdiagnosticへ記録される。

これはTLS検証付きremote-response forwarding経路の公開bytes・実操作確認である。直通browser TLS経路の通信性能、物理iPhone Safariでの光の視認性、VoiceOver音声、実OS background/BFCacheは未確認。Canvasへの提出と保持は物理ディスプレイで見えた保証ではない。

本公開検証のコード・結果・最終metadataに未解決P1/P2なし。

- results SHA256: `248d4c0d9de2af7204ced5d655ca849e68ee222ee13f6358ce76b9aa6a35fb63`
- runner SHA256: `8653902f1ad885302780a5035c65da840ff4dea5ecd31ae53339a8cc5ee34349`
- adapter SHA256: `ebbfdf3c3dd06d7d1c55cf6b717552673867cf6da7ba83e4526b376ba94e9728`
