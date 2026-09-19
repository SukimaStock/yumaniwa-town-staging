# ORBIT Web v2.5.1 — RESTORE TAP FIX

v2.5 の open-universe 設計はそのままに、BASE 着陸中の RESTORE 入力だけを修正。

## 症状

Lv1→2 の WAKE 後、次の RESTORE が READY 表示になっていても、
iPhone で通常のタップをした際に Lv2→3 の LINK が始まらないことがあった。

## 原因

BASE は同じジェスチャーを
- 短い入力 = RESTORE
- 1秒長押し = LAUNCH

として共用しているが、RESTORE 側だけ `0.34秒以内` という狭い判定だった。
そのため、見た目には普通のタップでも 0.34秒を少し超えると
RESTOREにもLAUNCHにもならない「入力の空白」が存在していた。

## 修正

- RESTORE の短押し上限を、LAUNCH の 1.0秒直前（0.92秒）まで拡張。
- タッチ開始時に RESTORE READY を `repairTapArmed` として保持。
- 1秒に達する前に指を離せば RESTORE。
- 1秒保持すれば従来どおり LAUNCH。
- 0.34〜1.0秒のデッドゾーンを撤去。

## 変更していないもの

- v2.5 open-universe 設計
- FUEL / ORE / DATA / Echo
- SERA / VOX / LUMA
- MiniMap
- Station / Ship visuals
- RESTORE Ritual の内容
- 1秒 hold takeoff の成立時間
