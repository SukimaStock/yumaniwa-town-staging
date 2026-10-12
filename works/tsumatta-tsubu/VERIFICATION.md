# 2026-10-12 検証記録

対象実装 SHA: `24f50b9a82245c19df491faa8611eae2e0ee0e74`。
Plan digest: `a5e1e77f847015e4c21f1a639bf2b7bd0866753c5d668da1bae3689ebf8a7db7`。
正式な verificationState は **UNVERIFIED**。添付 v0.2 Record の checker 成功は内部整合だけを示す。

| 確認 | 実測結果 |
| --- | --- |
| `physics.test.mjs` | 3/3成功。30秒放置、同じ位置を保持して離す、空白タッチでは解放なし。±20座標の移動で32粒が流出。離した後に半数以上が通過し、末尾は遅れる。3回の再試行も成功 |
| Chromium `/usr/bin/chromium` / Playwright | iPhone 13、iPad (gen 7)、Desktop 1280×800 の3条件。前2条件はCDP touch入力、PCはmouse入力。タップだけでは流れず、横移動→離す→6秒後に32/32流出 |
| 中断とレイアウト | touchCancel（携帯相当）/blur（PC）でdrag解除。resetで再び詰まる。844×390へのサイズ変更でdrag残留・勝手な流出・横overflowなし。全条件でpageerrorなし |
| 見た目 | iPhone相当のスクリーンショットを目視。大きな支持粒2個と小粒30個、漏斗、1行の操作案内、再試行ボタン |
| 既存回帰 | lifecycle / release-validator / work-guide 計59件成功。Engine input-boot / diagnostics / audio-lifecycle / audio-assets 計140件成功 |
| Scope → Risk → Impact | 固定Planに対してすべてPASS。workとlifecycle以外の実装差分なし |
| lifecycle / LAB | `--check --base d2c7f00c8cf9e5351e0e1b624bef17d5667ceea1` 成功。`--write-lab` 実行、生成差分なし |

ブラウザ検査の再実行は `browser-check.cjs`。環境のテスト出力は `/tmp/tsubu-*.log`、画面は `/tmp/tsubu-*.png`。
実機iPhone/iPad Safari、作者の気持ちよさ・採用判断は未確認。公開URLとPagesはPRの最終記録に別途残す。
`gh api` は環境のプロキシで Forbidden。GitHubコネクタによる正規の読み書きとgit pushは利用できた。
