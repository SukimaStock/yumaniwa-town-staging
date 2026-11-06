# H4-2 本編回想への統合

作者が比較Labを確認し、本編への組込みを指示したため、承認済みの120×72情景と手動送りを本編へ接続した。Stagingのみ。

## 変更
- `recall/pixel-scene.mjs`: H4-1の描画を移設。店・町並み・樽と瓶・手紙の4場面は描画命令ハッシュが移植前と完全一致。客の反応には同じ人物・机・瓶を組み合わせる。
- `recall/player.mjs`: Canvas情景＋DOM一文、戻る／次へ、最終場面で閉じる／次の代へ。タイマー・アニメーションなし。16px以上、44px操作、整数倍率、長文は切らず例外的なスクロールを許す。
- `shop-app.mjs`: 表示用import 2行のみ変更。世代交代・帳面からの再閲覧・デバッグの既存経路を共通playerへ接続。
- `index.html`: app cache tag更新。
- Lab `scene.mjs`: 本編描画を再exportし、二重管理を避ける。
- `tests/h4-integration.test.mjs`, `tests/h4-player.test.mjs`: 描画同一性、固定文章、入力不変、callback、キャンセル、再閲覧、表示のみの変更を検査。

保存、復元、候補収集・選定・確定、乱数、checkpoint、確定文章は変更なし。appの2 importを逆変換するとbaseとbyte同一になる検査を実行。

## 検証
Base: `8a145ec4bb810baccbb2dfb353e990db72a3ef21`

- H4 player 6、integration 3、Lab renderer 6: 合計15成功。
- 既存回想: 29件中27成功、1失敗、1 skip。失敗は既知のVM fixture `debugSkipJob is not defined`。
- 販売UI・formal-copy: 37件中32成功、5失敗。baseを別worktreeで実行し同じ5件の失敗を確認。今回の範囲では修正しない。
- ローカルChromiumはsocket権限制約で起動できない。公開後にクラウドブラウザーで表示・送り・終了を確認する。
- 物理iPhone Safari、VoiceOver、短い実機viewportは未確認。テストの最小幅確認は実ブラウザー描画の代用ではない。
- 表現監査: 比較パネル・分析見出しを本編へ持ち込まない。文章を変更せず、既存の日時と短い操作のみ。新規説明文、演出待ち、粒子なし。

## 確認手順
本編 `?debug=1&recall-preview=1` からダミー6場面を確認できる。実データは世代交代時と帳面の過去回想から同じplayerを使う。最後の「次の代へ」だけが既存callbackを実行し、途中の閉じる／Escapeと再閲覧は交代しない。

Rollback: 本編のimportとcache tagを戻す。保存データの変換は不要。
