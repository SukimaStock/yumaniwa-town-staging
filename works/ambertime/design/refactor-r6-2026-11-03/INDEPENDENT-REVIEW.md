# R6 独立レビュー

対象: R5 main `2ff8aba1287f1e7aba7ceb902cfaef5df1c9dd79` → R6のtests/docs作業tree。実装担当とは別のagentが、新キャッシュ基準・新テスト・Canvasの実source・監査記録・総括・browser runnerを確認した。正式モデルの全面再監査や実機評価ではない。

## コード・基準の確認

- R5のGit objectを既存buildGraphへ直接渡して再構築し、固定fixtureの110ノード・各body hash・全edgeがdeepEqualで一致した。fixtureの生成元を現在の作業treeへ読み替えていない。
- 現在の110到達製品ファイルについても、Git R5原文とのbyte一致とgraph全体一致を独立に確認した。製品・URL・新描画loop・正式状態の複製は追加されていない。既存tests/fixture/過去資料の変更もない。
- 新しいキャッシュ検査は既存R0 reader/assertUpdatedGraphを再利用し、R0に存在しなかった4moduleの更新と親HTMLまでの伝播を保護する。Canvas/tools/worker/CSS/fontのnegative/positive topology試験もある。任意の将来loaderを完全解析するものとは主張していない。
- フォント再試行は実際のrenewSource関数をVMで実行し、CSSと同じTTFへのretry queryだけを確認している。新しいフォント・常時timerを導入しない。
- lifecycleテストは実CanvasScene constructor/methodを制御されたhostで実行し、RAF集約、最新view参照、font gate、hidden/suspended停止、3timeout取消と既存イベント接続を確認する。drawの全画素をこのVM試験で確認したとは扱わない。
- 監査・総括はCanvasと正式時計/rootの境界、既存root suspendのpause/save、短時間hideで残る演出timestamp、DPR専用watcherなし、map/market別経路を区別している。無理なscheduler抽出を避ける判断は今回の許可範囲に合う。

新11テストを独立に再実行: 11成功、失敗0、skip0。runnerのnode --checkも成功。製品不変であることから、停止条件/font順序/TOOL_GEOMETRY/modal優先/正式保存の回帰を生むruntime差分はない。

修正要求となるコード指摘はない。初回文書レビューでローカルのみの旧Lock commit `3e2529d4` が記載されていたため、remoteの実Lock commit `0fdddf66` にprovenanceを合わせるよう親へ伝えた。Lock本文とdigestは同一。

## Browserレビュー

runnerは同じ正式fixture、viewport/DPR/font/time/presentation phaseで両側を実行し、Canvas内部hash・画面のdecoded pixel・DOM/実hit/focus/ARIA・正式snapshot/save hashを比較する。後付けの画素許容差はない。hidden/page lifecycleは実OSやBFCache hitと明確に区別された合成イベントである。rootの既存pause/save効果を一律に禁止せず、前後差を比較する。

R6は製品body/URL不変のため、1時間cache試験は旧キャッシュの互換性確認である。bodyが変わった配信へのupgradeを成功扱いするものではない。取得されたbodyのみの照合と、同一bodyによるcache再利用の有効性を区別して記録する。

最終runner hash・両engine結果・証拠ファイルの整合は、完了後に追記する。現時点で未完了のmatrixを成功扱いしない。

最終8条件の証拠を独立照合した。416 captures / 208前後比較、全件decoded pixel差0・PNG bytes一致。8 capture JSONのSHA256/件数、runner原文のSHA256 `8e395dc01a33a40bf36f493fbaf06534c883c509b79512096587d703870bdf4b` と起動時hash/runnerUnchanged、記録された製品sourceのbefore/after hash一致、errors空を確認した。16 side別synthetic lifecycle記録、2engineのcache成功も整合。cache reloadのnetwork requestは各1件（HTML）で、不変の製品資産を再利用する今回の条件に合う。

`lever-middle` のtagはpointer操作中のsample名であり、capture直前のmouse移動により中間姿勢を保証しない。R6の3姿勢すべての画素証明とは扱わず、記録されたtoolsの実値と既存R2/R3のgeometry/pose検証を区別する。実OS背景・真のBFCache hit・物理iPhone/VoiceOverは未確認のまま。

上記の証拠範囲で修正要求となる指摘なし。最終commit/CI/公開確認は親が実際のSHAに対して別途記録する。

## 道具の補足比較と圧縮証拠

追加の `tests/r6-browser-tools.mjs` を独立レビューした。take前に実pointer captureを確認し、captured中はmouseを退避しない。0/24/36 CSSpx変位で、描画済みdatasetのleverStepが0/1/2であることをそれぞれassertしてから同じ正式状態を比較する。主matrixの`lever-middle` tagの限界を、別の実測で補っている。

補足8条件128 captures / 64比較は全件decoded pixel差0・PNG一致、errors空。16side全ての3姿勢、合計48captureでtools.leverStepの実値0/1/2を保存記録から独立再確認した。glass開始中/開始後/採取停止前/終了直後/終了後もsampleするが、終了後は既存modalによりtoolsが非表示になる現行条件を維持する。全animation frameの証明ではない。

主・補足合計544 captures / 272比較。補足runner SHA256 `1e962fb0d685b223618c4ca65c04251923ecf0da41dedb45e8cfea4e2336ee37`、node syntax、runnerUnchangedと製品provenanceを照合した。両matrixの16gzipファイル全てについて圧縮/展開SHA256、byte数、capture件数を再計算しresults metadataと一致した。圧縮は可逆な証拠保存のみで実行runnerの変更ではない。

補足を含め修正要求なし。主matrixのgesture tagに対する先の注意はそのまま有効であり、3姿勢の成功根拠はこの補足matrixである。
