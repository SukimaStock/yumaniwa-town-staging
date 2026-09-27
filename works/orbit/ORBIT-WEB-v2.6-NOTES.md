# ORBIT Web v2.6 — SOURCE UI / EMPTY CENTER

v2.5.4 の gameplay / progression / physics / save / open-universe は変更せず、
通常飛行画面の情報密度だけを原作 Codea 版の UI/UX 原則へ戻す比較版。

## 原則

- 左上 = FUEL
- 右上 = ORE / DATA
- 左下 = SYSTEM / E.V.E. console
- 右下 = MiniMap
- 中央 = 宇宙

「情報を削除する」のではなく、
「常時意識させる情報を減らし、四隅へ退避させる」。

## 変更

### Persistent bottom strip removed
旧：
- FUEL / ORE / DATA
- RESTORE / ECHO
を画面下中央に常時表示。

新：
- FUELは左上の細いバーへ
- ORE / DATAは右上へ
- RESTORE / ECHOは通常飛行では非表示

### RESTORE / ECHO
進行情報は消していない。
BASE着陸中のみ、MiniMap / console の上の低い位置に小さく表示。

### E.V.E.
全幅の会話パネルを廃止。
原作の console / toast に近い小さな左下ログへ変更。
最新行は明るく、古い行は薄く残る。
Echo memory / Finale / Ritual は従来通り前面表示。

### MiniMap
機能・サイズ思想は維持。
persistent bottom strip が消えたため、右下 y=14 へ戻した。

### SAVED
常設行を使わず、FUEL下に短時間だけ表示。

## 変更していないもの

- Ship / Station / planet visual size
- MiniMap content / range
- Faint Signal
- FUEL capacity / consumption
- ORE / DATA / Echo economy
- RESTORE costs / Rituals
- LUMA / SERA / VOX
- landing / takeoff
- save / rescue
- story / finale
