# A1-2 公開後確認 — 独立レビュー

対象製品: PR #780 merge `636ee1a0`。公開後追補Lock: `ebd7ad7ca6e9ff8c92178f808624cd29805279581d41234c930630c2995ca604`。公開runner・結果・transport adapter・製品hashを実装担当とは別に読み照合した。Pages runの成功は統合担当の観測を参照し、本レビューは配信bodyと操作記録の照合を担当する。

## 実行結果

`run.log`は`{"passed":true,"cases":4}`。`results.json`にはChromium140.0.7339.186 / WebKit26.5 × 通常 / reduced-motionの4条件が重複なく存在し、すべてfontState=ready、pageerror/request failure/transport failureはそれぞれ0。各条件の帳面2分類と採取終了操作が完了し、4枚のscreenshotが存在する。

|条件|光のdestination Canvas記録|開始→終了callback|callback→fill検出|
|---|---:|---:|---:|
|Chromium 通常|5回、3段階|362.7ms|22.4ms|
|WebKit 通常|5回、3段階|392ms|23ms|
|Chromium reduced|0回、開始受理false|待機なし|通常fill到達|
|WebKit reduced|0回、開始受理false|待機なし|通常fill到達|

通常の両条件は3以上の異なる時刻でdestination Canvasへ描画され、段階集合は1→2→3、全記録でmodalOpen=false、すべて終了callback時刻より前、その後にfill検出となる。終了callbackは1回だけ。reducedはstart要求1件のみでaccepted=false、光記録0、終了callbackなし。fillAtはrunnerによる検出時刻であり、物理画面が初めて見えた時刻とは主張しない。

runnerを読み、公開APIの正式snapshotと実localStorage.gameの双方が`D.stopDistillation(合法collecting)`と厳密一致するassertionが、各record登録前に実行されることを確認した。4条件の保存raw SHA256は同一の`9bb15332ebc8a35dd346ebdf48dfaf42bbc672eabd002e3c27c6747c01871d97`。

HTML/app/Canvasの配信body hash計12件を本レビューで再計算したlocalファイルhashおよびGit merge636ee1a0のblob hashと独立照合し、すべて一致した。製品sourceは公開後追補で変更していない。

## 通信経路と観測の限界

transport adapterはPR #779の保存版とbyte一致。sourceを読み、構成済みproxyを使う`route.fetch`で実公開HTTPS responseを取得し、body/headerを同originのbrowser requestへ渡すことを確認した。ローカル製品bodyを代用する処理、ignoreHTTPSErrors、TLS検証無効化はない。失敗promiseをcacheから除去し、現在の失敗はdiagnosticへ記録する。

これはTLS検証付きremote response forwarding経路での公開bytes・実操作確認である。ブラウザー自身の直接TLS通信性能、物理iPhone Safariでの光の視認性、VoiceOver実音声、実OS background/BFCacheの証明とはしない。公開smokeは375×620/DPR2。全画面幅・連続RAF機会・中断条件の詳細は本体browser検証を参照する。

本追補の検証コード/結果に未解決P1/P2なし。最終provenanceを再読し、status=executed-passed、sourceBase=636ee1a04f2b632f6363022e0bc52dcb310bf8b9、現行追補Lock digestの一致を確認した。製品3ファイル・runner・adapterの記録hashも実ファイルから独立に再計算して一致した。

結果JSON SHA256: `dccf8c069518634631e2c632f6a262af2b15501ef6ab6998d1fd36746c62792c`
Adapter SHA256: `ebbfdf3c3dd06d7d1c55cf6b717552673867cf6da7ba83e4526b376ba94e9728`
