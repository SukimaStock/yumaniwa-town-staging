# ORBIT Web v2.5 — OPEN UNIVERSE

v2.4 の Station / Ship / RESTORE Rituals 統合を維持しつつ、Phase 12 で強くなりすぎた「正しい航路」を解体し、ORBIT の根である **宇宙を漂う自由** を戻す版。

## 設計原則

**行ける場所を RESTORE で制限しない。RESTORE で増えるのは、その場所でできること／理解できること。**

RPG の「見えている場所へ歩いて行けるが、敵・鍵・イベント条件などでまだ攻略できない」という構造を ORBIT 向けに置き換えた。

- 宇宙そのもの：最初からかなり開いている
- SERA / VOX：遠くのものにも到達・着陸できる
- RESTORE：信号解析・採掘システムの対応範囲を広げる
- LUMA：進行レベルに関係なく給油できる。偶然の中継で遠くへ行く遊びを復帰
- FUEL：進路を指定する壁ではなく、そろそろ帰る判断を作る遠征時計

## 1. Procedural SERA / VOX を復帰

Phase 12 では procedural atlas が ASTRA / LUMA だけになり、SERA / VOX は固定リングのものが事実上の正解ルートになっていた。

v2.5 では sector atlas に再び以下を生成する。

- LUMA 20%
- VOX 26%
- SERA 6%
- ASTRA 48%

固定 SERA / VOX は削除せず、seed が悪くても進行不能にならない **保証ランドマーク** として残す。どの方向へ漂っても資源世界に出会えるため、固定地点だけを辿る必要はない。

Procedural SERA は 1 惑星 = DATA 1 + Echo 1。Procedural VOX は 12〜22 ORE の有限在庫。

## 2. RESTORE は「到達条件」ではなく「相互作用条件」

SERA / VOX には HOME からの距離に応じた interaction tier を持たせる。固定ランドマークは従来の requiredLevel を interaction tier として使う。

レベル不足でも：

- MiniMap に見える
- 実際に近づける
- 着陸できる

ただし：

- SERA: `SIGNAL UNREADABLE · RESTORE Lx`
- VOX: `EXTRACTION OFFLINE · RESTORE Lx`

となり、その場では DATA/Echo 解析または ORE 採掘ができない。

MiniMap では未対応の SERA / VOX を **中抜きの点** として描き、存在は隠さない。

## 3. FUEL を寄り道前提へ

FUEL 上限を以下へ変更。

- Lv1: 45
- Lv2: 70
- Lv3: 105
- Lv4: 145
- Lv5: 190

距離制消費 `4.23 / 1000`、速度・旋回・慣性は変更していない。

Lv1 でも次の interaction band を物理的に覗きに行ける余白を作り、1〜2回の進路変更や間違った星への寄り道が即失敗にならない方向へ戻した。

## 4. LUMA の進行制限を撤去

v2.3.3 の `LUMA RELAY · SIGNAL TOO WEAK` を撤去。

遠方の LUMA も最初から給油可能。LUMA を偶然つないで想定外の遠方へ行くことは、抜け道ではなく ORBIT の探索体験として扱う。

遠くへ行けても、SERA / VOX の interaction tier は別なので、RESTORE の意味は失われない。

## 5. 燃料切れでも「発見」は失わない

緊急帰還時：

- 未帰還 ORE：HOME checkpoint へ巻き戻るため失う
- DATA：維持
- Echo発見：維持
- 発見済み SERA：再取得不可

つまり、無茶な遠征で燃料を使い切っても「そこへ行って何かを見つけた」こと自体は消えない。

通常の永続保存地点が HOME であることは維持。緊急帰還後は、維持した DATA / Echo を HOME で即時保存する。

## 6. Faint Signal

Faint Signal は固定 SERA だけでなく procedural SERA も候補にする。

ただし RESTORE 不足で解析できない SERAを意図的に案内はしない。あくまで進行に戻りたい時の弱い手がかりであり、遠方の locked SERA 自体は自由探索で発見できる。

## 7. RESTORE Ritual 黒画面対策

v2.4 では iOS Safari で RESTORE 開始時に iframe 内 canvas が真っ暗になる実機報告があった。

原因候補だった `display:none` 状態で iframe 文書が初期 resize される構造を撤去。

- iframe は常に full-size layout を持つ
- 開始前は `visibility:hidden / opacity:0 / pointer-events:none`
- 子 ritual が `resize()` と初期化を終えた後 `orbit-ritual-ready` を送信
- 親は ready を受け取ってから表示・タッチ受付

承認済み Ritual v0.8 の見た目・難易度・コピー自体は変更していない。

## 維持したもの

- Web版の thruster-side 操作
- max speed 520 / steering assist / inertia / gravity
- landing / 1 sec hold takeoff
- Station Lv1〜5 visual
- Ship Lv1〜5 visual
- WAKE / LINK / MEMORY / RESONANCE / REBIRTH
- MiniMap の簡素な構成
- RESTORE cost 20/2 → 25/2 → 30/3 → 30/3
- Echo 12 の固定ストーリー順
- GAME CLEAR を置かず、完了後も漂流継続

## 次の実機確認

1. BASE で WAKE を開始して黒画面が解消したか
2. Lv1 で「目的地を知らずに」適当に漂っても VOX / SERA / LUMA に出会えるか
3. 間違った星へ1〜2回寄っても帰還が現実的か
4. Lv2以降の locked SERA / VOX を先に発見した時、「いつか戻りたい」と感じるか
5. LUMA をつないで遠出することが抜け道ではなく冒険として楽しいか
6. 燃料切れ後、OREだけを失い DATA / Echo が残ることが納得感につながるか
