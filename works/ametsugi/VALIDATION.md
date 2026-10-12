# 雨つぎ · 検証

## 初回Staging canaryの前

- `node --test works/ametsugi/tests/game.test.mjs`: 15/15。30/60/120fpsで五つの屋根と反転した五つを自然に完走。水平で待つ、速すぎる/逆方向の失敗、傾きを残した自動復帰、範囲端の切返し、release/cancel、reset、再プレイ、座標変換、異常deltaを確認。
- Engine・3Dの既存コードは無変更。入力/描画/音/復帰の接続はブラウザで別途確認する。
- PR #301の新作単一folder追加は、必須LAB一致と並行更新されたbaseによりCI失敗。未マージで保存し、最新mainからPlan-first branchへ移行。Plan Lock commit `880a97bbf33caa9d2bc0276d668ec10dd9852247` の後にsnapshotを移し、active登録と生成LABの棚項目を追加。検査の省略・変更はしていない。
- 内部preview supervisorは `bwrap: Can't mount proc ... Operation not permitted` で起動できなかった。代替静的配信もブラウザからconnection refused。ここをブラウザ検証のPASSにはしない。Staging canary後に本物のPagesから検証する。
- `tests/viewport.html`は開発者用の画面寸法・合成PointerEvent fixture。普通のゲームには表示しない。合成タッチはisTrusted=falseで、物理端末やSafariの検証と区別する。

ブラウザ、実iPhone/iPad、音の実聴、Pages配信は現時点でUNVERIFIED。作者の採用・candidate・production反映はこの作業に含めない。formal verificationState: UNVERIFIED。

## 登録を含むStaging canary

Lifecycle/LAB checkと既存Lifecycle 24/24成功。Scope → Risk → Impact成功。3D Manipulation 20/20、Engine Input/Boot 28/28成功。Native Canvasで初期画面・最後の屋根・横画面・終わりを描画し、器と結果の窓の重なりを見つけて窓を上へ移動。これはブラウザではない。ブラウザ結果はPages配信後に追記する。
