# AmberTime — R0〜R6の総括

2026-11-03。R6開始基準は `2ff8aba1287f1e7aba7ceb902cfaef5df1c9dd79`（R5 / PR #774）。本編の段階的整理をここで一区切りにする。各段階の詳細と測定結果は `design/refactor-r0-2026-11-03/` 〜 `design/refactor-r6-2026-11-03/` に残す。

## 変更しやすくなった境界

|段階|改善した責務|今後の変更で減ったリスク|
|---|---|---|
|R0 / #769|既存失敗を切り分け、正式129途中状態・蒸留20状態・旧保存・通知優先・保存失敗と画面の基準を固定|最終画面だけが合っている変更や、generic actとcandidate保存の違いを消す変更を見つけやすい。検査の期待値を実装に追随させない基準になった|
|R1 / #770|spirit-readout-viewに原酒の表示値整形だけを分離|日本語表示・volume・gaugesを変更するときにDOM書込や正式操作を一緒に編集する必要が減った。入力はゲーム全体でなく既存readoutと表示条件|
|R2 / #771|既存TOOL_GEOMETRYを描画・layout・入力の共通参照へ接続|レバー・グラスを修正する際、複数の数値を手で揃える必要が減った。座標を共有しても採取量や操作guardは正式モデルのまま|
|R3 / #772|distill-room-controllerが仕込み確認の一時状態を所有|prepared・対象batch・confirmationの寿命と取消条件を小さく試せる。正式カード選択、countdown、saveをcontrollerへ混ぜない境界が明確になった|
|R4 / #773|warehouse-room-controllerが樽の選択IDと現存樽・正式試飲との整合を所有|選択の読み書きを一つへまとめた。帳面の参照樽と通常選択を混同せず、試飲・瓶詰め・再読込の既存効果をrootに残せる|
|R5 / #774|ledger-history-viewが履歴・profileのHTML生成を所有|履歴の整列・重複除去・escape・風味表示を、modal・worker・正式試飲を動かさず検査できる。帳面全体の汎用化はしなかった|
|R6|Canvas更新経路・停止/復帰・font/DOM/時計の責務を記録し、R5依存閉包とライフサイクル回帰を補強|R0以降に追加した4モジュールの古い親キャッシュを検出できる。既にまとまったRAFを分割せず、変更対象と必要な検証を選びやすくした|

R3/R4のcontrollerは部屋全体の操作エンジンではない。数個の一時状態だけを所有し、正式なゲーム操作を発行しない。R5もモーダル管理器ではない。抽出範囲を名前から拡大解釈しない。

## shop-app.mjsに残した主要責務

rootは引き続きcompositionとアプリケーション接続を所有する。正式モデルの読み取り、操作dispatch、保存transaction、時計・月次順序、countdown、正式通知と割込優先、modalの開閉/戻る/focus/scroll、worker要求・取消・古い応答破棄、DOM書込とCanvasへのprojectionをつなぐ。

CanvasSceneは純粋描画だけのクラスではない。既存DOMの操作領域配置・ARIA・viewport/font/lifecycleとCanvas描画を結ぶadapterでもある。単一のRAF、3つの期限付き描画タイマーとprogress専用の2px描画を所有する。正式時計はroot/runtime-clock、地図はroot/world-map-view、販売のDOM演出はmarket-uiが別に所有する。

## 正式モデルとUIの境界

正式な蒸留・熟成・瓶詰め・販売・経済・担当者・評判・RNG・操作履歴・保存形式は既存モデルの権威を保った。表示関数は入力を読むだけで、controllerの選択値や確認状態は正式状態の複製にしない。Canvasの時刻は演出用であり月次を進めない。

ただしrenderを純粋関数とは呼ばない。syncModalは必要な正式noticeと保存を含む。hidden/pagehideでもrootは既存どおりpause/saveを実行する。描画を呼ぶ側の正式効果と、Canvas自身が正式状態を変えないことを分けて扱う。

## 保守で守ること

- 表示変更は小さな入力と出力から始め、正式状態やDOMを丸ごと新viewへ渡さない。既存view/controllerを重ねて二重所有しない。
- 保存失敗時のgeneric actとcandidate方式の差、通知順序、旧保存原文とcold replayを維持する。共通化したくなったら、先に差の意味と失敗matrixを確認する。
- 画素・hit・ARIA・focus・操作回数を別々に確認する。固定font/time/DPR/animation phaseの比較を実機の触感や音声確認へ読み替えない。
- モジュールを変えたら、全親importからHTML入口までURL identityを追う。worker・CSS・fontを含める。R0/R5固定graphは特定基準からの検査であり、将来の全配信間の自動保証ではない。直前配信と旧1時間cacheも照合する。
- 新しい常時タイマー、座標の複製、正式ゲーム状態の描画側への複製を避ける。既存の更新頻度・停止条件を変える場合は別の具体的な目的と比較基準を用意する。

## 残る結合と、現時点で維持する領域

rootのmodal familyとdraft/focus、DOM→Canvasの読戻し、各workerのcache/取消には結合が残る。今後その周辺に実際の機能変更が発生したとき、影響を限定できる小さな境界だけを検討する。今回の整理を理由に抽出を継続する必要はない。

正式モデルのreplay/checkpoint、月次順序、旧reader、保存transactionの一括共通化、Canvas全体のエンジン化は現段階で変更しない。低い変更頻度に対して保護コストが高く、現状の分離を崩す危険が利益より大きい。DPR単独変化の専用監視や、短時間の非表示で残る演出の仕様も、今回「改善」として変更しない。

小さい表示修正と一時状態の調整を個別に検査できるようになり、誤って時計・保存・通知へ触れる面積は減った。一方root全体が単純になったとは言わない。R0の比較基準、R1〜R5の限定抽出、R6の所有者記録と依存閉包を合わせ、変更を安全に選び、影響を説明できる状態を得た。R6の測定結果は同段階のIMPLEMENTATION.mdへ記録する。

本編の整理はここで区切る。L1のLab研究記録化は別作業とし、このR6ではLabの実体・分類・公開URL・状態を変更しない。物理iPhone Safari、VoiceOver音声、実OS背景、実BFCache hit等の未確認は、ブラウザー自動検証の成功で完了扱いにしない。
