# 本編カットUIのブラウザー検証

最終ソースでChromium89観測／Linux WebKit86観測、console errorなし。360×568・375×620・390×680、DPR3、375pxは通常motion、他はreduced-motion。

- 既存の実pointer/tap/左右slide、短い/逆/cancel、CDP touch cancelと複数指、画像外pointercapture、3→2→1の実画素。
- Native model APIで同じ開始/終了を再生し、実ゲームsnapshotと正式保存を完全比較。正式な味・量・費用・進行を表示のために変更していない。
- 採取直後fill0、8stepで0.7、確定後同じ高さ。異なる正式量でも液面は同じ。採取中の正式量予測パネルは非表示、結果では正式量を表示。グラスARIAもLの目盛なし。
- Cバーの実画素・palette/現在/開始/終了の3px座標と、実際の採取境界を照合。ページ縦横overflowなし、道具の44px以上のhit領域と位置を確認。
- 正式終了後のleverDown=false、通常motionで途中姿勢1、最終0、reduced-motion即時。矢印firstの3/6/9px、practiceの6pxと長い休止、触れ始め0、非活性と還元motion静止。
- 実際の手動開始＋終了を1回行い、completedRuns1とpending消費を検証。採取途中のreloadでもpendingを保持し、同じ正式操作結果に一致。
- practice1/2・learned3は明示的な表示fixtureで比較し、reload後も距離/非表示を確認。3回の実操作をこの表示fixtureと混同しない（計数/重複は独立単体テストも担当）。
- previewでは既存の正式保存と習熟設定bytesを変えない。習熟keyだけの書込拒否でも正式保存・蒸留結果は正常で、session内の習熟は維持。
- Chromium追加のmock clockなしWindow timer＋実touchで同一正式結果を確認。

テスト：`works/ambertime/tests/distill-cut-main-browser.mjs`。`AMBER_BROWSER_MODULE`に環境のPlaywright module、`AMBER_BROWSER_EXECUTABLE`にChromium、WebKit時は`AMBER_TOOL_ENGINE=webkit`と`AMBER_WEBKIT_EXECUTABLE`を指定する。製品依存は追加していない。

実機iPhone Safariのバー伸縮、指での操作感・負荷・作者採否は未確認。Linux WebKitを実機結果とは扱わない。
