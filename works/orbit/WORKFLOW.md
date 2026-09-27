# SukimaStock 標準制作フロー

この手順は、SukimaStock Starterで新作を始め、Koderと自作パッチャーで制作し、完成後にYumaniwaDesk v0.8へ登録してWorking CopyからGitHubへ公開するまでの標準手順です。

## 0. 役割を固定する

```text
SukimaStock-Starter
  共通原本

Koder / 各作品フォルダ
  制作中の正本

自作パッチャー
  コード更新を適用する道具

Working Copy / yumaniwa-town
  公開直前からの正本

YumaniwaDesk
  作品コードではなく、町の台帳・履歴を更新する管理室

GitHub
  公開版
```

同じ作品をKoderとWorking Copyの両方で並行編集しないことを基本ルールにします。

---

# A. Starterを更新する

EngineやBlankテンプレートに共通改善を入れるときだけ原本Starterを更新します。

```text
共通改善を決める
  ↓
自作パッチャーでSukimaStock-Starterへ適用
  ↓
index.demo.htmlをKoderで開く
  ↓
基本動作を確認
  ↓
必要ならindex.html側のBlankも確認
  ↓
Starter更新完了
```

作品固有の改善はStarterへ戻しません。

Engineへ入れる基準は「二作品以上で実際に必要になったか」です。

---

# B. 新作を作る

## 1. Starterを複製

原本Starterを直接編集せず、必ずフォルダごと複製します。

```text
SukimaStock-Starter-v0.1.1
  ↓ 複製
作品ID
```

## 2. 最初に作品情報を決める

最低限、次を変更します。

- `sketch.js` の `SSE.createApp()` 内の `id`
- `index.html` の `<title>`
- 作品固有のTEXT、Scene、state
- 湯間庭町へ置く作品は、公開前までに `bridge.workId` と作品IDを一致させる

作品IDは英小文字・数字・ハイフンだけにし、一度決めたら原則変更しません。

## 3. Koder + Patcherで制作

```text
sketch.jsを更新
  ↓
index.htmlをPreview
  ↓
確認
  ↓
PatcherまたはKoderで修正
  ↓
Reload
```

画像や音声も作品フォルダ内で完結させます。

この段階ではKoder側の作品フォルダが正本です。

## 4. 共通改善を見つけたとき

作品制作中に共通化したい処理が見つかっても、まず作品側で完成させます。

```text
作品で必要になる
  ↓
作品側で実装・確認
  ↓
別作品でも必要になる
  ↓
Engine / Blank用パッチへ整理
  ↓
原本Starterへ反映
```

---

# C. 完成判定

公開工程へ進む前に確認します。

- Koder Previewで起動する
- 主操作がiPhone実機で通る
- Scene遷移が意図どおり
- 保存を使う作品は再読込後も必要データが残る
- 共有を使う作品は実端末で共有またはfallbackを確認
- 外部Webフォントを使う場合は実ブラウザで確認
- 作品IDが仮IDではない
- `bridge.workId` を使う場合は作品IDと一致
- 必要な画像・音声が全部作品フォルダ内にある
- `index.html` を単体で開いて動く

ここまで通ったら「制作完了」です。

---

# D. 湯間庭町へ公開する

ここからは順番が重要です。

## 5. まずWorking Copyを完全に同期する

**作品フォルダをコピーする前に** Working Copyを開きます。

1. `yumaniwa-town` で Pull
2. Statusを確認
3. `HEAD / main / origin/main` が同じコミットであることを確認
4. 未コミットの変更がないことを確認

この時点ではWorking Copyをcleanな状態にしておきます。

## 6. YumaniwaDeskの安全ロックを解除する

Working Copy内の `yumaniwa-town` 直下または `tools/` に置いたYumaniwaDeskを起動します。

`案内` タブで、

1. `Working CopyのStatusを開く`
2. 状態をもう一度確認
3. `Pull・同期状態を確認済み`

を押します。

**この同期確認を済ませてから作品フォルダをコピーします。**

YumaniwaDesk v0.8は、同期確認済みセッションでないと `works.js` や `updates.js` を書き換えません。

## 7. Koderの完成作品をWorking Copyへコピーする

Koder側の完成作品フォルダを、

```text
yumaniwa-town/
  works/
    <作品ID>/
```

へフォルダごとコピーします。

例:

```text
Koder/new-work/
  ↓
yumaniwa-town/works/new-work/
```

ここから先は、公開版の正本をWorking Copy側へ切り替えます。

---

# E. YumaniwaDeskへ作品登録

## 8. `作品` タブを開く

新規作品では次のように入力します。

### 基本

- `作品ID`：フォルダ名・`SSE.createApp()`のid・bridgeのworkIdと同じ
- `作品名`
- `設置場所`：レジャー / 灯串横丁
- `分類`：触れるらくがき / ゲーム
- `公開状態`：完成済みなら公開中
- `開き方`：町内

### 起動先

`entry` は通常 **空欄でOK** です。

空欄ならDeskが自動的に、

```text
./works/<作品ID>/index.html
```

を使います。

### 町内フレーム

特別な理由がなければ自動設定のままで構いません。

- `frameTitle`：空欄なら作品名
- `returnLabel`：設置場所から自動
- `frameMode`：レジャーならsoft、横丁ならstandard
- `playerLayout / playerWidth / playerHeight`：必要な作品だけ設定

### 施設メニュー

必要に応じて設定します。

- `menuTitle`
- `menuCategory`
- `menuDescription`
- `短い説明`
- `準備中メッセージ`

## 9. ここだけ必ずOFFにする

今回は作品フォルダをKoderからすでにコピーしているため、

**`町内プレイヤー用の作品フォルダを雛形から作る` をOFF**

にします。

ONのままだと、すでに存在する `works/<作品ID>/` と衝突します。

今後の固定ルール:

```text
Starterで制作した新作
  → フォルダは自分でコピー
  → YumaniwaDeskの雛形作成はOFF
```

## 10. `作品を登録する`

登録前にDeskが次を検証します。

- 作品IDの形式
- 作品IDの重複
- 公開中の町内作品なら `entry` のindex.htmlが存在するか
- 数値サイズ指定が正しいか

登録すると、Deskは `data/works.js` に1件追加します。

作品の `sketch.js` やEngineをDeskが書き換えることはありません。

保存前の `works.js` はリポジトリ外へ自動バックアップされます。

---

# F. 更新履歴を登録

## 11. 必要なら `履歴` タブへ

入力するもの:

- 日付
- 見出し
- 本文
- タグ（任意、カンマ区切り）

`更新履歴を追加する` を押すと `data/updates.js` に1件追加されます。

履歴を残さない公開なら、この工程は省略できます。

---

# G. Desk内で最終確認

## 12. `安全` タブを確認

`安全` タブで、

- dataファイルの基本構文
- 更新用マーカー
- 作品ID重複
- 公開中作品のentry
- itch.io / 外部URLの条件

などを確認します。

「重大な問題は見つかりませんでした」になれば次へ進みます。

Deskで保存した後に上部へ **`未Push確認あり`** と出るのは正常です。

---

# H. Working Copy → GitHub

## 13. Working CopyのStatusで差分確認

期待する差分は基本的に次だけです。

```text
works/<作品ID>/...   新しい作品一式
data/works.js        YumaniwaDeskの作品登録
data/updates.js      履歴を書いた場合だけ
```

それ以外のファイルが変わっていたら、理由を確認してから進みます。

## 14. Commit

例:

```text
Add <work name>
Update <work name>
```

作品追加と台帳・履歴は、通常は1つのCommitにまとめて構いません。

## 15. Push

GitHubへPushします。

---

# I. 本番確認

## 16. 3段階で確認

### 1. 作品単体

```text
/works/<作品ID>/index.html
```

### 2. 湯間庭町の作品表示

```text
/?work=<作品ID>
```

### 3. 実際の町内導線

- レジャーセンターまたは灯串横丁から開く
- 戻る
- 再入場
- タッチ操作
- 音
- 必要なら共有・保存

まで確認します。

可能ならSafariだけでなく、実際の利用が多いX内ブラウザでも最後に確認します。

---

# J. Push後

YumaniwaDeskの `未Push確認あり` は、GitHubのPush状態を自動検知して消す仕組みではありません。

次回Deskを使うときに、

1. Working CopyでPull / Status確認
2. cleanであることを確認
3. `Pull・同期状態を確認済み`

を押すと、新しい安全セッションになり警告もクリアされます。

---

# 最短版

## 新作制作

```text
Starter複製
→ 作品ID設定
→ Koder + Patcher
→ Preview / Reload
→ 完成
```

## 公開

```text
Working Copy Pull
→ clean確認
→ YumaniwaDeskで「同期確認済み」
→ Koder作品を works/<id>/ へコピー
→ Desk「作品」
→ 雛形作成OFF
→ 作品登録
→ 必要なら「履歴」
→ 「安全」
→ Working Copy差分確認
→ Commit
→ Push
→ 本番3段階確認
```

## Starter更新

```text
共通改善
→ Patcherで原本Starter更新
→ index.demo.html確認
→ Validation
→ 次の新作から使用
```

---

# 一番大事な3ルール

1. **制作中はKoderを正本にする**
2. **Working CopyをcleanにしてDeskの同期確認を済ませてから、完成作品をコピーする**
3. **Starter作品を登録するときはYumaniwaDeskの「雛形から作る」をOFFにする**
