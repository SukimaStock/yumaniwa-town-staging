# AmberTime 夜間実装・第2段階（2026-11-11）

状態: 実装済み・Draft。必須CI、ブラウザー、30年/100年、iPhoneは未完了。Staging未マージ。

## 基準と変更

- Repository: SukimaStock/yumaniwa-town-staging。固定base: `ebc507df0ece98dadab0673e9d27e39a69424467`。
- 作者の夜間指示第2段階を実装。Productionへの変更なし。
- Full / WORK。録画済み操作の厳密再生が保存契約なので、`bottlingAssignment.version=1` と `enable-bottling-assignment` を追加し、境界以前のhire/fill/default/delegateを変更しない。
- 有効化は既存予約・担当・現金・在庫を保持。共通方針がない場合だけ熟成12か月・10本の時期指定を初期化。既存雇用済みセーブの手動樽を遡って担当対象にしない。
- 境界後の採用は既存の未予約樽を担当対象にし、その後の手動仕込みと担当者による仕込みにも共通方針のsnapshotを割当。
- 共通方針変更は既存予約へ波及しない。「自分で行う」は予約取消を使い、再び任せると最新方針で新予約。一時停止/再開は元条件と順番を維持。担当者画面に一時停止/再開と、完了した予約の条件を表示。
- 時期指定の一度だけ実行、在庫連動の繰返し、熟成下限なし、月1回の全体制御は既存計算を維持。
- 既存瓶詰め完了通知を保持。保存済みactive→completed遷移で、active/paused予約が一つも残らないときだけ「任せたビン詰めがすべて終わりました。」を追加。在庫連動の待機は未完了。
- 正式保存keyとv8 envelope、保存成功前の候補非適用は維持。新opcodeは旧コードで読めないため、このbranchを戻す際は新境界を含む書出しセーブを保管する。
- 診断URLのprivate-data保護を維持し、cache識別子 `assignment=night-stage2-v01` の固定値だけを既存allowlistへ追加。

## Plan順序

実装前lock: `.change-plans/ambertime-night-stage2-20261111-r2/r0.lock.json`。

- lock commit: `e867a0b718acc80b48b57cb5c5dc5bfa15b79efc`
- digest: `ef5d2e6a35bf431b33f0e6b7610c5a54c4ba86f6ee8d981ca45a48c626ad8cb6`
- 初期計画では診断allowlist依存、次の計画ではlock自身のscopeを落としていた。いずれもmainから新branch/新r0を作り直し、lock commit後に差分を適用。旧lockを実装後に書き換えていない。最終branchにあるlockはr2の一つだけ。

## 検証

- 新規 `night-stage2-bottling.test.mjs`: **10/10成功**。新旧factory、旧固定byte fixture、採用/手動/担当者仕込み、予約snapshot、手動取消とpause/resume、在庫連動待機、完了通知、marker/予約/opcode改ざん拒否、cold子process復元、正式v8往復、実際のUI handlerを確認。
- 既存瓶詰め方針・役割・経験・採用経済: **33/33成功**。
- 拡大回帰: **277件、269成功、5失敗、3skip**（32.0秒）。5失敗はexact baseの同名テストでも再現。期待値を弱めず保留。
  - `formal-copy.test.mjs`: 原酒の旧選択構造、削除済みledgerReleaseView、過去のcache URL文字列を要求する3件。
  - `save-menu-ui.test.mjs`: VM fixtureにdebugSkipJobがない2件。
- 初回の追加cache識別子で診断privacy回帰が失敗。exact allowlistをscopeへ含めた新lock後に修正し、診断privacy回帰を含む21/21成功。その後の新規UI handlerを含む10/10も成功。
- Scope → Risk → Impact: すべてPASS。変更した6つのJS/MJSと新規testのsyntax、git diff --checkもPASS。
- 独立レビュー: メイン担当から42件と追加30件成功、active抽出/試飲境界の厳密往復に重大指摘なしとの連絡あり。最終のpause/resumeボタンとcache allowlistは差分再確認を依頼。レビューを自己認証しない。
- 新規Node fixtureの境界有効化: 9,292→9,459 UTF-8 bytes（+167 bytes）。warm restore 0.48ms。短い新規fixtureだけの値であり、長期保存やiPhone性能の証明ではない。

実行した拡大回帰:

```sh
node --test works/ambertime/tests/*bottl*.test.mjs works/ambertime/tests/*staff*.test.mjs works/ambertime/tests/*save*.test.mjs works/ambertime/tests/*session*.test.mjs works/ambertime/tests/*entry*.test.mjs works/ambertime/tests/*single-slot*.test.mjs works/ambertime/tests/event-notices.test.mjs works/ambertime/tests/formal-copy.test.mjs
```

## 未確認とDraft停止理由

- 必須CI未実行。ローカル成功をCI通過扱いしない。
- ブラウザー/実タブ: メイン作業でChromium起動が環境制約により停止。今回の画面、正式localStorage移行、保存失敗時の実ブラウザー操作は未確認。
- iPhone Safari: 採用直後の全樽、担当者仕込み後の自動割当、共通方針変更後の既存条件、手動→再委任、一時停止/再開、最後の仕事通知と在庫連動待機を作者が確認する必要がある。
- この境界を含む30年/100年経営、保存容量増加、初回保存/復元性能は未確認。既往の長期結果を流用しない。
- 指示どおり安全確認が不足するためDraftを維持。Staging統合・配信・作者採用は別状態。

## 作者確認への引継ぎ・第1段階後の統合

作者の追加指示「私が確認しますのでマージしてください」を受け、ブラウザー/iPhoneの確認を作者へ引き継ぐ。未確認をPASSにしない。

統合baseは第1段階PR919のmerge e0dfbad6a8f6c8486b13510e3394c865b310f0b7。旧PR921は旧baseの候補として保持し、新規Plan `.change-plans/ambertime-night-stage2-integration-20261111/r0.lock.json` を実装適用前に固定した。

entry-diagnostics/index/shop-appの競合は、Stage1の通知保持・導線・世代表示を残してStage2のassignment fingerprintと予約処理を追加。partner-orders/session-entry/新規瓶詰めテストは旧候補とbyte同一。

統合回帰109/109成功。独立レビューで正式保存・回想保存・新規開始30/30成功、具体的重大指摘なし。Scope→Risk→Impact成功。CIは新しいcandidateのexact SHAで確認する。Staging限定、Production変更なし。

元PR921の追加検証commentには、今回生成した30年/100年旧記録の新境界適用・cold完全一致・将来12か月一致を記録済み。容量増加169/170 bytes。新方式で100年間運営した検証ではなく、長期fixtureは予約0件である。
