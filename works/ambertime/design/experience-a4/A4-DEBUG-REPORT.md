# A4 — デバッグ画面への分離

## 実施内容

- 通常のゲーム本編では「保存」入口を表示しない。帳面、取扱店、地図、時計などの本編操作は維持する。
- デバッグ画面を `works/ambertime/debug.html` に独立設置。ここではゲームを起動せず、localStorage の正式記録・旧卸取引記録・配分版記録の存在、概況を確認し、元JSONをそのまま書き出せる。
- 初期化・販売ルール切替・過去の各変換前書き出しは既存の正式処理を再利用する。デバッグ画面の「管理メニュー付きで本編を開く」から `?debug=1` へ入り、メニュー内の「デバッグ」を選ぶ。
- 起動時の旧記録引き継ぎ、保存競合・失敗時の停止／復旧、外側の正式保存キー、元の書き出しと初期化実装は変更しない。
- デバッグ画面自体には `localStorage.setItem` / `removeItem` / `clear` がなく、閲覧とダウンロードだけを扱う。書き出し時に記録が他タブで変更されたら中断して更新する。

## 変更理由と保護範囲

作者指示：保存は開発用の機能であり、日常プレイから外して別のデバッグ画面へ分離する。既存の保管・初期化・移行を残しながら、通常ゲームの説明と操作を減らす。

記録破損時にも元データをエクスポート可能。概況表示は簡易形式確認であり、復元可能性の保証とはしない。書き出しファイルの読込み・新しいセーブ方式・自動バックアップは追加しない。

## 検証

- `node --test works/ambertime/tests/debug-isolation.test.mjs`：作業後に実行。
- `node --test works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/market-rules-ui.test.mjs`：CIまたはローカルで確認。
- Chromium・WebKit／iPhone Safari で本編の保存ボタン非表示、デバッグ専用URLと書き出し、既存管理操作、初期化前の確認、旧記録移行、保存失敗時の復旧、読み上げと4幅を確認。

物理iPhone Safari、VoiceOverは未確認。Productionは変更しない。
