# ORBIT Web v2.7 — HOME OPERATIONS TERMINAL

v2.6.x で繰り返し発生した `RESTORE READY` なのに修理へ進めない問題を、
タップ判定の修正ではなく、原作の HOME UX を復元することで解決。

## 原作から戻した構造

Codea原作では BASE 着陸時に StationUI が自動で開き、
`BASE OPERATIONS TERMINAL` から修理・アップグレードを行っていた。

つまり：

- 宇宙 = 漂う画面
- HOME = システムに接続する画面

が明確に分離されていた。

v2.7ではこの構造を復元する。

## BASE帰還

BASEへ着陸すると自動的に
`BASE OPERATIONS TERMINAL`
が開く。

CONTINUEでBASEから再開した場合、Emergency RescueでHOMEへ戻った場合も自動接続。

## Terminal

Windows 98風のsource-inspired window。

表示：
- SYSTEM LINK
- RESTORE level
- ECHO archive
- 次RESTOREに必要な ORE / DATA
- READY / WAITING / COMPLETE

READY時のみ `RESTORE SYSTEM` ボタン有効。

## RESTORE

`RESTORE SYSTEM`
→ classic confirmation dialog
→ YES
→ WAKE / LINK / MEMORY / RESONANCE ritual

宇宙画面のタップや長押しでは修理を開始しない。

Ritual完了後は、更新された状態でTerminalへ戻る。

## LAUNCH

Terminalが開いている間、離陸入力は完全に無効。

右上のXで明示的にDISCONNECTしたあと、
従来どおり1秒長押しでLAUNCH。

修理と離陸は完全に別操作・別文脈。

## 通常画面

BASE上に浮いていた以下の文字を削除：
- RESTORE x/5
- ECHO x/12
- RESTORE READY
- NEXT RESTORE
- HOLD TO LAUNCH

進行情報はHOME Terminalの中だけで確認する。

## 維持

- v2.6.1 visual scale / thin cockpit UI
- small Ship
- MiniMap
- flight / landing physics
- open-universe
- RESTORE costs / rituals
- Echo / E.V.E. / finale
- FUEL / ORE / DATA balance
