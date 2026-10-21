# ねじで持ち上げる — 2026-10-21

選択A（2026-10-21 18:41:30 UTC）。最新main 83d250f5ad15dc3fe702426087e4fca9ff787564、AGENTS、Change OS、表現監査、Motion Lab原典・利用案内、Engine新作手順を確認。同名PR・neji/screw branch・既存workに同作業なし。

実装前scope: 新規 works/neji-lift/ の通常ファイル追加のみ。Class WORK、独立試作の判定は CHANGE-PLAN §1 と固定判定器で確認する。共有pathへ軽量判定を拡張しない。ねじと台の一つの関係をSVGとPointer Eventsで描く。Engineを必要とするゲームloop・音・保存はなく、共通EngineやMotion Labへの追加はしない。

つまみ一周で台が8 viewBox単位上昇、上下限間144単位。逆回しで即下降し、離すと停止。慣性、空回り、鎖、目的、スコア、音は追加しない。タッチ・マウス・矢印キー。画面は装置と一行の操作案内のみ。タイトル/meta/支援技術ラベルを保ち、副題・説明カード・詩的コピーなし。

必要検証: syntax、回転量と上下限/即時逆転/保持、実ブラウザーのタッチ・マウス・keyboard/cancel/blur/resize、縦横表示、ページ例外、差分隔離、必須CI。実機iPhone/Safari・作者の手触り採否は未確認。

停止境界: OPERATIONS「新作・制作ツールのLAB接続」は data/work-lifecycle.json 登録と lab/index.html 再生成を求めるが、今回の指示は作品登録・共有変更を禁止している。これらは未実行。登録省略を手順完了と扱わない。Lifecycle整合が満たせない場合はStaging mergeを保留し、実装・検証とPRまでを残す。共有変更を伴う再開には実装前の通常Plan Lockが必要。

検証結果: node --check 成功。Chromium 390×844（touch emulation）/1100×760/844×390。tests/browser.cjsで一周8単位、即時逆転、解放後保持、CDP touch/cancel、上下限、keyboard、画面外解放、blur、中心通過の跳躍防止、resize/reload、reduced-motion、44px以上の操作域、横あふれなし、pageerrorなしを確認。3枚の画面を目視確認。関連しない全作品テストは未実行。

修正1: SVGのgだけではtouch-action:noneがタッチのスクロール抑止に効かず、途中でpointercancelされた。SVG操作面にも指定して回転継続を確認。続くテスト失敗はCDP入力直後の最終move未配送を読み取ったもので、期待値を変えず配送後の値を待つよう検証側を修正し成功。実装の修正は1回。

表現監査6点: 題名はdocument title、画面は装置と操作案内一行、metaとsliderラベルは機能説明のみ。重複するボタン・コピー、架空の感情・結論なし。操作発見性とフォーカス・キーボード操作を保持。作者の原案名を維持。

Lifecycle --check は exit 1「LAB out of date; run --write-lab」。許可外の登録・共有HTML生成は実行せず、マージ・配信は保留。正式verificationStateはUNVERIFIED。自己レビューと実ブラウザー境界検査を行い、独立レビューは未実施。実機Safari/iPhone/iPad、作者採否、公開URL動作は未確認。
