# Motion Lab v0.1 — 実装・検証と実機ドリル

作業開始base: `c3b9c2729bd314c6452ff9838e94872103c260d6` (2026-10-09)。直近はWorld Consistency CIのstaging向け追加。作業開始時open PRは既存PUMPOKO Draft #140のみで、対象外。

Plan: `.change-plans/motion-lab-v01-20261009/r0.lock.json`。digest: `9f26b5d3e41f63f608557f4d4b4d98585a058f1f548741d328b1e3c90b6d1e3d`。Plan-onlyの最初のcommitを実装前に固定。

## 実装

| 動き | 調整値 | 内部への変換 |
| --- | --- | --- |
| Slime | 弾力・粘り・重さ・減衰：0–100 | spring=22+1.6×弾力、追従rate=22−0.2×粘り、中央たわみ=2.2×重さ×描画scale、drag=2.5+0.18×減衰 |
| PuddleMoon | 速度・大きさ・減衰・発生間隔：0–100 | 直径の速度25+2.4×速度、初期半径8+0.46×大きさ、寿命4.5−0.039×減衰秒、時間間隔0.025+0.003×発生間隔秒と距離条件 |
| Firefly | 引力・斥力・影響範囲：0–100、粒数：12–120 | 引力1+0.1×値、斥力10+1.25×値、範囲60+4×値px、個体数は整数 |

入力・ループ・描画領域はrunner、数値の定義はcatalog、動きは3モデル、標本はstorageへ分離。UIスライダーはモデルを作り直さず即座に反映。実験ごとに直前の設定を保持。

Canvas2Dは埋め込みサイズ、DPR上限2。120Hz固定ステップ、1frameで進める上限0.05秒。非表示・pagehideでは入力と残り時間を消し、復帰後の最初のframeは進めない。向き・サイズ変更時は状態座標を倍率変換し、全ての指を解放。リスナーは1組、RAFは1本。波紋上限128、蛍上限120、Slime35節。

### Engineを使わない理由

現行`engine/SUKIMASTOCK-ENGINE-v0.3.md`、`codea-lite.v1.0.0.js`、`sukimastock-engine.v0.3.0.js`、starter/tea-unfold-02を読んだ。Codeaは`window.innerWidth/innerHeight`でcanvasとbacking sizeを管理する。一方このworkは3領域と埋め込みcanvasを必要とするため、work-localなCanvasループを採用。CodeaとRAFを二重に起動したり、共通runtimeをpatchしない。ローカル保存もユーザー指示のwork固有データだけ。Engineの機能を利用しているという表示はしない。

### 標本

キー: `sukimastock.motion-lab.specimens.v1`、schema: `sukimastock-motion-specimens/1`。ID、実験名、原典、全調整値、programVersion、seed、interactionMode、日時、タイトル、メモを保存。上限200件／入力JSON上限1MB。別実験・原作URL・未知version・範囲外値を拒否。壊れた保存の読出しでは既存データを書き換えない。インポートは全体検証後に追加し、同IDは既存を優先。quota/アクセス拒否ではセッション内に保持し、JSON退避を促す。文字列をHTMLとして実行しない。

## 確認結果の扱い

2026-10-09のローカル検証：Motion Lab **23/23成功**。既存lifecycle、work guide、World Consistency、PUMPOKO ending/audio、ORBIT 02 archiveを加えた一括実行は **145/145成功**。差分の空白チェックとScope → Risk → Impactも成功。ブラウザーテストは実行していない。

変更ファイル（19件）：

- `.change-plans/motion-lab-v01-20261009/r0.lock.json`
- `data/work-lifecycle.json`（新workの1項目だけ）
- `works/motion-lab/`内：`index.html`、`style.css`、`app.js`、`catalog.js`、`math.js`、`runner.js`、`slime.js`、`puddle.js`、`firefly.js`、`storage.js`
- 同work内：`README.md`、`SOURCES.md`、`VALIDATION.md`
- 同workの`tests/`内：`app.test.cjs`、`models.test.cjs`、`runner.test.cjs`、`storage.test.cjs`

`node --test works/motion-lab/tests/*.test.cjs`で数値、入力・Canvas/DOM doubles、保存、実アプリのイベント配線を確認する。テストは実際のアプリコードを読み込むが、ブラウザーの描画・レイアウト・SafariのPointer Eventsを証明しない。

managed LinuxのSitesスキルでは`control-browser`がない場合ブラウザーQAを実施しない規定。このセッションには同スキルがないため、プレビューサーバーやブラウザーを別経路で起動していない。**実ブラウザーの表示・コンソール、主観的な触り心地、実iPhone/iPad/PC、長時間の実機負荷はUNVERIFIED**。自動テスト合格で「手触りが良い」「全完了」とは扱わない。PRの本文にexact head SHAとチェック結果を記録する。

## 実機ドリル（約5分）

1. Slimeを1本指でつかみ、もう1本を置いて左右へゆっくり広げる。2本目が飛ばずに伸び、中央に重さがあるか。
2. 粘りを0と100にして同じ動き。追いつく時間の違いが分かるか。弾力0／100、重さ0／100も比較。
3. 引き伸ばして離す。形が飛ばずに塊へ戻るか。減衰0／100で余韻が違うか。PCではShift＋ドラッグも試す。
4. PuddleMoonを近い場所で3回タップ。重なった波が突然消えないか。速度・大きさ・減衰を端まで変えて違いを見る。
5. ゆっくり／速くなぞり、発生間隔0／100を比較。離したあと、月がしばらく揺れて戻るか。
6. Fireflyに1本指を近づける→ゆっくり動かす→2本目を置く→両方離す。甘い水へゆっくり集まり、苦い水から逃げ、漂いへ戻るか。
7. 引力／斥力／影響範囲を変える。粒数120でも気持ちよく動くか。PCの「逃げる」とShiftも確認。
8. 好きな設定に名前とメモを付けて保存。別の実験を開く→標本棚から復元。設定値とFireflyの選択モードが戻るか。
9. ページを再読み込みし、標本が残るか。JSONを書き出し・取り込み、同IDが増殖しないか。
10. 操作中に別アプリへ移動し30秒待つ→戻る。暴走やつかみっぱなしがないか。横向きにする→調整パネルを開閉し、ページの意図しないスクロール・隠れたボタンを確認。

気になったときは「端末／ブラウザー／実験／4つの値／指の動かし方／違和感」を知らせると、同じ条件へ戻しやすい。

## 配信と範囲

新規active/staging-only登録。町のメニュー・SEO・productionへは登録しない。変更はwork内、Plan Lock、`data/work-lifecycle.json`の1項目のみ。

PR作成まで。自動マージ・公開・Sites登録なし。既存GitHub Pagesはmainを配信するため、未マージ中は新workをmainのURLで試せない。マージ後の確認先は `https://sukimastock.github.io/yumaniwa-town-staging/works/motion-lab/`。未配信URLを「プレビュー確認済み」としない。

## v0.2以降

実機での調整範囲・見え方・反応時間を先に磨く。標本schemaの移行、発見を見比べる機能、残りの原作の取り出しは後続。合成・ノードエディタ・自動ゲーム化はv0.1には含めない。
