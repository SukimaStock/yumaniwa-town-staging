# Map Factory → Cleaner → Map Editor：完成素材の新規登録

この入口は **stagingの作業branchに1素材ずつ追加**する。素材登録と配置は別操作。
正式な素材台帳は `data/world-objects.js`、配置の正本は各sceneの既存ファイルのまま。
FactoryのIndexedDB・Recipe・バックアップZIPを町へ接続する機能ではない。

## 操作手順（Pythonista / Working Copy）

1. Working CopyでstagingをPullし、作業branchを作成・Pushして同期する。mainでは保存できない。
   通常のPlan-first / Plan Lock / PR手順も引き続き必要。Deskはcommit/pushを行わない。
2. Map Factoryの素材カードの **PNG**、または構成の **Draft PNG** を保存する。
   Recipe JSONは構成の記録、バックアップZIPは素材庫の移動用。登録用object.jsonの代わりにはならない。
3. Yumaniwa CleanerでPNGを読み込み、必要な調整・TARGET/TOWN CANVAS確定を行う。
   **SAVE FINAL OBJECT** で完成PNGと同名の `.object.json` を保存する。
   WORLD OBJECT metadataを付ける場合は、既存 `yumaniwa-world-object/0.1` JSONをNEW/PASTEしてから画像を読み込む。
4. 更新した `tools/YumaniwaDesk.py` をPythonistaで開く。［案内］でstaging接続・選択branchの同期を確認する。
5. ［町］→ **完成PNG＋object.jsonを選ぶ**。最初にPNG、次に対応するJSONを選択する。
   Cleaner形式では町に採用する安定したobjectIdと表示名を明示する。既存IDは拒否される。
   既存素材の改名・置換は行わない。Factoryのtimestamp付きIDは使用せず、来歴に残す。
6. PNGプレビュー、入力実寸、logical/保存寸法、対象repository/branch、保存先、登録定義を確認する。
   詳細欄はスクロール可能。Editor初期サイズ・collision・finalization・来歴もここに表示する。
   **この素材を新規登録する** → 最終確認の **登録する** で初めて書き込む。キャンセルでは書き込まない。
7. **登録した作業コピーを配信している町**を再読込し、［開発］→［パーツ］の追加候補から素材を選ぶ。
   ローカル保存は公開stagingサイトに即時反映されない。ローカルHTTPで確認するか、通常のPR手順でstagingへ反映してから公開URLを再読込する。
   編集途中のsessionは自動更新しない。必要な差分を先にDeskへ適用するか、明示破棄してから再読込する。
8. ［追加］で配置し、既存の移動・複製・削除・Undoを使用する。
9. ［書き出す］→［変更差分をコピー］。Desk［町］の既存 **クリップボードの書き出しを確認** → 内容確認 → **反映する**。
10. 町を再読込し、素材と配置を確認する。Working Copyで差分を確認して通常のcommit/push/PRへ進む。

初回来訪案内が表示される場合は閉じてから［開発］を開く。

### PNGだけの場合

古いDot Cleanerや、WORLD OBJECT metadataを付けずに完成PNGを保存した場合は、
Deskの **PNGだけの場合：定義を入力する** を使う。
既存category・TARGETを選び、安定objectId・表示名・typeを入力して、同じ登録プレビューへ進む。
これは不足情報の明示入力。既存の不正JSONを無視するfallbackではない。

初期サイズはTARGETのlogical canvas / 16、collisionは明示的に無効、`pixelSafe`はfalse。
画像の補間・crop・パレット変更は行わない。PNGの寸法や整数ブロックがTARGETと合わなければ拒否し、Cleanerへ戻す。

## 受け渡しと保存

優先入力は既存 **`yumaniwa-world-object/0.1`**。`object` がidentity、
`finalization.output` が物理ファイル検証、`pixelStandard` がlogical契約を持つ。
Deskはこれを既存台帳の `id / category / type / src / finalization / editor` へ対応付ける。
元のsidecar全体は `cleanerMetadata` に監査用として保持する。runtimeが読む別台帳ではない。
`placementSnapshot` も保持するが、sceneへ適用しない。未知の来歴フィールドを捨てない。

既存台帳の1素材分と同形のJSONも受け付ける。別のschemaは新設しない。
`editor` がない場合だけ表示名を明示入力して生成する。ある場合は不正な値を補正せず拒否する。

| 項目 | 初版の規則 |
| --- | --- |
| objectId | `id`、英小文字で開始、英小文字・数字・`_`、2〜80文字、timestamp連続10桁以上不可 |
| 保存先 | categoryに対応する既存フォルダへ `<objectId>.png`。明示srcも同じ分類の直下だけ |
| Editor | 台帳の `editor` から既存候補生成。追加可能・表示名・有限order・logicalに合う初期w/h・collision必須 |
| 表示名 | 1〜100文字、既存EditorのHTML組立へ安全に渡すため`< > &`・制御文字は拒否 |
| 入力上限 | PNG 16 MiB・各辺2048px以内、JSON 1 MiB、静止PNGのみ |
| 1x PNG | 全体をdecode/検証し、bytesをそのまま保存 |
| 整数倍率PNG | 全RGBAブロック一致と縮約後の再拡大一致を確認した場合だけ既存lossless規格で1x化 |
| pixelSafe | 入力値を保持。検証を通すためtrueへ変更しない |
| collision | Scene契約で検査。画像外・負値・小数を保持し、0〜1制限や丸めはしない |
| 登録時の変更 | PNG新規作成、world-objectsへの1定義追加、indexの該当script fingerprintのみ |
| 配置時の変更 | 既存Editor diff → Desk source/before/hash/Scene検証 → 配置source/cache更新 |

保存先はfurniture / light / greenery / sign / street_furniture / facility / shopを既存objects分類へ、
exhibitを既存leisure-center propsへ、npcを既存station-plaza propsへ対応させる。
既存素材の分類・ID・寸法は修正しない。

## 安全性

計画中は読取りだけ。確定後にstaging identity・安全session・branch/revision・読んだsourceのhashを再確認し、
入力snapshotから計画を再生成して照合する。選択後の元ファイルはメモリ内snapshotとして扱う。取り直す場合は再選択する。
入力JSONをコードとして実行しない。重複JSON key・非有限数・prototype汚染keyも拒否する。

objectId / catalogKey / 保存先の衝突、絶対path・`..`・symlink経由の逸脱は拒否。
PNGはexclusive createし、遅れて現れた別ファイルも上書き・削除しない。
既存transactionへ新規PNGの所有情報を加え、書込み・読戻し・transaction完了失敗時に台帳/cacheを復元しPNGを削除する。
直前のDesk Undo情報も失敗前へ戻す。Deskの直前更新Undoでは、新規PNGも除去する。
既存と同様、OS全体の排他lockや停電・強制終了に対するjournalは導入していない。

## ローカル確認とテスト

作業branchのrootを配信する例（Pythonista用Desk自体はLinuxで起動しない）:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/?dev=1
```

ブラウザー検証は一時stagingコピーを作り、実際のDesk関数・transactionで登録し、
ChromiumのEditor controlsで追加・移動・Undo・複製・削除・差分出力する。
その差分を実際のDesk applyメソッドへ渡し、再読込後の配置・画像寸法を照合する。
Pythonistaのdialogs/Viewだけを置き換えるため、**Desk UIの実機確認とは別**。
外部通信は遮断する。検証用素材・配置は実際の町に残さない。

```sh
python3 -B -m unittest discover -s tests -p 'test_*.py'
node --test tests/test-change-*.cjs tests/test-editor-*.cjs tests/test-release-validator.cjs tests/test-town-*.cjs tests/test-work-guide.cjs
# Pillow、Playwright、Chromiumが必要
node tests/map-asset-browser.cjs
# 別のPlaywright配置を使う場合: PLAYWRIGHT_MODULE=/absolute/path/to/playwright
```

実出力の検証は `MAP_CLEANER_PNG` / `MAP_CLEANER_JSON` にローカルファイルを指定して同じbrowser testを実行できる。
一時検証で採用するIDは `fixture_planter_01` に明示固定し、元のidentityは来歴へ保持する。
テストは出力先ディレクトリを表示し、プレビューJSON・export・スクリーンショット・結果を残す。

## 2026-10-03の原典確認と未確認境界

- current main開始値: `c66008b0720d29b2a2f340ba7bc6e7780d52e75b`。開始時はclean、open PRなし。
- Map Factory SYSTEM/app、Artifact、Pixel、Scene、Editor Session契約と既存metadata候補生成を確認。
- Drive `SukimaStock/Code/Cleaner/yumaniwa-cleaner.txt` と実sidecarで既存schemaを確認。
- 提供PNGは168×168、metadataはlogical 56×56、3xからのlossless一致を確認。
  PNG末尾1790337173とJSON末尾1790336756は異なるため、同時出力ペアの証明とはしない。
- Pythonistaファイルピッカー・プレビュー・確認dialog、Working Copy File Providerの実動作、iPhone/iPad実機は **UNVERIFIED**。
- Cleanerのコードと出力は読取り確認。Codea内での画像処理・SAVE FINAL OBJECT操作をこの環境で実行したとは扱わない。
- `CHANGE-VERIFICATION.md` に従い、final verificationStateは **UNVERIFIED**。観測したテスト結果はPRにexact headと分けて記録する。

### 今回の観測結果

- Python回帰: 57件PASS（登録15件を含む）。Node関連回帰: 215件PASS。
- Chromium 134.0.6998.35: fixtureおよび提供Cleaner出力を一時repositoryへ登録し、Editor操作→実Desk apply→再読込に成功。page errorは0件。
- 提供PNGは時計展示、sidecarはDotWeather展示identity。画像とidentityの意味的一致は未確認であり、採用前プレビューで利用者が確認する。testでは明示した新規IDへだけ登録した。
- Scope → Risk → Impact はPASS。required checksの結果・exact headはDraft PRに記録する。
- Pythonista UI起動コマンド `python3 -B tools/YumaniwaDesk.py` は失敗（想定環境外）。
  `ModuleNotFoundError: No module named 'ui'` → `RuntimeError: このアプリは Pythonista で実行してください。`
- 初回 `git clone` は `Failed to connect to browser-proxy port 8889 ... Couldn't connect to server`。
  承認されたsandbox外実行で取得に成功。
- sandbox内のNode全件実行は26 file suite中18成功/8失敗。Git subprocessの`spawnSync git EPERM`、
  ローカルlistenの`Error: listen EPERM: operation not permitted 127.0.0.1`を観測。
  必要な関連215件はsandbox外で再実行してPASS。無関係なEngine browser suiteは成功扱いにしない。
- 既設PlaywrightのChromium 1234取得は`Error: End of central directory record signature not found. Either not a zip file, or file is truncated.`で失敗。
  一時ディレクトリのPlaywright 1.51.1 / Chromium 1161へ切替。
  sandbox内起動も`FATAL:sandbox_host_linux.cc(41) ... shutdown: Operation not permitted (1)`で失敗したため、承認されたsandbox外で実ブラウザー確認を実施。
- テスト作成中の失敗: `parts`ではなく既存select値は`props`、初回案内はload後900msなので閉じてからEditorを開く、scene変数は`currentScene`。
  いずれも検証スクリプトを修正し、町runtimeを変更せず再実行。再読込スクリーンショットはloading終了後に取得。
- Linux検証環境には日本語フォントがなく、画面の日本語字形は未確認。候補名は実selectのtextContentで一致確認。Pythonista/iOSの字形・配置は実機確認が必要。


### CI依存の補足

初回Draft PR #136の通常CIは `ModuleNotFoundError: No module named 'PIL'` で失敗した。
ローカル57件のPASSとrequired checks成功を、そのCIの成功に読み替えない。
固定Plan外のworkflow変更が必要だったため、mainから新しいv2 Plan/branchへ作り直した。
`.github/workflows/change-operations-tests.yml` は一時venvに **Pillow==11.3.0** を導入し、
既存の全Python unittest discoveryをその環境で実行する。testをskipせず、ゲートやregistryは変更しない。
同じ手順で手元でも確認できる:

```sh
python3 -m venv /tmp/yumaniwa-desk-tests
/tmp/yumaniwa-desk-tests/bin/python -m pip install Pillow==11.3.0
/tmp/yumaniwa-desk-tests/bin/python -B -m unittest discover -s tests -p 'test_*.py'
```
