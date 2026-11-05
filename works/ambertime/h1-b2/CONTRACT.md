# H1-B2 正式保存契約

## 表現と読込

正式キーは従来どおり `sukimastock.ambertime.main.v1`。

- v2は `{version:2,game,userPaused,elapsed}` をそのまま旧形式として読む。
- v3も4項目を維持し、`game.labConnection.town.arrivals` の実体だけを `null` sentinelへ置換する。独立した研究envelopeや永続索引は導入しない。
- v3 writerは元arrivalsとevents内のarrival全件を内容・件数・順序まで一致検査する。条件を満たさなければ並べ替え・補修せず保存を拒否する。
- v3 readerは厳格な項目・version・pause/time・sentinel・ID検査後、元のproperty位置へ独立したarrivalオブジェクト配列を再構成する。完全JSONを従来の `restoreDistillery()` へ渡す。
- writerは `serializeDistillery()` の正式検証を維持し、新しい保存候補を同じ `readSession()` と正式readerへ通し、復元JSONが元serializer出力と完全一致してから書き込む。

町events/attempts、ゲーム計算・乱数・runtime API・地図/帳面/歴史の参照方式は変更しない。実行中は従来の完全状態であり、常駐メモリやcold全再生が軽くなったとは扱わない。

## 上限

`PARALLEL_PARAMETERS.maxSaveBytes*4+16384` に対応する **6,016,384 UTF-16 code units未満**を展開後に要求する。境界値ちょうども拒否する。入力sessionにはこの値+1024未満の保守的な別ガードを置く。wireが小さくても展開後上限は迂回しない。

この上限とlocalStorage native quota、UTF-8 bytesは別。広域100年の展開後余裕178,291単位（約2.96%）は不変。100年超の継続を保証しない。超過時は書込前に拒否し、時計停止・旧正常値保持とする。

## 旧保存の移行

v2の読込成功だけでは上書きしない。移行待ちの間はclock・通常操作・retry・reset・pagehide保存を止め、元文字列を保持する。ゲームのmodalが復旧欄を塞がないよう閉じる。

元の全保存をファイルに書き出し、同じファイルを選び直して文字列完全一致と正式reader読込を確認する。さらに本人に端末外保管の確認を求める。download開始を保管完了とは判定しない。アプリはクラウドへの書込完了や物理的な保管先を確認できない。確認ができない・取消・異なるファイル・途中終了では元キーを変えない。

同originへ完全backupを別キーで複製する方式をC移行の前提にしない。従来の販売ルール切替が独立して持つbackup helperは保持し、その容量不足時は切替を拒否する。旧版キーからの従来copy経路も保持し、正式キーへコピーされたv2は同じ移行待ちを通る。

## 失敗と確定

通常act、market、樽詰め、配分、月次、蒸留進行、resetなどは中央候補保存を通る。最後の確定game/pause/timeを保持し、失敗時はそこへ戻す。保存前に成功callback・通知・ゲーム状態を公開しない。開始/再開時のpause変更も候補のmetadataとして保存し、成功後だけliveへ反映する。

保存失敗はclock停止・未保存表示・retry/救出へ進む。読込失敗は元データを残して停止し、新規ゲームを自動保存しない。バックアップ復元は通常メニューのfile入力から正式readerを通して検査し、置換確認後に現在キーの期待値比較を行って書き込む。不正ファイルは書込へ達しない。試遊から正式キーへimportしない。

localStorageのget/比較/set/読戻は原子的CASではない。storage eventで他タブ更新を止め、古い期待値でのretryを拒否する。古いタブは閉じてから移行する。同時に複数processが比較を通過するraceを完全に排除したとは主張しない。

## 復旧とrollback

新v3は旧アプリreaderでは読めない。コードを旧版へ単純revertする場合も互換readerを保持するか、本人が保管した完全v2ファイルを復元する。新形式を読めない旧版で自動初期化しない。端末外backupはorigin消失への復旧手段であり、同originの別キーは代替にならない。
