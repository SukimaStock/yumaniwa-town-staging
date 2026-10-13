# Feel Bridge 1 · 新作への接続

作品は自身の描画・物理・入力・RAF・ルールを所有する。Studioは隔離したHTMLを起動し、作品が公開した能力を呼ぶ。Canvasや固定座標、特定Engineは契約に含まれない。

## 三段階

| 接続 | 作品側 | Studioでできること |
| --- | --- | --- |
| Level 1 | 独立HTMLと全依存の登録だけ。APIなし | 起動、切り替え、並列比較、履歴、分岐、採用・保留。内部状態の編集・復元はできない |
| Level 2 | 任意のBridge能力と状態schema | 公開された状態の保存・復元、対応する直接編集。能力のない操作は表示しない |
| Level 3 | Level 2＋コードpartsとWorkの別build登録 | 対象コード・編集状態・選択元を依頼に含め、独立した新コードの返答を履歴へ追加 |

## 最小接続

普通の作品はこれまで通り、自分で起動する。制作用index.htmlにbridge-client.jsを読み込み、公開できるhookだけ接続する。

```js
const bridge = window.FeelBridge?.connect({
  getState: () => structuredClone(settings),
  restoreState: saved => { settings = validate(saved); resetMyWork(); },
  reset: resetMyWork,
  pause: paused => { myPaused = paused; },
  play: () => { myPaused = false; },
  getEditableElements: () => [
    { id: 'wait', label: '待つ時間', type: 'timing',
      min: 0, max: 2, step: .05, value: settings.wait, unit: '秒' }
  ],
  beginEdit: id => { if (id === null) myEditing = true; },
  applyEdit: (id, change) => { settings.wait = validateWait(change.value); },
  endEdit: id => { if (id === null) myEditing = false; },
  getComparisonInfo: () => 'この作品では指は目標位置を意味する'
});
```

play/pause/resetは個別に任意。状態にはgetState/restoreStateの両方が必要。共通直接編集にはさらにgetEditableElements/beginEdit/applyEdit/endEditが必要。UIは実装のready能力を見て表示する。Bridge自身はRAF、描画、pointer listenerを作らない。接続できなくても作品は自分で動く。

id=nullのbeginEdit/endEditはモードの出入り。idありは一操作の開始/終了。作品内の固有操作は`bridge?.changed('begin'|'move'|'end')`で公開状態を通知する。キャンセル・blur・visibilityで作品自身の持ち続けた指を解除する。

## 編集宣言

- position: `{id,label,type:'position',screen:{x,y}}`。x/yは現在の作品viewport内の0〜1。Studioは触れる印を重ね、`applyEdit(id,{point:{x,y}})`を渡す。これを作品の世界へ変換するのは作品側。固定pixelや世界単位の指定はない。
- timing / range / value: `{id,label,type,min,max,step,value,unit}`。共通スライダーから実際のhookへ渡す。
- 作品固有操作: `{id,label,type:'position',control:'work',hint}`。Studioは説明を表示し、操作・hit判定・座標変換は作品が担当する。小棚はWebGL投影のローカルZ軸へのscreen delta投影を使う。2Dの印を3D座標へ代入しない。
- pathその他の種類は0.3の共通UIでは未対応と表示する。作品側のcontrol:'work'として提供できる。任意3D操作や汎用pathエディタを提供したとは扱わない。

## 登録手順（Studio本体の変更なし）

1. `prototypes/<project>/<不変build-id>/`に独立したindex.html、app.jsを置く。Canvas/DOM/WebGLどれでもよい。資産もローカルに置く。既存buildは変更せず、別実装は新しいIDを使う。
2. catalog.jsonのprojectsへid/title/level/config/ranges/settingParts/inputMeaningを追加。configはgetState/restoreStateの状態schema兼初期条件。数値・boolean・文字列・入れ子object・固定長arrayに対応。文字列1000文字、数値有限かつ絶対値5000以下、array200要素以下。JSONの形とrangeを作品と親双方で検査する。動的要素集合は作品で明示的な状態schemaへ整理する。
3. 必要ならrelationsに`{path:'open',lte:'range'}`のような状態間の上限関係を宣言する。作品側でも必ずvalidateする。互換設定はsettingPartsのkeys/contractを宣言する。共通物理項目を設ける必要はない。
4. buildsへproject/id/title/version/runtime/url/source/initial/derivedFrom/partsを登録。runtimeはfeel-bridge/1またはhtml-isolated/1。sourceは実装の正本JS、codeHashはそのSHA256。htmlHashと全依存のSHA256も登録する。全JS/CSS/画像等の実行依存を列挙する。外部URL/親directoryの新規依存は扱わない。
5. `tests/register-v3.cjs`のregister(catalog,definition)を作業用Nodeから呼べばhashを生成できる。同じIDの再登録は拒否する。作品を追加するためにstudio-v2.js、records-v2.js、bridge-*.jsを書き換えない。
6. 元案はinitial:true。AIの返答案はinitial:false、derivedFromに元build。Workはrequestのrepository/path/version/hash/configと選択したpartsの出典を読み、新IDへ実装。既存Aを上書きしない。
7. feel-work-response/2で同じrequestIdと新buildId/codeHash/config/summaryを返す。Studioの「Workの返答・保存」へ貼り付ける。JSONから任意コードやURLを実行することはない。partsのidは作品固有で、選択したコード部分が自動合成されたとは表示しない。
8. 完成時は各作品のplay.htmlとapp.js・作品自身のCSS/描画依存だけを独立配置する。play.htmlはBridgeやStudioを読み込まない。Engine移行は不要。

制作用起動: prototypes/paper/paper-a/index.html。独立起動: 同じdirectoryのplay.html。3Dも同じ。DOM比較試作は最初からBridgeを含まない。

## 安全・保存・比較の境界

0.2のfeel-workspace/2、feel-work-request/2、feel-work-response/2とv2のproject別keyを継続使用する。boat/lightのJSON、旧hashと旧frame-v2.jsは変更しない。0.1は旧机・旧keyのまま。新作品は別project keyを使う。

sandboxはallow-scriptsのみ、referrerなし。CSPはローカルscript/styleのみ・通信なし。親はsource/HTML/全依存hashを起動前と返答取込前に検査。sender WindowProxy/nonceを照合し、旧frameと古いasync mountを破棄する。可視のframe以外はpause能力で停止し、非対応（Level 1等）ならiframeを除去し、戻ると登録状態から再起動する。Level 1の内部状態は保存できないことを明示する。

同じ設定schemaの範囲で条件を合わせる。reset非対応は登録HTMLを再起動する。0.2の固定座標の指録画は旧作品に限定し、新作で同じ入力・同じ力だと見せない。一般作品間の入力再生は未対応。

通信・localStorage/cookie・外部module・Service Worker・XR・追加権限を前提にしたHTMLはこの制限では起動できない場合がある。WebGL非対応端末やcontext lostは作品内で明示。隔離はリソース過負荷からブラウザ全体を守る完全な実行制限ではない。登録コード自体のレビューが必要。

## 実際の制作往復

cycle-v3/paper-request.jsonとdrawer-request.jsonはDeskから出した編集済み状態の依頼。WorkはそのファイルとAのhashを実際に読み、別app.jsへBを実装した。source-workspace＋responseで取込を再開でき、completed-workspaceは採用後の再分岐と復元を含む。UIの実例ボタンから同じ依頼/返答を試せる。

手動: 作者操作、JSONをWorkへ渡すこと、新コード実装・テスト・Git/Pages登録、返答貼り付け、採否。
自動: 公開能力の操作UI、編集の反映・保存、履歴/分岐、コード検証、依頼との対応、比較案としての取込。

検証は作者操作のAI代理。作者本人の評価・実機iPhoneの操作感とは区別する。実観測の結果はVALIDATION-V03.mdに記録する。

3D補足: クラウドChromeはWebGLコンテキスト非対応だったため、原案A/Bを残し、作品自身がWebGLまたはCPUの3D透視投影を選ぶdrawer-cを追加しました。Studioは描画方式の分岐を持ちません。GPU WebGLの実表示・実機性能は未検証です。
