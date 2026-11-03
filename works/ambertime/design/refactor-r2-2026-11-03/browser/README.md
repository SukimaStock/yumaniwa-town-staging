# R2 ブラウザー比較記録

基準は `1a86a3ce40eb5b5abadda162451d777a649ee855`。候補と基準を、同じブラウザー・viewport・DPR・フォント・seed・時刻・明示的な描画phaseで比較した。最終結果は [results.json](results.json)。この要約は条件別の全capture、各engineの結果、source provenance、cacheの記録へSHA256で結び付ける。自己比較の暫定結果は最終結果に含めない。

## 最終結果

Chromium 153.0.8010.0 / WebKit 26.5、それぞれ以下の4条件を実行した。

| viewport | DPR | reduced-motion |
| --- | ---: | --- |
| 360×568 | 1 | no-preference |
| 375×620 | 2 | no-preference |
| 390×680 | 3 | no-preference |
| 390×680 | 3 | reduce |

各条件43状態、変更前後で688 capture / 344組。全344組で、画面PNGをRGBAへdecodeした画素差0、PNG原文のSHA256も完全一致した。許容差は0。Canvas内部のDPR適用後の全RGBA bufferのSHA256、DOMの実client矩形・style・hitRegions、描画tools値、ARIA/文言・focus、正式serializeと保存envelopeのhash、同期済みpointer traceも一致した。

各captureの正式snapshotは、その時点の保存gameと厳密一致することを要求した。主要な操作結果は、基準mainの公開モデルAPIから作った合法なseed42状態と照合した。UIから作った任意の偽保存ではない。正式129/旧20状態の広域回帰は親のR2実装記録を参照する。

代表40 PNG（375px / DPR2、両engineのbefore/after）と [screenshots.json](screenshots.json) を保存した。3レバー姿勢、グラスの左右直接drag、70ms中間・吸着後、期限切れ誘導を含む。他の全captureは条件別JSONにCanvas/Screenshot hashと正確な比較値を残す。

## 操作と座標

- レバーは実mouse pointerで、17/18/35/36 CSS px、3姿勢、短い・逆方向・横方向優位・同量diagonal、画面外までのpull、36pxのcountdown開始、keyboard段階/Escapeを確認した。18/36はlogical pxへ変更しない。
- グラスは、実pointerのtap・左右24px slide、20px direct dragと `CSS offset / viewport.scale`、逆方向・短い・縦方向優位・遠距離clamp、取消復帰を確認した。tapもdown/capture/upを通り、pointerupとcapture解放後に次の描画phaseへ進む。
- 140ms演出の70ms時点で、motion有効ならglassX=205.5、reduceなら174を要求する。完了時は174、停止後は237。統合結果modalが出る停止側の表示条件も元のまま比較する。
- 実DOMのlever/glass矩形は常に44 CSS px以上。さらに一時的にviewport高さを480pxへ変更し、glassの44px最小補正を含めて比較した。元のviewportへ戻した矩形も一致する。
- ドラッグ中の透明ボタンは従来の定位置を保ち、pointer capture中の描画だけが移動する。この挙動を変えず、実DOM矩形とCanvasのglassXを別々に記録した。
- pointercancel / lostpointercapture / second pointer / document.hidden / persisted pagehide-pageshow は合成イベントによる割込確認であり、OSによる実発生とは区別する。viewport resizeと履歴の往復は実ブラウザーAPIで実行した。

## 描画phaseとハーネスの修復

固定seed42、2026-11-03T10:00:00Z、フォントreadyを使用した。Playwrightの時計を先にinstallし、その後にページごとの明示的な `performance.now` phaseを設定する。各phaseの前に既存の `amber-font-change` をdispatchし、その唯一のlistenerであるCanvasの `queue()` を通して描画を要求する。正式操作・保存・フォント状態は変更しない。

これは同一phaseの描画値を比較する方法であり、自然なtimeout/RAF配信順の実機認証ではない。製品の140ms、16ms→RAF、120ms復帰等のschedulerは変更していない。release後はcursorを(1,1)へ移し、hoverなしを確認してから固定phaseを描画する。capture中の指・cursorは移さない。

初期の比較で検出したハーネス問題は [diagnostics/harness-review.json](diagnostics/harness-review.json) に記録した。viewport resizeの非同期配信、Playwrightによるperformance overrideの上書き、gotpointercapture/upの配信、16ms timeout→RAFによる古い描画sampleを、実イベントの待機と明示phase描画で解消した。

WebKitのmodal直後の1比較では、refillボタンのhover背景だけ10,780px異なった。全差分がCSSの `#303547` / `#393f52` と一致し、Canvas・DOM・focus・正式状態は一致していた。元画像をdiagnosticsへ保存した。hoverを対称な明示条件へ固定し、immutable base同士の360px/375px自己比較後に、最終344組を再実行した。製品コードやCSSを修正せず、pixel許容差も広げていない。

## キャッシュ

同じorigin・pathで基準mainを1時間cacheとして読み、HTMLだけno-storeのまま候補へ切り替えてreloadした。両engineとも正式状態が一致した。

| engine | reload後resource | cacheから利用 | 新しいbodyを取得 |
| --- | ---: | ---: | ---: |
| Chromium | 110 | 105 | 5 |
| WebKit | 109 | 104 | 5 |

新しい5bodyはshop-app / canvas-scene / canvas-layout / distill-tools-view / distill-tool-input。すべて `geometry=r2-1` の新URLを要求し、サーバーが返したbytesのSHA256が候補ファイルと一致した。既存のfont/CSS等はcacheを利用した。全cache削除やSW方針の変更はない。具体的なURL・transfer値は結果のcacheSummary / old-one-hour-cacheを参照する。

## 履歴復帰と未確認

各engine/条件/before-afterで実際に別ページへ移動してbackを試し、計16回、正式状態・保存・道具状態が一致した。ただし全て `pageshow.persisted=false` だった。[別のBFCache調査](bfcache-probe.json)でも、Chromiumのdisable-back-forward-cacheを除いた通常multiprocess起動でbefore/afterを試したが、`BrowsingInstanceNotSwapped` / `BackForwardCacheDisabledForDelegate` によりdocumentが再生成された。実BFCacheからのdocument保持復帰は未確認とする。合成persistedイベントの成功で置き換えない。

物理iPhoneの触感・Safari/VoiceOver、非ゼロsafe-area、OSの実background・ブラウザーツールバーの開閉も未確認。既存のviewport変換・CSS・safe-areaの処理は変更していない。

## 再実行

既存Playwrightと実行可能ブラウザーを使用する。製品依存やCIは追加しない。次回の変更で本記録を上書きせず、新しい出力先・比較記録を用意する。

```sh
AMBER_R2_BEFORE_ROOT=/absolute/immutable-1a86a3ce-archive \
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs \
AMBER_BROWSER_EXECUTABLE=/absolute/chromium \
AMBER_WEBKIT_EXECUTABLE=/absolute/webkit-wrapper \
node works/ambertime/tests/r2-browser-tools.mjs
```

実際の最終実行はengineを別processへ分け、`AMBER_R2_ENGINES` と `AMBER_R2_RESULTS_FILE=results-<engine>.json` を使用した。これは独立したブラウザー・server間の並列実行であり、結果の条件別JSONとsource hashは共通。最終runner SHA256は `e982841506ed7a9840fd13db395b4c2942a6615fa1de10922c98e7abb9caa8d9`。コードは最終2実行の開始後に変更していない。
