# Editor状態所有（Phase 2）

保存済みscene → 不変baseline → draft → runtime/view。
実装は `town-editor-session.js` とmainの明示的lifecycle呼出し。
第二registry、遅延baseline取得、定期同期、event busは使わない。

## 所有者

- canonical: ファイル読込後、Phase 1検証に成功した `TOWN_SCENE_MAPS`。
  初回起動の検証後にdeep freezeする。通常runtimeはdeep cloneしたsceneで動作する。
  ghost literalの既存scriptによる初期登録は検証前に行い、配置元は移動しない。
- session: 同時に一つ。`sceneId`、`baseline`、`draft`を所有する。
- baseline: canonicalから同期deep clone。内容と参照をfreezeし、session中は更新しない。
- draft: baselineと独立したdeep clone。props / triggers / areaZonesとfixedCollisionGridを所有。
  fixed collisionの編集可能なrectanglesは持たない。出力時のみ生成する。
- view: activeTownSceneDef / triggers / areaZones / baseCollisionGridはdraftの直接参照。
  collisionGridは従来どおり固定grid＋part collision＋edgeWarpの派生値。
  globalからcanonicalに戻す処理はない。
- 会話: ghostの選択台詞はactivation引数の一時payloadへ渡す。保存対象triggerを変更しない。
- metadata: 読取用defaultは `getTownPartMetadataView()` の戻り値だけ。draftに補完しない。

## Lifecycle

| 操作 | 結果 |
| --- | --- |
| 初回open | 保存済みcanonicalを検証しbaseline/draftを同期生成。runtimeから取得しない |
| close | sessionとpreviewを維持。移動予約だけ既存cancel処理で解除 |
| 同じsceneで再open | 同じsession/baseline/draftを再利用 |
| export / copy | baseline/draft不変。copy済み表示は保存済みを意味しない |
| 明示discard | baselineからdraftを作り直して参照を再bind。既存Undo/選択を破棄 |
| 別town sceneへ移動 | dirtyなら拒否。cleanならEditorを閉じsessionと旧Undoを終了 |
| 作品・menu等 | sessionを終了しない。同じtownへ戻る時はdraftを再利用 |

`editorHasUnsavedChanges` はsessionの意味比較を返すgetter。
独立dirtyフラグはない。gridセル、ID単位のprops/triggers、areaZones、保存fieldを比較する。
キー順だけの違いは無視し、値を完全に戻すとcleanになる。
copy済み表示用フラグはUI情報であり、dirty判定の正本ではない。

## Diffと保存field

`YUMANIWA_EDITOR_BUILD_DIFF` はsafe-exportの一つだけ。
comment-exportの別baseline・template merge・global wrapperは削除した。
全draftの永続化表現がPhase 1 validatorを通る場合だけdiffを返す。
trigger.areaが永続化された範囲の所有者。prop.triggerArea bridge/template cacheは作らない。
ID変更、役割変更、複製はdraft内のtriggerを直接編集する。
未知のnested metadataはdeep clone・編集時のfield保持で残す。
fixed collisionが無変更なら元の矩形表現も保持する。
将来、固定矩形に未知のannotationが追加された場合、grid変更後のexportは明示的な変換規則が
できるまで拒否する。矩形分割・結合でannotationを黙って消さないため。

## Undo境界と未実施

既存のgrid / townState / triggers / props / areaZonesという履歴形式は残す。
復元先をdraftの配列/gridへ固定し、配列参照を維持して復元する。
townStateのtrigger template/managed IDコピーは不要になったため除去。
新session・discard・scene離脱で旧履歴を終了し、別sceneへ適用させない。
履歴形式・gesture単位・redo等の統合はPhase 3。interaction予約やwrapperの整理はPhase 4。

## 検証

```sh
node tests/test-editor-session.cjs
python3 tests/test_editor_session_desk.py
python3 tests/test_scene_validation.py
```

最初のテストは実main/Editor/ghost/interactionコードをNode VMで動かす。
全canonicalをdeep freezeしstrict modeで書込み試行を例外化する。
DOM adapterは実ハンドラを動かすための最小controls/events実装で、描画E2Eではない。
Desk往復は一時ディレクトリだけへ書き込む。通常のテストはrepositoryを変更しない。
