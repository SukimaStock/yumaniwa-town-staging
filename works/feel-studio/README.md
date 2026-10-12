# Feel Studio 0.2

制作中の試作品を、直接編集とAIの別コードで育てる小さな作業机。

https://sukimastock.github.io/yumaniwa-town-staging/works/feel-studio/

## 最初に触る

「小舟の渡し」で「直接編集」を押し、始・岸・杭を動かす。下の「待つ」「動く」のつまみは時間そのものを変更する。「試遊へ戻る」で試し、気に入ったら「ここから分岐」。元の案のコードと設定は残る。

Aは押している間に渡る。Bは指との糸をばねにして引く。Cはためて離すと出発する。設定違いではなく、それぞれ別のmodel.js。「並べて比べる」と「比較する案」は常に机の上にある。iPhoneは左/右をワンタップ切り替え、広い画面は2つの隔離した実装を並べる。

同じ位置・時間の初期設定を持つA/B/Cから開始するが、設定の編集はその案だけ。自動的に別案の設定を書き換えない。指の記録も同じ力とはみなさない。

## AIとの制作

1. 「良い部分を取り入れる」または「AIに変更を依頼」を開く。
2. 試作が宣言した部分を選ぶ。例えば進み方B・指を離した瞬間A。
3. 「変更依頼を作る」で対象node/build/version/コードSHA256/パス/現在設定/部分の出典/コメント/保護部分をJSONにする。ここではまだ実装案は増えない。
4. JSONをWorkに渡す。Workは古いbuildを変えず、新しいbuildディレクトリへ独立したコードを追加し、catalog.jsonへ登録する。実装とテストはWorkが行う。
5. Workの返答JSONを「Workの返答・保存」へ貼り、「Workの返答を取り込む」。同じrequestIdを持つ依頼と、実際に登録されたbuild・コードSHA256だけを受け付ける。
6. 修正前後を比較し、採用・保留・今回は採用しないを選ぶ。採用案も再編集・再分岐できる。

互換性のある宣言済み設定は、その場で別の案へ取り込める。小舟では配置と出発の時間、あかりでは灯と幕の配置・待つ時間と周期。コード部分の選択とは明確に区別する。任意のプログラムの自動合成やAIへの通信は行わない。

## 実装済みの制作往復

cycle/request.jsonは実際のDesk APIから書き出した依頼。開始位置と待ち時間を編集したA2を保存し、独立コードB/Cを比較したうえで、Bの進み方とAの停止を選んだ。作者操作の代理検証であり、作者本人の採用とは区別する。

Workはこの依頼を読み、A/B/Cを変えずにbuilds/boat-d/model.jsを追加した。DはBのばね追従を持ち、離したフレームで速度と追従先を止める。cycle/response.jsonが実装結果、cycle/workspace.jsonが依頼元の再開可能な作業机。

「Workの返答・保存」→「制作往復の実例を読み込む」→「Workの返答を取り込む」で、この往復を実際に再開できる。既存保存案は保ったまま依頼元の机を読み、Dの実装を履歴へ追加する。感想だけを読み込む操作ではない。

手動：WorkへのJSON受け渡し、コード実装・Git登録・Staging反映、返答の貼り付け、作者の採否。
自動：直接編集の反映、分岐履歴・ローカル保存、コード識別と互換性検査、返答と依頼の接続、再試遊。

## 新しい試作を接続する

大きなEngineは必要ない。

- catalog.jsonにproject（config初期値、ranges、settingParts、入力の比較限界）を登録する。
- builds/<新しい不変ID>/へindex.htmlとmodel.jsを置く。別の実装は必ず別IDへ追加し、過去buildを上書きしない。
- model.jsはStudioPrototypeとしてcreate(config)、validate(config)、handles(config)、edit(config,id,point)を宣言する。createの戻り値はupdate(dt,input)、draw(ctx,input)、stateを持つ。共通の物理方式は要求しない。
- handlesは画面上の編集点とposition/time等の意味を返す。editが実設定を返す。実装できない箇所はハンドルにせず、partsのコード部分として宣言する。
- catalogのbuildにmodelのSHA256、HTMLのSHA256、固定ランタイム/依存のSHA256、partsのid/label/anchorを登録する。partsは作品ごとに異なる。独立モデルを直接比較できる。
- 初回表示するbuildはinitial:true。AI返答で取り込むbuildはinitial:false。derivedFromは元のbuild ID。
- 同じ登録で「あかりの待ち合わせ」が動作する。空間の編集対象・時間の名前・コード部分が小舟とは異なり、同じDeskとframe機能を再利用する。

## 隔離と保存

実装はsandbox="allow-scripts"のiframeで動く。same-origin/top-navigation/forms/popups権限は与えない。各frameはnetworkを禁止するCSPを持ち、親はコード・HTML・依存のhashを照合してから起動する。メッセージは送信frame・ランダムnonce・protocolで照合する。切り替えでは旧frameを除去し、古い非同期読み込みとメッセージを破棄する。画面外の比較frameは停止する。

JSONに含まれる外部URL、コード文字列、未登録buildは実行しない。取込はconfigの宣言range、履歴の親、コードID、sourceの対応、依頼/返答対応を検査する。保存はv2のproject別キー。壊れた元データは上書きせず、保存失敗は通知する。大切な状態は「作業机をJSONにする」→保存。

0.1はlegacy-01/に保管。旧コード・旧v1保存キーは維持し、旧JSONは旧机で開く。v1をv2へ誤解釈したり上書きしない。コードbuildはGitで保持し、workspace JSONはそのコードを再指定する。JSON単体でコードを持ち運ぶものではない。

## 確認

- node works/feel-studio/tests/cycle-v2.cjs
- node works/feel-studio/tests/frame-v2.cjs
- node works/feel-studio/legacy-01/tests/verify.cjs
- node tools/work-lifecycle.cjs --check

実ブラウザと実機の観測範囲はVALIDATION.mdとPRで分けて記録する。

## 実ブラウザの制作往復

公開Stagingで、開始位置と待ち時間をドラッグして保存したAの分岐を保ち、Bの進み方とAの停止を選んだ実際のJSONがcycle/browser-request.json。Workがその出典を検査して独立コードEを追加し、browser-response.jsonへ返した。browser-source-workspace.jsonはその依頼元を再開できる机。「ブラウザ制作往復の実例を読み込む」から同じ往復を試せる。

別題材も実ブラウザで灯の位置と待ち時間を変更・分岐し、別コードBと比較した。再開用はbrowser-light-workspace.json。実機iPhone本人の触感確認と、このブラウザ検証は別に扱う。
