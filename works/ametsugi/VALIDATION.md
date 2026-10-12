# 雨つぎ · 検証

## 初回Staging canaryの前

- `node --test works/ametsugi/tests/game.test.mjs`: 15/15。30/60/120fpsで五つの屋根と反転した五つを自然に完走。水平で待つ、速すぎる/逆方向の失敗、傾きを残した自動復帰、範囲端の切返し、release/cancel、reset、再プレイ、座標変換、異常deltaを確認。
- Engine・3Dの既存コードは無変更。入力/描画/音/復帰の接続はブラウザで別途確認する。
- 独立した軽量新作追加。active / staging-onlyは既存のimplicit default。明示台帳登録・LAB生成は別のPlan-first変更で行う。
- 内部preview supervisorは `bwrap: Can't mount proc ... Operation not permitted` で起動できなかった。代替静的配信もブラウザからconnection refused。ここをブラウザ検証のPASSにはしない。Staging canary後に本物のPagesから検証する。
- `tests/viewport.html`は開発者用の画面寸法・合成PointerEvent fixture。普通のゲームには表示しない。合成タッチはisTrusted=falseで、物理端末やSafariの検証と区別する。

ブラウザ、実iPhone/iPad、音の実聴、Pages配信は現時点でUNVERIFIED。作者の採用・candidate・production反映はこの作業に含めない。formal verificationState: UNVERIFIED。
