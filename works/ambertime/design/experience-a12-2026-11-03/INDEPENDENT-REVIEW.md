# A1-2 独立レビュー

対象: base aabc77cb54f10838b8b9975161fda29b84977b51、現行事前Lock commit577e509c / digest ee5216023bbc8c4525549e67646a719759bd299f849830c157e7db33c970b9a2（旧scopeの93f36c76は置換済み）。下記SHA256のworking candidateを実装担当とは別に確認した。

## 指摘と修正確認

P2: 初稿の`stopDrawing()`は唯一のmotionTimer watchdogを消すがactive completionを解放しなかった。実CanvasSceneのprototypeを使うVMで、start→stopDrawing→10秒後もactive=true/timers=0/done=0を再現した。修正はexplicit stopではfinishし、通常drawのcleanupだけ`stopDrawing(true)`で保持する。再検査はactive=false/timers=0/done=1。解消。

描画本体の例外でcleanup後のwatchdogを失わないよう、drawはstopDrawing(true)直後に同じmotionTimerへ期限を再設定する。motion.sampleを意図的にthrowさせる独立VMで、例外後も600msの期限でactive=false/done=1を確認した。これは合成の描画不能境界であり、ブラウザーの通常動作で例外が発生したという意味ではない。

## 最終コードの確認

- 光の描画命令だけでなく、destination CanvasへのdrawImageの後に成功フレームを記録する。異なる時刻で3段階のcompositeを要求し、各段階に表示期間、消灯後30msの余韻を設ける。遅延時は段階を飛ばさず、duration+250msの期限で省略終了する。物理ディスプレイの提示保証とはしない。
- 正式操作・保存成功後の開始位置・syncModalの優先順位・callbackの現存原酒/phase/room/modal/visibility/save可否再確認は変更なし。app/HTMLはcache参照だけの変更。
- 同じ原酒の重複開始はrunを再生成せず、reset/hidden/pagehide/正式割込は既存tokenで失効する。reduced-motion/font未準備/Canvas context lossは演出を省略または終了する。
- finishは残ったmotionTimerをclearして一度だけcallbackを発行する。
- 新しい常時loopや独立timerカテゴリーなし。既存RAF/motionTimerを使う。
- beforeA1 adapterは新cache tokenだけを1回逆変換し、既存hunk単一一致と不変L1 hashを維持する。期待値や画素差許容の緩和なし。

独立実行: `node --test works/ambertime/tests/a1-glint.test.mjs` は13pass/0fail/0skip。全域・browser実測・cache・公開確認は担当記録を照合すること。現時点で未解決P1/P2なし。物理iPhone Safari、VoiceOver実音声、実OS background/BFCacheは未確認。

## scheduler byte pinの独立再レビュー

全域検査で既存`shop-order-view.test.mjs`の`stopDrawing`周辺byte pinが意図したsignature変更を拒否したため、実装修正前のfresh Lockへ当該testを明示してからexact inverseを追加した。製品3ファイルのhashは下記のまま不変。

`beforeA12CanvasScheduler`は新しいstopDrawingメソッドの全文が正確に1件存在することを要求し、その1件だけを既存メソッドへ戻す。呼出側では従来の不変Git commitから読んだ`drawTimeBar`および`stopDrawing`〜`controls`のbyte比較assertをそのまま維持する。既存モデル9ファイルとapp側clockパスの不変比較もそのまま残る。任意のdiffを除去する処理ではない。

独立mutation検査では、normalize後のqueue本文への変更は旧byte pinで拒否され、stopDrawing既定引数の変更はinverse自体で拒否された。新規14番目glint testもmethodの意味変更と重複を拒否する。検査を通すために旧oracleの期待値や比較範囲を緩めたものではない。この追加差分に未解決P1/P2なし。

## 確認時のsource SHA256

```json
{
  "works/ambertime/canvas-scene.mjs": "5d9e1c687573a6957f00fa84e715b5eb8eaf5b6402713b27f6419f3a6b662460",
  "works/ambertime/shop-app.mjs": "3a2c0ae71d04592e0408053d3cbcbbc2330b71e9dd8e41f6c2608df0e5990f93",
  "works/ambertime/index.html": "6a2f34a07607a89015735298975c521979eaf6535fcbd56881073760960b77b5"
}
```
