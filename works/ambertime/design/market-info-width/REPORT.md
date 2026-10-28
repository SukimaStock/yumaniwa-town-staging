# 店情報の折返しを防ぐ追補

PR671の公開画像で「店情報」が2行に折り返す状態を確認。了承された横1行の文字を保つため、情報列を64→72logicalへ広げ、nowrapを指定した。文字サイズ、左120logical、瓶・残数・発売日、自然高、背景の部屋、モデル・保存・販売計算は変更していない。

新しいbase dd99d82e、先行Plan Lock `.change-plans/ambertime-market-info-width/r0.lock.json`、digest `14b1c33ae3a6ab1bba0a932afe4f1d9b38d3f7261d877bdcba4d7fab9b4f3497`。

関連32テスト成功。実Chromiumのコンパクト販売室試験で、4画面寸法・DPR1/3、1/2/3販路、情報ボタンの実scrollWidth/clientWidth・高さ・外枠内の位置を確認。納品返品、単行返品、通知、店情報から既存価格情報、複数商品の残数も検査。実機iPhone/Safari/VoiceOverは未確認。公開画像で発見した見落としを、ボタン外枠だけでなく文字幅の回帰へ追加した。

Root独立レビュー、Scope→Risk→Impact、必須CI・Pages・公開バイト照合と最終画像はPRへ記録する。Production変更なし。
