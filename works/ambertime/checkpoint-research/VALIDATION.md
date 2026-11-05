# H1-A2 検証記録

基準main: `0f22b025542ebb09abb464c632d998fbc88cac2c`。
Plan Lock: `.change-plans/ambertime-h1-a2/r0.lock.json`。
Plan digest: `8217e44fc702f7b354882c081197e31b259eeb1facb28eb3d2674761a6d018d9`。

## 研究実装の検証

- 新規研究テスト12件成功。操作境界から非空tailを実際に適用し、全状態・Mapの順序/キー型・global operationIndexを比較。
- 公開された製造・試飲・瓶詰め・価格・自家販売操作から生成した短い記録で、tailの各操作後状態を独立した公開操作の結果へ照合。
- 世代交代前後、担当者採用/依頼/実行/完了と委任中の途中蒸留、通常蒸留途中、試飲状態、旧v08保存を正式readerで移行したorigin付き保存、同prefix別suffixを試験。
- seed/origin/prefix不一致、index不一致、モデル失効、破損、tail欠落・改変を拒否。checkpointとhashを同時に作り直した場合の正当性は保証しない。由来contextを削って自己hashを作り直すと局所検査は通り得るが、後続recipe操作が失敗する負例も保持。
- 60か月の広域型では、既存の正式帳面関数と独立したH25抽出processをoracleとして、樽・仕込み・瓶詰め資料、発売・店別納品、歩み・世代詳細とraw歴史事実を比較。全再生とprefix collector＋tailも一致。
- 資料prefixはJSONへ分離したMaps/Setsと必要な補助資料であり、全操作のbefore/after snapshot列ではない。再開時のobserver呼出し件数がtail件数だけであることを確認。
- 資料prefixは最終対象保存に厳密にbindingする。別の将来へ中立なオンライン履歴cacheの成立は今回の証明に含めない。

新規テスト:

```sh
node --test works/ambertime/checkpoint-research/*.test.mjs
```

## 既存回帰

関連既存109件は108成功・1失敗。

```sh
node --test works/ambertime/chronicle-lab/*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*ledger*.test.mjs works/ambertime/tests/*history*.test.mjs
```

失敗は`r5-history-view.test.mjs`の固定ソースハッシュ検査。
期待値`c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5`に対し、実値`14b472590a731fa9a7fd17183f28af0cd107e6d9003f2b722e26a183179b5798`。
変更前の独立worktreeでも同じ失敗を再現。旧基準`7b138e2a`から今回基準`0f22b025`まで、対象shop-app・R5テスト・a1-source-baselineのGit差分は空である。期待値も本編も変更していない。この失敗を成功へ読み替えない。

## 長期検証と再現

H1-A1の正式保存12件を入力SHAと容量で照合して再利用する。保存再生成はしない。各条件で未変更の正式readerによる全復元・再保存1回、研究全再生と5方式の非空tail、context、資料、回想を照合する。

```sh
node --expose-gc works/ambertime/checkpoint-research/benchmark.mjs all /path/to/h1-a1/saves /new/scratch/h1-a2/results
node works/ambertime/checkpoint-research/summarize.mjs /new/scratch/h1-a2/results/results.json works/ambertime/checkpoint-research
```

条件ごとの完了JSONをatomic保存する。再開時はstatus、入力SHA、モデル・研究コード・既存の投影/回想依存コード・比較用JSONのfingerprintを検証し、一致した完了条件だけ再利用する。`.tmp`や失敗中の部分結果は完了aggregateへ含めない。scratch checkpointは既存内容と異なる場合に上書きせず停止する。

小条件の最初のlocal30年は実装smokeとして実施した。その後、依存fingerprint・純粋tail計測・既存H2-5境界照合を確定した最終コードで別の新規出力先に本計測する。smoke値を本計測へ混ぜない。既存H1-A1保存・結果は変更しない。

## 保証と未確認

正式状態は研究メタデータを除いたJSON全体で比較し、数値近似・乱数順序・IDの差を許容しない。研究checkpointは状態・context・全操作prefixを保持する。毎回の局所hash照合はprefixの独立完全再生や悪意ある改変の認証と同等ではない。

partialは正式全復元と研究全再生の後に同じprocessで測るwarm条件。material計測はpure tailの後であり、cold復元倍率は算出しない。元保存・比較状態・複数checkpointを保持するprocess peak RSSを、個別復元の実機必要メモリへ読み替えない。生成・局所検証・比較の負荷は結果の別列に残す。既存正式復元と同等の永続checkpoint信頼契約を実装した場合の性能値は不明。

3政策はseed42・単一銘柄のH2-4経路。複数seed/銘柄の長期分岐、旧originの長期運用、長期memory、50年後の再登場、全ての保留申し出・未処理判断・取引分岐を網羅するものではない。短い補助試験と長期実プレイ資料を区別する。iPhone Safari、DOM/worker転送/paint、quota、正式移行・圧縮・削除・本編reader接続は未確認または未実施。

本編・正式保存形式・経済・乱数・帳面UI・既存H2-4/H2-5/H1-A1資料・Productionは変更しない。H1-A3は提案のみ。ブラウザー入口を持たないオフライン研究のため、新しいLAB画面や作品identityは作らない。

Change Verificationの最終状態は`UNVERIFIED`を維持する。研究検証・CI・Stagingマージを作者実機確認や正式採用、Production公開承認として扱わない。
