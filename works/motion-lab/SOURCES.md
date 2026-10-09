# Motion Lab v0.1 — 原典調査

2026-10-09。Google DriveのSukimaStock/Code/Rakugakiを原典として、4つのCodea ZIPを取得し、それぞれのMain.luaを読んだ。原作の変更・上書きなし。取得コピーは調査用scratchにのみ保持し、リポジトリへ再配布していない。

| 原作 | 入力と動き | 取り出した部分 | Web版の変更・省略 |
| --- | --- | --- | --- |
| [Slime.codea](https://drive.google.com/file/d/1NTziYonHtCmH2PU4MSRsGoeLqCAgDf3f/view) | touchOrderと遅れて追うtouchPools。35節が指間のパスへspringで追従。中央がたわみ、伸びるほど面が細くなる。指なしは自由落下 | 35節、2本目の仮想指を1本目から伸ばす遅れ、U字の中央、細くなる一体の面 | 初期表示を中央の塊に変更。離したら塊へ復元するのは実験室で加える挙動。雫、画面外からの引上げ、3本以上の折れ線は省略。元の毎フレーム積分を秒単位の固定ステップへ |
| [PuddleMoon.codea](https://drive.google.com/file/d/1a98QmyXisnetCMd5LNUmivqce5jYdFqo/view) | タップ時2波、離したとき1波。追従する仮想位置が30px進むたびに軌跡波。中心に6層の月、引き・変形・wobble。円は直径をrippleSpeedで増やし、寿命に比例して薄くなる | タップと離しの波、遅い軌跡、中心の月、6層の加算光と余韻 | 発生間隔に時間と距離の両条件。複数指の独立した軌跡。月の形は簡略化。円の加算による重なりであり流体の干渉ではない。既存波にも速度・減衰の変更が反映 |
| [Firefly.codea](https://drive.google.com/file/d/17OlvroUARcn3RHEJY3XCrunzYuv8RiRF/view) | 1本指「あまい」、2本以上「にがい」。WaterDropは指の中心へ15/s追従。あまいは個体差・targetOffsetに向けゆっくり集まる。にがいは400px内で強く逃げる。noiseによる漂い、明滅、速度による変形、端でbounce | 指本数・指の中心・甘苦の文字、引力と斥力の速度差、個体差・目標offset、明滅、端の反発 | 原作に粒同士の相互作用はない。軽い近接距離調整を追加。noiseを周期関数の組合せに変更。引力にも範囲を設け、離したあとの反応をフェード。文字登場時の飛沫と大きなwobbleは省略。PCのモード選択とShift操作を追加 |
| [RakugakiEngine.codea](https://drive.google.com/file/d/1hCBKWCxm1ecKe_-rP2LCs8A8OiErb7S9/view) | 拖曳→慣性→静止、追従の遅れ、端の反発、速度に応じた伸び縮み、減衰するwobble、粒子の寿命 | 時間差と余韻を入力・更新・描画から分離する考え方 | CodeaのGravity/parameter APIは移植しない。Web Engine 0.3.0とは別。汎用物理フレームワークは作らない |

## 原典の指紋

取得したMain.luaのSHA-256。実行したCodea実機の映像との照合は未実施。

| ファイル | Main.lua SHA-256 |
| --- | --- |
| Slime | `c520b53ca9c17e70d2ce0bb0952b9c853c03efba11709ba8a19a5180cb8c11ab` |
| PuddleMoon | `7808d939ac559e6d36ba73f66e7a8aea06219bd4ff4f912ad62574332ee6f7b3` |
| Firefly | `a3cd7e4bdc9949128754d1580c251f7e86b567fdaa444e87b6db9e70991f5b1b` |
| RakugakiEngine | `8d023a7e64dead1669dbf85c148ab32548903707acb4dd270e1233fc44a478ac` |

## 制作記録

SukimaStock/noteに保存された次の5本を読み、判断に使った。UIには長い制作論を持ち込まず、手で試す空間を優先。

- [ひねる、積む、なぞる。触れるらくがきの話](https://drive.google.com/file/d/1TKbnkYihOjewZnM2cKU3-7zcQ3xNEuc-/view)：動詞から選ぶ棚、反応するまでの短い間。
- [ゲーム未満、アプリ未満の心地よさ](https://drive.google.com/file/d/1bJvteZ2xEwJ3dETtecmEM_HRMvgbsibB/view)：完成・便利さより「ちょっと触りたい」を続けられること。
- [コードを書く前に、手触りがある](https://drive.google.com/file/d/1VaVFysR71ybxcKN3Vojcypvxq71k0Am-/view)：違和感→修正→触る→違ったら戻す、の往復。
- [アプリを作り始めたのに、ゲームになっていた](https://drive.google.com/file/d/1QYgrob51Kof3BZ4f8OflIVYWEkt7h3zi/view)：動かせるものが先、ルールは後から現れる。
- [ただ「気持ちいい」を磨く夜。目的のない自作アプリ](https://drive.google.com/file/d/1Y_xgh65cnVTIXFkIscqDY6dIMW0FNh51/view)：現実の正確さだけに合わせず、動きの痕跡・余韻を残す。
