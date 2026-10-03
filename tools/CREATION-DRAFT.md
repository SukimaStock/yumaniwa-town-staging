# 制作下書き v1（staging専用）

PNGを街へ読み込み、未登録のまま位置・縦横比固定サイズ・足元線を決め、選んだ素材と配置をDeskでまとめて正式化する。正式scene、正式Editor session、制作下書きは別owner。仮素材をWORLD OBJECTやdraft.propsへ入れない。

## 使う順序

1. この機能branchの作業コピーを起動し、「開発」→「PNGを持ち込む」。PNGだけでよい。順番に複数PNGを追加できる。
2. 「未登録下書き」へ操作対象を切り替え、素材を選んでドラッグ／1pxボタン／拡大縮小／足元線上下で調整する。「正式編集」へ戻すと既存Editorを使える。Undoは別々。
3. 「枠・パネルを隠して歩く」で比較する。未登録表示は残る。素材の表示切替・個別削除で調整値や正式編集は変わらない。
4. 「下書きZIPを保存」→「ZIPをファイルへ保存」。iPhoneは保存先を「ファイル」に選ぶ。保存の完了を自分で確認してから「ファイル保存完了を確認」。開始・キャンセルだけでは保存済みにしない。
5. 再読込後、同じsceneで「下書きZIPを再開」。既存の作業がある場合は先にZIPと正式diffを保存し、明示破棄する。復元は混合・上書きしない。復元前のUndo履歴は保存しない。復元後の操作からUndoが効く。
6. 残す素材を選び「この試し置きを採用分に含める」。必要な数だけ指定し、「採用分をDeskへ渡す」からZIPを「ファイル」へ保存する。採用分書出しは下書き全体の保存済み状態を更新しない。
7. **採用用の新しいstaging作業branchと実装前Plan Lockを準備し、最初のcommitにLockを登録して同名origin branchへ同期する。** Planは素材PNG、data/world-objects.js、配置scene（駅前ならdata/station-plaza.js、ほかはdata/town-maps.js）、含まれる正式編集のsource、index.htmlのcacheをallowedPathsに明示する。登録と配置を同じPlan・PRに含める。index.htmlを含む既存SYSTEM / Full / HQ基準も維持する。
8. そのbranchのDeskで「町」→「制作下書き／Desk採用分ZIPを確認」。表示名・分類・正式objectId・既存logical TARGETを素材ごとに確定し、採用用Lockのpathを指定する。
9. PNG、論理サイズ・処理、scene座標・配置サイズ・足元線、仮配置→正式ID対応、正式diff、repository／branch／予定ファイルを確認してから「適用」。読込・計画作成では書き込まない。
10. 作業コピーの町を再読込し確認。元の座標やサイズの再入力は不要。Working Copyで差分→Commit→Push→Draft PR。公開stagingはPRのmerge後に更新される。

DeskはGit操作を行わない。既存identity／branch同期確認と明示適用に加え、採用用r0 Lockのdigest・scope・分類と読込後のsource hashを照合する。Lockが最初のcommitに登録済みであることは既存のWorking Copy確認で確認する。Git非公開のFile Providerではbranch／同期の確認は手動申告のまま。PRのimmutable Lock／trusted base gateを置き換えない。

## パッケージと保存対象

stored-entry ZIPのみ。`manifest.json`（format `yumaniwa-creation-draft`, version 1）と`images/<assetKey>.png`。仮素材・仮配置・下書きはランダム128bit key。ファイル名を対応キーにしない。元PNGのバイト列とSHA-256を保存し、canvas再出力しない。選択書出しと全保存は同じ構造・reader。

manifestはscene tile座標（1 tile = 16 world px）、map寸法、関係する4つのsourceのSHA-256、画像寸法・hash・任意metadata、仮配置、採用対象を持つ。正式sessionが同じsceneに存在するときは、不変baseline・検証済みsnapshot・既存安全diffを`formal`区画へ保存する。全sceneの古いsnapshotで最新sceneを上書きしない。Deskは正式diffのbeforeとsnapshotを照合し、差分だけを既存patcherで適用する。

関連sourceはstation-plaza.js／town-maps.js／town-ghost-npc.js／world-objects.js。無関係なHEAD差のみでは拒否しない。初版は関係file内の変更を保守的に拒否する（同じfileの別sceneやコメント変更も再確認対象）。汎用的な自動マージは行わない。

1枚16 MiB・各辺2048px・16素材／配置・PNG合計64 MiB・展開画素合計16 Mpx・manifest 1 MiB・metadata 64 KiB。Undoの画像もメモリ上限に含む。履歴は最大50操作。初期表示で縦横いずれかが1 world px未満になる極端な縦横比は、表示できない理由を出して読込を拒否し、元の作業を保持する。ZIP外path、外部画像URL、圧縮entry、余分／重複entry、異常サイズ、CRC／hash不一致、APNG、非有限座標、縦横比不一致を拒否する。入力失敗・キャンセルでは既存作業を置き換えない。

## 描画・サイズ・足元

既存`drawPlacementImage`を正式propsと下書きで共有し、同じ座標丸め、nearest描画、footY sortとプレイヤー描画を使う。未登録画像はrenderer cache／load traceへ入れない。選択枠だけoverlay。カメラ・画面サイズを保存座標に使わない。

PNG物理寸法と今回の配置サイズを区別し、論理サイズ／基準倍率／pixelSafeは未検証と表示する。任意Cleaner metadataは原文相当のJSONで保持する。pixelSafeを推測でtrueにしない。Cleaner原典（Drive SukimaStock/Code/Cleaner/yumaniwa-cleaner.txt、2026-10-03）とPixel Standardに従い、`finalization.target.groundAnchorY`は0-based最終画素行。明示的な「Cleaner足元行を使用」で`footY = y + h * (groundAnchorY + 1) / logicalHeight`へ対応付ける。古いplacementSnapshotは来歴だけで、配置に使わない。

拡縮は足元線中央を固定し、位置移動は足元も移動、足元線だけ変更すると画像は移動しない。境界を越える拡縮は拒否する。

Deskでは既存TARGETと可逆integer block検証を使う。1xは元のバイト列、均一3xなどはlossless 1x collapse。原PNGは元ZIPと確認計画内に残す。PNGのみの登録はpixelSafe=falseのまま。画像の縦横比・余白が変わらなければw/h/footYをそのまま引き継ぐ。TARGETへ不可逆縮小・crop・余白変更が必要な画像は理由を表示して拒否し、元ZIPを保持する。配置サイズを素材全体の標準値へ昇格しない。

正式propsにはid・objectId・x/y/w/h/footYと無効collisionだけを変換する。src・自由metadata・リンクを流し込まない。正式placement IDは下書きkeyと配置keyから決定的に生成し、素材の最小来歴情報と組み合わせて二重取込みを拒否する。同じ位置であるだけで上書きしない。正式素材と配置がある場合、同じ来歴・placement IDの未登録描画は除外する。

## 状態と検証

パネルを閉じる・表示を隠す・別sceneへ移動しても下書きownerは残る。他sceneへ表示・移動しない。別sceneの新規下書きで置き換えない。正式draftのscene移動保護は変更しない。再読込／タブ終了で一時下書きは消えるため、パネルとプレビューバッジに明示する。自動保存・共有・アップロードはなし。ZIP保存のキャンセルは作業を残す。

- `node tests/test-creation-draft.cjs`: 実session／ZIP／下書きの独立状態、正式diff保持、復元、境界・CRC・source拒否。
- `CANVAS_MODULE=<@napi-rs/canvas module> node tests/test-creation-draft.cjs --render-roundtrip`: 実renderer＋native canvas＋実Deskの往復。プレイヤーは描画順比較用マーカーで、キャラクター実表示のブラウザー確認とは別。
- `python3 -B tests/test_creation_draft.py`: 一時コピーの複数登録＋配置、正式diff、Plan、ID／二重取込み、stale source、途中失敗、Undo。
- `PLAYWRIGHT_MODULE=<playwright module> CHROMIUM_EXECUTABLE=<optional chrome path> node tests/creation-draft-browser.cjs`: 一時作業コピーでファイルUI・ZIP download／reload・Desk apply・描画比較。物理実機ではない。

iPhone／iPad・Pythonista実機は別確認。PNG2枚→操作→足元線→歩行→FilesへのZIP保存→reload後ZIP復元→採用ZIPをDeskで選択→確認／キャンセル→採用用branch/Lockで適用、を確認する。横画面・縦画面、ファイル選択キャンセル、保存画面キャンセルでも値が消えないことを確認する。未観測の実機確認をPASSにしない。
