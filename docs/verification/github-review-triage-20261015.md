# GitHubレビュー13件の再検証と運用変更 — 2026-10-15

監査開始のStaging mainは `b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2`。各修正は最新mainから影響単位ごとにPlanを固定し、実際のremote commitを取得して検証した。運用文書変更前のmainは `23932ecbd2c41d54be2b163ef6e524e29b3bb5be`。Productionは変更していない。

対象13件はすべて開始時に問題が残っていた。最終分類は **対応済み0／修正完了13／対応不要0／未解決0**。実機未確認や対象外の既存テスト不整合を、解消済みの証拠には使っていない。

## 13件の対応表

| 元の指摘 | 現行対象・再現 | 最終対応 |
| --- | --- | --- |
| #168 P1 非操作のresume待ち | Engineの待機フラグで操作による置換を妨げていた | #381、#385。非操作・既知の操作・由来不明の既存呼び出しを区別して再試行 |
| #168 P2 BGM再開意図 | 失敗前に再開対象を消していた | #381。再生成功または明示的な停止・無音化まで意図を保持 |
| #192 P2 対岸の遮蔽 | `works/pumpoko/` の地形下の果実を手前に描いていた | #382。失敗落下だけ既存の空間クリップを適用。現行20対岸でピクセル検査 |
| #203 P2 無音続行の表示 | 音声無効化後に表示・ARIAが古いまま | #382。既存label処理を直後に実行 |
| #179 P2① 旧snapshot | `works/pumpoko-01/` のstageDataが不足 | #383。Git履歴から再構築し既存hash項目も保持 |
| #179 P2② 到着fixture | 移動済みの畑より古い位置を使っていた | #383。現行ENDと承認済みカメラ実装に対して検査 |
| #179 P2③ Builder監査 | 意図的な更新を移行前bytesと比較していた | #383。除外せず承認済み `d536a7e` のBuilder bytesへ厳密に固定 |
| #204 P2 台帳登録 | 暫定fallbackのみで正式登録なし | #388。既存ID/path/titleをactiveとして登録し、登録の検査も修正 |
| #204 P2 評価の閲覧 | 保存した配列を表示する経路なし | #388。既存key/schemaのまま折りたたみ表示。過去データを移行・上書きしない |
| #208 P2 左右ボタン | pointer以外の操作を扱わなかった | #388。Enter/Space保持と支援技術click、解除・中断を検査 |
| #210 P2 接地の折り返し | softWaves/doubleBounceの半径offsetが折り返す | #388。末端の接線2点だけ修正。接地・速度・安定性を前後比較 |
| #295 P2 併用debug | Motion更新が上書きされ、パネルも重なる | #389。全更新を集約し、debug専用の縦積み表示へ |
| #379 P2 再現不能な記録 | 未保存commitを根拠とする12件の結果 | #390。到達可能な `e35f7d0` の独立再実行と正確な手順・個別結果を保存 |

元の対象13スレッドは、修正・検証・Staging反映の確認後に解決済みへ変更した。古いPRの再オープンは行っていない。`works/pumpoko-02/` のredirectは変更していない。

## 実行した検証と公開

- Engine：最終の4スイート159/159、Python Canary 3/3。pending/reject/初回preload、既存の引数なしunlock、タイマー、明示解除、古い要求の遅延完了と重複防止を検査。[元の修正](review-engine-audio-20261015.md)／[互換性の追補](review-engine-unlock-compat-20261015.md)。
- PUMPOKO：描画・無音UI・実Engineとの開始ボタン結合を含む9/9、socket描画13/13。追加の既存story動作4/4。物理・地形・作品の描画素材は維持。[記録](../../works/pumpoko/REVIEW-20261015.md)。
- PUMPOKO 01：全162/162。承認済みBuilder・journeyのbytesと過去の移行証拠を保持。[記録](../../works/pumpoko-01/REVIEW-20261015.md)。
- Feel Lab：作品・Lifecycle・Release Validator・案内を合わせ73/73。曲率、接地、速度、安定性、旧保存配列、入力中断を検査。[記録](../../works/pumpoko-feel-lab/REVIEW-20261015.md)。
- Touch Lab：全649/649。独立の実装レビューとcache/併用3/3も成功。[記録](../../works/sukima-3d-lab/DEBUG-REVIEW-20261015.md)。
- AmberTime：`e35f7d0e7edf395346d6503a84b723a4c094dc4a` に対して67/67、別担当のUI 12/12。現行とのモデル・保存・実行コード一致を確認。この12件は制御時計と模擬DOMによる検査であり、実ブラウザ12件とは呼ばない。[再現手順](../../works/ambertime/REVIEW-379-REPRODUCTION.md)。

採用した各修正PRでScope→Risk→Impact、必要なCIとtrusted target gateの成功を確認してからマージした。最終の配信確認：Engine #385 / run38719324641、PUMPOKO #386 / run38719774817、旧作 #383 / run38717525241、Feel #388 / run38720610209、Touch #389 / run38721205684、AmberTime #390 / run38721632231はすべてPages成功。EngineとPUMPOKOの公開ソースは検証済みGit bytesとの一致も確認した。

### 公開Chromeでの確認

- Feel Lab：修正前の09:59 UTCに保存した評価を修正後に閲覧。10:31 UTCに別評価を追加し、再読み込み後も新旧2件を表示できた。左右ボタンへのSpace/Enter操作も実行した。保持入力の物理結果は自動テストの証拠であり、実指の触感とは区別する。
- Touch併用fixture：MotionのPLAY→PAUSE（0.63s）→PLAY（0.98s）、Manipulationの値 -0.1500→-0.2500 radを両方確認。Reset/Reopen直後のリセットと、再表示後もパネルが2個であることを確認。実DOMの矩形は同じx1112/幅235、上の下端581.015625px、下の上端591.015625pxで10pxの間隔。desktopで重なりなし。通常一覧を開き、通常DOOR画面にdebugパネルがないことも確認した。
- 使用したcloud ChromeはWebGL 2非対応を表示したため、通常のGPU描画は未検証。iPhone/iPad、Safariの実際の音声出力、実指の触感、mobile縦横の実描画も未検証。成功を記録していない。

PUMPOKOの古いsnapshotに対するsource-byte検査には、開始時からの不整合が残る。goalは動作14件成功・旧byte検査1件失敗、Stage3にも旧finale基準のbyte検査失敗がある。広いstoryファイルの実行失敗も全件成功には数えず、実行できた選択動作4件と新しいexact-base保護を根拠とした。検査を無条件に除外・弱体化していない。

## 作業中の追加レビュー

- #381の引数なしunlock互換性、#384のタイマーからのunlock指摘は有効。#384は未マージで閉じ、#385の3状態の呼び出し区別と初回pending再試行で解消した。作品側の直接Start経路も#386で1行修正し、実Engineで再現・解消を確認した。
- #382 / r4281598790と#383 / r4281629364の「Lockと実装が同一commit」は誤検出。remote履歴の先行Lock専用commit（21fdfb52、b49eb2f）と後続実装（e454a88、175de3e）、変更されていないLock、trusted gate成功を照合し、対応不要とした。重大度ラベルから人間のToDoへ変換していない。
- Feel初回#387は古いLifecycle期待値により不合格となったため、未マージで閉じた。新しい事前Planで正式登録を検査する#388を作り、未知の作品のfallback検査も維持して73件を再実行した。

## #389のPlan補足説明の訂正（事後の監査記録）

[追加P2 r4281924898](https://github.com/SukimaStock/yumaniwa-town-staging/pull/389#discussion_r4281924898)は有効。`.change-plans/touch-debug-panels-20261015/r0.lock.json` の必須のStandard/WORK分類、9件の許可path、expectedChanges、node-syntax、work.runtime/work.regressionと実差分は一致していたが、任意のFull説明項目に別の観光協会の文章が残り、監査上の矛盾があった。元のLock digestは `06edb8f6c04e821b75035c3cfb55d28f25cb9ce4865e6ccf377f438acab48c10`。

元のLock・digest・履歴は変更しない。以下は今回の独立レビューを経た**事後の訂正**であり、正しい説明が実装前に存在していたとは扱わない。誤って記載された観光協会・20模型・stamp/map・audio等の検査をTouchの実行結果とは扱わない。

| 項目 | Touch修正についての正しい内容 |
| --- | --- |
| problem | 異なるrigid partのMotion/Manipulation併用時、更新handlerの上書きとabsoluteパネルの重なりが起きる |
| currentContract | SpecimenSessionは別partでの併用を許容。debugのみrender/toggle/resetで更新し、選択変更・戻る際に破棄する |
| whyExistingIsInsufficient | 単一handlerではMotionが古い状態になり、独立absolute配置は同じ座標を使う |
| design | 既存panel factoryをdebug-stackへ集約し全updateを実行。debug専用の有界scroll/flex縦配置。変更したapp/debug/CSSだけdate queryを更新 |
| migration / compatibility | 保存・schema・model・URL identityの移行なし。createDebugPanel、300モデル、共通Engine、描画、入力、物理、通常操作を維持。既存fixture APIも維持 |
| alternativesRejected | モデル/対応する挙動/通常操作の変更、片方だけの更新、個別の固定absolute座標 |
| boundaryCases | 併用、pause、手動変更、reset、clear/reopen、旧cacheと新URL。単独capabilityとmobile縦横は互換性の確認観点であり、新しいaggregate DOMケースを別途実行したとは主張しない |
| testPlan / evidence | 実SpecimenSessionと実factoryを使う併用DOMテスト、appの配線・破棄、cache graph、全649件、exact remote gates/CI、上記desktopブラウザ観測。geometry/Motion/300モデルは既存全suiteで保護 |
| promotionRisk / rollback | Stagingのみ。Production許可なし。必要時はdebug PRをrevertし、データ移行不要 |

## ToDoと自動化の反映

リポジトリ内にToDo登録の処理は見つからず、既存ChatGPT自動化「ToDoリストを更新」のpromptとPage接続に、GitHubを収集してチェックリストへ反映する経路を確認した。

同自動化のpromptに、現行コードでの検証、4分類、AIの短い対応提案、同じ候補の再通知抑制、人間のToDoの限定を反映し、保存結果を読み戻して照合した。時刻・scheduleは変更していない。定期処理のソース読取専用という既存の制約は維持し、コード変更・無人merge権限は追加していない。許可済み実装セッションでは技術調査・修正・PR・安全なStagingマージをAIが担当する。新しいbotや定期タスクは作っていない。次回の自動実行そのものはまだ観測していない。

Pageの技術レビュー6項目を、13件の実際の解消を確認してから完了の非チェック項目1件へ集約した。39→34 blocks、対象6個の旧blockがなくなり、他の項目はすべて保持されたことを読み戻して確認した。既存のiPhone BGM確認だけは未確認のまま、最新#385/#386へ参照を更新した。他の本人タスクや手動チェックは変更していない。

AGENTS.mdとOPERATIONS.mdにも同じ責任分担を明文化する。ルールをリポジトリに書いたことと、外部自動化の実際の設定変更を別々に確認した。追加の技術的な作業・修正方法の選択を本人へ求める事項はない。実機確認を代行したとは扱わず、Productionは別の明示的指示が必要。

## 運用文書の検査

既存Change Operations回帰10ファイルは197/197成功。実行コード、台帳、元のPlan Lockはこの文書PRで変更しない。exact candidate SHA、Scope→Risk→Impact、trusted static結果はこのPRの本文とCIへ記録する。CI成功を未観測の実機確認や正式なVERIFIED状態へ読み替えない。
