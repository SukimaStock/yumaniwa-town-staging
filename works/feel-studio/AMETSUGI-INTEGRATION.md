# 雨つぎを Feel Studio 0.3 につなぐ

元作品：[`works/ametsugi/`](../../ametsugi/) （変更なし）。
制作版：`prototypes/ametsugi/ametsugi-a/` （Stagingのみ）。
作品側の物理／画面の見た目を持ち込めるかを確かめるための**独立接続**。ゲーム本体の公開版や共通 Engine/3D Lab は改変しない。

## 最初の操作

1. [Feel Studio](./)で「雨つぎ · 制作版」を選ぶ。
2. 「直接編集」で最初の雨どいの銅色の端を上下に引く、または「最初の雨どいの傾き」を調節。「最初の雨までの間」を変える。
3. 「試す」で傾きをつけた状態から水を流す。元の5屋根と失敗後の再挑戦、最後の逆向き周回を試せる。
4. 「ここから分岐」で編集結果を残す。「並べて比べる」で元のAと分岐を比較。最初の制作版はAのコードを参照する設定分岐であり、新コードの別実装ではない。
5. 「AIに変更を依頼」では「雨どいの傾きと操作」「雨粒の流れと受け渡し」「雨と屋根の演出」を選び、Workへ出典付きJSONを手動で渡す。新しいコードの登録と返答JSON取り込みで初めて別実装を増やす。

## 意図的な制約

- 初期設定を保持するのは**最初の屋根の傾き**（-0.66〜+0.66 rad）と**最初の一粒までの間**（0〜2秒）。2〜5番目の屋根と水の操作は元のゲームどおり作品内で操作できるが、各屋根の傾きはFeel Studioの保存設定には含まれない。
- 編集モードでは水の流れを止め、最初の屋根へ復元する。試遊中の一時的な角度は制作設定ではない。
- 元の `game.mjs` と `draw.mjs` のモジュール本文は、import/exportを外した状態で`physics.js`と`art.js`にそのまま含める。原版とは依存境界が違うため、`ManipulationPlayer`のHINGE制御を最小のwork-local shimへ置き換え、アプリ起動／音声は独立実装する。
- したがって、作品本体のEngine/Codea/audio再生とバイト単位に同一の「元作品をそのままiframe化」したものではない。全5屋根の物理と描画の式は同じ。ブラウザで操作感、音、画面の縦横、復帰を確認する必要がある。
- 保存/履歴は Feel Studio の `sukimastock.feel-studio.v2.ametsugi` キー。元作品の保存や他projectを変更しない。試作として `ametsugi-a` のコード・登録hashは不変。
- `ametsugi-a/play.html` は独立起動用。Bridgeを読み込まず、自身の入力とRAFで動く。
- Studioは`sandbox=allow-scripts`と全ローカル依存SHA256検証を維持する。外部通信・任意コードJSON実行は追加しない。

## 検証と未確認

`node works/feel-studio/tests/ametsugi-v3.cjs`：元の物理・描画本文とCSSの同一性、追加buildと全依存SHA、10ケース（5/15/30/60/120fps×通常/反転）×5屋根を自然なゴールまで、設定分岐・範囲拒否・Work依頼の生成。

`node works/feel-studio/tests/bridge-v3.cjs`、`node works/feel-studio/tests/cycle-v2.cjs`、`node works/feel-studio/tests/frame-v2.cjs`、`node works/feel-studio/legacy-01/tests/verify.cjs` で旧機能を確認。

未確認：公開Pages実ブラウザのキャンバス操作と見た目、実機iPhone/iPad Safari、音の実聴、作者の採用。これらは実際の結果が出るまでPASSと記録しない。
