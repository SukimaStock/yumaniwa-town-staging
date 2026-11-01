# カット表示の追加調整

基準main: `823227736a80230a564ea0b19e051d5c183532e9`（#744）。先行Planは `.change-plans/ambertime-cut-mark-followup/r0.lock.json`。

ゲージの開始・終了・現在位置を貫く長い縦線を削除し、短い位置印・採取区間の下線と点を維持した。色・採取位置・正式処理は変更していない。

結果の右上にあった6px色印を削除し、「果実香が強い」等の香り名の左に12×12pxで配置。3pxグリッドへ揃え、香り名の行だけ18px右へ移動する。量の行やパネル寸法・操作位置は変えない。

関連Node17件成功。変更依存の入口→app→Canvas→barを `cut-mark-r1` へ更新した。正式味・量・費用・保存・入力・レバー・習熟モジュールは変更なし。

同じ正式24→52カットを保存したfixtureで360×568・375×620・390×680の前後を比較。各engineの結果JSONと画像は隣の `chromium/`、`webkit/` に保存。描画は正式状態/保存bytesを変えない。Linux WebKitは実機iPhone Safariの検証ではない。

- [375px変更前](chromium/375-before.png)
- [375px変更後](chromium/375-after.png)

実機では色印と香り名の読みやすさ、細い位置印を追加確認する。Productionは変更しない。
