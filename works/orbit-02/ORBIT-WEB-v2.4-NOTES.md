# ORBIT Web v2.4 — HOME RESTORATION

v2.3.3 の進行・燃料・LUMA・MiniMap 基盤を固定したまま、原作由来で個別検証済みの HOME 表現を本体へ統合した版。

## 統合したもの

- **BASE / Station**
  - 緑の母天体と、その上空に残された人工ステーションを別オブジェクトとして描画。
  - Station は Lv1〜5 の原作 preset をベースに、検証版 v0.3 の調整（黒い損傷表現を避け、亀裂・停止モジュール・弱い非常灯で損傷を表現）を反映。
  - E.V.E. が話すと、Station 中心からリングへ淡い青い pulse が走る。
  - 着陸物理は既存 BASE planet をそのまま使い、進行・燃料バランスは変更していない。

- **Ship**
  - 原作 late ShipRenderer の orb 型 Lv1〜5 を復帰。
  - 検証版 v0.3 の outer rim 約24%細化、Lv1 の傷の読みやすさ調整を反映。
  - RESTORE level がそのまま Ship visual level になる。
  - Lv3 の円弧、Lv4 の窓十字、Lv5 の side nozzle を復帰。
  - Web版で採用した「指側にスラスターが出て、指から離れる方向へ進む」操作と directional plume は維持。

- **RESTORE Rituals**
  - instant repair を廃止。
  - Lv1→2: WAKE
  - Lv2→3: LINK
  - Lv3→4: MEMORY
  - Lv4→5: RESONANCE
  - それぞれ BASE 着陸中の短い tap で開始し、既存の1秒 hold takeoff と共存。
  - 承認済み `ORBIT-RESTORE-RITUALS-DEBUG-v0.8` を埋め込み用画面として使用。
  - ゲームオーバー・時間制限なし。最初の有効操作から始まり、成功後の E.V.E. 台詞を読んでから本体へ戻る。
  - 資源消費と RESTORE level 更新は ritual 成功後にのみ確定。

## Final REBIRTH

Echo 12/12 と RESTORE Lv5 が HOME で揃うと、従来 finale を以下の順に再構成。

1. 「……全部、繋がりました。」
2. E.V.E. / Echo of Vital Emotion.
3. 事故時に「あなた自身」を預かっていたことを明かす
4. 「……返します。」
5. **REBIRTH ritual**（中央を10秒保持）
6. E.V.E.「あなたの心は / また 動き出した。」
7. HOME に戻り「……おかえり。」
8. 次の離陸時「……いってらっしゃい。」

GAME CLEAR / 強制終了は追加していない。以後も宇宙を漂い続けられる。

## 変更していない基盤

- max speed / steering / inertia / gravity
- distance-based FUEL 消費
- FUEL 32 / 60 / 95 / 135 / 180
- RESTORE cost
- SERA / VOX / LUMA 配置
- LUMA relay range rule (v2.3.3)
- HOME checkpoint / save rule
- MiniMap / Faint Signal
- landing / 1 sec hold takeoff

## 検証

- `sketch.js`: `node --check` 通過。
- embedded ritual JS: `node --check` 通過。
- ZIP 展開テスト・CRC テストを実施。
- この環境ではブラウザの localhost / file URL 起動が管理制限で遮断されたため、実機タッチ操作と表示の最終確認は未実施。
