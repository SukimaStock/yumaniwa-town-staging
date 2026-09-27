# Validation

2026-08-06にv0.1.1で以下を確認しました。

- `codea-lite.js` JavaScript構文検査
- `sukimastock-engine.js` JavaScript構文検査
- `sketch.js` JavaScript構文検査
- `sketch.blank.js` JavaScript構文検査
- Scene離脱時のScene-scoped Delay停止
- Scene離脱時のScene-scoped Tween停止
- Scene離脱時のScene-scoped Timeline停止
- Overlayを`pop`した際のScene-scoped処理停止
- 従来のGlobal `SSE.motion`がScene遷移後も継続すること
- `SSE.storage`の文字列・Object・配列保存
- fallback、has、remove、作品単位のclear
- StarterのTitle → Play → Result遷移
- 主ポインター入力と論理座標変換
- 360×640論理画面の2倍画像（720×1280）切り出し

Starter固有の外部Webフォントと実端末の共有シートは、配布先ブラウザでの最終確認対象です。フォント失敗時は端末フォントへ進み、共有非対応時はPNG保存へフォールバックします。
