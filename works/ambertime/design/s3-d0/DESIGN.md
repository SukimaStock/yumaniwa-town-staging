# S3-D0 — 個別記録を失わない保持方式の比較

## 結論 / 2026-11-07

D1候補は **B：順序・プロパティを保持するcanonical履歴表現**。最初は町のevents/attemptsを対象とし、旧状態へ厳密に復元できる独立実験に限定する。Aの現在状態と履歴の分離は長期的に必要だが、現状では古いevents・shipmentsも将来計算の入力であり、D1で同時に実行モデルを変更しない。Cのcheckpointと分割永続化は今回は採用しない。

これは正式導入承認でも100年保存成功でもない。**S3は未完了**。現行reader/writer/validator、上限、ゲーム、UIは変更していない。新しい保存表現が小さくても現行の完全状態上限を超える問題は残る。D1実装は作者判断待ち。

## 根拠と範囲

基準main: `5191c22a6ca82737c650477bbafbf15365e85820` (#854)。#805、#806、#807、#810、#811、#812、#853、#854は確認時merged。#840はopen Draft、head `187cd9eb9621747f8a5063209a02194495d24f16`。#840の信頼方針は参考であり正式採用ではない。Plan Lockは `.change-plans/ambertime-s3-d0-design/r0.lock.json`。既存資料は `save-audit/DEPENDENCIES.md`、`reputation-dedup-research/DEPENDENCIES.md`、`design/s3-r0-capacity/REPORT.md` と各checkpoint研究を再利用した。v8が現行形式であり、古い文書のv6記述を現行仕様としない。

既存fixtureのみを使用し、100年再シミュレーションは行わなかった。

- アーカイブSHA256: `aa148020a3e3223b5608ec2be409d49b519ffabc165e4ac72d2160b333db4877`
- wide-1200.research.json全体SHA256: `ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4`
- JSON.stringify(fixture.game) SHA256: `b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55`

最後の値は依頼された元ゲームSHAと完全一致する。アーカイブ、session付帯情報を含むenvelope、game単体は異なる対象なのでSHAも異なる。巨大fixtureはコミットしない。

## 境界

現在状態には資金・在庫・樽・発売回・契約・販売実績、RNG、seen、pending、packets、nodes等を維持する。歴史には全events・全attemptsを個別に保持する。arrivalsはevents上の順序付き到達参照として再生可能だが、現在C保存ですでに本文重複は省かれている。新しい削減として二重計上しない。

索引は正本ではない。イベントID、元のordinal、sourceId、release/store/receipt ID、世代境界とappend位置を保持する。索引が壊れたら正本から再構築可能かを検証し、events自体が欠落した場合は索引で復旧したことにしない。Aへの将来移行では全件数とordinal lookupを提供し、最近12か月のrumor窓、過去bar証拠、回想の祖先参照を維持する必要がある。

Bは同じ順序のプロパティ名を持つ行ごとにschemaを共有し、各行はschema IDと値を保持する。値の丸め、rollの量子化、記録削除、試行の成功/失敗集計への置換を行わない。計測器はJSON由来のplain dataだけを対象とする。任意JS graphの汎用serializerではない。

現行上限は完全ゲームJSONとsessionの契約である。新表現を別ファイルへ分けるだけでは契約を満たさない。正式化には、各成分・総量・展開時メモリ・件数・因果連鎖の資源上限と独立検証の設計承認が必要。D0/D1で既存assertFormalSizeを解除してはいけない。

## 再現

Node v24.22.1 / Linux、隔離worktree。ブラウザー・Safari・永続化の実測はない。

```sh
node works/ambertime/design/s3-d0/measure.mjs /path/to/wide-1200.research.json /tmp/capacity.json
node --test works/ambertime/tests/s3-d0-capacity.test.mjs
```

`capacity.json` は今回新規の容量会計。既存#854の698か月初回超過、100年状態、因果監査を再利用。新規のゲーム将来同値性試験や正式保存成功は主張しない。

## 検証記録

新規計測器4件と既存formal-save/recall-save/s3-saveを合わせ27/27 PASS。Plan Lock verify、Scope Guard、Risk Check、Impact Check、変更mjsのnode --check PASS。これらは設計資料と隔離計測器の安全性確認であり新正式保存の合格ではない。

独立レビュー: 計測器と文書を別担当が監査し、fixture再計測一致と4件PASSを確認。削減率のUTF-16/UTF-8区別、townコンテナproperty順のD1確認、現行操作上限の3点を修正。D0のroundtripは行単位/各town fieldの一致であり、コンテナのキー順を含む全game roundtripはD1で証明する。
