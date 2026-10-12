# つまった粒 — おやすみ工房 01

2026-10-12、選択済み案 C の初回 staging 試作。active / staging-only。
指で下の大きな粒を少し横へずらす。「もう一度」で同じ詰まりを試す。
町へは登録していない。制作指示は source thread
`01a11875-47fb-73f8-b86d-cf31e84fa0c8` の委任本文。作者の感想、採用・凍結判断は未取得。

## 狙いと実現

狭い口で止まった塊が、小さな一押しで動き始める面白さと余韻を確認する。
32粒（支える大きな粒2個、小粒30個）と漏斗の線分だけの位置ベース接触計算。
重力・粒同士の非貫通・壁との接触・壁の摩擦を同じ固定時間刻みで解く。
触った時に解放フラグや流出タイマーを立てる処理はない。
初期配置を同じ solver で静定し、支持粒を動かして幾何的な支えが失われた時に崩れる。
上の粒や空白を触るだけでは自動完了しない。移動が足りなければ詰まったままでもよい。

大粒は指で狙いやすくするため小粒より大きく、色を変えた。全粒同寸の砂の再現ではない。
押す場所や軌跡次第で再び詰まる場合もある。最後の数粒の遅れも接触から生じ、秒数固定ではない。
初回の狙いを調べる小さなモデルであり、剛体物理の厳密な再現ではない。
スコア、クリア表示、ステージ、BGM、保存、通信、町内導線は加えていない。

## 実装範囲

独立した Canvas / Pointer Events。starter の noindex / viewport 慣例を参照。
この核は音・保存・町連携を使わないため Engine / Codea Lite の依存は追加しない。
共有 Engine と既存作品は無変更。既存 lifecycle schema へ1件だけ追加。
`tools/work-lifecycle.cjs --write-lab` を実行したが、現行 LAB は凍結記録中心で生成差分なし。
Plan は `.change-plans/tsumatta-tsubu-first-prototype/r0.lock.json`。

## 再実行

- `node --test works/tsumatta-tsubu/physics.test.mjs`
- repository root を `python3 -m http.server 8765 --bind 127.0.0.1` で配信
- Playwright と `/usr/bin/chromium` のある環境で `node works/tsumatta-tsubu/browser-check.cjs`
- `TSUBU_URL` で公開URLへの検査対象切替可。スクリーンショットは `/tmp/tsubu-*.png`。

## まだわからないこと

実際の iPhone / iPad Safari での指の追従、熱・電池、気持ちよさは作者未確認。
Chromium の端末エミュレーションは実機 Safari の確認ではない。
音なしの手触りが選択時の期待に合うか、二つの大きな支持粒が自然に読めるかも作者判断待ち。
formal verificationState は現行運用どおり UNVERIFIED。CI成功を採用や公開許可にしない。
