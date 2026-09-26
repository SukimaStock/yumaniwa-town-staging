# Scene 永続化データ契約（Phase 1）

この契約は `town-scene-validation.js` の `validateSceneData` と
`tools/YumaniwaDesk.py` の `validate_scene_data` が実装する。
両者は入力を変更せず `{ok, errors}` を返す。Pythonista は JavaScript を実行しない。
規則変更時は `tests/scene-validation-cases.json` を追加し、両実装を同時に更新する。

## 共通規則

| 対象 | 規則 |
| --- | --- |
| 数値 | 有限な数値。文字列・boolean・nullから変換しない |
| mapWidth / mapHeight | 正の整数 |
| props / triggers / areaZones | 配列。各要素のidは空白で始終しない非空文字列で、同じ配列内で一意 |
| prop placement | x/yは有限数、w/hは有限数かつ正。負座標、小数、画像のmap外への張り出しを許可。旧Deskの根拠のない絶対値256制限は撤去 |
| footY | 存在する場合は有限数。明示値を変更しない |
| prop画像 | objectIdがWORLD OBJECT台帳に存在し、その定義に非空srcがあること。placementのsrcはnull/空文字でも禁止 |
| prop相対矩形 | collision / interaction / tapは、存在する場合、有限x/yと正のw/h。画像外へ伸びる値を許可し、0〜1に制限しない |
| enabled | 存在する場合はboolean。tap=false / tap={enabled:false}は既存の無効化形式として許可 |
| linked trigger | interaction.enabledがfalseでなければ、有効なtriggerIdと同一scene内の参照先が必要。enabled=falseは非リンク状態で、Editorのrole=noneが残す旧IDを許可する |
| trigger.area / areaZone.area | 有限x/yと正のw/hを持つ矩形、全体がmap内。小数を許可 |
| fixed collision | passableRects / blockedRects / blockedPointsは配列。矩形のx/y/w/hと点のx/yは整数。矩形は正のサイズで全体がmap内、点は0以上・map寸法未満 |

未知の付加メタデータは削除しない。相対collisionはfixed collisionではない。
現在の6sceneには小数placement・負のplacement座標・画像外へ伸びる相対collisionがある。
テストでは現行全sceneをそのまま読み、明示footYとobjectId-only placementを含め、
validation前後に変更がないことも確認する。

## 境界

- **runtime**: 既存 `validateTownSceneDefinition` が共通validatorを呼ぶ。
  title/background、spawn、groundRects、edgeWarpとscene routing等は既存runtime検証に残す。
  補正wrapper、load後処理、fallbackは追加しない。indexではvalidatorをmainより先に読み込む。
- **Desk**: scene/source対応、操作ID、before一致を確認し、全操作をメモリ上の候補sourceへ適用する。
  その後に候補scene全体を読み戻して共通契約を検証する。
  propとtriggerの同時追加、参照先と参照元の同時変更は最終状態で判定する。
  検証に失敗した場合、計画を返さずrepositoryへ書き込まない。
- **書込み直前**: staging identityと計画作成時のsource hashを再確認する。
  書換対象だけでなく検証で読んだWORLD OBJECT台帳・ghost・scene sourceも照合する。
  既存のtransaction/rollbackを維持する。OSレベルの排他ロックの導入は本Phaseに含めない。

## sourceとbefore

- station_plaza: `data/station-plaza.js`
- 非station: `data/town-maps.js` の該当scene
- stationの既存ghost prop/triggerのみ: `town-ghost-npc.js` の既存literal
- objectId台帳: `data/world-objects.js`

Deskは既存の安全なliteral parserで読む。source中の関数は実行しない。
ghost literalは既存scriptで検証前に初期登録する。Deskは同じliteralを候補sceneに含める。
Phase 2以降、会話文はactivation payloadで扱い、scene/draftを書き換えない。
重複するghost所有元を新設した場合は、Deskは重複IDとして拒否する。

propのbefore比較では既存の永続化projectionを維持する
（runtime補完triggerArea、および該当shopの補完catalogKeyを除外）。
それ以外は型を含めて比較する。数値1と1.0は同値、trueと1は別値。
collision.beforeは既存のセル意味比較を維持し、矩形分割の違いを許可する。
この比較でも数値文字列・booleanを整数として受け付けない。
collision.afterの指定フィールドは配列が必須で、null等を空配列に補正しない。
未指定のcollision.afterフィールドを保つ既存部分更新は維持する。

## 回帰テスト

```sh
python3 tests/test_scene_validation.py
node --check town-scene-validation.js
node --check main.js
```

Nodeはテスト実行環境だけで必要。実際のruntime関数をVMで読み込み、
現行6scene、共通positive/negative fixtureの判定・エラー一致、
Desk候補計画、before、source、hash、identity、非書込みを検証する。
roundtripは一時ディレクトリにのみ書込み、実runtimeで読み直す。
ブラウザ描画・Pythonista UI操作のE2Eテストではない。

Phase 1はvalidation境界を扱う。Phase 2のsession/baseline/draft/export所有関係は
[EDITOR-SESSION.md](EDITOR-SESSION.md)を参照。Undo形式、interaction状態、
triggerAreaの永続化schema移行は後続Phaseの対象。
