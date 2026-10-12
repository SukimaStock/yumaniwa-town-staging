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

## ブラウザで見つけた仕上げ（Plan-first）

初回canaryはPR #302でStagingへマージ。main `7c6443282cf974949d9ecea483e8384dd75719b4`、Pages run 38279823250成功。実Chromiumで起動し、通常のドラッグで最初の屋根をクリア、器への着水と次の屋根への進行を観察。Canvasの音声状態は有効な指示相当のマウス入力後にrunning。初期画面の画像と390×844 CSS pxのiframe表示も確認。

横画面で説明と窓が重なること、低い描画頻度では .05秒のframe capが経過時間を捨て、水の進行が遅くなることを観察。fixtureの15秒wall timeoutもこの遅れで失敗した。実機・タッチのPASSへ読み替えていない。

最新canary mainから新しいStandard/WORK Planを実装前に固定。digest `4fe9fd20239c0a3752fb609a3ad7f61409e8617a7bf44f3821eab726f0f6671d`、lock commit `d17effe1d0b5f6e0067cfd380010edf4ff8eca42`。変更は新作内だけ。

- 120Hzの接触substepは維持し、作品側とEngineの既存設定からvisible frameのcatch-up上限を.2秒へ。共有Engineは変更せず、hidden wall timeを除外する既存Lifecycleを使う。
- 新作21/21。5/10/15/30/60/120fpsで通常/反転の全屋根を自然に完走し、失敗/待機/復帰/入力/再プレイも保持。
- 横画面のタイトルと案内を上へ分離。結果の窓を背景として先に描き、水と雨どいを覆わないようにした。
- work module graphを?v=2で揃え、同じgame moduleをapp/drawが参照。fixtureは実ゲームの時間と90秒のwall上限の両方で待ち、ゴールを直接設定しない。

新版Pagesからの通しプレイ・再プレイ・各画面寸法・cancel/音・エラーは配信後に追記する。合成PointerEventは物理端末ではない。音の実聴、物理iPhone/iPad Safari、作者採用はUNVERIFIED。
