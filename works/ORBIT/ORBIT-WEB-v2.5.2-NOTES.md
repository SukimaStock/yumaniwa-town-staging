# ORBIT Web v2.5.2 — BASE INPUT SPLIT

v2.5.1 でも RESTORE READY 後の次段階が iPhone で始まらないケースが残ったため、
BASE 上の「修理」と「離陸」を同じ短押し／長押し判定で兼用する設計を撤去。

## 新しい入力

- **緑の BASE 本体をタップ** → RESTORE ritual を即時開始
- **長押し** → 従来どおり 1秒で LAUNCH

RESTORE READY 中でも宇宙船付近の長押しは修理タップとして誤認しない。

## 追加対策

- ritual iframe が既に閉じているのに `restoreRitualActive` だけ残った場合は自動復旧。
- ritual 完了後は `mode = landed` を明示的に再確定。
- 完了直後 0.30秒だけ次の RESTORE 起動をロックし、成功画面を閉じた指の入力漏れを防止。
- HUD を `RESTORE READY · TAP BASE / HOLD TO LAUNCH` に変更。

## 維持

open-universe、FUEL、SERA/VOX/LUMA、MiniMap、Station、Ship、
RESTORE ritual 内容・コスト・1秒離陸は変更していない。
