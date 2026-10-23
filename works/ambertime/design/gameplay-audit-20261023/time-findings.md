# 時間・負荷監査の証拠メモ

基準SHA `2a1a172fa67ef7bda3cad82c9070c8946353b3f6`。本編・Labは変更していない。`time-browser.mjs` はHTTP応答上だけに呼出回数・CPU時間の計測を挿入する。タイマーは実際のChromium153標準タイマーであり、Playwright clockやCPU slowdownを使っていない。390×844・DPR3。iPhoneの形のviewportであり、実機iPhone/Safariの速度、消費電力、温度ではない。

## 1. 実時間とゲーム時間

`parallel-parameters.mjs:2` は1月6,000ms、1step100ms。`shop-app.mjs:461–478` は60stepで1月、1倍なら100ms、2倍なら50msを待つ。しかし次のsetTimeoutは**モデル更新・保存・全renderが終わってから**登録する。固定100msをゲーム時間へ足し、実経過時間を足さないため、各callbackの仕事がそのまま時計の遅れになる。2倍でも仕事量/月は減らない。

下表は各1ゲーム月、単一観測。保存回数は開始/終了の停止操作各1回を含む。Canvas回数にも切替境界の描画を含む。測定窓は3秒準備の後の蒸留状態から始め、準備時間は含まない。

| 条件 | 1倍 実秒 | 2倍 実秒 | 1倍 Canvas回数 | 1倍 保存回数 |
| --- | ---: | ---: | ---: | ---: |
| 序盤、1樽、蒸留なし | 6.140 | 3.140 | 68 | 3 |
| 手動蒸留、蒸留室 | 6.978 | 3.872 | 76 | 14 |
| 自動蒸留、蒸留室 | 6.816 | 未計測 | 73 | 14 |
| 自動蒸留、貯蔵庫 | 6.856 | 3.801 | 67 | 14 |
| 手動蒸留終了、樽詰め待ち | 6.157 | 未計測 | 62 | 3 |
| 100月、3樽・3商品、蒸留なし | 6.240 | 3.244 | 67 | 3 |
| 101月、3樽・3商品、自動蒸留、貯蔵庫 | 9.486 | 6.869 | 68 | 14 |

後半条件では履歴・樽数・商品数が同時に増えており、履歴長だけの独立効果とは分離していない。

未改変応答の対照は、通常1倍6.154秒、手動1倍6.967秒。軽い状態での計測挿入による差は約±0.2%で、今回の蒸留時遅延の大きさは計測器だけでは説明できない。ただし後半状態の無挿入対照は取っていない。値の一般化には実機での複数回測定が必要。

手動蒸留で別室へ移動すると`selectRoom():489`がuserPausedをtrueにし、`blocked():460`も蒸留室外を止める。2.502秒待って月・elapsed・抽出位置は不変、render0回・save0回。Canvasは切替直後の3回だけ。これは意図された全体停止であり、負荷による遅延と区別する。自動蒸留にはこの制限がなく、別室でも同じ蒸留処理と全renderが続く。

277月・387操作の既存履歴（3商品、樽なし）では2倍で3月9.713秒（期待9秒）、182render/182Canvas/5save。履歴が長いだけで必ず極端に遅くなるとはいえず、**大きい履歴と進行中の抽出の組合せ**で負荷が増える。

## 2. 支配的な負荷の特定

`shop-app.mjs:761` は部屋に関係なく各renderで`D.staffStatus(game)`を呼ぶ。`partner-orders.mjs:542–544`のstaffStatusは毎回validateDistilleryを呼ぶ。validator（1155–1171）は操作履歴のcheckpointを使うが、全状態/contextをcloneし、未記録の抽出進行を`progress()`（1097）で再実行する。`economy.mjs:24`のdistillStepは毎step状態全体をcloneする。したがって、保存だけでなく**表示用status取得から、抽出を再演する検証**が走る。

| 1月の累積CPU計測 | 序盤 蒸留なし1倍 | 序盤 手動1倍 | 後半 自動・別室1倍 |
| --- | ---: | ---: | ---: |
| render | 115.8ms / 62回 | 842.5ms / 62回 | 3,060.5ms / 62回 |
| validateDistillery | 40.8ms / 66回 | 819.0ms / 136回 | 3,198.0ms / 136回 |
| structuredClone | 30.7ms / 1,036回 | 812.7ms / 9,593回 | 3,222.9ms / 10,415回 |
| 実際のdistillStep | 0回 | 20.7ms / 60回 | 59.7ms / 60回 |
| 実際の月次処理 | 0.9ms / 1回 | 0.7ms / 1回 | 2.6ms / 1回 |
| save全体 | 3.6ms / 3回 | 84.8ms / 14回 | 345.2ms / 14回 |
| Canvas.draw | 186.9ms / 68回 | 241.1ms / 76回 | 226.4ms / 68回 |

これらは包含関係があるため足し合わせない。validationはrenderやsaveに含まれ、cloneはvalidationに含まれる。CDPのTaskDurationは通常1倍0.711秒、後半自動1倍4.305秒、後半自動2倍4.753秒。後半2倍は6.869秒の測定窓の約69%をtaskが占めた。GPU/電力/温度はこの指標から算出しない。

独立した小さい`time-cost-probe.mjs`でも、月次operationを挟まず抽出位置だけを進め、同じ状態のserializeDistilleryを10回測定した。

| 抽出位置 | 序盤 serialize中央値 | 後半 serialize中央値 | 1回のclone回数 |
| --- | ---: | ---: | ---: |
| 0 | 0.50ms | 2.00ms | 4 |
| 30 | 6.55ms | 26.90ms | 64 |
| 60 | 12.10ms | 47.65ms | 124 |
| 87 | 17.35ms | 72.75ms | 178 |

clone回数はこの条件では`4+2×抽出位置`。**毎回履歴全部を先頭からreplayする**という説明は正確でない。履歴checkpointは機能しており、その後の未記録抽出の再演と全状態cloneが増幅する。月次operationなどで進行位置がcheckpointへ含まれると再演範囲は短くなる。実際の蒸留計算や月次計算より、表示・保存のための検証が支配的だった。

## 3. 描画・保存・非表示

- 通常も蒸留中も1stepごとに全renderを呼び、1月62render。非表示の部屋や担当者パネルも組み立てる。通常1月でinnerHTML setter312回。DOMの一部はkeyで再利用されるが、全更新が省略されているわけではない。
- `canvas-scene.mjs:99`は各drawでcontrolsとdrawWorldを実行する。120×214のoffscreen世界を毎回描き、最終Canvasへ転送する。最終CanvasはDPR3のため実ピクセル数が多いが、今回の測定で主因はJSの検証再演だった。
- 蒸留室の手動1月ではSVG parse/小Canvas生成74回、自動1月72回。液量・稼働frameをキーとするsprite cache（12–16）があり、100超で全消去する。別室自動はSVG生成0回になるが、時計は6.856秒のまま。蒸気の絵だけを止めても支配的なstatus/validation負荷が残る。
- `shop-app.mjs:473`は蒸留中の5stepごとに保存する。測定窓の定期saveは通常1回、自動/手動12回。保存のJS負荷の中心はlocalStorage書込そのものよりserializeの厳密validation。保存頻度を減らすだけでは毎renderのvalidationが残る。
- 自動蒸留の非表示では2.2秒間に月・elapsed・抽出位置が完全不変、render/RAF/saveなどの計測回数は0。復帰後1.2秒で抽出位置9→20、elapsed900→2000。実際のtimerを維持してdocument.hidden/visibilitychangeだけを合成した確認であり、iOSのOS凍結・BFCache・長期バックグラウンド復帰は未測定。
- #611の選択点滅・小窓背面の停止を破壊する変更はしていない。heapはGC時点に左右され、今回の1点snapshotからmemory leakを認定しない。後半2倍で30.65MBというsnapshotはあるが、永続的な増加の証拠ではない。

## 4. 判断と次の検証

A（優先修正候補）: 表示からの厳密検証と抽出replayの重複を避ける。1つのゲーム状態に対してvalidated facts/statusを再利用し、状態変更・保存互換性・外部保存変更の境界では検証を保つ。検査を単に外す案は勧めない。先にこの負荷を落としてから、時計のcallback後待機によるdriftを、操作感とmanual採取判定を守る形で整理する。

C（既存表示の整理）: HUDの時間バーだけの更新で足りるstepと、ゲーム状態/部屋/操作が変わる更新を分ける。必要な箇所だけ更新し、部屋外でhidden panelのinnerHTMLや再演を作らない。静的背景・既知spriteの再利用は第二候補。これらは今回未実装。

副作用・影響: キャッシュの失効漏れは古い残高・採取結果・依頼可能状態を表示する危険がある。wall-clockの単純な追いつき処理は、処理落ち時にmanual採取バーを飛ばす危険がある。毎saveのreplayを弱めて破損検出を失わないこと。検証は同じ公開操作fixture・source hashで、1/2倍、蒸留終点、部屋切替、保存復元、別画面の保存変更、中断復帰を再測定する。

実機で確認すべき項目: 同じsave/画面輝度/低電力設定/充電状態/室温で通常・自動蒸留別室の5分区間を比較し、1月の実秒・温度感・電池減少・操作遅延・復帰を記録する。今回、発熱の直接測定はできず、CPU作業量が増える経路を特定したところまで。

## 再実行

`node works/ambertime/design/gameplay-audit-20261023/time-browser.mjs`

`node works/ambertime/design/gameplay-audit-20261023/time-cost-probe.mjs`

`AMBERTIME_CHROME`でChromium実行ファイルを指定できる。`AUDIT_CASES=late-auto-1x,late-auto-2x`で部分比較。全ケース測定は他の重い監査ジョブ終了後に行った。個々の母集団や実機の平均を表す数値ではない。JSONの全条件・fixture metadata・source hashes、CSVの計測値を参照する。fixtureは同じブラウザー内の公開APIと既存helpersで作る。Node生成の後半fixtureは別V8での厳密replayが一致せず測定から除外した。これだけで実ユーザーのセーブ不具合とは判定しない。
