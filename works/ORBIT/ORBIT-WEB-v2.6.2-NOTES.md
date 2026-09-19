# ORBIT Web v2.6.2 — RESTORE FLOW HARDENING

v2.6.1 の visual scale / thin instruments は維持。
今回は HOME で `RESTORE READY` なのに修理儀式が始まらない問題を、
タップ時間調整ではなく入力経路そのものから修正。

## 原因候補として残っていた2つの silent gate

1. RESTORE READY でも、pointer down の位置を screen -> world 変換し、
   BASE 円内と判定できた時だけ `tryBaseRepair()` へ進んでいた。
2. `tryBaseRepair()` に到達しても、ritual iframe / local flag が stale だと
   画面上の説明なしに false で終了した。

## v2.6.2 の HOME gesture

BASE 着陸中：

- 1秒未満で離す -> RESTORE（READYなら）
- 1秒保持 -> LAUNCH

RESTORE開始に座標ヒットテストを使わない。
HOME画面では「どこをタップしたか」で修理の可否を変えない。

HUD:
`RESTORE READY · TAP TO RESTORE / HOLD TO LAUNCH`

## Ritual bridge

- `OrbitRitual.ready` を追加
- active + ready = 実際の儀式中なので再入不可
- active + not ready = invisible stale iframe とみなし自動close
- local `restoreRitualActive` は実iframe状態に追従して自己回復
- build query を v2.6.2 に更新

## 変更なし

- visual scale / thin UI
- RESTORE costs
- Ritual内容
- Ship / Station / planet visuals
- flight physics
- fuel / resources / Echo
- story / finale
