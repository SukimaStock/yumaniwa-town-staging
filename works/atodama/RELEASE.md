# あとだま — 町への公開

作者の採用・公開指示：2026-11-08、この会話の「おお、すごい！湯間庭町で公開しますので作業を進めてください」。ゲームの採用と、必要な候補化・本番公開を含む指示として記録。実機・個別画像・exact SHAの承認とは呼ばない。

元ゲーム：Site source `d5c815638a812a435bf4dcc4e18d640fb6157929`。既存のembedded / soft / phone 390×740、湯窓レジャーセンターのmenu-only。共有runtime・Engine・scene・計測契約は変更しない。作品内の依存は同一フォルダのJS/CSSのみ。

計画：`.change-plans/atodama-town-release-20261108/r0.lock.json`。実装前先行commit `355b0efb8d10ed3944f97ba4615cd282394f451e`。Fullの分類は既存risk floorによる。事前の独立した技術レビューをHQ承認とは扱わない。

ゲーム規則・物理・描画を維持。追加は実行ページnoindex、町の既存ready通知、非表示時の音停止（遅延クリア音も含む）。保存keyは `atodama-v1` を維持し、保存不可でも遊べる。Siteと町は別originのためベスト記録は自動移行しない。

検証：実装後に記録。物理iPhone Safari、外部Plausible Goal・実送信は未確認。静的検査成功とRelease Completeを区別する。

本番への移送はあとだまと必要な台帳項目・紹介ページ・画像・告知だけ。LAB、他のstaging作品、計画lockは移さない。本番公開後のPages SHAとURL確認をここへ追記する。SNS投稿は依頼されていないため行わず、公開リンクを作者へ引き渡す。

復旧：当該PRの追加差分だけを通常のrevert PRで戻す。他作品・共通runtime・ベスト記録は削除しない。

## 実装時の検証

- Scope → Risk → Impact：固定base `b57ce881b5f5f68bc12ff1f15634178118496958` で全21 pathが計画内、必須分類・影響に欠落なし。
- 解探索：6テーブルすべて三球以内。30個の生成盤の再現性、軌道の不変性、過去の玉だけが扉を開くことを確認。
- 展示ガイド・共通player・install・lifecycle：49 test成功。Release Validator回帰30 test成功。
- Staging Release Validator：279 PASS / 0 FAIL / 0 HQ_REQUIRED / menu-only WARNING 1 / 外部確認8。CIの既存10作品Search生成一致と、追加したあとだま日英生成一致も確認。
- `core.mjs` と `style.css` は採用済みSiteとバイト一致。既存作品・Engine・共有runtimeは未変更。差分は登録・告知・生成ページ・画像と作品内ready/非表示時音停止。
- 独立技術レビュー：release_reviewが実装・生成物・画像・契約の整合をread-onlyで確認し、阻害事項なし。HQ承認とは扱わない。
- OGPは正規の物理軌道と盤面形状を使ったオフライン描画であり、実画面のスクリーンショットとは呼ばない。PNG iconは既存の玉と軌道の図形を使用。

## 未確認と確認制限

この会話の前段で、元Siteのブラウザー上のドラッグ・キーボード・扉の協力・一球戻す・クリア後再生・390×844/375×667表示を確認。今回の町への組込み後のブラウザー確認はローカルURLのアクセスを自動承認審査が拒否したため停止。町内起動・退出・再入場の実操作、物理iPhone Safari、外部Plausible Goal/実送信はUNVERIFIED。ローカルの接続失敗をサイト障害とは扱わず、拒否された操作を別経路で試していない。静的・CI・配信の証拠と実操作の証拠を分け、Release Completeとは呼ばない。
