# A1-2 — Staging公開後確認

PR #780 merge `636ee1a04f2b632f6363022e0bc52dcb310bf8b9`、同SHAのPages run [41652620067](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/41652620067)成功の通知後に実行。検証専用branch `verify/ambertime-a12-public` の事前Lock-only commit `65a14c56` 後に取得した記録。製品・runnerは変更していない。

`node works/ambertime/tests/a1-2-browser-public.mjs` はexit0、`run.log` は `passed:true,cases:4`。Chromium140.0.7339.186／WebKit26.5×通常／reduced、375×620・DPR2の全4条件に成功。全fontState=ready、pageerror・request failure・transport failureは各0。

|Engine|Motion|光のCanvas描画回数|段階|正式保存hash|
|---|---|---:|---|---|
|chromium|normal|5|1,2,3|`9bb15332ebc8`|
|chromium|reduced|0|省略|`9bb15332ebc8`|
|webkit|normal|5|1,2,3|`9bb15332ebc8`|
|webkit|reduced|0|省略|`9bb15332ebc8`|

通常は保存済みfilling→start受理true→3段階・異なる5回のCanvas描画→finish1回→既存fill画面。この5描画はすべてモーダルopen前。reducedはstart受理false、光の描画0回で通常のfillへ進む。正式snapshotとdurable saveは公開モデルAPIによる期待値に一致し、帳面「仕込み」「歩み」の実操作・本文・エラーなしも確認した。

4条件それぞれで実公開HTML/app/Canvasのbody SHA256をローカル製品と照合し、計12比較が一致した。

|製品|SHA256|
|---|---|
|index.html|`6a2f34a07607a89015735298975c521979eaf6535fcbd56881073760960b77b5`|
|shop-app.mjs|`3a2c0ae71d04592e0408053d3cbcbbc2330b71e9dd8e41f6c2608df0e5990f93`|
|canvas-scene.mjs|`5d9e1c687573a6957f00fa84e715b5eb8eaf5b6402713b27f6419f3a6b662460`|

## 通信と実機の境界

PR #779で使用したadapterをbyte一致で再利用。構成済みproxyとNodeの構成済みCA検証を用いるroute.fetchで実公開HTTPS応答を取得し、同じ公開originのブラウザーへ中継した。ローカル製品bodyの代用、TLS検証無効化、経路の迂回はしていない。失敗したfetch promiseはcacheから削除し、失敗は記録・assertion対象とする。

この結果はTLS検証付きの実公開bytesと、その同origin上でのブラウザー操作・正式保存・描画順の確認である。直接browser TLS、直通通信性能、物理ディスプレイへの提示、物理iPhone Safariの視認性・指触感・VoiceOver、実OS背景・BFCacheの確認には代用しない。初回の公開ファイル取得・初回ケース完了まで約80秒を要した観測があり、後続は中継cacheを再利用した。この待ち時間を演出遅延として扱わない。公開smokeの帳面elapsedには中継通信が含まれるため速度評価には使わない。

4スクリーンショット、全event/frame/result、runner・adapter・product・resultのhashを本ディレクトリへ保存。初回実行で成功し、製品・検証scriptの追加修正や再試行は行っていない。Production変更なし。
