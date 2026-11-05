# iPhone Safari確認・保存消失と復旧

実機は未接続。以下は未実施の作者向け手順であり、Chromium成功で代用しない。

## 短い実機手順

本編を開かず研究harnessを専用タブで開く。通常モードのiOS/Safari版、機種、空き容量を記録する。研究キーは独立だがStaging上のorigin容量は共有するため、容量を埋める試験は別originまたは別端末でのみ行う。harnessにはquotaを埋めるボタンを置かない。本編保存をインポートしない。

1. H2-4で生成した研究用の30・60・90・100年JSONをファイル選択する。各方針ごとに書込結果・文字数・SHA・エラーを記録する。ファイル未提供ならその条件は未検証のまま残す。
2. 成功後「読込確認」、再読込、タブを閉じて同URLを開く。SHAが一致するか記録する。これは文字列の往復であり正式readerの全再生ではない。
3. 成功済み100年条件でSafari終了→再起動、画面ロック→解除、別アプリへ移動→復帰を各1回確認する。保存途中の中断は専用研究データで行い、最新または直前正常値のどちらかが完全に残るか調べる。
4. 重い正式復元の端末計測は別途必要。現harnessは正式readerを呼ばない。読込表示の待機中にスクロール・タップが応答するか、復元後の月次・蒸留・瓶詰め・納品・地図・帳面・世代交代が操作できるかを本編とは独立した研究fixtureで確認する。
5. 低空き容量・実quota・OSによる強制終了・長期未訪問の消失は未検証として別記する。通常終了の成功から推定しない。試験後は研究キーだけを削除する。Safariのサイトデータ全削除は本編も消すので実施しない。

## 一次資料に基づくリスク

[WebKit: Updates to Storage Policy (2023-08-10)](https://webkit.org/blog/14403/updates-to-storage-policy/) はorigin単位の容量管理・ストレージ圧迫時等のorigin全体の削除・best-effortの非保証・Storage APIの概算とpersistent要求を説明する。大きなorigin quotaがlocalStorage単体の書込成功を保証するとは扱わない。`estimate()`は実書込試験の代替にならない。persistent要求は必ず許可されるものではない。

[WebKit: Full Third-Party Cookie Blocking and More (2020-03-24)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) は、サイトへのユーザー操作がないSafari使用7日後のscript-writable storage削除とHome Screenアプリの扱いを説明する。単なる7暦日後の必ず削除という意味ではない。現行端末でその動作を実測した証拠はない。

同originの別DB・旧commit・別キーはorigin全消失へのbackupにならない。Home Screen化・persistent modeも端末外backupの代替にはならない。

## 次のbackup契約

将来の独立実装では、完全な元正式JSON、形式version、reader/model識別子、UTF-8 bytes、SHA-256、checkpoint/context/tail/世代資料とその境界・参照manifestを一つの検証可能な書出形式へまとめる。書出後に別profileで読み戻し、状態・RNG・採番・過去回想を比較する。旧readerを保持し、破損checkpointは検証済み旧commit→完全元保存へfallbackする。origin消失時は端末外に出したファイルから復旧する。自己hashは改変認証ではない。今回の外部保存・移行はない。
