# A1 — 公開後確認と検証手順の修正

製品PR #778 は必須3CI成功後に通常merge `922662c3728dd4ee678634bb73a5e2e2876d870f`。Pages run [41637387741](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/41637387741) が同SHAで成功し、通常の公開URLのHTMLが検証済みlocalとbyte一致した。今回の追補は検証scriptと記録だけで、HTML/app/Canvasを含む全製品は変更しない。

## 最終結果

実行exit0、`public/run.log` は `passed:true,cases:4`。Chromium140/WebKit26.5、375×620・DPR2、通常/reduced-motionの全4条件で成功した。全条件fontState=ready。ページエラー0・request failure0・transport failure0。両帳面本文が揃いerror alertなし、既存の樽選択へ到達、正式snapshotと保存gameが同じ公開APIによる期待値と一致。通常は保存済みfilling→arm→completion→fill、reduceはarm要求を受けてもaccepted=falseで即fill。全4件でHTML/app/Canvasの配信body SHA256、計12照合がlocal/Git原文と一致した。4画像・全結果・source/adapter hashは `public/`。

最終Plan Lock `.change-plans/ambertime-a1-public-verification-20261103/r0.lock.json`、digest `5e2d1669d3e7f831ae9a4d814a558d413836a7bb58f125ae5cf1e7d9d8f600b8`。既存mainからlocal lock-only `0cd6701e` / remote `7c91713b254601714605244b42aecf8f1106028b` を固定してから検証用scriptを直した。独立レビューは `public/INDEPENDENT-REVIEW.md`。

## 検証側の問題と修正

1. reduceのpointerdownはCanvasの既存resetIdleを通り、演出がない状態でもfinishDistillCompletionを呼ぶ。初稿observerがこのno-opまで「演出完了」と記録し、保存前phaseを誤って検査した。修正は呼出前のactiveを記憶して有効なfinishだけを観測するもの。実method自体は必ず呼び、正式save/state/order等の全assertionは維持する。独立VM検査でも同じcallback/戻り値であることを確認。
2. 初期化用に捨て画面をload→即reloadする手順は、WebKitのmodule取得を意図せずcancelしていた。初回4件の機能照合は通ったがgeneric module error2件、診断2件ではcancel URLが記録され、厳密errors assertionは失敗した。`initial-errors.json` / `navigation-cancellation-diagnostic.json` と失敗logを残した。最終scriptは正式fixtureを最初のdocument前に一度だけseedし、試験用reload/close前にnetworkidleを待つ。active errorを除外しない。
3. standalone cold WebKitでは専用fontのreadyのみを待つ初稿がtimeoutした（0件）。既存のfontReadyが解放されるready/fallback両方を機能確認の入口とし、実際のfontStateを記録した。最終4条件はすべてready。固定phaseの画素検査のfont条件は緩めていない。

## 通信と実機の境界

この実行環境ではブラウザーの直接接続はERR_EMPTY_RESPONSE、明示proxy経由のブラウザーTLSは環境CAを信頼せず停止した。TLSを無効化せず、設定済みproxyとNodeの構成済みCA検証を用いるroute.fetchで実公開HTTPS responseを取得し、そのbodyを同じ公開originのbrowserへ中継した。ローカルの製品bodyは代用しない。実行adapterをそのまま保存し、失敗promiseはcacheから除去する。最終forwarded runの失敗は0。

公開後確認は、この通信中継で取得した実公開bytes上の操作・保存・配信hash検証である。ブラウザー独自のTLS検証、直通通信性能、物理iPhone Safari、VoiceOver音声、実OS背景/BFCacheの証明とはしない。公開smokeのelapsedには中継通信が入るので、帳面高速化の比較に使わない。速度は主記録の残留CPU処理停止後のpaired matrixを参照する。
