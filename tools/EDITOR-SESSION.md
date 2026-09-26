# Editor状態所有（Phase 2 / 3）

保存済みscene → 不変baseline → draft → runtime/view。
実装は `town-editor-session.js` とmainの明示的lifecycle呼出し。
第二registry、遅延baseline取得、定期同期、event busは使わない。

## 所有者

- canonical: ファイル読込後、Phase 1検証に成功した `TOWN_SCENE_MAPS`。
  初回起動の検証後にdeep freezeする。通常runtimeはdeep cloneしたsceneで動作する。
  ghost literalの既存scriptによる初期登録は検証前に行い、配置元は移動しない。
- session: 同時に一つ。`sceneId`、`baseline`、`draft`、`history`を所有する。
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

## Undo（Phase 3）

`session.history` のentryは `{generation, state}` 一形式。
stateは操作直前のprops / triggers / areaZones / fixedCollisionGridをdeep cloneしてfreezeする。
未知のnested metadataを保持し、baseline・player・UI選択・合成collision・矩形表現は含めない。
mainの `recordTownEditorHistory()` が唯一の操作記録入口。複製・削除・役割変更等の
複合操作も一回だけ呼び、propとtriggerを同じ時点へ戻す。
ドラッグは開始前にcaptureし、moveでは記録せず、完了時に一回だけ記録する。
close、選択切替、他操作、Undoによるgesture中断も完了処理を通す。

復元はsession APIの `undo()` 一つ。draftの4 fieldをsnapshotのdeep cloneに置換し、
mainが既存viewをdraftへ再bind、合成collision再計算、選択解除、UI/hint更新を行う。
canonicalへの同期やbaselineの再取得はない。
新sessionはhistory空。close/reopen/export/copyでは同じ履歴を保持する。
discard/endで破棄し、generation検査で旧sessionやdiscard前のsnapshotを拒否する。
履歴が残っていても意味比較でcleanになり得る。dirty判定は履歴を読まない。
型別復元、global editHistory、spatialの履歴fallback chainは削除した。redoは追加しない。

## Editor UI hook

mainのensurePartEditorFields / updatePartEditorSelectionUiから既知moduleの
`YUMANIWA_EDITOR_ACTION_UI.ensureFields()` / `updateSelection()` を直接呼ぶ。
field構築はDOMの存在確認で一度だけ。main関数の捕捉・再代入や動的hook登録は使わない。

## 残る境界

interaction予約やmovement/action wrapper、ghostのactivateTownTrigger wrapperはPhase 4。
今回それらの実装、destination、ghost配置、trigger.area schemaは変更していない。
全draft snapshot方式のため履歴の使用メモリは操作数とgrid面積に比例する。
履歴の上限やredo追加は今回行わない。

## 検証

```sh
node tests/test-editor-session.cjs
node tests/test-editor-history.cjs
python3 tests/test_editor_session_desk.py
python3 tests/test_scene_validation.py
```

最初のテストは実main/Editor/ghost/interactionコードをNode VMで動かす。
全canonicalをdeep freezeしstrict modeで書込み試行を例外化する。
DOM adapterは実ハンドラを動かすための最小controls/events実装で、描画E2Eではない。
Desk往復は一時ディレクトリだけへ書き込む。通常のテストはrepositoryを変更しない。
