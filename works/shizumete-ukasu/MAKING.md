# 沈めて浮かす — 2026-10-16

- 狙い：沈めた小さな浮きが水面を抜け、上下に揺れて静まる手触り。
- できた動き：浮きを下へドラッグして離す。深く沈めるほど高く返り、減衰する。途中でも再びつかめる。タッチとマウス、下矢印の長押しにも対応。
- 想定との差：流体・浮力の厳密計算ではなく、位置に比例する復元力と速度抵抗の減衰ばね。離す速度を使わず深さを返りの強さに使う。横移動はしない。最大深さ180論理px、最大積分刻み1/240秒、1フレームの経過は50ms上限。非表示中は停止。リサイズ時は論理深さを維持して入力を解除する。極小振動だけ静止へ丸める。
- 面白い部分：水中の青い色から暖かい浮きの色へ戻る瞬間と、小さな波紋。深く沈めた後の二度目の上下揺れ。
- 次の可能性：実指での評価に応じて浮上速度と減衰だけを調整する。

## 制作・検証記録

最新取得main `0d5baf486d3318b2e2d81569d0aba3ca5b291855`。AGENTS、CHANGE-PLAN、CHANGE-OPERATIONS、CHANGE-VERIFICATION、OPERATIONSを確認。対象repositoryとworkspaceに関連 `.agents/skills` は存在しなかった。
既存作品・Lifecycleに同名なし、同slugのremote branchなし。GitHub PR一覧は `gh pr list` が403 Forbiddenで取得不可。重複PRは未確認。403を別経路で回避しない。

軽量ルートではない。既存schemaのLifecycle active項目と既存generatorによるLAB / Prototype Benchだけを追加。未知共有pathのrisk floorに従いFull Planを実装前commitへ固定。共有runtime・既存作品・町登録・保存・外部権限・Productionは変更なし。

Nodeモデル検査3件：20/30/60/120Hzの浅い/深い浮上と減衰、位置連続性、最大深さ、1000回の再つかみ、長フレーム、6時間相当の静止がPASS。
Lifecycle既存回帰24件、`--write-lab` → `--check` PASS。
既存 `tests/test-work-lifecycle-browser.cjs` は変更前にPlaywright既定ブラウザ未導入で起動失敗。既存検査は変更しない。本作のブラウザ検査は導入済み `/usr/bin/chromium` を明示してLAB往復も確認する。
ブラウザ検査初回はスクリーンショット取得中に仮想時刻が進み、再つかみ位置の比較が別時刻となって失敗。検査側で時刻をpauseAt固定（修正1回）、同じ位置一致assertを再実行。実装の検証条件は緩和していない。

exact SHA・最終ブラウザ結果・独立レビュー・Scope/Risk/Impactとリモート進捗は作業報告へ記録する。
実機iPhone/iPad Safari、作者の触感・採用判断はUNVERIFIED。正式verificationStateは現行契約どおりUNVERIFIED。Staging作業をProduction公開許可へ拡張しない。
