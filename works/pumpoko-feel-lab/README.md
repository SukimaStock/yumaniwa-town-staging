# PUMPOKO｜FEEL LAB 0.1

本編のステージ攻略ではなく、操作だけを繰り返し比較する独立ラボ。現在のPUMPOKO 02の `physics.js` を参照し、値はラボの各状態だけに複製する。本編は変更しない。

## 使い方
ROLL / BOUNCE を切り替え、A（現行）→B（応答）→C（余韻）を同じ簡単な谷で比較。「同じ条件で再試行」で初期値に戻す。よかった感触の短いメモは端末内に保存。保存はステージデータやゲーム公開には一切反映されない。

## 初期版の参照
初期版 `works/pumpoko/builder/` のBuilderにはSpline制御点・Bowl/Ramp・Loop・TEST START・PLAY FROM HERE・走行軌跡・JSON EXPORTが存在。Loopは実接触による円地形であり、強制軌道・吸着・速度補助なし（`works/pumpoko/BUILDER.md`）。初回ラボにLoopやBuilder全文を移植しない。最初に好きな動きを選び、次の実験で「気持ちいい地形片」を保存する小さな編集器とLoopの練習地形を比較する。

## 限界
A/B/Cはゲームの本番コースではない。画面内の比較用ボウルに限る。触覚の印象、iPhone Safari実機、保存挙動は未検証。速度と跳躍の好みをUIだけで確定できない。productionは未変更。
