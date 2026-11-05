# H1-A5 現行保存経路と既存実測の再利用

監査対象は Staging `306524e1e7df3a5b2e2ba27310fb269d6e15aa4a`。本記録作成時のHEADはPlan Lockのみを追加した `ff5d623520ee73762ff064c50f9520d60593955b`。本編の変更、正式保存キーへの書込、既存保存の変更はしていない。以下のコード位置は監査対象の行番号。

## 保存と読込

| 処理 | 現行コード | 負荷と安全上の意味 |
|---|---|---|
| 検証・JSON化 | `partner-orders.mjs:1302–1333` | `serializeDistillery` は検証後にstateをJSON化。検証内でcore往復、state/contextのclone、操作prefix比較・tail再生、state全JSON同士の比較、cache保持を行う |
| 自動保存 | `shop-app.mjs:515–519` | state stringify → parse → wrapper stringify。旧保存文字列を保持し、getItemで競合検出 → setItem → getItem完全一致。同期実行でメインスレッドを占有 |
| 起動 | `shop-app.mjs:1337–1346`、`placement-save.mjs:10–19` | wrapper parse → game stringify → 正式reader parse/全再生。起動時の補正判定でもgame stringifyとwrapper parseを行う |
| 月次・採取 | `shop-app.mjs:530–548` | 月次ごと、採取終了/進行5stepごと、担当者の完了時などに保存。同じtickで複数条件が成立すると複数回saveする可能性がある |
| 操作 | `shop-app.mjs:552–589` | 通常actと候補確定型actMarket/fill/placementで公開順序が異なる |
| 非表示 | `shop-app.mjs:1295–1298` | visibilitychange hidden/pagehideで同期save。pageshow/表示復帰で再開。OS kill前にイベントが必ず来ることや、完了後の物理durabilityを保証しない |

メモリの同時保持にはlive state、検証replay/cache state、context、比較用JSON文字列、serialize結果、wrapper用parse結果、新wrapper文字列、lastSavedTextがある。寿命はGCに依存し、これらを単純に容量へ掛けた値を実測peakとは呼ばない。JSON/cloneだけでなく全再生・蓄積履歴の再走査がcold復元の主因である。

## 内部上限はブラウザquotaと別

`partner-orders.mjs:1333` の条件は `text.length < 1500000*4+16384`、すなわち **6,016,384 UTF-16 code units未満**。game JSONに対するreader条件であり、UTF-8 bytesでもlocalStorageの物理使用量でもない。wrapperには別途少量の文字が加わる。操作数は12,000以下を検証し、追加時は12,000未満を要求する。

一方、`serializeDistillery` と通常saveには同じ文字列長guardがない。quotaが許せば、書込・読戻しが成功しても次回readerに拒否されるサイズに成長する構造上の非対称がある。これは静的に確認した危険条件であり、実在の何年で到達するかや、そのサイズの正当なstateを本研究で生成・保存できたことを意味しない。guardを解除して安全年数を延ばす扱いにしない。

## 保存失敗と再開の現行仕様

| 経路 | setItem失敗時のlive state | 表示・停止 |
|---|---|---|
| `save()` | 呼出し前のlive stateを保持。保存済みとは限らない | `canSave=false`、時計停止、保存できない通知、`未保存`、再確認/recovery表示 |
| generic `act()` | fnの結果を先にgameへ公開し、save失敗でも元へ戻さない。戻り値もtrue | saveが停止を設定。成功後のnews/afterSaveは呼ばれない |
| `actMarket()` | 保存前のgameを保持 | canSave=false・通知・render。catchはsave-statusを更新しないため前回の`保存済み`文字が残り得る。ただし失敗候補は公開していない |
| 月次 | storeMarketModeでは直前game/elapsedへ戻す。それ以外は未保存の進行stateを保持 | 保存失敗でcanSave=false、以後の時計はblockedで停止 |
| `commitFill()` | 候補を公開せず原酒とdialogを保持 | `未保存`・通知・再確認/recovery |
| `commitPlacement()` | 候補を公開せず元gameを保持 | canSave=false・通知/dialog error。save-statusはcatchで更新しない |

`blocked():527` はcanSave=falseを停止条件にする。再確認 `:1300` はcanSaveを一度戻し、現live stateの再保存を試す。保存失敗が単純なsetItem例外であれば最後の正常保存は上書きしない。getItem一致検査は複数タブ間の原子CASではなく、競合チェックと書込の間のraceを完全には防がない。readback不一致では第三者の内容を再上書きしないが、「自分の最後の正常保存が必ず残る」とは保証できない。

初回reader失敗 `:1345–1346` はgameをnullにして時計停止・ゲーム非表示、元キーを変更せずraw exportを提示する。古い別キーへ黙ってfallbackしたり、新規ゲームで上書きしたりしない。正常な保存がoriginから消えた場合の復旧は、この経路だけでは成立しない。

## 実行した回帰

```sh
node --test works/ambertime/tests/r0-app-baseline.test.mjs works/ambertime/tests/placement-save.test.mjs
```

2026-11-05、**11成功・0失敗**。実際のsave/schedule/act/actMarket関数を抽出したNode VM harnessでsuccess・quota注入・競合・write拒否時の順序/rollbackを確認。wrapper検証失敗、reader拒否、元キー保持、別キー非変更も確認した。DOM/時計adapterは模擬であり、ブラウザUI操作、native quota、Safari実機確認として扱わない。既存R5固定hashテストはこの2ファイルに含めていない。

## H1-A1実測の再利用確認

H1-A1基準 `7b138e2a78cefe258b780d8426a1b508e4cfb357` と監査HEADについて、下記rootから相対static importをquery除去して再帰列挙した **53ファイルすべてのGit blobが一致**した。

- partner-orders.mjs
- chronicle-lab/research-h24-saves.mjs
- ledger-view.mjs / shop-ledger.mjs / cask-ledger.mjs / distillery-history.mjs
- chronicle-lab/research-h25.mjs / research-h25-generate.mjs

比較は各pathの `git rev-parse <base>:<path>` と `git rev-parse HEAD:<path>`。動的import一般を解決する証明ではなく、今回の既知rootとその相対static依存の照合である。計測scriptのfingerprintはrun.mjsの正規計算（run/measure/ledger-measureのUTF-8内容を改行でjoinしSHA-256）に一致：

`a617d45d6c7c9076cfe80ec754ce3e5f5a9309d85339b99ccca9c98beae89954`

既存results.jsonの12条件について同fingerprint、全3 official runとinstrumented runのsourceHash＝条件hash、instrumented再生操作数＝operationsを確認した。H1-A1 VALIDATION.mdは全48復元の再保存バイト一致を記録する。今回は同じ48回を再実行せず、完了済み既存証拠として再利用する。入力ファイルそのものの今回の再生成・SHA照合は別計測記録を参照する。

| 方針 | 30年cold秒 | 60年cold秒 | 90年cold秒 | 100年cold秒 | 100年warm再保存ms |
|---|---:|---:|---:|---:|---:|
| 地元密着 | 7.54–7.58 | 20.48–20.52 | 36.81–36.89 | 42.42–42.59 | 89.58 |
| 広域展開 | 10.01–10.37 | 33.24–33.97 | 71.31–72.07 | 88.02–91.39 | 179.54 |
| 混合 | 8.31–8.68 | 18.88–19.56 | 49.69–50.54 | 66.43–68.50 | 168.34 |

出典は `../save-audit/results.json` / REPORT.md。元環境Node v24.22.1 Linux x64、各条件最初のofficial runをhost/cache primingとして除外し、残り2回の別process cold値。warm再保存は正式state serializeのみで、wrapper生成・localStorage I/Oは含まない。比較用parsed state、復元結果、cache、再保存文字列を同時保持する条件で、peak RSSは処理単独peakでもChromium JS heapでもiPhone RAMでもない。帳面の旧値もNode資料生成時間であり、DOM・Worker通信・paint・実プレイ時間へ読み替えない。

H1-A4の128MiB renderer crashは約26MB fixtureを渡すpipeline全体の失敗で、落ちたphase未確定。前P2 fingerprintの100cycle性能/約588MB sampled JS heapと、current-source 42件成功のprotocol証拠を混ぜない。今回の新計測で分解しない部分について原因を断定しない。
