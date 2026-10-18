# ひと歯ずつ閉じる — 2026-10-18 / B

狙い：引き手を上下に動かし、一歯ずつ閉じる途中を止めたり戻したりする。
実現：ファスナーを一本に絞ったSVG試作。左右の布端が寄り、歯が交互にかみ合う。連続移動に小さな周期抵抗を加え、ゆっくり動かすと刻みをたどれる。離すと開閉位置を保持し、引き手だけが短く減衰して落ち着く。
想定との差：布全体の物理計算や実際の歯の接触は行わず、曲線と位置で近似した。手に力を返す触覚・音はなく、細かな抵抗は視覚上の変位として表現する。
面白さ：一歯の前後を往復する動きと、大きく一気に開閉する動きの切り替えを試せる。作者の実指による楽しさの評価はまだない。
次の可能性：実機で一歯の間隔と抵抗の強さを確かめ、必要なら作品内の数値だけ調整する。自動的な拡張・ゲーム化・町への設置は行わない。

## 操作と境界

引き手を上に動かすと閉じ、下に動かすと開く。72×80 CSS pxの操作領域。上下矢印は一歯、Homeは全開、Endは全閉。指を離した後も途中位置を保持するが、ページ再読込では初期位置へ戻る。保存・音・外部通信・共通Engine依存はない。cancel/lost capture/blur/非表示/resizeでつかみを解放。reduced motionでは引き手の揺れを省く。

## 制作と検証

- base: `1a3a71c8889bcc4b5072350c325e9aac0fcbf80a`。実装前Plan Lock commit: `7d943ab1d0b5afc57f3576e8109387191a150489`。digest: `20dcb08e7b8cd2fa9235e511c815341335010ab229f66b3f0e091930671145a6`。
- Lifecycle JSONと生成LABの既存risk floorに従いWORK/SYSTEM・Full。schema/generator変更なし。新作はactive / staging-only、Prototype Bench（試作作業台）へ既存generatorで接続。町・共通Engine・他作品・Productionは変更なし。
- 最新mainのLifecycle・works内にファスナー／ひと歯／zipperの既存作なし。GitHub open PR一覧は `gh pr list --repo SukimaStock/yumaniwa-town-staging --state open --limit 100` が `Post https://api.github.com/graphql: Forbidden`。リモート進行中作業との重複確認は未完。アクセス拒否を別経路で回避していない。
- Scope → Risk → Impact PASS、syntax PASS。Lifecycle --checkおよび既存回帰24件PASS。正式verificationStateはUNVERIFIED。
- ローカルChromium/Playwright: `node works/hitohazutsu/test-browser.cjs`。マウス・CDPタッチ、ゆっくり一歯ずつ・速い移動・両端・逆戻し・保持・連続操作・cancel・画面外release・blur・resize・keyboard・reduced motion・LAB往復。390×844、844×390、768×1024、1366×768、320×568。CDPは指相当の合成入力であり実機ではない。
- テスト初回のresize即時assertは、resizeイベント前の読取りで失敗。テストをイベント完了待ちへ修正（1回）。アプリ変更なし。追加したタッチ両端検証もCDPのイベント配信待ち不足を検出し、描画フレーム待ちへ修正（同じテスト同期問題の2回目）。アプリ変更なし。Risk CLIの初回誤記を既存 `change-risk-check.cjs` に訂正。
- 別agentのread-only独立レビュー: P1/P2相当欠陥なし。マウス両端・逆戻し・保持、CDPタッチ・cancel、resize、keyboard、reduced motionを別途実測し描画確認。実装ファイルはその後変更なし。
- 表現監査6項目を実施。画面は物体とLABへの戻り口、支援技術向け操作案内、必要な検索用title/descriptionのみ。副題・説明カード・詩的コピー・音・スコアなし。
- 未確認: iPhone/iPad実機Safari、VoiceOver実操作、作者の触感・採否、リモートPR重複、CI、Pages、公開URL。公開・merge成功やRelease Completeとは扱わない。最終commitと外部反映状態は最終報告を参照。

## 最新mainへの移行

親からの継続指示により、PR #498 後の `0052717f1452ce3f3e04d50d3dc64d3a6e409a68` へ移行。先行branchの完成コードと重複する変更はなく、作品の再実装なし。新しい実装前Lock commitは `8383950a2aeb493da059398e8231e90396b362a5`、digestは `f4fece5bb13cfa41a8747d547a7105d0d62f107e4a6aae7fa486e3646bb0d1b4`。旧 `a5750811cebd6cdaae6ba8bb2b87d3fbaf8ad226` の実装・操作テストをそのまま移し、LABだけ既存generatorで再生成した。親の接続済みGitHub connectorでは旧branchのopen PRが0件と確認済み。環境内の認証・ネットワーク設定は変更せず、PR・CI・merge・公開確認は親へ委任。

Lifecycle/Prototype BenchはAGENTS.md「新作・制作ツールのLAB接続」とOPERATIONS.md同節が要求するstaging探索用の入口。町の作品登録正本 `data/works.js` や町画面・配置は変更しておらず、自動的な町への設置とは異なる。

最新baseでの再検証ではlostpointercapture直後の即時assertも同じ非同期配信待ち不足を検出したため、data-held解除をwaitForFunctionで待つようテストのみ修正（同じテスト同期問題の3回目）。作品コードは不変。

現在の再検証結果：上記3回目の待機追加後も、lostpointercaptureテスト（releasePointerCapture(1)後のdata-held解除待ち）が30秒timeout。同期問題という仮説は未解決で、作品側か固定pointer IDを使うテスト側かの切り分け中。追加自動修正はAGENTSの同一問題3回上限により停止。最新branchのブラウザ回帰全体をPASSとして扱わず、解消までmergeを推奨しない。先行SHAでの成功記録と、この最新実行での失敗を区別する。
