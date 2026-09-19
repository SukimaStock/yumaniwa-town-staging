# ORBIT Web v2.5.3 — SAFARI CACHE FIX

v2.5.2 の BASE input split 自体は維持。

実機スクリーンショットで、v2.5.2 なら
`RESTORE READY · TAP BASE / HOLD TO LAUNCH`
と表示されるべきところが、
旧版の
`RESTORE READY · TAP / HOLD TO LAUNCH`
のままだった。

つまり iOS Safari / local server で `sketch.js` の旧キャッシュが残り、
0.34秒RESTORE判定を含む旧コードが実行されていた。

## 対策

- `codea-lite.js?v=2.5.3`
- `sukimastock-engine.js?v=2.5.3`
- `sketch.js?v=2.5.3`

のようにbuild queryを付け、更新時に新しいJSを取得させる。
RESTORE ritual iframeのqueryもv2.5.3へ更新。

HTMLにも no-cache / no-store のmeta hintを追加。

## v2.5.2から維持されるBASE操作

- 緑のBASE本体をタップ → RESTORE
- 1秒長押し → LAUNCH
- HUD: `RESTORE READY · TAP BASE / HOLD TO LAUNCH`
