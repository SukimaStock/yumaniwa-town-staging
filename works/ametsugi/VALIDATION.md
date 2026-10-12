# 雨つぎ · 検証

現在のゲームコードはPR #303の成果を維持。公開Chromiumの通常・反転5ルートと関連回帰が成功し、今回の変更は検証記録の整理のみ。実機Safari・実聴・作者採用はUNVERIFIED（詳細は末尾）。

## 初回Staging canaryの前（当時の記録）

- `node --test works/ametsugi/tests/game.test.mjs`: 15/15。30/60/120fpsで五つの屋根と反転した五つを自然に完走。水平で待つ、速すぎる/逆方向の失敗、傾きを残した自動復帰、範囲端の切返し、release/cancel、reset、再プレイ、座標変換、異常deltaを確認。
- Engine・3Dの既存コードは無変更。入力/描画/音/復帰の接続はブラウザで別途確認する。
- PR #301の新作単一folder追加は、必須LAB一致と並行更新されたbaseによりCI失敗。未マージで保存し、最新mainからPlan-first branchへ移行。Plan Lock commit `880a97bbf33caa9d2bc0276d668ec10dd9852247` の後にsnapshotを移し、active登録と生成LABの棚項目を追加。検査の省略・変更はしていない。
- 内部preview supervisorは `bwrap: Can't mount proc ... Operation not permitted` で起動できなかった。代替静的配信もブラウザからconnection refused。ここをブラウザ検証のPASSにはしない。Staging canary後に本物のPagesから検証する。
- `tests/viewport.html`は開発者用の画面寸法・合成PointerEvent fixture。普通のゲームには表示しない。合成タッチはisTrusted=falseで、物理端末やSafariの検証と区別する。

初回canary前の時点ではブラウザ・Pages配信もUNVERIFIEDだった。公開後の結果は後述。実iPhone/iPad・音の実聴は引き続きUNVERIFIED。作者の採用・candidate・production反映はこの作業に含めない。formal verificationState: UNVERIFIED。

## 登録を含むStaging canary

Lifecycle/LAB checkと既存Lifecycle 24/24成功。Scope → Risk → Impact成功。3D Manipulation 20/20、Engine Input/Boot 28/28成功。Native Canvasで初期画面・最後の屋根・横画面・終わりを描画し、器と結果の窓の重なりを見つけて窓を上へ移動。これはブラウザではない。公開後のブラウザ結果は次節以降に記録する。

## ブラウザで見つけた仕上げ（Plan-first）

初回canaryはPR #302でStagingへマージ。main `7c6443282cf974949d9ecea483e8384dd75719b4`、Pages run 38279823250成功。実Chromiumで起動し、通常のドラッグで最初の屋根をクリア、器への着水と次の屋根への進行を観察。Canvasの音声状態は有効な指示相当のマウス入力後にrunning。初期画面の画像と390×844 CSS pxのiframe表示も確認。

横画面で説明と窓が重なること、低い描画頻度では .05秒のframe capが経過時間を捨て、水の進行が遅くなることを観察。fixtureの15秒wall timeoutもこの遅れで失敗した。実機・タッチのPASSへ読み替えていない。

最新canary mainから新しいStandard/WORK Planを実装前に固定。digest `4fe9fd20239c0a3752fb609a3ad7f61409e8617a7bf44f3821eab726f0f6671d`、lock commit `d17effe1d0b5f6e0067cfd380010edf4ff8eca42`。変更は新作内だけ。

- 120Hzの接触substepは維持し、作品側とEngineの既存設定からvisible frameのcatch-up上限を.2秒へ。共有Engineは変更せず、hidden wall timeを除外する既存Lifecycleを使う。
- 新作21/21。5/10/15/30/60/120fpsで通常/反転の全屋根を自然に完走し、失敗/待機/復帰/入力/再プレイも保持。
- 横画面のタイトルと案内を上へ分離。結果の窓を背景として先に描き、水と雨どいを覆わないようにした。
- work module graphを?v=2で揃え、同じgame moduleをapp/drawが参照。fixtureは実ゲームの時間と90秒のwall上限の両方で待ち、ゴールを直接設定しない。

新版Pagesの結果は次節に記録する。合成PointerEventは物理端末ではない。音の実聴、物理iPhone/iPad Safari、作者採用はUNVERIFIED。

## PR #303公開後の結果（前回セッションから継承）

[PR #303](https://github.com/SukimaStock/yumaniwa-town-staging/pull/303) の本文に記録されていた結果を照合して転記した。以下の数値は前回の観測であり、今回の再試験と混同しない。

- 対象main: `d72ec746cf7af87750620dd88285bd786262d18a`。[Pages run 38281571365](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/38281571365) 成功。今回の再開時も同じmainで、Change Operations Tests / Release Validator Testsとも成功。
- 実Chromiumの390×844 CSS pxで通常5ルート、844×390で反転5ルート。公開された開発fixtureから合成PointerEventを入力し、実際のEngine→app→HINGE→物理→着水→進行を通して自然に完走。ゴールの直接設定なし。
- 各ルートの訪問雨どい数は1/2/3/3/4。通常・反転とも `filled=5`、`failures=0`、`drag=null`、ゲーム経過33.5917秒。
- AudioContext running、mute true→false、合成touch cancelでheld=0→nullを観測。resize中の入力キャンセル、切替完了後の再プレイも確認済み。

## 2026-10-12 再開・最終確認

開始時の正本は上記main。#301は未マージの制作snapshot、#302・#303はマージ済みとして引き継いだ。企画、配色、物理、5ステージ、既存Engineの接続は作り直していない。今回の変更は本記録と事前固定したCONTENT/Lite Plan Lockだけ。

### 回帰と配信

- 新作の既存21/21成功。5/10/15/30/60/120fps × 通常/反転の全5ステージ、水平待機、勢い過大・逆方向の失敗、角度を残す自動復帰、範囲端の切返し、cancel、reset、再プレイ、座標変換、異常deltaを再確認。低fpsは物理モデルの検証であり、物理端末の描画fps測定ではない。
- 既存のEngine Input/Boot 28/28、Audio/Lifecycle 20/20、3D Manipulation 20/20、Work Lifecycle 24/24成功（関連92件）。新作3モジュールのsyntaxとLifecycle/LAB一致も成功。
- 公開index、CSS、app/game/draw、開発fixture、Engine/Codea、ManipulationPlayerとその依存geometry/math/mesh/motion/partsの計14ファイルはHTTP 200。取得した全本文が正本Git treeとbyte一致。画像・BGMの外部アセットは不要。

### 公開Chromiumでの追加観測

[公開ゲーム](https://sukimastock.github.io/yumaniwa-town-staging/works/ametsugi/) と、その公開開発fixtureを使用。CSS pxのiframe寸法は端末・Safariのエミュレーションではない。合成PointerEventはisTrusted=falseで、直接マウス入力の観測と区別した。

- 通常390×844: 合成タッチで5ステージを完走。訪問数1/2/3/3/4、`phase=end`、`filled=5`、`failures=0`、`drag=null`、ゲーム経過33.8250秒。タイトルから実操作へ入り、器への着水、次の屋根、5つの器が残るエンディングまで観測。ゴール状態の直接設定なし。
- 直接マウスドラッグ: 普通のゲームの銅色の右端を下へ動かし、雨どいの傾きと案内のフェードを観測。タッチの追従感や実機での音の印象とは区別する。
- 画面切替直後に自動ドラッグを始めた最初の横画面試験は、`wanted -0.36 / got -0.024`でFAIL。resizeによるreleaseと整合し、captureが残ったゲーム障害ではない。FAILを完走のPASSへ数えず、レイアウト確定後に同じfixtureを再試験した。反転844×390は全5ステージでPASS。訪問数1/2/3/3/4、`phase=end`、`filled=5`、`failures=0`、`drag=null`、`lap=1`、ゲーム経過33.7250秒。
- 小画面375×667とタブレット寸法820×820でエンディングを表示。器、タイトル、再プレイボタンの重なり・欠けなし。820×820は既存fixtureの正方形タブレット寸法であり、iPad全機種・全画面比の確認ではない。
- 小画面への切替後、最初の合成cancel試験は`before=null / after=null`でFAIL。iframeが親の寸法ボタンへフォーカスを移した状態からの試験で、復帰後のlayout更新とreleaseを行う作品コードの挙動に整合した。レイアウト確定後の再試験では`before=0 / after=null`でPASS。切替直後の合成fixture失敗をゲームのcapture残留や実機成功へ読み替えない。
- 公開ゲームの音ボタンを直接クリックし、muteの`aria-pressed` true→false、AudioContext runningを確認。音量・響きの実聴はしていない。
- リセットで最初の屋根へ戻り、再プレイボタンは隠れる。小画面での正常な縦構図と直接ドラッグによる傾きも観測。
- 小画面375×667の反転ルートを直接マウス入力で操作。逆方向へこぼして`phase=retry`と「同じ屋根でもう一粒」を確認し、角度を調整して次の屋根へ自然に進んだ。最後の観測は`level=1`（第2屋根）、`phase=playing`、`drag=none`。cancel/resize後にも操作が復帰することを観測。
- 取得した公開タブのwarn/errorログに作品・Engine由来のメッセージは0件。Chrome検証拡張のmetadata送信エラー21件は別記し、ゲームの例外と混同しない。
- 補助Native Canvasでは320×568、820×1180、1180×820の物体構図を、開始・第5屋根・自然な終了状態で比較。器や雨どいの画面外への欠けなし。これはブラウザではなく、DOMのボタン、端末のsafe area、指入力、日本語フォントの確認を含めない。

### 画面と遊びの判断

青灰色の屋根、琺瑯の雨どい、明るい水、銅の操作端を公開画面で区別できた。暖色の小窓が届いた結果を示し、器と水の手前へ割り込まない。開始・第5の屋根・終わりは同じ素材と配色を保つ。失敗と再挑戦も数値HUDを追加せず扱っている。

傾きだけでなく水が持つ勢いを次の雨どいで受ける構造、雨どい1→2→3→3→4本と左右方向の変化、角度を残した再挑戦がコードと自然な完走で対応している。既定角度を自動入力した完走は、初見の人にとっての発見しやすさ・難易度・面白さの保証ではない。作者の実プレイで判断する。

### 未確認・作者のiPhoneチェック

- **UNVERIFIED**: 物理iPhone/iPad、iOS Safariの指追従、端末固有の描画性能、safe area・アドレスバー変化、アプリ切替/ロック解除/BFCache後の音声復帰、効果音の実聴と音量、作者による採用。
- 音の鳴る条件とAudioContextの状態は機械で確認できるが、擦れ・接触・着水の響きが心地よいかは実聴で確かめる。
- iPhoneでは、銅色の端を上下へ動かす→水平で水を待たせる→勢いをつけすぎてこぼす→角度を微調整して再挑戦→複数の雨どいで受け渡す→最後の器→「もうひと雨」の反転を確認する。途中で横向き、別アプリへ移動、復帰、音の切替、はじめからも試す。

formal verificationStateは **UNVERIFIED**。Lifecycleは **active / staging-only**。Production、candidate、町への正式設置、既存作品・共有Engineの変更は行わない。
