# ORBIT Web v2.5.4 — FINALE CONTROL RETURN

## 症状

Echo 12 / RESTORE 5 の最終シークエンス中でも HUD が
`RESTORE COMPLETE · HOLD TO LAUNCH`
と表示していた。

しかし finale.active 中は story beat を守るため touch() が入力を受け付けない。
そのため「離陸できる表示なのに離陸できない」状態になっていた。

加えて、前の RESTORE ritual の `restoreRitualActive` が stale になった場合、
final REBIRTH が開始できず finale が解除されない余地があった。

## 修正

- finale.active 中の BASE HUD は `E.V.E. · FINAL SYNC` に変更。
- 最終シークエンス中は離陸可能とは表示しない。
- final REBIRTH 開始前に stale `restoreRitualActive` を自動復旧。
- outro 終了時に以下を明示的に解除：
  - finale.active = false
  - mode = landed
  - restoreRitualActive = false
  - pressing = false
  - departHold = 0
  - repairTapArmed = false
  - repairInputLock = 0
- `……おかえり。` 後は即座に1秒長押し離陸可能。
- 最初の離陸では従来どおり `……いってらっしゃい。`

ゲーム進行・open-universe・資源・燃料・MiniMap・Ritual内容には変更なし。
