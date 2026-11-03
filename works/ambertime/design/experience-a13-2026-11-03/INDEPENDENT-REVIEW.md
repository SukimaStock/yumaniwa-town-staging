# A1-3 独立レビュー

対象base `7662134ce094eabc637625c2742b2e1eb91b2127`、実装前Lock-only `eccd2db5`、digest `c3e4ec28daad8885d12546c0c282019e026d111fa2749420d890ff015230714d`。実装担当とは別のagentが製品diffと実CanvasSceneのVMを確認した。現時点で未解決P1/P2なし。

## 描画・時間・終了条件

旧縁の3段階は同じ色・4native cells・座標・170msを維持する。base766のCanvasSceneを別VMで実行し、150/207/264msの実fillRect座標・サイズ・色・alphaを現行と完全一致で照合した。

後段は中心1→5→9cells（最大形30ms＋保持70ms）→先端減光→5→中心1→中心減光→中心微光。主軸上だけを使い、最大9cells、Manhattan距離2以内、全座標整数。中心は1→.88→.65→.36→.14と減光し、腕と先端は順に弱まり消える。CanvasのglobalAlphaは描画後に元へ戻す。背景の上へ各セルを合成し、ぼかし・斜め・粒子・全画面フラッシュはない。中心はTOOL_GEOMETRY由来のグラス座標から+8/-3native cellsで、下端もrimより1cell上にある。

独立VMの690/740/760ms全候補で、縁3＋十字8の11段階を順番に成功compositeし、それぞれの保持終了直前に進まないこと、最後の微光が終わった後に消灯20msを置いてcallbackが一度だけ発生することを確認した。十字8段階のfillRect件数は1/5/9/9/5/1/1/1、最後3段階のalphaは.65/.36/.14。

ackは従来どおりworldを表示CanvasへdrawImageした後。sampleやrim/cross描画命令だけでは成功を数えず、異なる時刻のcompositeが段階を進める。遅いRAFは段階を飛ばさず保持時間を延ばし、通常740msの構成は必要な表示機会が遅れた分だけ実時間が増える。物理ディスプレイの表示保証とは区別する。

## 独立した失敗境界

- 経過150/320/740/1000msでsampleとpaintだけを呼び、destination compositeを呼ばない場合、全時刻で最初のrim段階のまま、成功frame数0。1140msの既存motionTimer期限で一度だけ安全終了。
- 同時刻に二度recordしてもack数が増えない。
- 明示stopDrawingは一度だけ終了し、古い期限callbackを残さない。
- cancel後の期限callbackは失効tokenにより発火しない。
- draw内のmotion.sampleを合成throwさせても、draw冒頭で再設定した同じmotionTimerの期限が残り1140msで安全終了。これは合成描画不能境界であり通常のブラウザー例外を観測したという意味ではない。

独立VM検査sourceと生結果は本ディレクトリの `review/check.mjs` / `review/results.json`（実行時sourceを保持）。初稿のVM fixtureにcasks/products配列がなく、意図したthrowより前にfixture由来TypeErrorになったため、配列を補って再実行した。製品変更や検査条件緩和はしていない。

## 保存・モーダル・負荷

app/HTMLの実diffはそれぞれcache query1件だけで、逆変換後のbytesがbase766と完全一致した。正式stop/save/afterSave/syncModal/通知優先/原酒ID・phase・部屋・保存可否の既存callbackガードは変更していない。正式モデル・保存schema・味・量・乱数・操作回数へ新しい状態を追加しない。

stopDrawing/queue区間、単一RAF、既存motionTimer、hidden/pagehide/room/modal/reload/reset/reduceの失効経路を維持する。新しい常時loopや独立timerなし。world cacheはcompletionStepを含み、同じ段階で背景worldを不要に再生成しない。最大形の伸長終了と保持は同じ画像100msへまとめ、重複描画を増やさない。cacheはHTML→app→Canvasの変更identityを伝播する。

全域・自然時間/固定段階のdual-engine・画素/DOM/hit/focus/ARIA・旧cache・公開後実操作はそれぞれ担当の最終記録と照合する。上記VM検査だけで物理iPhoneの視認性、VoiceOver音声、実OS背景/BFCache、全域成功を主張しない。

## 確認時の製品SHA256

```json
{
  "canvas-scene.mjs": "08ec564545fdc3823a85a9092ac61c7756ccb1afb89cc87b14d1bcfc74772519",
  "shop-app.mjs": "02160d577ee63d3fcfa4643a3d63b4259f310ebf500628e1e3f63e53503f8c8c",
  "index.html": "9f6f66235ee83efe2145d18a05ec8b00a8d4bc1dfa1889553b573c56668f8976"
}
```

## 最終unit・ブラウザー記録の独立照合

担当のrunner sourceと最終results.jsonを独立に読み、40自然時間case（2engine×4幅×通常/reducedの16件＋12中断境界×2engineの24件）と2固定段階proofが存在し、errors0であることを確認した。製品3hash・runner hash・元rimのGit766原文hashをレビュー側で再計算し、記録と一致した。製品hashは本レビュー冒頭から不変。専用unit16件を独立実行し、16pass/0fail/0skip。新cache-only A13→A12逆変換は単一一致を要求し、既存A12→A1/L1のhunk/hash保護を残す。unitは未承認query・重複query・無関係source変更の拒否も確認する。

自然時間runnerは実pointer採取・performance.now・実RAFの観測だけを行い、pixel比較・PNG生成は別ページの固定段階proofへ分離している。記録された通常8条件すべてで、11段階が一度ずつ順番に表示Canvasへ提出され、最後の微光後に消灯、finish/callbackが一度、modal-open、次の可視寸法付きRAFという順序。光のあるframeでmodalは閉じている。各段階の観測保持時間をレビュー側でも独立に算出し、最も短いものでも目標時間より3ms長かった。runnerの2msはwrapper時刻と内部時刻のずれを扱う時間観測用で、画素許容値は0のまま。reduced8条件は受理false/active frameなし/callbackなし。formal/saved一致はrunnerが実モデルserializeとの完全一致でassertし、中断時はresetだけが意図した新gameになる。更新数がmodal後の追加150msで増えない検査も維持されている。

自然時間のfinishはChromium839.6〜856.4ms、WebKit865〜884ms、全8通常条件の成功提出は11回。modal-openはChromium855.3〜871.8ms、WebKit880〜903ms。これは740msの構成値にRAF/同期render/共有hostの処理時間が加わった実測で、物理提示の保証ではない。

固定proof2件では全11段階の120×214 world画素を、原rim3段階は不変Git766の実paint method、十字8段階は製品tableから独立した手書き半径・alpha基準へ照合している。全段階differentPixels0/outside0、セル数4/4/4/1/5/9/9/5/1/1/1を独立確認した。自然時間ページへこの重い画素処理やPNG生成を入れず、固定proof画像を自然時間の連続画面録画とは呼んでいない。DOM/hit/focus/ARIAの前後比較は別の208非演出比較記録と併せて確認する。

初期instrumented matrixでは430px通常caseが11段階条件に失敗した記録を保持する。そのcaseの完全traceが保存されていないため、watchdog終了の厳密な原因をobserver負荷と断定しない。後続の選択幅pilotと、重い検査を別ページへ分離した最終40case成功は独立した試行として扱う。初回固定proofの継承toolPaintX欠落は検証器fixtureの問題で、修正後もpixel差0を維持し製品・画素閾値を変更していない。

最終browser results SHA256: `6da70e04bbad36eb3949d5f2bea49d04f06b3c99cef17eb4d87df93c024d63a0`。本レビューで未解決P1/P2なし。全域1237実行・旧cache2・208非演出比較・公開後操作は担当の最終記録が揃ってから統合する。物理iPhone Safari/実OS背景/BFCache/VoiceOverは未確認。
