# coding: utf-8
"""
Yumaniwa Desk v0.10.22
Pythonista 用:湯間庭町の「中身」だけを安全に更新する小さな管理室。

Working Copy 運用の想定配置:
  yumaniwa-town-staging/      ← GitHub から clone した staging 専用ローカルコピー
    tools/
      YumaniwaDesk.py         ← このファイルをここへ置く(直下でも可)
    data/notes.js
    data/works.js
    data/updates.js
    works/_template/

日々の追加と、別室での過去記録編集を安全に扱います。
Webの開発モードで書き出した駅前広場 / 町マップの編集データも安全に取り込めます。
main.js / engine / 作品の sketch.js は直接編集しません。
設定・バックアップ・Undo情報はリポジトリ外の Pythonista Documents に保存します。

v0.10.22:
- baseCollisionGrid を正本由来の固定collision専用にし、edgeWarp carveをruntime collisionGridだけへ分離
- collision editor serializerのcomposite grid fallbackを廃止してfail-closed化
- edgeWarp / collision serializerの再退行を安全確認で検出

v0.10.21:
- town-editor-spatial-20260823.js を正式な town-editor-spatial.js へ移行
- spatial editorのruntime関数上書き / load後setTimeout / 旧collision同期wrapperを廃止
- areaZones / trigger範囲編集を YUMANIWA_SPATIAL_EDITOR の明示hookへ統一
- collision差分exportを getEditorCollisionData() へ復旧し、削除済みfull-export API依存を解消
- spatial moduleとcollision serializerの再退行を安全確認で検出

v0.10.20:
- town-staging-20260823.js を廃止し、staging専用runtime wrapperを撤去
- 古い駅前座標patch / 非正本interaction px editor / 死んだcollision wrapperを削除
- 調べる範囲・単独trigger・削除ボタンの有用なUI文言だけ正本へ統合
- town-staging-20260823.js の再導入やindex読込を安全確認で検出

v0.10.19:
- station guide refresh / hotfix を main.js + style.css へ統合し、後付けwrapperを廃止
- town arrival refresh を main.js へ統合し、表示文言・灯り演出の正本を一本化
- 案内図からtown sceneへ移動する処理を isTownScene ベースの共通経路へ統一
- 旧patchファイルやindex読込が再導入された場合、安全確認でエラー

v0.10.18:
- WORLD OBJECT定義を逆引きし、scene / Editor catalog / dynamic propから未参照の定義を検出
- 管理対象PROP画像を逆引きし、WORLD OBJECTから未参照の孤児画像を検出
- station ghost NPCをWORLD OBJECT化し、dynamic propもobjectId-only契約へ統一
- 旧station PROP画像7件を孤児として削除

v0.10.17:
- town propの画像正本を data/world-objects.js に一本化し、placement.src fallbackを廃止
- station-plaza.js / town-maps.js のprop src重複を禁止
- WORLD OBJECT srcが実ファイルとして存在するか安全確認で検証
- Editor新規配置をobjectId-onlyへ変更し、旧src経路の再導入を検出

v0.10.16:
- 全town sceneに共通schema検証を導入し、未訪問sceneも起動時に一括検査
- mapWidth / mapHeight / spawnPoints.default / collision・trigger等の必須配列をruntime補完せずfail-closed
- edgeWarpsのtarget scene / targetSpawn参照切れを起動時に検出
- 初期playerのscene前fallbackを廃止し、validated scene適用だけが実座標を設定
- scene schema fallbackの再導入を安全確認で検出

v0.10.15:
- 起動時の BG_IMAGE_PATH / collision globals fallbackを廃止し、canonical scene欠落時はfail-closed
- 町内ワープは遷移前にscene定義を必須確認し、欠落時に現在sceneを壊さない
- 旧bootstrap background Image経路を削除し、背景読込はtown scene cacheへ一本化
- 旧起動fallbackの再導入を安全確認で検出

v0.10.14:
- PLAYER_START の二重管理を廃止し、初期player位置も station scene の spawnPoints.default を正本化
- main.js の旧「完全版書き出し」実装を削除し、Web Editor書き出しを diff-v1 専用へ統一
- PLAYER_START / 旧full-file exporter の再導入を安全確認で検出

v0.10.13:
- station_plaza scene定義の正本を data/station-plaza.js に一本化
- data/town-maps.js に station_plaza: { ... } が再導入されていないことを安全確認で検証
- station-plaza.js のscene builder契約を安全確認し、欠落時はエラー
- runtimeでstation正本を後上書きする構造を廃止した前提を検証

v0.10.12:
- Town Editor正本とDesk管理の works / updates 更新時に対応scriptのcache fingerprintを index.html へ同一transactionで自動反映
- cache keyを手書き日付ではなく正本内容から決まる auto-XXXXXXXX 形式へ統一
- station / town-maps / ghost / works / updates と index.html の対応を安全確認で検証
- index.html更新もバックアップ・rollback対象へ含め、正本だけ更新された半端な状態を防止
- HTMLはJS構文検証対象から除外し、JS正本だけ従来どおりbasic_js_balanceを実行

v0.10.11:
- staging判定をフォルダ名だけでなく data/repository-identity.json の固定identityで検証
- Pythonistaから.gitが見える場合は origin が SukimaStock/yumaniwa-town-staging、branch が main であることも必須化
- HEAD と origin/main の参照を読める場合は同期一致を自動確認し、不一致なら安全ロックを解除しない
- .git がFile Providerから非公開の場合は repository identity を必須の代替証明とし、従来の手動同期確認を維持
- 同期確認時のHEADを記録し、確認後にHEADが変わった場合も安全ロックを自動で閉じる

v0.10.10:
- Town Editor取り込みを yumaniwa-editor-diff-v1 専用に統一
- 旧「駅前完全版 / 町マップ1シーン完全版」取り込みを廃止し、全体置換経路をfail-closed化
- 旧完全版専用の解析・置換・検証コードと、apply側の1ファイル互換分岐を削除
- 旧形式を貼り付けた場合は、現在の「変更差分をコピー」を使うよう明示して拒否

v0.10.9:
- おばけNPC専用sourceも var prop / var trigger を安全に読み取り、通常差分と同じbefore照合を実施
- おばけNPC propは位置・サイズ・footY・collisionだけ更新可、triggerはareaだけ更新可に契約を明確化
- 古い/改変済みbeforeを持つおばけNPC差分はfail-closedで拒否

v0.10.8:
- collision.before照合を矩形配列の完全一致からセル意味一致へ変更
- passableRects / blockedRects / blockedPoints をruntimeと同じ優先順でセル展開し、矩形分割や配列順だけの差は許容
- 通行可能/不可の意味が1セルでも違う場合は従来どおり拒否

v0.10.7:
- propsのbefore照合をEditorと同じ永続化形へ正規化し、runtime補完値だけで競合しないよう修正
- prop.triggerArea はruntime/editor bridgeとして照合・保存対象から除外
- 灯串横丁WORLD OBJECT shopへ実行時補完されていた catalogKey=worldObjectShop も保存対象から除外
- src / objectId / collision / interaction / 座標等のbefore照合は従来どおり厳密に維持

v0.10.6:
- Town Editorの複数ファイル反映で、書込途中・再読込・検証・transaction完了のどこで例外が起きても全対象をバックアップからrollback
- rollback失敗時は対象ファイル名を含めて明示し、部分反映を黙って残さない
- 反映後検証失敗も同じrollback経路へ統合

v0.10.5:
- 駅前の更新履歴看板 / おたより箱の配置・trigger差分を data/station-plaza.js に一本化
- town-update-sign.js / town-feedback-box.js をTown Editor差分の反映先から除外
- おばけNPCだけは専用 town-ghost-npc.js を正本として維持
- 古い専用JS向け差分はfail-closedで拒否

v0.10.4:
- Town Editor差分の正本を現在の構造へ合わせ、data/town-runtime-fixes.js を反映先から除外
- 町パーツの配置正本は station_plaza → data/station-plaza.js、それ以外 → data/town-maps.js に統一
- 旧 no_entry_sign / standing_signboard / yakitori_yumado_shop / common_temporary_storefront のruntime直接書換え互換を撤去
- 古い差分が runtime-fixes.js をsourceに指定した場合はfail-closedで拒否

v0.10.3:
- Files / Pythonista 経由で __file__ から Working Copy を辿れない場合、保存済みの旧 project_root を「探索ヒント」としてのみ利用
- 保存済みが production の場合、その同じ親フォルダにある yumaniwa-town-staging だけを候補にして厳密検証
- staging と検証できた実パスだけを project_root として保存し、production 自体は引き続き接続拒否
- 「stagingを再検出」もスクリプト位置・保存済みstaging・旧productionの兄弟stagingの順に安全探索

v0.10.2:
- 「Pull・同期状態を確認済み」後の画面再描画を Pythonista のメインUIスレッドへ戻すよう修正
- 同期確認直後に safe_session_info を再検証し、ロック解除に失敗した場合は無反応にせず理由を表示
- background action 内での例外を同期確認ボタン上で明示表示し、止まったように見える状態を防止

v0.10.1:
- Pythonista の Files / Working Copy 経由起動で、未接続時に os.path.abspath("") が cwd へ触れて PermissionError になる問題を修正
- 未接続時は project key / repo name を純粋な文字列処理だけで扱い、ファイルシステムへ触れないよう fail-closed を強化
- staging 探索中の PermissionError / OSError は「未接続」として安全に扱う

v0.10:
- YumaniwaDesk を staging 専用ツールへ変更し、本番 yumaniwa-town への接続・書き込みを拒否
- 起動場所の検出に失敗したとき、前回の project_root を再利用するフォールバックを廃止して fail-closed 化
- Working Copy の Status 導線を yumaniwa-town-staging 固定へ変更
- 同期確認・未Push状態をプロジェクト単位で保存し、この起動中に確認した staging と一致するときだけ書き込み許可
- 書き込み直前にも staging identity を再検証し、production 誤編集を二重に防止
- staging の noindex,nofollow を「このリポジトリを確認する」で検証
- 画面上に STAGING を常時表示し、production は branch → PR → safety checks → merge で昇格する運用を明記

v0.9.2:
- update / delete の before を現在の正本と照合し、古い差分や別経路の上書きを拒否
- collision / areaZones も before を照合してから反映
- data/town-maps.js / data/station-plaza.js の配列オブジェクトを安全なJSリテラル解析で確認
- props / triggers 配列が未作成のシーンでも、最初の add で配列を安全に新設

v0.9.1:
- 開発モード差分の props / triggers で add / update / delete を正式対応
- add はID重複を拒否、delete は対象IDの存在を確認してから安全に配列へ反映
- 新規パーツ・新規コメント・旧仮トリガー削除を1回の差分取り込みで処理可能

v0.9:
- Web開発モードの yumaniwa-editor-diff-v1 差分形式を正式対応
- 1回の取り込みで複数の正本ファイルを安全にまとめて更新
- props / triggers / collision / areaZones の差分だけを反映し、完全版置換を不要化
- source ごとに反映先を検証し、複数ファイルを一括バックアップ・SHA-256再確認
- 旧形式（駅前完全版 / 町マップ1シーン完全版）も互換維持

v0.8.2:
- 同期確認が終わるまで[記事][作品][履歴][町]の編集UIを表示しない安全ロックを追加
- Deskを起動し直した場合は、前回の確認時刻に関係なくWorking Copyの同期確認を再必須化
- 過去記録の編集室も同期確認前は開かないよう統一

v0.8.1:
- 白い入力欄に合わせ、入力済み文字を濃色へ調整
- TextField のプレースホルダー色を明示指定し、薄すぎる表示を改善

v0.8:
- 書き込み前に「Working Copy同期確認済み」の作業セッションを必須化
- 保存後は未Push状態を記録し、次回起動時にも警告
- Working CopyのStatus画面をDeskから1タップで開ける導線を追加
- 町の取り込み時に既存シーンのフィールド消失を検出して拒否
- 町データのID重複・参照切れ・画像不足・異常座標を事前検証
- 反映内容の要約(パーツ/トリガー/当たり判定)を保存前に表示
- 書き込み後に期待した内容と完全一致するかSHA-256で再確認
- ボタンの多重タップを抑止

v0.7.1:
- 開発モード書き出しの判定を、日本語説明文の完全一致からコード構造ベースへ変更
- iOSクリップボード経由で説明文の文字表現が変化しても取り込めるよう改善

v0.7:
- 「町」タブを追加し、開発モードの「書き出す」コードをクリップボードから取り込み
- 駅前広場は data/station-plaza.js の完全版として安全に反映
- 灯串横丁などの町マップは data/town-maps.js 内の該当シーン定義だけを置換
- 取り込み前に対象・差分有無を確認し、反映前のファイルをリポジトリ外へ自動バックアップ
- 取り込み後も[安全]から直前の更新をUndo可能
- 反映前のプレビュー後に対象ファイルが変化していた場合は取り込みを中止

v0.6.1:
- Pythonista の Button action を ui.in_background で実行し、確認・保存ダイアログが反応しない問題を修正

v0.6:
- Working Copy の clone 内から起動すると、親フォルダをたどって湯間庭町を自動認識
- 設定・バックアップ・Undo情報を Git 管理外の Pythonista Documents/YumaniwaDesk-data へ分離
- File Provider 上で atomic replace が使えない場合の安全な書き込みフォールバックを追加
- 「ファイルを選んで接続」方式をやめ、Working Copy 内からの自動検出を標準運用に変更

v0.5.1:
- 施設メニュー専用の短い表示名(menuTitle)を正式対応

v0.5:
- itch.io埋め込み(itch_embed)を作品台帳で正式対応
- 現在の works.js の表示設定を追加・編集画面で安全に保持
- 数値フィールド(playerWidth / playerHeight)を読み取り・保存
- 既存作品編集時に未編集の追加フィールドをできるだけ保持
- 公開中 itch.io 作品の embedUrl を安全確認

v0.4.2:
- 編集室(全画面表示)の上部にセーフゾーンを追加
- iPhoneの時刻・通信・バッテリー表示と、独自ヘッダーが重ならないよう修正

v0.4.1:
- Pythonista ui.Button の非公開 title_label へのアクセスを廃止
- 過去記録の一覧を安定した1行ボタン表示へ修正

v0.4:
- 追加画面と過去記録の編集室を分離
- note記事・作品・更新履歴の既存データを編集可能に
- 過去の記録は専用入口と保存前確認を必須化
- 削除機能は持たせず、必要なら作品は非表示へ変更

v0.2:
- ui.View の基底初期化を追加
- __file__ が無いPythonista起動でも作業フォルダへフォールバック
- did_load に依存せず、layout時に初期画面を構築
- 起動エラーの詳細をコンソールとアラートへ表示
- タブ切替時のページ削除を Pythonista の remove_subview() へ修正
"""

from __future__ import print_function

import datetime
import ast
import hashlib
import math
import json
import os
import re
import shutil
import tempfile
import uuid
import traceback
import webbrowser

try:
    import ui
    import dialogs
    import console
    import clipboard
except ImportError:
    raise RuntimeError("このアプリは Pythonista で実行してください。")


APP_NAME = "Yumaniwa Desk — STAGING"

# Pythonistaでは起動方法によって __file__ が無い場合があります。
# note.py / rakugaki_cabinet.py と同じく、安全に作業フォルダへフォールバックします。
try:
    _script_path = str(__file__ or "")
except NameError:
    _script_path = ""

# File Provider 経由で cwd に権限がない場合があるため、
# 空パスを abspath/getcwd で解決しない。取得できなければ未接続で開始する。
try:
    APP_DIR = os.path.dirname(os.path.normpath(_script_path)) if _script_path else ""
except Exception:
    APP_DIR = ""

# Working Copy のリポジトリを汚さないため、Desk 自身の管理データは
# Pythonista の Documents 側へ分離します。
PYTHONISTA_DOCUMENTS = os.path.abspath(os.path.expanduser("~/Documents"))
DESK_DATA_DIR = os.path.join(PYTHONISTA_DOCUMENTS, "YumaniwaDesk-data")
SETTINGS_PATH = os.path.join(DESK_DATA_DIR, "settings.json")
BACKUP_ROOT_DIR = os.path.join(DESK_DATA_DIR, "backups")
STATE_ROOT_DIR = os.path.join(DESK_DATA_DIR, "state")
LAST_TRANSACTION_NAME = "last_transaction.json"
MAX_BACKUPS = 40
SAFE_SESSION_MAX_MINUTES = 180
OPERATION_STATE_KEY = "operation_state_by_project"
EXPECTED_PROJECT_DIR_NAME = "yumaniwa-town-staging"
PRODUCTION_PROJECT_DIR_NAME = "yumaniwa-town"
WORKING_COPY_REPO_NAME = EXPECTED_PROJECT_DIR_NAME
EXPECTED_GITHUB_REPOSITORY = "SukimaStock/yumaniwa-town-staging"
EXPECTED_GIT_BRANCH = "main"
REPOSITORY_IDENTITY_PATH = "data/repository-identity.json"
REPOSITORY_IDENTITY_SCHEMA = "yumaniwa-repository-identity/1"

# 同期確認は「このDeskを起動している間」だけ有効にする。
# settings.json には前回確認時刻を残すが、アプリを起動し直したら必ず再確認する。
RUNTIME_SYNC_CONFIRMED = False
RUNTIME_SYNC_PROJECT_KEY = ""

COLORS = {
    "bg": "#11161B",
    "panel": "#192129",
    "panel_alt": "#202A33",
    "line": "#31404B",
    "text": "#F1F1E8",
    "muted": "#AAB7BD",
    "accent": "#D5A45D",
    "accent_dark": "#7B5A2F",
    "green": "#6FAE8C",
    "red": "#D97872",
    "blue": "#84AAC4",
    "input": "#0F151A",
    "input_text": "#1B2329",
    "placeholder": "#9AA8AE",
}

REQUIRED_DATA = {
    "notes": ("data/notes.js", "NOTE_ARTICLES", "[NOTES:ADD_NEWEST_HERE]"),
    "works": ("data/works.js", "WORKS", "[WORKS:ADD_NEWEST_HERE]"),
    "updates": ("data/updates.js", "TOWN_UPDATES", "[UPDATES:ADD_NEWEST_HERE]"),
}


# -----------------------------------------------------------------------------
# 基本ユーティリティ
# -----------------------------------------------------------------------------

def today_iso():
    return datetime.date.today().isoformat()


def compact_date(value):
    return re.sub(r"[^0-9]", "", value or "")


def safe_read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def atomic_write(path, text):
    """
    可能なら同一フォルダ内の一時ファイルから atomic replace します。
    Working Copy など File Provider 上で replace が拒否される場合だけ、
    事前バックアップ済みであることを前提に直接書き込みへフォールバックします。
    """
    folder = os.path.dirname(path)
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(prefix=".yumaniwa-", suffix=".tmp", dir=folder)
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        try:
            shutil.copymode(path, tmp_path)
        except Exception:
            pass
        os.replace(tmp_path, path)
        tmp_path = None
        return
    except Exception:
        # iOS の外部 File Provider では POSIX rename/replace が使えないことがある。
        # Git + Desk の外部バックアップがあるため、最後の手段として直接上書きする。
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def safe_json_dump(data, path):
    folder = os.path.dirname(path)
    if not os.path.isdir(folder):
        os.makedirs(folder)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def js_string(value):
    return json.dumps(str(value), ensure_ascii=False)


def js_list(values):
    return "[" + ", ".join(js_string(v) for v in values) + "]"


def path_is_inside(child_path, parent_path):
    try:
        return os.path.commonpath([os.path.abspath(child_path), os.path.abspath(parent_path)]) == os.path.abspath(parent_path)
    except ValueError:
        return False


def relative_safe_path(value):
    if not value:
        return ""
    value = value.replace("\\", "/").strip()
    while value.startswith("./"):
        value = value[2:]
    if value.startswith("/") or value.startswith("../") or "/../" in value:
        return None
    return value


def project_looks_valid(root):
    if not root:
        return False
    try:
        if not os.path.isdir(root):
            return False
        required = [
            "index.html",
            "data/notes.js",
            "data/works.js",
            "data/updates.js",
            "works",
        ]
        return all(os.path.exists(os.path.join(root, rel)) for rel in required)
    except (OSError, PermissionError):
        return False


def project_repo_name(root):
    # 空パスを abspath() すると Pythonista が cwd を参照するため、
    # 未接続時は純粋な文字列処理だけで返す。
    value = str(root or "").strip()
    if not value:
        return ""
    try:
        return os.path.basename(os.path.normpath(value))
    except Exception:
        return ""


def _read_optional_text(path):
    try:
        if not os.path.isfile(path):
            return ""
        return safe_read(path).strip()
    except (OSError, PermissionError, UnicodeError):
        return ""


def _normalize_github_repository(remote_url):
    value = str(remote_url or "").strip().replace("\\", "/")
    if not value:
        return ""
    match = re.search(
        r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$",
        value,
        re.IGNORECASE,
    )
    if not match:
        return ""
    return (match.group(1) + "/" + match.group(2)).strip("/").lower()


def _git_dir_for_project(root):
    value = str(root or "").strip()
    if not value or not os.path.isabs(value):
        return "", False, ""

    dotgit = os.path.join(value, ".git")
    try:
        if os.path.isdir(dotgit):
            return dotgit, True, ""
        if not os.path.isfile(dotgit):
            return "", False, ""
        pointer = _read_optional_text(dotgit)
        match = re.match(r"gitdir:\s*(.+)$", pointer, re.IGNORECASE)
        if not match:
            return "", True, ".git の参照先を読めません。"
        target = match.group(1).strip()
        if not os.path.isabs(target):
            target = os.path.normpath(os.path.join(root, target))
        if not os.path.isdir(target):
            return "", True, ".git の参照先が見つかりません。"
        return target, True, ""
    except (OSError, PermissionError) as exc:
        return "", True, ".git を読めません: " + str(exc)


def _origin_url_from_git_config(config_text):
    section = ""
    for raw_line in (config_text or "").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(("#", ";")):
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line.lower()
            continue
        if section == '[remote "origin"]' and "=" in line:
            key, value = line.split("=", 1)
            if key.strip().lower() == "url":
                return value.strip()
    return ""


def _read_git_ref(git_dir, ref_name):
    if not git_dir or not ref_name:
        return ""
    ref_path = os.path.join(git_dir, *ref_name.split("/"))
    value = _read_optional_text(ref_path)
    if re.fullmatch(r"[0-9a-fA-F]{40,64}", value or ""):
        return value.lower()

    packed = _read_optional_text(os.path.join(git_dir, "packed-refs"))
    for raw_line in packed.splitlines():
        line = raw_line.strip()
        if not line or line.startswith(("#", "^")):
            continue
        parts = line.split()
        if len(parts) == 2 and parts[1] == ref_name:
            if re.fullmatch(r"[0-9a-fA-F]{40,64}", parts[0]):
                return parts[0].lower()
    return ""


def git_repository_info(root):
    info = {
        "metadata_visible": False,
        "valid_identity": None,
        "remote_url": "",
        "repository": "",
        "branch": "",
        "head_commit": "",
        "origin_commit": "",
        "sync_state": "unknown",
        "error": "",
    }

    git_dir, present, error = _git_dir_for_project(root)
    if not present:
        return info

    info["metadata_visible"] = True
    if error or not git_dir:
        info["valid_identity"] = False
        info["error"] = error or ".git を確認できません。"
        return info

    config_text = _read_optional_text(os.path.join(git_dir, "config"))
    origin_url = _origin_url_from_git_config(config_text)
    repository = _normalize_github_repository(origin_url)
    head_text = _read_optional_text(os.path.join(git_dir, "HEAD"))
    branch = ""
    head_commit = ""

    if head_text.startswith("ref:"):
        ref_name = head_text.split(":", 1)[1].strip()
        prefix = "refs/heads/"
        if ref_name.startswith(prefix):
            branch = ref_name[len(prefix):]
        head_commit = _read_git_ref(git_dir, ref_name)
    elif re.fullmatch(r"[0-9a-fA-F]{40,64}", head_text or ""):
        head_commit = head_text.lower()

    origin_ref = "refs/remotes/origin/" + EXPECTED_GIT_BRANCH
    origin_commit = _read_git_ref(git_dir, origin_ref)

    info.update({
        "remote_url": origin_url,
        "repository": repository,
        "branch": branch,
        "head_commit": head_commit,
        "origin_commit": origin_commit,
    })

    expected_repo = EXPECTED_GITHUB_REPOSITORY.lower()
    if repository != expected_repo:
        info["valid_identity"] = False
        info["error"] = (
            "Git origin が想定stagingと一致しません: "
            + (origin_url or "origin URL 不明")
        )
        return info

    if branch != EXPECTED_GIT_BRANCH:
        info["valid_identity"] = False
        info["error"] = (
            "Git branch が "
            + EXPECTED_GIT_BRANCH
            + " ではありません: "
            + (branch or "detached / 不明")
        )
        return info

    info["valid_identity"] = True
    if head_commit and origin_commit:
        info["sync_state"] = "match" if head_commit == origin_commit else "mismatch"
    return info


def repository_identity_info(root):
    info = {
        "valid": False,
        "reason": "",
        "marker_valid": False,
        "git": git_repository_info(root),
    }

    if not project_looks_valid(root):
        info["reason"] = "staging プロジェクトを確認できません。"
        return info

    name = project_repo_name(root)
    if name != EXPECTED_PROJECT_DIR_NAME:
        if name == PRODUCTION_PROJECT_DIR_NAME:
            info["reason"] = (
                "YumaniwaDesk は staging 専用です。"
                "本番 yumaniwa-town への書き込みは拒否しました。"
            )
        else:
            info["reason"] = (
                "YumaniwaDesk は "
                + EXPECTED_PROJECT_DIR_NAME
                + " だけを編集します。現在のフォルダ: "
                + (name or "不明")
            )
        return info

    marker_path = os.path.join(root, REPOSITORY_IDENTITY_PATH)
    marker = load_json(marker_path, None)
    if not isinstance(marker, dict):
        info["reason"] = (
            REPOSITORY_IDENTITY_PATH
            + " を読めないため、staging identity を確認できません。"
        )
        return info

    marker_valid = (
        marker.get("schema") == REPOSITORY_IDENTITY_SCHEMA
        and marker.get("repository") == EXPECTED_GITHUB_REPOSITORY
        and marker.get("environment") == "staging"
        and marker.get("branch") == EXPECTED_GIT_BRANCH
    )
    if not marker_valid:
        info["reason"] = "repository identity の内容が想定stagingと一致しません。"
        return info
    info["marker_valid"] = True

    git_info = info["git"]
    if git_info.get("metadata_visible") and not git_info.get("valid_identity"):
        info["reason"] = git_info.get("error") or "Git identity を確認できません。"
        return info

    info["valid"] = True
    return info


def project_is_staging(root):
    return bool(repository_identity_info(root).get("valid"))


def require_staging_project(root):
    info = repository_identity_info(root)
    if not info.get("valid"):
        raise RuntimeError(info.get("reason") or "staging identity を確認できません。")
    return True


def find_project_root(start_path):
    value = str(start_path or "").strip()
    if not value:
        return None
    # cwd を暗黙参照しないため、相対パスは推測せず未接続にする。
    try:
        current = os.path.normpath(value)
        if not os.path.isabs(current):
            return None
        try:
            if os.path.isfile(current):
                current = os.path.dirname(current)
        except (OSError, PermissionError):
            return None
        for _ in range(9):
            if project_looks_valid(current):
                return current
            parent = os.path.dirname(current)
            if parent == current:
                break
            current = parent
    except (OSError, PermissionError):
        return None
    return None


def ensure_desk_data_dir():
    for path in (DESK_DATA_DIR, BACKUP_ROOT_DIR, STATE_ROOT_DIR):
        if not os.path.isdir(path):
            os.makedirs(path)


def project_storage_key(root):
    # 未接続でも cwd / File Provider に触れず安全に状態キーを作る。
    value = str(root or "").strip()
    if not value:
        return "unconnected"
    try:
        normalized = os.path.normpath(value)
    except Exception:
        normalized = value
    base = os.path.basename(normalized) or EXPECTED_PROJECT_DIR_NAME
    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "project"
    digest = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:8]
    return safe_base + "-" + digest


def project_backup_root(root):
    ensure_desk_data_dir()
    return os.path.join(BACKUP_ROOT_DIR, project_storage_key(root))


def project_state_dir(root):
    ensure_desk_data_dir()
    return os.path.join(STATE_ROOT_DIR, project_storage_key(root))


def last_transaction_path(root):
    return os.path.join(project_state_dir(root), LAST_TRANSACTION_NAME)


def backup_abs_from_transaction(root, transaction):
    value = (transaction or {}).get("backup_dir", "")
    if not value:
        return ""
    if os.path.isabs(value):
        return value
    # v0.5以前のトランザクションとの互換用。
    return os.path.join(root, value)


def read_settings():
    ensure_desk_data_dir()
    return load_json(SETTINGS_PATH, {}) or {}


def save_settings(data):
    ensure_desk_data_dir()
    safe_json_dump(data, SETTINGS_PATH)


def remember_verified_staging_root(root):
    require_staging_project(root)
    settings = read_settings()
    settings["project_root"] = str(root)
    save_settings(settings)


def staging_root_candidates():
    # 1) スクリプトの実パスから見つかる場合
    direct = find_project_root(APP_DIR)
    if direct:
        yield direct

    # 2) 過去に記録した実パスは「ヒント」としてのみ使う。
    #    そのパス自体が staging と検証できる場合のみ採用する。
    settings = read_settings()
    stored = str(settings.get("project_root") or "").strip()
    if not stored:
        return

    yield stored

    # 3) 旧版が production を記録していた場合は、同じ親フォルダの
    #    yumaniwa-town-staging だけを候補にする。production 自体は採用しない。
    try:
        if project_repo_name(stored) == PRODUCTION_PROJECT_DIR_NAME:
            parent = os.path.dirname(os.path.normpath(stored))
            if parent:
                yield os.path.join(parent, EXPECTED_PROJECT_DIR_NAME)
    except Exception:
        pass


def find_verified_staging_root():
    seen = set()
    for candidate in staging_root_candidates():
        value = str(candidate or "").strip()
        if not value or value in seen:
            continue
        seen.add(value)
        if project_is_staging(value):
            return value
    return ""


def default_project_root():
    # 自動検出できなくても、保存済みパスは必ず staging と再検証してから使う。
    root = find_verified_staging_root()
    if root:
        try:
            remember_verified_staging_root(root)
        except Exception:
            pass
        return root
    return ""


def _parse_iso_datetime(value):
    if not value:
        return None
    try:
        return datetime.datetime.fromisoformat(str(value))
    except Exception:
        return None


def operation_state(root):
    settings = read_settings()
    states = settings.get(OPERATION_STATE_KEY, {})
    if not isinstance(states, dict):
        states = {}
    state = states.get(project_storage_key(root), {})
    return dict(state) if isinstance(state, dict) else {}


def save_operation_state(root, state):
    settings = read_settings()
    states = settings.get(OPERATION_STATE_KEY, {})
    if not isinstance(states, dict):
        states = {}
    states[project_storage_key(root)] = dict(state or {})
    settings[OPERATION_STATE_KEY] = states
    save_settings(settings)


def safe_session_info(root):
    # 未接続中は settings の project state すら読まず、完全にロック状態を返す。
    identity = repository_identity_info(root)
    git_info = identity.get("git") or {}
    if not identity.get("valid"):
        return {
            "valid": False,
            "confirmed_at": None,
            "age_minutes": None,
            "pending_push": False,
            "last_change_label": "",
            "last_change_files": [],
            "git": git_info,
            "identity_reason": identity.get("reason") or "",
        }

    state = operation_state(root)
    confirmed = _parse_iso_datetime(state.get("sync_confirmed_at"))
    age_minutes = None
    valid = False
    root_key = project_storage_key(root)
    if confirmed is not None:
        try:
            age_minutes = max(0.0, (datetime.datetime.now() - confirmed).total_seconds() / 60.0)
            valid = (
                bool(RUNTIME_SYNC_CONFIRMED)
                and RUNTIME_SYNC_PROJECT_KEY == root_key
                and age_minutes <= SAFE_SESSION_MAX_MINUTES
            )

            # .git を読める場合は、確認後のbranch/remote逸脱や
            # HEAD変更・origin/main不一致も自動的に安全ロックへ戻す。
            if git_info.get("metadata_visible"):
                if not git_info.get("valid_identity"):
                    valid = False
                if git_info.get("sync_state") == "mismatch":
                    valid = False
                confirmed_head = str(state.get("sync_head_commit") or "")
                current_head = str(git_info.get("head_commit") or "")
                if confirmed_head and current_head and confirmed_head != current_head:
                    valid = False
        except Exception:
            valid = False

    return {
        "valid": valid,
        "confirmed_at": confirmed,
        "age_minutes": age_minutes,
        "pending_push": bool(state.get("pending_push")),
        "last_change_label": str(state.get("last_change_label") or ""),
        "last_change_files": list(state.get("last_change_files") or []),
        "git": git_info,
        "identity_reason": "",
    }


def confirm_safe_session(root):
    global RUNTIME_SYNC_CONFIRMED, RUNTIME_SYNC_PROJECT_KEY
    require_staging_project(root)

    git_info = git_repository_info(root)
    if git_info.get("metadata_visible"):
        if not git_info.get("valid_identity"):
            raise RuntimeError(git_info.get("error") or "Git identity を確認できません。")
        if git_info.get("sync_state") == "mismatch":
            raise RuntimeError(
                "HEAD と origin/main が一致していません。"
                "Working Copy で Pull / Push 状態を確認してから再実行してください。"
            )

    state = operation_state(root)
    now = datetime.datetime.now().isoformat(timespec="seconds")
    state["sync_confirmed_at"] = now
    state["pending_push"] = False
    state["last_sync_confirmed_at"] = now
    state["sync_head_commit"] = str(git_info.get("head_commit") or "")
    save_operation_state(root, state)
    RUNTIME_SYNC_CONFIRMED = True
    RUNTIME_SYNC_PROJECT_KEY = project_storage_key(root)


def require_safe_write_session(root):
    # 書き込み直前に環境をもう一度検証する。UIの接続状態だけを信用しない。
    require_staging_project(root)
    info = safe_session_info(root)
    if info.get("valid"):
        return True
    git_info = info.get("git") or {}
    if git_info.get("sync_state") == "mismatch":
        raise RuntimeError(
            "安全ロック中です。HEAD と origin/main が一致していません。"
            "Working Copy で同期してから再確認してください。"
        )
    raise RuntimeError(
        "安全ロック中です。書き込む前に[案内]で staging の Working Copyを開き、"
        "Pull後に HEAD / main / origin/main が一致し、未コミット変更がないことを確認してから"
        "「同期確認済み」を押してください。"
    )


def mark_pending_push(root, label, files):
    state = operation_state(root)
    state["pending_push"] = True
    state["last_change_label"] = str(label or "update")
    state["last_change_files"] = list(files or [])
    state["last_change_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    save_operation_state(root, state)


# -----------------------------------------------------------------------------
# JavaScriptデータの「読むだけ」パーサ
# 外部ライブラリなしで、現在の data/*.js の単純な配列を確認する用途。
# 書き換えは必ずマーカー直後への追記だけで行う。
# -----------------------------------------------------------------------------

def find_matching(text, start_index, open_char, close_char):
    depth = 0
    i = start_index
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue

        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_array_body(text, var_name):
    match = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*\[", text)
    if not match:
        return ""
    open_index = text.find("[", match.start())
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0:
        return ""
    return text[open_index + 1:close_index]


def extract_object_blocks(array_body):
    blocks = []
    i = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < len(array_body):
        ch = array_body[i]
        nxt = array_body[i + 1] if i + 1 < len(array_body) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue

        if ch == "{":
            end = find_matching(array_body, i, "{", "}")
            if end < 0:
                break
            blocks.append(array_body[i:end + 1])
            i = end + 1
            continue
        i += 1
    return blocks



def extract_array_bounds(text, var_name):
    match = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*\[", text)
    if not match:
        return None
    open_index = text.find("[", match.start())
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0:
        return None
    return open_index + 1, close_index


def extract_object_spans(text, start, end):
    spans = []
    i = start
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < end:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < end else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '\"', "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            close = find_matching(text, i, "{", "}")
            if close < 0 or close > end:
                break
            spans.append((i, close + 1))
            i = close + 1
            continue
        i += 1
    return spans


def replace_object_by_id(path, var_name, object_id, new_entry_text):
    text = safe_read(path)
    bounds = extract_array_bounds(text, var_name)
    if not bounds:
        raise ValueError("配列を見つけられません: " + var_name)
    for start, end in extract_object_spans(text, bounds[0], bounds[1]):
        fields = parse_object_fields(text[start:end])
        if fields.get("id") == object_id:
            atomic_write(path, text[:start] + new_entry_text.rstrip() + text[end:])
            return
    raise ValueError("編集対象の作品IDを見つけられません: " + object_id)


def replace_object_by_index(path, var_name, record_index, new_entry_text):
    """IDを持たない更新履歴を、配列内の読み取り順で安全に置換する。"""
    try:
        record_index = int(record_index)
    except Exception:
        raise ValueError("更新履歴の編集位置を特定できません。")

    text = safe_read(path)
    bounds = extract_array_bounds(text, var_name)
    if not bounds:
        raise ValueError("配列を見つけられません: " + var_name)
    spans = extract_object_spans(text, bounds[0], bounds[1])
    if record_index < 0 or record_index >= len(spans):
        raise ValueError("更新履歴の編集対象を見つけられません。")
    start, end = spans[record_index]
    atomic_write(path, text[:start] + new_entry_text.rstrip() + text[end:])


def parse_js_string(raw):
    try:
        return json.loads('"' + raw + '"')
    except Exception:
        return raw.replace(r'\"', '"').replace(r"\\", "\\")


def parse_object_fields(block):
    """data/*.js の単純なオブジェクトを、編集画面用に読み取る。"""
    result = {}
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\"((?:\\.|[^\"])*)\"", block):
        result[key] = parse_js_string(raw)
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(true|false)\b", block):
        result[key] = raw == "true"

    # works.js の表示サイズなど、単純な数値も安全に読む。
    # 文字列やコードは実行せず、数値リテラルだけを対象にする。
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(-?\d+(?:\.\d+)?)\b", block):
        if key in result:
            continue
        try:
            result[key] = float(raw) if "." in raw else int(raw)
        except ValueError:
            pass

    # 更新履歴の tags は文字列配列だけを扱う。ここではコードを実行しない。
    tag_match = re.search(r"\btags\s*:\s*\[([^\]]*)\]", block, re.S)
    if tag_match:
        result["tags"] = [
            parse_js_string(raw)
            for raw in re.findall(r'\"((?:\\.|[^\"])*)\"', tag_match.group(1))
        ]
    return result

def load_data_records(root, key):
    rel_path, var_name, _marker = REQUIRED_DATA[key]
    path = os.path.join(root, rel_path)
    text = safe_read(path)
    body = extract_array_body(text, var_name)
    records = []
    for index, block in enumerate(extract_object_blocks(body)):
        record = parse_object_fields(block)
        # 更新履歴にはIDがないため、配列内の順番だけを編集対象の識別に使う。
        # 保存時には対象ファイルを丸ごとバックアップするため、失敗時は戻せる。
        record["_record_index"] = index
        if key == "notes":
            record["_date_key"] = "publishedAt" if "publishedAt" in record else "publish_date"
        records.append(record)
    return records


def basic_js_balance(text):
    stack = []
    pairs = {"}": "{", "]": "[", ")": "("}
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    for i, ch in enumerate(text):
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            continue
        if ch in "{[(":
            stack.append(ch)
        elif ch in "}])":
            if not stack or stack[-1] != pairs[ch]:
                return False, "括弧の対応が崩れている可能性があります。"
            stack.pop()
    if quote:
        return False, "閉じていない文字列があります。"
    if stack:
        return False, "閉じていない括弧があります。"
    return True, "OK"


# -----------------------------------------------------------------------------
# Web開発モードの書き出しデータ取り込み
# -----------------------------------------------------------------------------

def _sha256_text(text):
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _normalize_editor_export(text):
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    return text + ("\n" if text else "")


EDITOR_DIFF_FORMAT = "yumaniwa-editor-diff-v1"

# Town placement canonical sources:
# - station_plaza -> data/station-plaza.js
# - other town scenes -> data/town-maps.js
# Runtime compatibility code is intentionally not a diff destination.
EDITOR_DIFF_ALLOWED_SOURCES = {
    "data/station-plaza.js",
    "data/town-maps.js",
    "town-ghost-npc.js",
}


DESK_CACHE_BUST_SOURCES = {
    "data/station-plaza.js": "./data/station-plaza.js",
    "data/town-maps.js": "./data/town-maps.js",
    "town-ghost-npc.js": "./town-ghost-npc.js",
    "town-editor-spatial.js": "./town-editor-spatial.js",
    "data/works.js": "./data/works.js",
    "data/updates.js": "./data/updates.js",
}


def _cache_fingerprint(text):
    """
    JavaScript String.charCodeAt と同じUTF-16 code unit列に対するFNV-1a。
    暗号用途ではなく、正本内容とscript cache keyを1対1で結ぶための短いfingerprint。
    """
    raw = str(text or "").encode("utf-16le", "surrogatepass")
    value = 0x811C9DC5
    for i in range(0, len(raw), 2):
        code_unit = raw[i] | (raw[i + 1] << 8)
        value ^= code_unit
        value = (value * 0x01000193) & 0xFFFFFFFF
    return "{0:08x}".format(value)


def _cache_revision_for_text(text):
    return "auto-" + _cache_fingerprint(text)


def _find_script_src_tail(index_text, script_src):
    source = str(index_text or "")
    candidates = []

    for quote in ('"', "'"):
        prefix = "<script src=" + quote + script_src
        start = 0
        while True:
            position = source.find(prefix, start)
            if position < 0:
                break

            tail_start = position + len(prefix)
            tail_end = source.find(quote, tail_start)
            if tail_end < 0:
                raise ValueError(
                    "index.html のscript src引用符が閉じていません: " + script_src
                )

            tag_end = source.find(">", tail_end + 1)
            if tag_end < 0 or source[tail_end + 1:tag_end].strip():
                raise ValueError(
                    "index.html のscript参照形式を安全に解釈できません: " + script_src
                )

            candidates.append({
                "tail_start": tail_start,
                "tail_end": tail_end,
                "tail": source[tail_start:tail_end],
            })
            start = tail_end + 1

    if len(candidates) != 1:
        raise ValueError(
            "index.html のscript参照が1件ではありません: " + script_src
        )

    return candidates[0]


def _replace_script_cache_revision(index_text, script_src, revision):
    match = _find_script_src_tail(index_text, script_src)
    return (
        index_text[:match["tail_start"]]
        + "?rev="
        + revision
        + index_text[match["tail_end"]:]
    )


def _script_cache_revision(index_text, script_src):
    try:
        match = _find_script_src_tail(index_text, script_src)
    except ValueError:
        return None

    tail = match.get("tail") or ""
    if not tail.startswith("?"):
        return ""

    for item in tail[1:].split("&"):
        if item.startswith("rev="):
            return item.split("=", 1)[1]

    return ""


def cache_transaction_paths(rel_paths):
    result = []
    for rel in (rel_paths or []):
        value = str(rel or "").strip()
        if value and value not in result:
            result.append(value)

    if any(rel in DESK_CACHE_BUST_SOURCES for rel in result):
        if "index.html" not in result:
            result.append("index.html")

    return result


def refresh_cache_revisions(root, rel_paths):
    targets = [
        str(rel or "").strip()
        for rel in (rel_paths or [])
        if str(rel or "").strip() in DESK_CACHE_BUST_SOURCES
    ]
    if not targets:
        return False

    index_abs = os.path.join(root, "index.html")
    if not os.path.isfile(index_abs):
        raise FileNotFoundError("index.html がありません。")

    current = safe_read(index_abs)
    updated = current

    for rel in targets:
        source_abs = os.path.join(root, rel)
        if not os.path.isfile(source_abs):
            raise FileNotFoundError(rel + " がありません。")
        revision = _cache_revision_for_text(safe_read(source_abs))
        updated = _replace_script_cache_revision(
            updated,
            DESK_CACHE_BUST_SOURCES[rel],
            revision,
        )

    if updated != current:
        atomic_write(index_abs, updated)

    # 書き込み直後にも正本とcache keyの一致を確認する。
    verified_index = safe_read(index_abs)
    for rel in targets:
        expected = _cache_revision_for_text(
            safe_read(os.path.join(root, rel))
        )
        actual = _script_cache_revision(
            verified_index,
            DESK_CACHE_BUST_SOURCES[rel],
        )
        if actual != expected:
            raise ValueError(
                rel + " のcache fingerprint更新を確認できません。"
            )

    return updated != current


def _plan_editor_cache_bust(root, file_plans):
    changed_sources = [
        item for item in (file_plans or [])
        if item.get("changed") and item.get("target_rel") in DESK_CACHE_BUST_SOURCES
    ]
    if not changed_sources:
        return None

    index_rel = "index.html"
    index_abs = os.path.join(root, index_rel)
    if not os.path.isfile(index_abs):
        raise FileNotFoundError("index.html がありません。")

    current = safe_read(index_abs)
    updated = current

    for item in changed_sources:
        source = item.get("target_rel")
        script_src = DESK_CACHE_BUST_SOURCES[source]
        revision = _cache_revision_for_text(item.get("new_text", ""))
        updated = _replace_script_cache_revision(updated, script_src, revision)

    return {
        "target_rel": index_rel,
        "current_hash": _sha256_text(current),
        "new_hash": _sha256_text(updated),
        "new_text": updated,
        "changed": current != updated,
    }


def _extract_editor_diff_manifest(text):
    """コメント付きの開発モード出力から diff-v1 のJSON本体だけを安全に読む。"""
    source = text or ""
    marker = '"format"'
    marker_pos = source.find(marker)
    if marker_pos < 0 or EDITOR_DIFF_FORMAT not in source:
        return None

    # format より前にある { を後ろから試し、JSONとして成立する最小のルートを採用する。
    starts = [i for i, ch in enumerate(source[:marker_pos + 1]) if ch == "{"]
    for start in reversed(starts):
        end = find_matching(source, start, "{", "}")
        if end < marker_pos:
            continue
        try:
            data = json.loads(source[start:end + 1])
        except Exception:
            continue
        if isinstance(data, dict) and data.get("format") == EDITOR_DIFF_FORMAT:
            return data

    raise ValueError("差分JSONを読み取れません。開発モードで[変更を書き出す]→[変更差分をコピー]をもう一度行ってください。")


def _js_render(value, prefix=""):
    raw = json.dumps(value, ensure_ascii=False, indent=4)
    if not prefix or "\n" not in raw:
        return raw
    return raw.replace("\n", "\n" + prefix)


def _line_indent(text, index):
    line_start = text.rfind("\n", 0, index) + 1
    m = re.match(r"[ \t]*", text[line_start:index])
    return m.group(0) if m else ""


def _object_id_from_block(block):
    for pattern in (
        r'\bid\s*:\s*"([^"]+)"',
        r"\bid\s*:\s*'([^']+)'",
        r'"id"\s*:\s*"([^"]+)"',
        r"'id'\s*:\s*'([^']+)'",
    ):
        m = re.search(pattern, block or "")
        if m:
            return m.group(1)
    return ""


def _find_var_array_span(text, var_name):
    m = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*(\[)", text)
    if not m:
        raise ValueError("配列を見つけられません: " + var_name)
    open_index = m.start(1)
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0:
        raise ValueError("配列の終端を読めません: " + var_name)
    return open_index, close_index


def _find_scene_span(text, scene_id):
    root_match = re.search(r"window\.TOWN_SCENE_MAPS\s*=\s*\{", text)
    if not root_match:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS を見つけられません。")
    root_open = text.find("{", root_match.start())
    root_close = find_matching(text, root_open, "{", "}")
    if root_close < 0:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS が閉じていません。")
    body_start = root_open + 1
    body = text[body_start:root_close]
    pattern = re.compile(r"(?m)^([ \t]*)" + re.escape(scene_id) + r"\s*:\s*(\{)")
    matches = list(pattern.finditer(body))
    if len(matches) != 1:
        raise ValueError("data/town-maps.js のシーンを一意に読めません: " + scene_id)
    open_index = body_start + matches[0].start(2)
    close_index = find_matching(text, open_index, "{", "}")
    if close_index < 0:
        raise ValueError("シーンの括弧を読めません: " + scene_id)
    return open_index, close_index


def _find_named_array_span(text, key, scope_start, scope_end):
    scope = text[scope_start:scope_end + 1]
    pattern = re.compile(r'(?m)(?:"' + re.escape(key) + r'"|\'' + re.escape(key) + r"\'|" + re.escape(key) + r")\s*:\s*(\[)")
    m = pattern.search(scope)
    if not m:
        raise ValueError("シーン内の配列を見つけられません: " + key)
    open_index = scope_start + m.start(1)
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0 or close_index > scope_end:
        raise ValueError("シーン内の配列を正しく読めません: " + key)
    return open_index, close_index


def _replace_object_in_array(text, open_index, close_index, object_id, after):
    for start, end in extract_object_spans(text, open_index + 1, close_index):
        if _object_id_from_block(text[start:end]) != object_id:
            continue
        prefix = _line_indent(text, start)
        replacement = _js_render(after, prefix)
        return text[:start] + replacement + text[end:]
    raise ValueError("配列内に編集対象IDがありません: " + object_id)


def _find_array_object_matches(text, open_index, close_index, object_id):
    matches = []
    for index, (start, end) in enumerate(extract_object_spans(text, open_index + 1, close_index)):
        if _object_id_from_block(text[start:end]) == object_id:
            matches.append((index, start, end))
    return matches


def _insert_object_into_array(text, open_index, close_index, object_id, after):
    if _find_array_object_matches(text, open_index, close_index, object_id):
        raise ValueError("配列内に同じIDが既にあります: " + object_id)

    spans = extract_object_spans(text, open_index + 1, close_index)
    array_indent = _line_indent(text, open_index)

    if spans:
        item_indent = _line_indent(text, spans[0][0]) or (array_indent + "    ")
        last_end = spans[-1][1]
        tail = text[last_end:close_index]
        # 配列末尾にコメント等がある場合、誤って壊さないため自動挿入しない。
        if not re.fullmatch(r"[\s,]*", tail):
            raise ValueError("配列末尾の形式が複雑なため、安全に追加できません: " + object_id)
        rendered = item_indent + _js_render(after, item_indent)
        replacement = ",\n" + rendered + "\n" + array_indent
        return text[:last_end] + replacement + text[close_index:]

    rendered = (array_indent + "    ") + _js_render(after, array_indent + "    ")
    replacement = "\n" + rendered + "\n" + array_indent
    return text[:open_index + 1] + replacement + text[close_index:]


def _delete_object_from_array(text, open_index, close_index, object_id):
    spans = extract_object_spans(text, open_index + 1, close_index)
    matches = [
        (index, start, end)
        for index, (start, end) in enumerate(spans)
        if _object_id_from_block(text[start:end]) == object_id
    ]
    if not matches:
        raise ValueError("配列内に削除対象IDがありません: " + object_id)
    if len(matches) != 1:
        raise ValueError("配列内に削除対象IDが複数あります: " + object_id)

    index, start, end = matches[0]

    if len(spans) == 1:
        before_gap = text[open_index + 1:start]
        after_gap = text[end:close_index]
        if not re.fullmatch(r"[\s,]*", before_gap + after_gap):
            raise ValueError("配列内の形式が複雑なため、安全に削除できません: " + object_id)
        array_indent = _line_indent(text, open_index)
        return text[:open_index + 1] + "\n" + array_indent + text[close_index:]

    if index == 0:
        next_start = spans[1][0]
        separator = text[end:next_start]
        if not re.fullmatch(r"[\s,]*", separator):
            raise ValueError("削除対象の後ろにコメント等があるため、安全に削除できません: " + object_id)
        return text[:start] + text[next_start:]

    prev_end = spans[index - 1][1]
    separator = text[prev_end:start]
    if not re.fullmatch(r"[\s,]*", separator):
        raise ValueError("削除対象の前にコメント等があるため、安全に削除できません: " + object_id)
    return text[:prev_end] + text[end:]


def _replace_var_array_object(text, var_name, object_id, after):
    open_index, close_index = _find_var_array_span(text, var_name)
    return _replace_object_in_array(text, open_index, close_index, object_id, after)


def _insert_var_array_object(text, var_name, object_id, after):
    open_index, close_index = _find_var_array_span(text, var_name)
    return _insert_object_into_array(text, open_index, close_index, object_id, after)


def _delete_var_array_object(text, var_name, object_id):
    open_index, close_index = _find_var_array_span(text, var_name)
    return _delete_object_from_array(text, open_index, close_index, object_id)


def _replace_scene_array_object(text, scene_id, array_name, object_id, after):
    scene_open, scene_close = _find_scene_span(text, scene_id)
    arr_open, arr_close = _find_named_array_span(text, array_name, scene_open, scene_close)
    return _replace_object_in_array(text, arr_open, arr_close, object_id, after)


def _insert_scene_array_property(text, scene_open, scene_close, array_name, object_id, after):
    # props/triggers 配列がまだ存在しない新しいシーンでも、最初の add を安全に受けられるようにする。
    scene_indent = _line_indent(text, scene_open)
    property_indent = scene_indent + "  "
    item_indent = property_indent + "  "
    body = text[scene_open + 1:scene_close]
    stripped = body.rstrip()
    if not stripped:
        separator = "\n"
    else:
        last_non_ws = stripped[-1]
        separator = "\n" if last_non_ws == "," else ",\n"

    rendered = _js_render(after, item_indent)
    insertion = (
        separator +
        property_indent + array_name + ": [\n" +
        item_indent + rendered + "\n" +
        property_indent + "]\n" +
        scene_indent
    )
    return text[:scene_close] + insertion + text[scene_close:]


def _insert_scene_array_object(text, scene_id, array_name, object_id, after):
    scene_open, scene_close = _find_scene_span(text, scene_id)
    try:
        arr_open, arr_close = _find_named_array_span(text, array_name, scene_open, scene_close)
    except ValueError as exc:
        if "配列を見つけられません" not in str(exc):
            raise
        return _insert_scene_array_property(text, scene_open, scene_close, array_name, object_id, after)
    return _insert_object_into_array(text, arr_open, arr_close, object_id, after)


def _delete_scene_array_object(text, scene_id, array_name, object_id):
    scene_open, scene_close = _find_scene_span(text, scene_id)
    arr_open, arr_close = _find_named_array_span(text, array_name, scene_open, scene_close)
    return _delete_object_from_array(text, arr_open, arr_close, object_id)


def _replace_var_array_value(text, var_name, value):
    open_index, close_index = _find_var_array_span(text, var_name)
    prefix = _line_indent(text, open_index)
    replacement = _js_render(value, prefix)
    return text[:open_index] + replacement + text[close_index + 1:]


def _replace_scene_array_value(text, scene_id, key, value):
    scene_open, scene_close = _find_scene_span(text, scene_id)
    open_index, close_index = _find_named_array_span(text, key, scene_open, scene_close)
    prefix = _line_indent(text, open_index)
    replacement = _js_render(value, prefix)
    return text[:open_index] + replacement + text[close_index + 1:]


def _replace_var_object(text, var_name, value):
    m = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*(\{)", text)
    if not m:
        raise ValueError("オブジェクトを見つけられません: " + var_name)
    open_index = m.start(1)
    close_index = find_matching(text, open_index, "{", "}")
    if close_index < 0:
        raise ValueError("オブジェクトの終端を読めません: " + var_name)
    prefix = _line_indent(text, open_index)
    replacement = _js_render(value, prefix)
    return text[:open_index] + replacement + text[close_index + 1:]


def _find_literal_id_object_span(text, object_id):
    patterns = [
        r"\bid\s*:\s*'" + re.escape(object_id) + r"'",
        r'\bid\s*:\s*"' + re.escape(object_id) + r'"',
        r'"id"\s*:\s*"' + re.escape(object_id) + r'"',
    ]
    match = None
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            break
    if not match:
        raise ValueError("IDを持つオブジェクトを見つけられません: " + object_id)

    candidates = [i for i, ch in enumerate(text[:match.start() + 1]) if ch == "{"]
    for start in reversed(candidates):
        end = find_matching(text, start, "{", "}")
        if end >= match.end():
            return start, end + 1
    raise ValueError("IDを持つオブジェクト範囲を読めません: " + object_id)


def _replace_literal_id_object(text, object_id, value):
    start, end = _find_literal_id_object_span(text, object_id)
    prefix = _line_indent(text, start)
    replacement = _js_render(value, prefix)
    return text[:start] + replacement + text[end:]


def _replace_simple_var_number(text, var_name, value):
    number = repr(float(value)) if isinstance(value, float) and not float(value).is_integer() else str(value)
    pattern = re.compile(r"(\bvar\s+" + re.escape(var_name) + r"\s*=\s*)([^;]+)(;)")
    if not pattern.search(text):
        raise ValueError("数値設定を見つけられません: " + var_name)
    return pattern.sub(lambda m: m.group(1) + number + m.group(3), text, count=1)


def _replace_prop_assignment_block(text, object_id, after):
    # runtime-fixes.js の if (prop.id === '...') { ... } 内だけを更新する。
    pattern = re.compile(r"if\s*\(\s*prop\.id\s*===\s*['\"]" + re.escape(object_id) + r"['\"]\s*\)\s*\{")
    m = pattern.search(text)
    if not m:
        raise ValueError("runtime-fixes.js のパーツ設定を見つけられません: " + object_id)
    open_index = text.find("{", m.start())
    close_index = find_matching(text, open_index, "{", "}")
    if close_index < 0:
        raise ValueError("runtime-fixes.js のパーツ設定が閉じていません: " + object_id)
    block = text[open_index:close_index + 1]
    for key in ("x", "y", "w", "h", "footY"):
        if key not in after:
            continue
        number = repr(after[key])
        key_pattern = re.compile(r"(\bprop\." + re.escape(key) + r"\s*=\s*)([^;]+)(;)")
        if not key_pattern.search(block):
            raise ValueError("runtime-fixes.js に " + object_id + "." + key + " がありません。")
        block = key_pattern.sub(lambda mm, n=number: mm.group(1) + n + mm.group(3), block, count=1)
    return text[:open_index] + block + text[close_index + 1:]



class _SafeJsLiteralParser(object):
    """湯間庭町の設定データで使うJSリテラルだけを、コード実行せずに読む。"""
    def __init__(self, text):
        self.text = text or ""
        self.pos = 0
        self.length = len(self.text)

    def _skip(self):
        while self.pos < self.length:
            if self.text[self.pos].isspace():
                self.pos += 1
                continue
            if self.text.startswith("//", self.pos):
                end = self.text.find("\n", self.pos + 2)
                self.pos = self.length if end < 0 else end + 1
                continue
            if self.text.startswith("/*", self.pos):
                end = self.text.find("*/", self.pos + 2)
                if end < 0:
                    raise ValueError("JSコメントが閉じていません。")
                self.pos = end + 2
                continue
            break

    def _peek(self):
        self._skip()
        return self.text[self.pos] if self.pos < self.length else ""

    def _consume(self, expected=None):
        self._skip()
        if self.pos >= self.length:
            raise ValueError("JSリテラルが途中で終わっています。")
        ch = self.text[self.pos]
        if expected is not None and ch != expected:
            raise ValueError("JSリテラルの形式が不正です。")
        self.pos += 1
        return ch

    def _string(self):
        self._skip()
        quote = self._consume()
        if quote not in ('"', "'"):
            raise ValueError("文字列の開始記号が不正です。")
        start = self.pos - 1
        escaped = False
        while self.pos < self.length:
            ch = self.text[self.pos]
            self.pos += 1
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if ch == quote:
                token = self.text[start:self.pos]
                try:
                    if quote == '"':
                        return json.loads(token)
                    return ast.literal_eval(token)
                except Exception:
                    raise ValueError("JS文字列を安全に読めません。")
        raise ValueError("JS文字列が閉じていません。")

    def _identifier(self):
        self._skip()
        m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.text[self.pos:])
        if not m:
            raise ValueError("JS識別子を読めません。")
        value = m.group(0)
        self.pos += len(value)
        return value

    def _number(self):
        self._skip()
        m = re.match(r"-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", self.text[self.pos:])
        if not m:
            raise ValueError("数値を読めません。")
        raw = m.group(0)
        self.pos += len(raw)
        value = float(raw) if any(c in raw for c in ".eE") else int(raw)
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError("有限でない数値は使えません。")
        return value

    def _array(self):
        self._consume('[')
        values = []
        if self._peek() == ']':
            self._consume(']')
            return values
        while True:
            values.append(self.value())
            ch = self._peek()
            if ch == ',':
                self._consume(',')
                if self._peek() == ']':
                    self._consume(']')
                    return values
                continue
            if ch == ']':
                self._consume(']')
                return values
            raise ValueError("JS配列の区切りが不正です。")

    def _object(self):
        self._consume('{')
        result = {}
        if self._peek() == '}':
            self._consume('}')
            return result
        while True:
            ch = self._peek()
            key = self._string() if ch in ('"', "'") else self._identifier()
            self._consume(':')
            result[key] = self.value()
            ch = self._peek()
            if ch == ',':
                self._consume(',')
                if self._peek() == '}':
                    self._consume('}')
                    return result
                continue
            if ch == '}':
                self._consume('}')
                return result
            raise ValueError("JSオブジェクトの区切りが不正です。")

    def _call(self, name):
        self._consume('(')
        args = []
        if self._peek() != ')':
            while True:
                args.append(self.value())
                if self._peek() == ',':
                    self._consume(',')
                    continue
                break
        self._consume(')')
        if name == 'rect' and len(args) == 4:
            return {"x": args[0], "y": args[1], "w": args[2], "h": args[3]}
        raise ValueError("正本照合で未対応の関数呼び出しです: " + name)

    def value(self):
        ch = self._peek()
        if ch == '{':
            return self._object()
        if ch == '[':
            return self._array()
        if ch in ('"', "'"):
            return self._string()
        if ch == '-' or ch == '.' or ch.isdigit():
            return self._number()
        name = self._identifier()
        if name == 'true':
            return True
        if name == 'false':
            return False
        if name == 'null':
            return None
        if self._peek() == '(':
            return self._call(name)
        raise ValueError("正本照合で未対応の値です: " + name)

    def parse(self):
        value = self.value()
        self._skip()
        if self.pos != self.length:
            raise ValueError("JSリテラルの後ろに未解釈の内容があります。")
        return value


def _parse_safe_js_literal(text):
    return _SafeJsLiteralParser(text).parse()


def _read_array_object_value(text, open_index, close_index, object_id):
    matches = _find_array_object_matches(text, open_index, close_index, object_id)
    if not matches:
        raise ValueError("正本に対象IDがありません: " + object_id)
    if len(matches) != 1:
        raise ValueError("正本に対象IDが複数あります: " + object_id)
    _index, start, end = matches[0]
    return _parse_safe_js_literal(text[start:end])


def _read_var_object_value(text, var_name):
    m = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*(\{)", text)
    if not m:
        raise ValueError("正本にオブジェクトがありません: " + var_name)
    open_index = m.start(1)
    close_index = find_matching(text, open_index, "{", "}")
    if close_index < 0:
        raise ValueError("正本のオブジェクト終端を読めません: " + var_name)
    return _parse_safe_js_literal(text[open_index:close_index + 1])


def _normalize_diff_prop_for_persistence(value):
    """Editor runtimeでだけ補完されるprop項目を正本照合・保存から除外する。"""
    if not isinstance(value, dict):
        return value

    result = dict(value)

    # triggerArea is mirrored from linked trigger.area for editor/runtime use.
    # The trigger object remains the persisted owner.
    result.pop("triggerArea", None)

    object_id = str(result.get("objectId") or "").lower()
    object_name = str(result.get("id") or "").lower()
    if (
        result.get("catalogKey") == "worldObjectShop"
        and (
            "_shop_" in object_id
            or object_name.endswith("_shop")
        )
    ):
        result.pop("catalogKey", None)

    return result


def _read_current_diff_object(source, text, scene_id, kind, object_id):
    if kind not in ("props", "triggers"):
        raise ValueError("正本照合の種類が不正です: " + kind)

    if source == "data/station-plaza.js":
        var_name = "stationPlazaProps" if kind == "props" else "triggers"
        open_index, close_index = _find_var_array_span(text, var_name)
        return _read_array_object_value(text, open_index, close_index, object_id)

    if source == "data/town-maps.js":
        scene_open, scene_close = _find_scene_span(text, scene_id)
        arr_open, arr_close = _find_named_array_span(text, kind, scene_open, scene_close)
        return _read_array_object_value(text, arr_open, arr_close, object_id)

    if source == "town-ghost-npc.js":
        var_name = "prop" if kind == "props" else "trigger"
        current = _read_var_object_value(text, var_name)
        if str(current.get("id") or "") != object_id:
            raise ValueError(
                "おばけNPC正本のIDが差分と一致しません: "
                + kind + " " + object_id
            )
        return current

    # その他の専用スクリプトは対応する安全なreaderを持たない限り
    # before照合を省略しない設計にする。
    return None


def _assert_diff_before_matches(source, text, scene_id, kind, change):
    op = str(change.get("op") or "")
    if op not in ("update", "delete"):
        return
    before = change.get("before")
    object_id = str(change.get("id") or "")
    current = _read_current_diff_object(source, text, scene_id, kind, object_id)
    if current is None:
        return

    if kind == "props":
        current = _normalize_diff_prop_for_persistence(current)
        before = _normalize_diff_prop_for_persistence(before)

    if current != before:
        raise ValueError(
            "正本が開発モード開始時の内容と一致しません: {0} {1}。"
            "古い差分を上書きせず、Working Copyを同期して開発モードからもう一度書き出してください。".format(
                kind, object_id
            )
        )


def _read_current_array_value(source, text, scene_id, key):
    if source == "data/station-plaza.js":
        open_index, close_index = _find_var_array_span(text, key)
    elif source == "data/town-maps.js":
        scene_open, scene_close = _find_scene_span(text, scene_id)
        open_index, close_index = _find_named_array_span(text, key, scene_open, scene_close)
    else:
        return None
    return _parse_safe_js_literal(text[open_index:close_index + 1])


def _collision_int(value, label):
    try:
        number = float(value)
    except Exception:
        raise ValueError("collision の " + label + " が数値ではありません。")
    if not math.isfinite(number) or int(number) != number:
        raise ValueError("collision の " + label + " は整数である必要があります。")
    return int(number)


def _collision_cell_state(data):
    """collision配列をruntimeと同じ優先順でセル状態へ正規化する。"""
    if not isinstance(data, dict):
        raise ValueError("collision.before がオブジェクトではありません。")

    cells = {}

    def apply_rects(items, state, label):
        if not isinstance(items, list):
            raise ValueError("collision." + label + " が配列ではありません。")
        for index, rect in enumerate(items):
            if not isinstance(rect, dict):
                raise ValueError("collision." + label + " の要素がオブジェクトではありません。")
            x = _collision_int(rect.get("x"), label + "[" + str(index) + "].x")
            y = _collision_int(rect.get("y"), label + "[" + str(index) + "].y")
            w = _collision_int(rect.get("w"), label + "[" + str(index) + "].w")
            h = _collision_int(rect.get("h"), label + "[" + str(index) + "].h")
            if w < 1 or h < 1:
                raise ValueError("collision." + label + " の w/h は1以上である必要があります。")
            for cy in range(y, y + h):
                for cx in range(x, x + w):
                    cells[(cx, cy)] = state

    apply_rects(data.get("passableRects") or [], 1, "passableRects")
    apply_rects(data.get("blockedRects") or [], 2, "blockedRects")

    points = data.get("blockedPoints") or []
    if not isinstance(points, list):
        raise ValueError("collision.blockedPoints が配列ではありません。")
    for index, point in enumerate(points):
        if not isinstance(point, dict):
            raise ValueError("collision.blockedPoints の要素がオブジェクトではありません。")
        x = _collision_int(point.get("x"), "blockedPoints[" + str(index) + "].x")
        y = _collision_int(point.get("y"), "blockedPoints[" + str(index) + "].y")
        cells[(x, y)] = 2

    return cells


def _assert_collection_before_matches(source, text, scene_id, change, keys=None):
    if not change:
        return
    before = change.get("before")
    if keys is None:
        current = _read_current_array_value(source, text, scene_id, "areaZones")
        if current is not None and current != before:
            raise ValueError("areaZones の正本が開発モード開始時の内容と一致しません。もう一度書き出してください。")
        return

    if not isinstance(before, dict):
        raise ValueError("collision.before がオブジェクトではありません。")

    if tuple(keys) == ("passableRects", "blockedRects", "blockedPoints"):
        current_collision = {}
        for key in keys:
            current = _read_current_array_value(source, text, scene_id, key)
            if current is None:
                current = []
            current_collision[key] = current

        if _collision_cell_state(current_collision) != _collision_cell_state(before):
            raise ValueError(
                "collision の正本が開発モード開始時の内容と意味上で一致しません。"
                "矩形分割ではなく通行セルを比較しています。もう一度書き出してください。"
            )
        return

    for key in keys:
        if key not in before:
            continue
        current = _read_current_array_value(source, text, scene_id, key)
        if current is not None and current != before.get(key):
            raise ValueError("{0} の正本が開発モード開始時の内容と一致しません。もう一度書き出してください。".format(key))


def _changed_top_keys(before, after):
    before = before if isinstance(before, dict) else {}
    after = after if isinstance(after, dict) else {}
    keys = set(before.keys()) | set(after.keys())
    return {key for key in keys if before.get(key) != after.get(key)}


def _patch_ghost_prop(text, before, after):
    allowed = {"x", "y", "w", "h", "footY", "collision"}
    unsupported = _changed_top_keys(before, after) - allowed
    if unsupported:
        raise ValueError(
            "おばけNPCでEditorから変更できない項目が含まれています: "
            + ", ".join(sorted(unsupported))
        )
    return _replace_var_object(text, "prop", after)


def _patch_ghost_trigger(text, before, after):
    allowed = {"area"}
    unsupported = _changed_top_keys(before, after) - allowed
    if unsupported:
        raise ValueError(
            "おばけNPCの会話トリガーは範囲以外を変更できません: "
            + ", ".join(sorted(unsupported))
        )
    return _replace_var_object(text, "trigger", after)


def _validate_diff_change_identity(change, kind):
    if not isinstance(change, dict):
        raise ValueError(kind + " の差分形式が不正です。")

    op = str(change.get("op") or "")
    if op not in ("add", "update", "delete"):
        raise ValueError(kind + " の未対応操作です: " + (op or "(空)"))

    object_id = str(change.get("id") or "")
    if not object_id:
        raise ValueError(kind + " の差分にIDがありません。")

    before = change.get("before")
    after = change.get("after")

    if op in ("update", "delete"):
        if not isinstance(before, dict) or str(before.get("id") or "") != object_id:
            raise ValueError(kind + " の before とIDが一致しません: " + object_id)

    if op in ("add", "update"):
        if not isinstance(after, dict) or str(after.get("id") or "") != object_id:
            raise ValueError(kind + " の after とIDが一致しません: " + object_id)

    return op, object_id


def _validate_diff_part(root, change):
    op, object_id = _validate_diff_change_identity(change, "props")
    if op == "delete":
        return

    after = change.get("after")
    for key in ("x", "y", "w", "h"):
        try:
            value = float(after.get(key))
            if not math.isfinite(value) or abs(value) > 256:
                raise ValueError()
        except Exception:
            raise ValueError(object_id + " の " + key + " が異常です。")
    src = str(after.get("src") or "")
    if src and not src.startswith(("http://", "https://")):
        rel = src.split("?", 1)[0].split("#", 1)[0].lstrip("./")
        if rel and not os.path.exists(os.path.join(root, rel)):
            raise ValueError("画像ファイルが見つかりません: " + rel)


def _validate_diff_trigger(change):
    return _validate_diff_change_identity(change, "triggers")


def _normalize_diff_source(value):
    rel = relative_safe_path(str(value or ""))
    if not rel or rel not in EDITOR_DIFF_ALLOWED_SOURCES:
        raise ValueError("差分の反映先が許可されていません: " + str(value or ""))
    return rel


def _patch_diff_file(source, current_text, scene_id, prop_changes, trigger_changes, collision_change, area_change):
    result = current_text

    for change in prop_changes:
        op = str(change.get("op") or "")
        object_id = str(change.get("id") or "")
        after = _normalize_diff_prop_for_persistence(change.get("after"))
        before = _normalize_diff_prop_for_persistence(change.get("before"))

        _assert_diff_before_matches(source, result, scene_id, "props", change)

        if source == "data/station-plaza.js":
            if op == "add":
                result = _insert_var_array_object(result, "stationPlazaProps", object_id, after)
            elif op == "delete":
                result = _delete_var_array_object(result, "stationPlazaProps", object_id)
            else:
                result = _replace_var_array_object(result, "stationPlazaProps", object_id, after)

        elif source == "data/town-maps.js":
            if op == "add":
                result = _insert_scene_array_object(result, scene_id, "props", object_id, after)
            elif op == "delete":
                result = _delete_scene_array_object(result, scene_id, "props", object_id)
            else:
                result = _replace_scene_array_object(result, scene_id, "props", object_id, after)

        elif source == "town-ghost-npc.js":
            if op != "update":
                raise ValueError("おばけNPCは update 以外を安全に反映できません。")
            result = _patch_ghost_prop(result, before, after)

        else:
            raise ValueError("props の未対応反映先です: " + source)

    for change in trigger_changes:
        op = str(change.get("op") or "")
        object_id = str(change.get("id") or "")
        after = change.get("after")

        _assert_diff_before_matches(source, result, scene_id, "triggers", change)

        if source == "data/station-plaza.js":
            if op == "add":
                result = _insert_var_array_object(result, "triggers", object_id, after)
            elif op == "delete":
                result = _delete_var_array_object(result, "triggers", object_id)
            else:
                result = _replace_var_array_object(result, "triggers", object_id, after)

        elif source == "data/town-maps.js":
            if op == "add":
                result = _insert_scene_array_object(result, scene_id, "triggers", object_id, after)
            elif op == "delete":
                result = _delete_scene_array_object(result, scene_id, "triggers", object_id)
            else:
                result = _replace_scene_array_object(result, scene_id, "triggers", object_id, after)

        elif source == "town-ghost-npc.js":
            if op != "update":
                raise ValueError("おばけNPCのトリガーは update 以外を安全に反映できません。")
            before = change.get("before")
            result = _patch_ghost_trigger(result, before, after)
        else:
            raise ValueError("triggers の未対応反映先です: " + source)

    if collision_change:
        _assert_collection_before_matches(
            source, result, scene_id, collision_change,
            ("passableRects", "blockedRects", "blockedPoints")
        )
        after_collision = collision_change.get("after") or {}
        if not isinstance(after_collision, dict):
            raise ValueError("collision.after がオブジェクトではありません。")
        if source == "data/station-plaza.js":
            for key in ("passableRects", "blockedRects", "blockedPoints"):
                if key in after_collision:
                    result = _replace_var_array_value(result, key, after_collision.get(key) or [])
        elif source == "data/town-maps.js":
            for key in ("passableRects", "blockedRects", "blockedPoints"):
                if key in after_collision:
                    result = _replace_scene_array_value(result, scene_id, key, after_collision.get(key) or [])
        else:
            raise ValueError("collision の反映先が不正です: " + source)

    if area_change:
        _assert_collection_before_matches(source, result, scene_id, area_change, None)
        after_zones = area_change.get("after")
        if not isinstance(after_zones, list):
            raise ValueError("areaZones.after が配列ではありません。")
        if source == "data/station-plaza.js":
            result = _replace_var_array_value(result, "areaZones", after_zones)
        elif source == "data/town-maps.js":
            result = _replace_scene_array_value(result, scene_id, "areaZones", after_zones)
        else:
            raise ValueError("areaZones の反映先が不正です: " + source)

    ok, message = basic_js_balance(result)
    if not ok:
        raise ValueError(source + " へ差分を反映すると構文が崩れます: " + message)
    return result

def _plan_editor_diff_import(root, manifest):
    scene_id = str(manifest.get("scene") or "")
    title = str(manifest.get("title") or scene_id or "町")
    if not scene_id:
        raise ValueError("差分に scene がありません。")
    changes = manifest.get("changes")
    if not isinstance(changes, dict):
        raise ValueError("差分の changes がありません。")

    props = changes.get("props") or []
    triggers = changes.get("triggers") or []
    collision = changes.get("collision")
    area_zones = changes.get("areaZones")
    if not isinstance(props, list) or not isinstance(triggers, list):
        raise ValueError("props / triggers の差分形式が不正です。")

    grouped = {}
    detail_lines = []

    def bucket(source):
        source = _normalize_diff_source(source)
        return grouped.setdefault(source, {"props": [], "triggers": [], "collision": None, "areaZones": None})

    op_labels = {"add": "追加", "update": "更新", "delete": "削除"}

    for change in props:
        _validate_diff_part(root, change)
        op = str(change.get("op") or "")
        source = _normalize_diff_source(change.get("source"))
        bucket(source)["props"].append(change)
        detail_lines.append(
            "・{0}: パーツ{1} {2}".format(source, op_labels.get(op, op), change.get("id"))
        )

    for change in triggers:
        op, _ = _validate_diff_trigger(change)
        source = _normalize_diff_source(change.get("source"))
        bucket(source)["triggers"].append(change)
        detail_lines.append(
            "・{0}: トリガー{1} {2}".format(source, op_labels.get(op, op), change.get("id"))
        )

    if collision:
        if not isinstance(collision, dict):
            raise ValueError("collision 差分の形式が不正です。")
        source = _normalize_diff_source(collision.get("source"))
        bucket(source)["collision"] = collision
        detail_lines.append("・{0}: 当たり判定".format(source))

    if area_zones:
        if not isinstance(area_zones, dict):
            raise ValueError("areaZones 差分の形式が不正です。")
        source = _normalize_diff_source(area_zones.get("source"))
        bucket(source)["areaZones"] = area_zones
        detail_lines.append("・{0}: エリア表示".format(source))

    file_plans = []
    for source, group in grouped.items():
        target_abs = os.path.join(root, source)
        if not os.path.isfile(target_abs):
            raise FileNotFoundError(source + " がありません。")
        current = safe_read(target_abs)
        new_text = _patch_diff_file(
            source,
            current,
            scene_id,
            group["props"],
            group["triggers"],
            group["collision"],
            group["areaZones"],
        )
        file_plans.append({
            "target_rel": source,
            "current_hash": _sha256_text(current),
            "new_hash": _sha256_text(new_text),
            "new_text": new_text,
            "changed": current != new_text,
        })

    cache_plan = _plan_editor_cache_bust(root, file_plans)
    if cache_plan is not None:
        file_plans.append(cache_plan)
        if cache_plan.get("changed"):
            detail_lines.append("・index.html: script cache fingerprint")

    changed_files = [p for p in file_plans if p.get("changed")]
    change_count = len(props) + len(triggers) + (1 if collision else 0) + (1 if area_zones else 0)
    if change_count == 0:
        change_summary = "この編集セッションには変更がありません。"
    else:
        change_summary = "{0}件の変更 / {1}ファイル\n{2}".format(
            change_count,
            len(changed_files),
            "\n".join(detail_lines),
        )

    target_rels = [p["target_rel"] for p in changed_files]
    return {
        "kind": "editor-diff-v1",
        "scene_id": scene_id,
        "title": title,
        "target_rel": "、".join(target_rels) if target_rels else "(変更なし)",
        "target_rels": target_rels,
        "file_plans": file_plans,
        "changed": bool(changed_files),
        "summary": title + " の変更差分を反映",
        "change_summary": change_summary,
        "warnings": [],
    }


def plan_town_editor_import(root, clipboard_text):
    if not project_looks_valid(root):
        raise ValueError("湯間庭町プロジェクトへ接続されていません。")
    text = _normalize_editor_export(clipboard_text)
    if not text:
        raise ValueError("クリップボードが空です。開発モードの[変更を書き出す]→[変更差分をコピー]を先に行ってください。")

    # Town Editor imports are diff-v1 only.
    # Full-file replacement was an old compatibility path and is intentionally
    # rejected so stale exports cannot overwrite a newer canonical file.
    manifest = _extract_editor_diff_manifest(text)
    if manifest is not None:
        return _plan_editor_diff_import(root, manifest)

    looks_like_legacy_full_export = (
        (
            "data/station-plaza.js" in text
            and "var stationPlazaProps" in text
            and "var MAP_WIDTH" in text
        )
        or (
            "data/town-maps.js" in text
            and re.search(r"(?m)^\s*[A-Za-z0-9_]+\s*:\s*\{", text) is not None
        )
    )

    if looks_like_legacy_full_export:
        raise ValueError(
            "旧形式の完全版取り込みは廃止しました。"
            " 正本ファイル全体の置換は行いません。"
            " 開発モードで[変更を書き出す]→[変更差分をコピー]を実行し、"
            " yumaniwa-editor-diff-v1 の差分を取り込んでください。"
        )

    raise ValueError(
        "yumaniwa-editor-diff-v1 の変更差分として認識できません。"
        " 開発モードで[変更を書き出す]→[変更差分をコピー]をもう一度行ってください。"
    )


# -----------------------------------------------------------------------------
# 更新・バックアップ・検証
# -----------------------------------------------------------------------------

def ensure_marker(path, marker):
    text = safe_read(path)
    if text.count(marker) != 1:
        raise ValueError("更新用マーカーが見つからない、または複数あります: " + marker)


def insert_after_marker(path, marker, entry_text):
    text = safe_read(path)
    count = text.count(marker)
    if count != 1:
        raise ValueError("更新用マーカーが見つからない、または複数あります: " + marker)
    index = text.index(marker) + len(marker)
    insertion = "\n" + entry_text.rstrip() + ",\n"
    atomic_write(path, text[:index] + insertion + text[index:])


def backup_dir_for(root, label):
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    safe_label = re.sub(r"[^A-Za-z0-9_-]+", "-", label).strip("-") or "update"
    return os.path.join(project_backup_root(root), timestamp + "-" + safe_label)


def create_transaction(root, label, target_rel_paths):
    require_safe_write_session(root)
    destination = backup_dir_for(root, label)
    os.makedirs(destination)
    files = []
    for rel in target_rel_paths:
        source = os.path.join(root, rel)
        if not os.path.isfile(source):
            raise FileNotFoundError("バックアップ対象がありません: " + rel)
        target = os.path.join(destination, rel)
        folder = os.path.dirname(target)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        try:
            shutil.copy2(source, target)
        except Exception:
            shutil.copyfile(source, target)
        files.append(rel)
    return {
        "version": 2,
        "created_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "label": label,
        "project_root": os.path.abspath(root),
        "backup_dir": destination,
        "files": files,
        "created_paths": [],
        "undone": False,
    }


def finish_transaction(root, transaction):
    backup_abs = backup_abs_from_transaction(root, transaction)
    safe_json_dump(transaction, os.path.join(backup_abs, "manifest.json"))
    state_dir = project_state_dir(root)
    if not os.path.isdir(state_dir):
        os.makedirs(state_dir)
    safe_json_dump(transaction, last_transaction_path(root))
    prune_backups(root)
    mark_pending_push(root, transaction.get("label", "update"), transaction.get("files", []))


def prune_backups(root):
    base = project_backup_root(root)
    if not os.path.isdir(base):
        return
    names = [name for name in os.listdir(base) if os.path.isdir(os.path.join(base, name))]
    names.sort(reverse=True)
    for old in names[MAX_BACKUPS:]:
        shutil.rmtree(os.path.join(base, old), ignore_errors=True)


def last_transaction(root):
    return load_json(last_transaction_path(root), None)


def restore_transaction_files(root, tx):
    """transaction開始後の失敗時に、対象ファイルをバックアップ世代へ戻す。"""
    if not tx:
        return []

    backup_abs = backup_abs_from_transaction(root, tx)
    failures = []

    for rel in tx.get("files", []):
        source = os.path.join(backup_abs, rel)
        target = os.path.join(root, rel)

        try:
            if not os.path.isfile(source):
                raise FileNotFoundError("バックアップがありません")
            folder = os.path.dirname(target)
            if folder and not os.path.isdir(folder):
                os.makedirs(folder)
            try:
                shutil.copy2(source, target)
            except Exception:
                shutil.copyfile(source, target)
        except Exception as exc:
            failures.append(rel + ": " + str(exc))

    return failures


def undo_last_transaction(root):
    require_safe_write_session(root)
    tx = last_transaction(root)
    if not tx:
        raise ValueError("戻せる更新がありません。")
    if tx.get("undone"):
        raise ValueError("直前の更新はすでに戻されています。")

    backup_abs = backup_abs_from_transaction(root, tx)
    if not os.path.isdir(backup_abs):
        raise ValueError("バックアップが見つかりません。")

    for rel in tx.get("files", []):
        source = os.path.join(backup_abs, rel)
        target = os.path.join(root, rel)
        if not os.path.isfile(source):
            raise ValueError("バックアップ内のファイルが見つかりません: " + rel)
        folder = os.path.dirname(target)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        try:
            shutil.copy2(source, target)
        except Exception:
            shutil.copyfile(source, target)

    # テンプレートから作っただけの新規フォルダだけを削除する。
    for rel in tx.get("created_paths", []):
        normalized = relative_safe_path(rel)
        if not normalized:
            continue
        target = os.path.join(root, normalized)
        if path_is_inside(target, root) and os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)

    tx["undone"] = True
    tx["undone_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    safe_json_dump(tx, os.path.join(backup_abs, "manifest.json"))
    safe_json_dump(tx, last_transaction_path(root))
    mark_pending_push(root, "undo-" + str(tx.get("label") or "update"), tx.get("files", []))


def validate_project(root):
    report = {"errors": [], "warnings": [], "ok": []}
    if not project_looks_valid(root):
        report["errors"].append("湯間庭町のプロジェクトとして認識できません。index.html / data / works を確認してください。")
        return report

    identity = repository_identity_info(root)
    if not identity.get("valid"):
        report["errors"].append(identity.get("reason") or "staging identity を確認できません。")
        return report

    report["ok"].append("repository identity: staging を確認")
    git_info = identity.get("git") or {}
    if git_info.get("metadata_visible"):
        report["ok"].append(
            "Git: origin={0} / branch={1}".format(
                git_info.get("repository") or "不明",
                git_info.get("branch") or "不明",
            )
        )
        if git_info.get("sync_state") == "mismatch":
            report["errors"].append("Git: HEAD と origin/main が一致していません。")
        elif git_info.get("sync_state") == "match":
            report["ok"].append("Git: HEAD = origin/main")
        else:
            report["warnings"].append("Git: HEAD / origin/main のcommit参照を両方は読めません。同期状態はWorking Copyで確認してください。")
    else:
        report["warnings"].append(
            "Pythonista から .git metadata を参照できません。"
            "repository identity は確認済みですが、HEAD / origin/main はWorking Copyで手動確認してください。"
        )

    retired_patch_files = [
        "town-arrival-refresh.js",
        "station-guide-refresh.js",
        "station-guide-hotfix.js",
        "town-staging-20260823.js",
        "town-editor-spatial-20260823.js",
    ]
    retired_patch_present = [
        rel for rel in retired_patch_files
        if os.path.exists(os.path.join(root, rel))
    ]

    if retired_patch_present:
        report["errors"].append(
            "廃止済みruntime patchファイルがあります: "
            + ", ".join(retired_patch_present)
        )
    else:
        report["ok"].append("runtime patch files: retired")

    station_source_text = safe_read(os.path.join(root, "data/station-plaza.js"))
    town_maps_text = safe_read(os.path.join(root, "data/town-maps.js"))
    main_source_text = safe_read(os.path.join(root, "main.js"))
    spatial_editor_text = safe_read(os.path.join(root, "town-editor-spatial.js"))
    safe_export_text = safe_read(os.path.join(root, "town-editor-safe-export.js"))
    world_objects_text = safe_read(os.path.join(root, "data/world-objects.js"))
    editor_upgrade_text = safe_read(os.path.join(root, "town-editor-upgrade.js"))
    ghost_source_text = safe_read(os.path.join(root, "town-ghost-npc.js"))

    if "PLAYER_START" in station_source_text or "PLAYER_START" in main_source_text:
        report["errors"].append(
            "旧 PLAYER_START が再導入されています。spawnPoints.default を正本にしてください。"
        )
    else:
        report["ok"].append("player start owner: scene spawnPoints.default")

    if (
        "function buildStationPlazaExportCode(" in main_source_text
        or "function buildFullStationPlazaExportCode()" in main_source_text
    ):
        report["errors"].append(
            "main.js に旧完全版Town Editor export実装が残っています。"
        )
    else:
        report["ok"].append("Town Editor export: diff-v1 only")

    legacy_boot_fallback = (
        "if (!applyTownSceneDefinition(currentScene, 'default'))" in main_source_text
        and "BG_IMAGE_PATH" in main_source_text
        and "bgImage.src = BG_IMAGE_PATH" in main_source_text
    )
    if legacy_boot_fallback:
        report["errors"].append(
            "main.js に旧bootstrap scene fallbackが再導入されています。"
        )
    elif "failTownSceneBoot(currentScene)" not in main_source_text:
        report["errors"].append(
            "main.js のcanonical scene起動失敗処理を確認できません。"
        )
    else:
        report["ok"].append("town boot: canonical scene required")

    retired_staging_tokens = [
        "YUMANIWA_STAGING_20260823",
        "applyStationPlazaPatch",
        "persistEditorCollisionToScene",
        "part-interaction-rect-editor",
    ]
    restored_staging_tokens = [
        token for token in retired_staging_tokens
        if token in main_source_text
    ]

    if restored_staging_tokens:
        report["errors"].append(
            "main.js に廃止済みstaging patch処理が再導入されています: "
            + ", ".join(restored_staging_tokens)
        )
    else:
        report["ok"].append("town staging runtime patch: retired")

    spatial_retired_tokens = [
        "buildExportCollisionData",
        "syncCollisionToScene",
        "baseGetTownPartTriggerArea",
        "baseGetTownPartInteractionRectPixels",
        "window.handleEditorTap =",
        "window.ensurePartEditorFields =",
        "window.addEventListener('load'",
    ]
    spatial_regressions = [
        token for token in spatial_retired_tokens
        if token in spatial_editor_text
    ]

    if spatial_regressions:
        report["errors"].append(
            "town-editor-spatial.js に廃止済みwrapper/互換処理があります: "
            + ", ".join(spatial_regressions)
        )
    elif "window.YUMANIWA_SPATIAL_EDITOR" not in spatial_editor_text:
        report["errors"].append(
            "town-editor-spatial.js の正式editor hookを確認できません。"
        )
    else:
        report["ok"].append("spatial editor: explicit hook module")

    if "function getEditorCollisionData()" not in main_source_text:
        report["errors"].append(
            "main.js のeditor collision serializerを確認できません。"
        )
    elif "function getEditorBaseCollisionGrid()" not in main_source_text:
        report["errors"].append(
            "main.js のeditor base collision guardを確認できません。"
        )
    elif "baseCollisionGrid.length ? baseCollisionGrid : collisionGrid" in main_source_text:
        report["errors"].append(
            "editor collision serializerにcomposite grid fallbackが再導入されています。"
        )
    elif "if (baseCollisionGrid[y])" in main_source_text:
        report["errors"].append(
            "edgeWarp carveがauthored baseCollisionGridを書き換えています。"
        )
    elif "applyTownPartCollisionToGrid(collisionGrid);\n    carveTownEdgeWarpTiles(activeTownSceneDef);" not in main_source_text:
        report["errors"].append(
            "runtime collision rebuildでedgeWarp carveを確認できません。"
        )
    elif "buildExportCollisionData" in safe_export_text:
        report["errors"].append(
            "town-editor-safe-export.js が削除済みcollision APIを参照しています。"
        )
    elif "getEditorCollisionData" not in safe_export_text:
        report["errors"].append(
            "town-editor-safe-export.js のcollision serializer参照を確認できません。"
        )
    else:
        report["ok"].append("editor collision diff: canonical authored base serializer")

    scene_schema_fallback_tokens = [
        "Number(def.mapWidth) || 24",
        "Number(def.mapHeight) || 24",
        "spawns.default || { x: 12, y: 12",
        "function getInitialTownSpawn(sceneId)",
    ]
    restored_scene_fallbacks = [
        token for token in scene_schema_fallback_tokens
        if token in main_source_text
    ]

    if restored_scene_fallbacks:
        report["errors"].append(
            "main.js にscene schema fallbackが再導入されています: "
            + ", ".join(restored_scene_fallbacks)
        )
    elif "function validateTownSceneRegistry()" not in main_source_text:
        report["errors"].append(
            "main.js のtown scene schema validatorを確認できません。"
        )
    else:
        report["ok"].append("town scene schema: fail-closed")

    placement_src_pattern = re.compile(r"(?m)^\s*[\"']?src[\"']?\s*:")
    placement_src_files = []
    if placement_src_pattern.search(station_source_text):
        placement_src_files.append("data/station-plaza.js")
    if placement_src_pattern.search(town_maps_text):
        placement_src_files.append("data/town-maps.js")

    if placement_src_files:
        report["errors"].append(
            "prop placement に src の二重管理があります: "
            + ", ".join(placement_src_files)
        )
    else:
        report["ok"].append("town prop source owner: data/world-objects.js")

    if "fallbackSrc" in world_objects_text:
        report["errors"].append(
            "data/world-objects.js に旧src fallbackが再導入されています。"
        )

    world_srcs = re.findall(
        r"(?m)^\s*src\s*:\s*[\"']([^\"']+)[\"']",
        world_objects_text,
    )
    missing_world_assets = []

    for source in world_srcs:
        clean = source.split("?", 1)[0].split("#", 1)[0].lstrip("./")
        if not clean or re.match(r"^https?://", clean, re.IGNORECASE):
            continue
        asset_path = os.path.join(root, clean)
        if not os.path.isfile(asset_path):
            missing_world_assets.append(clean)

    if missing_world_assets:
        report["errors"].append(
            "WORLD OBJECT の参照先ファイルがありません: "
            + ", ".join(sorted(set(missing_world_assets)))
        )
    else:
        report["ok"].append(
            "WORLD OBJECT assets: {0} refs / missing 0".format(len(world_srcs))
        )

    world_object_ids = re.findall(
        r"(?m)^\s{8}([A-Za-z0-9_]+)\s*:\s*\{",
        world_objects_text,
    )
    world_usage_text = "\n".join([
        station_source_text,
        town_maps_text,
        main_source_text,
        editor_upgrade_text,
        ghost_source_text,
    ])
    orphan_world_objects = []

    for object_id in world_object_ids:
        quoted = re.compile(
            r"[\"']" + re.escape(object_id) + r"[\"']"
        )
        if quoted.search(world_usage_text) is None:
            orphan_world_objects.append(object_id)

    if orphan_world_objects:
        report["errors"].append(
            "未参照のWORLD OBJECT定義があります: "
            + ", ".join(sorted(orphan_world_objects))
        )
    else:
        report["ok"].append(
            "WORLD OBJECT definitions: {0} refs / orphan 0".format(
                len(world_object_ids)
            )
        )

    canonical_world_assets = set()
    for source in world_srcs:
        clean = source.split("?", 1)[0].split("#", 1)[0].lstrip("./")
        if clean and not re.match(r"^https?://", clean, re.IGNORECASE):
            canonical_world_assets.add(clean.replace(os.sep, "/"))

    managed_asset_roots = [
        "assets/maps/objects",
        "assets/maps/props/station-plaza",
        "assets/maps/props/leisure-center",
        "assets/maps/props/common",
    ]
    managed_extensions = (".png", ".jpg", ".jpeg", ".webp")
    orphan_managed_assets = []

    for managed_rel in managed_asset_roots:
        managed_abs = os.path.join(root, managed_rel)
        if not os.path.isdir(managed_abs):
            continue
        for folder, _dirs, filenames in os.walk(managed_abs):
            for filename in filenames:
                if not filename.lower().endswith(managed_extensions):
                    continue
                absolute = os.path.join(folder, filename)
                relative = os.path.relpath(absolute, root).replace(os.sep, "/")
                if relative not in canonical_world_assets:
                    orphan_managed_assets.append(relative)

    if orphan_managed_assets:
        report["errors"].append(
            "WORLD OBJECTから未参照の管理対象画像があります: "
            + ", ".join(sorted(orphan_managed_assets))
        )
    else:
        report["ok"].append(
            "managed WORLD OBJECT assets: orphan 0"
        )

    if re.search(r"(?m)^\s*src\s*:", ghost_source_text):
        report["errors"].append(
            "town-ghost-npc.js にplacement.srcが残っています。"
        )
    elif "objectId: 'station_ghost_npc_01'" not in ghost_source_text:
        report["errors"].append(
            "town-ghost-npc.js のWORLD OBJECT参照を確認できません。"
        )
    else:
        report["ok"].append("ghost NPC prop: WORLD OBJECT-owned")

    if "window.YUMANIWA_BUILD_STATION_PLAZA_SCENE" not in station_source_text:
        report["errors"].append(
            "data/station-plaza.js に station scene builder がありません。"
        )
    else:
        report["ok"].append("station scene owner: data/station-plaza.js")

    if re.search(r"station_plaza\s*:\s*\{", town_maps_text):
        report["errors"].append(
            "data/town-maps.js に station_plaza の重複定義があります。"
        )
    elif "station_plaza: buildStationPlazaScene()" not in town_maps_text:
        report["errors"].append(
            "data/town-maps.js が station scene builder を参照していません。"
        )
    else:
        report["ok"].append("town-maps: station scene builder参照のみ")

    index_text = safe_read(os.path.join(root, "index.html"))
    retired_patch_tags = [
        rel for rel in retired_patch_files
        if rel in index_text
    ]
    if retired_patch_tags:
        report["errors"].append(
            "index.html が廃止済みruntime patchを読み込んでいます: "
            + ", ".join(retired_patch_tags)
        )
    else:
        report["ok"].append("runtime patch script tags: none")

    if 'noindex,nofollow' not in index_text.replace(" ", "").lower():
        report["errors"].append("staging の index.html に noindex,nofollow がありません。")
    else:
        report["ok"].append("staging: noindex,nofollow を確認")

    for source_rel, script_src in DESK_CACHE_BUST_SOURCES.items():
        source_abs = os.path.join(root, source_rel)
        if not os.path.isfile(source_abs):
            report["errors"].append(source_rel + " がありません。")
            continue

        expected_revision = _cache_revision_for_text(safe_read(source_abs))
        actual_revision = _script_cache_revision(index_text, script_src)

        if actual_revision is None:
            report["errors"].append(
                "index.html のscript参照を特定できません: " + script_src
            )
        elif actual_revision != expected_revision:
            report["errors"].append(
                "{0} のcache fingerprintが正本と一致しません: actual={1} / expected={2}".format(
                    source_rel,
                    actual_revision or "(なし)",
                    expected_revision,
                )
            )
        else:
            report["ok"].append(
                source_rel + ": cache fingerprint 一致"
            )

    for key, (rel, var_name, marker) in REQUIRED_DATA.items():
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            report["errors"].append(rel + " がありません。")
            continue
        text = safe_read(path)
        if text.count(marker) != 1:
            report["errors"].append(rel + " の更新用マーカーが1つではありません: " + marker)
        ok, message = basic_js_balance(text)
        if not ok:
            report["errors"].append(rel + ":" + message)
        else:
            report["ok"].append(rel + ":基本構文を確認")

    try:
        notes = load_data_records(root, "notes")
    except Exception as exc:
        notes = []
        report["errors"].append("notes.js の読み取りに失敗: " + str(exc))
    try:
        works = load_data_records(root, "works")
    except Exception as exc:
        works = []
        report["errors"].append("works.js の読み取りに失敗: " + str(exc))

    note_urls = {}
    note_ids = {}
    for article in notes:
        note_id = article.get("id", "")
        url = article.get("url", "")
        if note_id:
            if note_id in note_ids:
                report["errors"].append("note のIDが重複しています: " + note_id)
            note_ids[note_id] = True
        if url:
            if url in note_urls:
                report["warnings"].append("同じnote URLが複数あります: " + url)
            note_urls[url] = True
            if not url.startswith("https://"):
                report["warnings"].append("note URLが https:// ではありません: " + url)

    work_ids = {}
    for work in works:
        work_id = work.get("id", "")
        if work_id:
            if work_id in work_ids:
                report["errors"].append("作品IDが重複しています: " + work_id)
            work_ids[work_id] = True

        status = work.get("status", "")
        launch = work.get("launch", "")
        title = work.get("title", "作品")
        if status != "open":
            continue
        if launch == "embedded":
            entry = relative_safe_path(work.get("entry", ""))
            if not entry:
                report["errors"].append("公開中の埋め込み作品に entry がありません: " + title)
            else:
                target = os.path.join(root, entry)
                if not os.path.isfile(target):
                    report["errors"].append("公開中の作品の entry が見つかりません: " + entry)
        elif launch == "itch_embed":
            embed_url = work.get("embedUrl", "")
            normal_url = work.get("url", "")
            if not embed_url.startswith("https://itch.io/"):
                report["errors"].append("公開中のitch.io作品に有効な embedUrl がありません: " + title)
            if normal_url and not normal_url.startswith("https://"):
                report["errors"].append("itch.io作品の通常URLが https:// ではありません: " + title)
        elif launch == "external":
            url = work.get("url", "")
            if not url.startswith("https://"):
                report["errors"].append("公開中の外部作品に https URL がありません: " + title)
        else:
            report["errors"].append("公開中の作品に対応した launch 指定がありません: " + title)

    template_dir = os.path.join(root, "works", "_template")
    if not os.path.isdir(template_dir):
        report["warnings"].append("works/_template が見つかりません。新規作品フォルダの自動作成は使えません。")
    else:
        report["ok"].append("works/_template:新規作品の雛形を確認")

    engine_path = os.path.join(root, "engine", "rakugaki-engine.v1.js")
    if not os.path.isfile(engine_path):
        report["warnings"].append("engine/rakugaki-engine.v1.js が見つかりません。触れるらくがきの雛形を確認してください。")

    report["stats"] = {
        "notes": len(notes),
        "works": len(works),
        "open_works": len([w for w in works if w.get("status") == "open"]),
    }
    return report

# -----------------------------------------------------------------------------
# データ1件分のJavaScript文字列
# -----------------------------------------------------------------------------

def note_entry(article):
    # 既存データの publish_date と、新しい publishedAt のどちらも維持できる。
    date_key = article.get("_date_key", "publishedAt")
    if date_key not in ("publishedAt", "publish_date"):
        date_key = "publishedAt"
    date_value = article.get("publishedAt") or article.get("publish_date") or ""
    lines = [
        "    {",
        "        id: " + js_string(article["id"]) + ",",
        "        title: " + js_string(article["title"]) + ",",
        "        url: " + js_string(article["url"]) + ",",
        "        " + date_key + ": " + js_string(date_value) + ",",
        "        featured: " + ("true" if article.get("featured") else "false"),
        "    }",
    ]
    return "\n".join(lines)


WORK_KNOWN_FIELDS = [
    "id", "title", "venue", "kind", "status", "launch",
    "entry", "embedUrl", "url",
    "frameTitle", "returnLabel", "frameMode",
    "playerLayout", "playerWidth", "playerHeight",
    "menuTitle", "menuCategory", "menuDescription", "description", "emptyText",
]


def js_simple_value(value):
    """works.js の追加フィールドを安全に往復させるための単純値シリアライザ。"""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str):
        return js_string(value)
    if isinstance(value, (list, tuple)) and all(isinstance(item, str) for item in value):
        return js_list(value)
    return None


def default_work_return_label(venue):
    if venue == "tomogushi_alley":
        return "灯串横丁"
    if venue == "leisure_center":
        return "湯窓レジャーセンター"
    return ""


def default_work_frame_mode(venue):
    return "soft" if venue == "leisure_center" else "standard"


def default_work_menu_category(kind):
    return "ゲーム" if kind == "game" else "触れるらくがき"


def work_entry(work):
    """現在の works.js スキーマを保ちながら1作品をJavaScriptへ戻す。"""
    pairs = []

    def add_string(key, value, required=False):
        value = "" if value is None else str(value)
        if required or value != "":
            pairs.append((key, js_string(value)))

    def add_number(key, value):
        if value in (None, ""):
            return
        try:
            number = float(value)
            if number.is_integer():
                value_text = str(int(number))
            else:
                value_text = str(number)
            pairs.append((key, value_text))
        except (TypeError, ValueError):
            return

    add_string("id", work.get("id", ""), True)
    add_string("title", work.get("title", ""), True)
    add_string("venue", work.get("venue", ""), True)
    add_string("kind", work.get("kind", "work"), True)
    add_string("status", work.get("status", "preparing"), True)
    launch = work.get("launch", "embedded")
    add_string("launch", launch, True)

    if launch == "embedded":
        add_string("entry", work.get("entry", ""), True)
    elif launch == "itch_embed":
        add_string("embedUrl", work.get("embedUrl", ""), True)
        add_string("url", work.get("url", ""))
    elif launch == "external":
        add_string("url", work.get("url", ""), True)

    for key in ("frameTitle", "returnLabel", "frameMode", "playerLayout"):
        add_string(key, work.get(key, ""))
    add_number("playerWidth", work.get("playerWidth"))
    add_number("playerHeight", work.get("playerHeight"))
    for key in ("menuTitle", "menuCategory", "menuDescription", "description"):
        add_string(key, work.get(key, ""))
    add_string("emptyText", work.get("emptyText") or "この作品は準備中です。", True)

    # Deskがまだ知らない将来の単純フィールドも、可能な範囲で残す。
    known = set(WORK_KNOWN_FIELDS)
    for key, value in work.items():
        if key in known or key.startswith("_"):
            continue
        encoded = js_simple_value(value)
        if encoded is not None:
            pairs.append((key, encoded))

    lines = ["    {"]
    for index, (key, value_text) in enumerate(pairs):
        comma = "," if index < len(pairs) - 1 else ""
        lines.append("        {0}: {1}{2}".format(key, value_text, comma))
    lines.append("    }")
    return "\n".join(lines)

def update_entry(update):
    lines = [
        "    {",
        "        date: " + js_string(update["date"]) + ",",
        "        title: " + js_string(update["title"]) + ",",
        "        body: " + js_string(update["body"]) + ",",
        "        tags: " + js_list(update.get("tags", [])),
        "    }",
    ]
    return "\n".join(lines)


# -----------------------------------------------------------------------------
# UI ヘルパー
# -----------------------------------------------------------------------------

def hud(message, icon="success", duration=1.5):
    try:
        dialogs.hud_alert(message, icon=icon, duration=duration)
    except Exception:
        print(message)


def alert(title, message, button1="OK", button2=None):
    try:
        return dialogs.alert(title, message, button1=button1, button2=button2, hide_cancel_button=button2 is None)
    except Exception:
        print(title + ": " + message)
        return 1


def confirm(title, message, ok_label="保存する"):
    return alert(title, message, button1=ok_label, button2="キャンセル") == 1


def make_label(text="", font_size=15, color=None, lines=1, alignment=ui.ALIGN_LEFT):
    label = ui.Label()
    label.text = text
    label.font = ("<system>", font_size)
    label.text_color = color or COLORS["text"]
    label.number_of_lines = lines
    label.alignment = alignment
    return label


def make_button(title, color_key="accent", action=None):
    button = ui.Button()
    button.title = title
    button.font = ("<system-bold>", 15)
    button.tint_color = COLORS["bg"] if color_key == "accent" else COLORS["text"]
    button.background_color = COLORS.get(color_key, COLORS["accent"])
    button.corner_radius = 9
    button.enabled = True
    button.touch_enabled = True

    # Pythonista の ui.Button action は UI スレッドで呼ばれる。
    # dialogs.alert / console.alert のようなブロッキング UI を action から
    # 直接呼ぶと反応しなくなるため、通常ボタンは interpreter thread へ移す。
    # Pythonista 公式ドキュメントでも alert を使う action には
    # ui.in_background が推奨されている。
    if action is not None:
        def guarded_action(sender):
            if getattr(sender, "_yumaniwa_busy", False):
                return
            sender._yumaniwa_busy = True
            try:
                action(sender)
            finally:
                sender._yumaniwa_busy = False
        button.action = ui.in_background(guarded_action)
    return button


def _hex_to_rgba(hex_color):
    value = hex_color.lstrip("#")
    if len(value) != 6:
        raise ValueError("expected #RRGGBB")
    return tuple(int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)


def _set_text_field_placeholder_color(field, placeholder, color):
    """Pythonista の ui.TextField では placeholder 色を直接指定できないため、
    UIKit の attributedPlaceholder を使って読みやすい色を設定する。
    ObjC ブリッジが使えない環境では標準表示へ安全にフォールバックする。
    """
    if not placeholder:
        return
    try:
        from objc_util import ObjCClass, ObjCInstance
        UIColor = ObjCClass("UIColor")
        NSAttributedString = ObjCClass("NSAttributedString")
        NSDictionary = ObjCClass("NSDictionary")
        r, g, b, a = _hex_to_rgba(color)
        ui_color = UIColor.colorWithRed_green_blue_alpha_(r, g, b, a)
        attrs = NSDictionary.dictionaryWithObject_forKey_(ui_color, "NSColor")
        attributed = NSAttributedString.alloc().initWithString_attributes_(placeholder, attrs)
        ObjCInstance(field).setAttributedPlaceholder_(attributed)
    except Exception:
        pass


def make_text_field(placeholder="", text="", secure=False):
    field = ui.TextField()
    field.placeholder = placeholder
    field.text = text
    field.font = ("<system>", 16)
    field.text_color = COLORS["input_text"]
    field.background_color = COLORS["input"]
    field.border_width = 1
    field.border_color = COLORS["line"]
    field.corner_radius = 8
    field.secure = secure
    field.clear_button_mode = "while_editing"
    _set_text_field_placeholder_color(field, placeholder, COLORS["placeholder"])
    return field


def make_text_view(text=""):
    view = ui.TextView()
    view.text = text
    view.font = ("<system>", 16)
    view.text_color = COLORS["input_text"]
    view.background_color = COLORS["input"]
    view.border_width = 1
    view.border_color = COLORS["line"]
    view.corner_radius = 8
    return view


def make_segmented(items, selected=0):
    segment = ui.SegmentedControl()
    segment.segments = items
    segment.selected_index = selected
    segment.tint_color = COLORS["accent"]
    return segment


def make_switch(value=False):
    switch = ui.Switch()
    switch.value = value
    switch.tint_color = COLORS["accent"]
    return switch


def editor_safe_top(view):
    """
    hide_title_bar=True の全画面編集室用の上部余白。

    Pythonista の ui.View は表示方法やiOSの世代により safe_area_insets が
    取れないことがあるため、取得できる場合はその値を使い、取れない場合も
    iPhoneのステータスバーを避けられる54ptを最低保証にします。
    """
    inset_top = 0
    try:
        insets = getattr(view, "safe_area_insets", None)
        if insets is not None:
            if hasattr(insets, "top"):
                inset_top = float(insets.top or 0)
            elif isinstance(insets, (tuple, list)) and len(insets) > 0:
                inset_top = float(insets[0] or 0)
    except Exception:
        inset_top = 0

    # 実機で時刻表示と独自ヘッダーが重ならないよう、少しだけ余裕を取る。
    return max(54, int(round(inset_top + 8)))


class PageBuilder(object):
    def __init__(self, parent, width):
        self.parent = parent
        self.width = width
        self.y = 16
        self.margin = 18
        self.content_width = max(280, width - self.margin * 2)

    def add(self, view, height, gap=10):
        view.frame = (self.margin, self.y, self.content_width, height)
        self.parent.add_subview(view)
        self.y += height + gap
        return view

    def title(self, text, subtext=None):
        self.add(make_label(text, 23, COLORS["text"], lines=1), 30, gap=2)
        if subtext:
            self.add(make_label(subtext, 13, COLORS["muted"], lines=0), 38, gap=14)

    def section(self, text):
        self.add(make_label(text, 14, COLORS["accent"], lines=1), 22, gap=5)

    def label(self, text, lines=1, color=None, size=14, gap=5):
        return self.add(make_label(text, size, color or COLORS["muted"], lines=lines), 20 if lines == 1 else 42, gap=gap)

    def field(self, label_text, placeholder="", text="", height=40):
        self.label(label_text, size=14, gap=4)
        field = make_text_field(placeholder, text)
        self.add(field, height, gap=12)
        return field

    def text_view(self, label_text, placeholder="", text="", height=96):
        self.label(label_text, size=14, gap=4)
        view = make_text_view(text)
        view.placeholder = placeholder
        self.add(view, height, gap=12)
        return view

    def segmented(self, label_text, options, selected=0):
        self.label(label_text, size=14, gap=4)
        control = make_segmented(options, selected)
        self.add(control, 34, gap=12)
        return control

    def switch(self, label_text, value=False):
        row = ui.View()
        row.background_color = COLORS["panel_alt"]
        row.corner_radius = 8
        label = make_label(label_text, 14, COLORS["text"], lines=2)
        toggle = make_switch(value)
        row.add_subview(label)
        row.add_subview(toggle)
        label.frame = (12, 8, self.content_width - 80, 38)
        toggle.frame = (self.content_width - 60, 9, 48, 30)
        self.add(row, 52, gap=12)
        return toggle

    def button(self, title, color_key, action, height=46):
        button = make_button(title, color_key, action)
        self.add(button, height, gap=12)
        return button

    def spacer(self, height=14):
        self.y += height

    def finish(self):
        self.parent.frame = (0, 0, self.width, self.y + 20)
        return self.y + 20


# -----------------------------------------------------------------------------
# アプリ本体
# -----------------------------------------------------------------------------

class ExistingWorkEditor(ui.View):
    """既存作品の台帳編集。IDは固定し、現在のworks.js設定を保ったまま更新する。"""
    def __init__(self, desk, work, on_saved=None):
        super(ExistingWorkEditor, self).__init__()
        self.desk = desk
        self.on_saved = on_saved
        self.original_id = work.get("id", "")
        self.original_work = dict(work)
        self.name = "作品の台帳を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("作品の台帳を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.cancel_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.cancel_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)

        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.cancel_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_work.get("title") or self.original_id, "作品IDは固定です。現在の表示設定を保ちながら安全に更新します。")
        b.section("基本設定")
        b.label("作品ID: " + self.original_id, lines=0, color=COLORS["accent"], size=16, gap=12)
        self.title_field = b.field("作品名", text=self.original_work.get("title", ""))
        venue_index = 0 if self.original_work.get("venue") == "leisure_center" else 1
        kind_index = 0 if self.original_work.get("kind", "work") == "work" else 1
        status_index = {"preparing": 0, "open": 1, "hidden": 2}.get(self.original_work.get("status"), 0)
        launch_index = {"embedded": 0, "itch_embed": 1, "external": 2}.get(self.original_work.get("launch", "embedded"), 0)
        self.venue = b.segmented("設置場所", ["レジャー", "灯串横丁"], venue_index)
        self.kind = b.segmented("分類", ["触れるらくがき", "ゲーム"], kind_index)
        self.status = b.segmented("公開状態", ["準備中", "公開中", "非表示"], status_index)
        self.launch = b.segmented("開き方", ["町内", "itch.io", "外部URL"], launch_index)

        b.section("起動先")
        self.entry = b.field("entry(町内プレイヤー)", text=self.original_work.get("entry", ""))
        self.embed_url = b.field("embedUrl(itch.io埋め込み)", text=self.original_work.get("embedUrl", ""))
        self.url = b.field("通常URL / 外部URL", text=self.original_work.get("url", ""))

        b.section("町内フレーム")
        self.frame_title = b.field("frameTitle", text=self.original_work.get("frameTitle", ""))
        self.return_label = b.field("returnLabel", text=self.original_work.get("returnLabel", ""))
        self.frame_mode = b.field("frameMode", "standard / soft / phone-cola など", self.original_work.get("frameMode", ""))
        self.player_layout = b.field("playerLayout(任意)", text=self.original_work.get("playerLayout", ""))
        self.player_width = b.field("playerWidth(任意)", text=str(self.original_work.get("playerWidth", "") or ""))
        self.player_height = b.field("playerHeight(任意)", text=str(self.original_work.get("playerHeight", "") or ""))

        b.section("施設メニュー")
        self.menu_title = b.field("menuTitle(一覧用の短い名前・任意)", text=self.original_work.get("menuTitle", ""))
        self.menu_category = b.field("menuCategory", text=self.original_work.get("menuCategory", ""))
        self.menu_description = b.text_view("menuDescription", text=self.original_work.get("menuDescription", ""), height=74)
        self.description = b.text_view("description(任意)", text=self.original_work.get("description", ""), height=74)
        self.empty_text = b.text_view("準備中メッセージ", text=self.original_work.get("emptyText", "この作品は準備中です。"), height=74)

        b.section("保存の注意")
        b.label("保存するとこの1件だけを置き換えます。Deskが読み取った既存フィールドは維持し、works.js は保存直前にバックアップします。公開中のitch.io作品には embedUrl が必要です。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        venue = "leisure_center" if self.venue.selected_index == 0 else "tomogushi_alley"
        kind = "work" if self.kind.selected_index == 0 else "game"
        status = ["preparing", "open", "hidden"][max(0, self.status.selected_index)]
        launch = ["embedded", "itch_embed", "external"][max(0, self.launch.selected_index)]

        work = dict(self.original_work)
        work.update({
            "id": self.original_id,
            "title": self.title_field.text.strip(),
            "venue": venue,
            "kind": kind,
            "status": status,
            "launch": launch,
            "entry": self.entry.text.strip(),
            "embedUrl": self.embed_url.text.strip(),
            "url": self.url.text.strip(),
            "frameTitle": self.frame_title.text.strip(),
            "returnLabel": self.return_label.text.strip(),
            "frameMode": self.frame_mode.text.strip(),
            "playerLayout": self.player_layout.text.strip(),
            "menuTitle": self.menu_title.text.strip(),
            "menuCategory": self.menu_category.text.strip(),
            "menuDescription": self.menu_description.text.strip(),
            "description": self.description.text.strip(),
            "emptyText": self.empty_text.text.strip() or "この作品は準備中です。",
        })

        dimension_errors = []
        for key, field in (("playerWidth", self.player_width), ("playerHeight", self.player_height)):
            raw = field.text.strip()
            if not raw:
                work.pop(key, None)
                continue
            try:
                value = int(raw)
                if value <= 0:
                    raise ValueError()
                work[key] = value
            except ValueError:
                dimension_errors.append(key + " は正の整数で入力してください。")
        if dimension_errors:
            alert("入力を確認してください", "\n".join("・" + item for item in dimension_errors))
            return

        # 空欄なら町の標準値を補う。既存値がある場合はフォームに入っているため維持される。
        if not work.get("frameTitle"):
            work["frameTitle"] = work.get("title", "")
        if not work.get("returnLabel"):
            work["returnLabel"] = default_work_return_label(venue)
        if not work.get("frameMode"):
            work["frameMode"] = default_work_frame_mode(venue)
        if not work.get("menuCategory"):
            work["menuCategory"] = default_work_menu_category(kind)
        if not work.get("menuDescription"):
            work["menuDescription"] = work.get("description", "")

        if self.desk.save_existing_work(self.original_id, work):
            self.close()
            if self.on_saved:
                self.on_saved()
            else:
                self.desk.show_tab(2)

class ExistingNoteEditor(ui.View):
    """既存note記事の編集。追加画面とは別の、上書き専用画面。"""
    def __init__(self, desk, article, on_saved=None):
        super(ExistingNoteEditor, self).__init__()
        self.desk = desk
        self.original_article = dict(article)
        self.original_id = article.get("id", "")
        self.on_saved = on_saved
        self.name = "過去の記事を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の記事を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.close_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_article.get("title") or self.original_id, "ここは過去の記録を置き換える画面です。削除は行いません。")
        b.section("記事ID(固定)")
        b.label(self.original_id, lines=0, color=COLORS["accent"], size=16, gap=14)
        self.title_field = b.field("記事タイトル", text=self.original_article.get("title", ""))
        self.url_field = b.field("note URL", text=self.original_article.get("url", ""))
        original_date = self.original_article.get("publishedAt") or self.original_article.get("publish_date") or ""
        self.date_field = b.field("公開日", "YYYY-MM-DD", original_date)
        self.featured = b.switch("掲示板で優先表示する(featured)", bool(self.original_article.get("featured")))
        b.section("保存の注意")
        b.label("保存すると、この1件だけを置き換えます。notes.js は保存直前にバックアップされ、[安全]から直前の更新を取り消せます。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        article = {
            "id": self.original_id,
            "title": self.title_field.text.strip(),
            "url": self.url_field.text.strip(),
            "publishedAt": self.date_field.text.strip(),
            "featured": bool(self.featured.value),
            "_date_key": self.original_article.get("_date_key", "publishedAt"),
        }
        if self.desk.save_existing_note(self.original_id, article):
            self.close()
            if self.on_saved:
                self.on_saved()


class ExistingUpdateEditor(ui.View):
    """既存更新履歴の編集。IDがないため、読み取り順だけを内部で保持する。"""
    def __init__(self, desk, update, on_saved=None):
        super(ExistingUpdateEditor, self).__init__()
        self.desk = desk
        self.original_update = dict(update)
        self.record_index = update.get("_record_index", -1)
        self.on_saved = on_saved
        self.name = "過去の更新履歴を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の更新履歴を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.close_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_update.get("title") or "更新履歴", "ここは過去の記録を置き換える画面です。削除は行いません。")
        b.section("編集対象")
        b.label("更新履歴の並び順: {0}番目".format(int(self.record_index) + 1), lines=0, color=COLORS["accent"], size=15, gap=14)
        self.date_field = b.field("日付", "YYYY-MM-DD", self.original_update.get("date", ""))
        self.title_field = b.field("見出し", text=self.original_update.get("title", ""))
        self.body_field = b.text_view("本文", text=self.original_update.get("body", ""), height=112)
        self.tags_field = b.field("タグ(カンマ区切り)", text=", ".join(self.original_update.get("tags", [])))
        b.section("保存の注意")
        b.label("保存すると、この1件だけを置き換えます。updates.js は保存直前にバックアップされ、[安全]から直前の更新を取り消せます。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        update = {
            "_record_index": self.record_index,
            "date": self.date_field.text.strip(),
            "title": self.title_field.text.strip(),
            "body": self.body_field.text.strip(),
            "tags": [tag.strip() for tag in self.tags_field.text.split(",") if tag.strip()],
        }
        if self.desk.save_existing_update(update):
            self.close()
            if self.on_saved:
                self.on_saved()


class PastRecordsEditor(ui.View):
    """追加とは別入口の、過去データを選んで編集する専用室。"""
    MODES = ["記事", "作品", "履歴"]

    def __init__(self, desk):
        super(PastRecordsEditor, self).__init__()
        self.desk = desk
        self.name = "過去の記録を編集"
        self.background_color = COLORS["bg"]
        self.mode = 0
        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の記録を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.mode_control = make_segmented(self.MODES, 0)
        self.mode_control.action = self.mode_changed
        self.add_subview(self.mode_control)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(160, width - 110), 30)
        self.close_button.frame = (width - 88, 10, 72, 36)
        self.mode_control.frame = (14, top + 64, width - 28, 34)
        self.scroll.frame = (0, top + 104, width, max(1, height - top - 104))
        if not self._built and width > 0:
            self._built = True
            self.render_list()

    def close_editor(self, sender):
        self.close()

    def mode_changed(self, sender):
        self.mode = max(0, sender.selected_index)
        self.render_list()

    def clear_page(self):
        for child in list(self.scroll.subviews):
            self.scroll.remove_subview(child)
        self.scroll.content_offset = (0, 0)

    def render_list(self):
        if self.width <= 0:
            return
        self.clear_page()
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, self.width)
        mode_name = self.MODES[self.mode]
        b.title("過去の{0}を選ぶ".format(mode_name), "ここは追加画面とは別の編集室です。保存するまで元のファイルは変わりません。")
        b.section("編集の安全ルール")
        b.label("・この画面では新規追加しません\n・保存前に対象ファイルを自動バックアップします\n・削除はありません。作品は必要なら「非表示」にします\n・直前の保存は[安全]から取り消せます", lines=0, color=COLORS["muted"], size=14, gap=16)
        if not project_looks_valid(self.desk.project_root):
            b.label("プロジェクト未選択です。先に管理室の[案内]から接続してください。", lines=0, color=COLORS["red"], size=15, gap=14)
            total = b.finish()
            self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))
            return
        key = ["notes", "works", "updates"][self.mode]
        try:
            records = load_data_records(self.desk.project_root, key)
        except Exception as exc:
            b.label("読み取れませんでした: " + str(exc), lines=0, color=COLORS["red"], size=14, gap=14)
            total = b.finish()
            self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))
            return

        b.section("編集したい記録を選ぶ")
        if not records:
            b.label("まだ記録がありません。追加は管理室の[記事][作品][履歴]から行います。", lines=0, color=COLORS["muted"], size=14, gap=14)
        for record in records:
            if key == "notes":
                title = record.get("title") or record.get("id") or "記事"
                date = record.get("publishedAt") or record.get("publish_date") or "日付なし"
                subtitle = date + (" ★" if record.get("featured") else "")
            elif key == "works":
                title = record.get("title") or record.get("id") or "作品"
                state = {"open": "公開中", "preparing": "準備中", "hidden": "非表示"}.get(record.get("status"), "未設定")
                subtitle = state + " " + ("レジャー" if record.get("venue") == "leisure_center" else "灯串横丁")
            else:
                title = record.get("title") or "更新履歴"
                subtitle = record.get("date") or "日付なし"
            # Pythonista の ui.Button は title_label を公開していません。
            # 1行タイトルとしてまとめ、内部UILabelへ直接触れない形にします。
            button_title = title
            if subtitle:
                button_title += "  ·  " + subtitle
            button = make_button(button_title, "panel_alt", self.open_record)
            button.font = ("<system>", 15)
            button.record = record
            button.record_kind = key
            b.add(button, 58, gap=8)
        total = b.finish()
        self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))

    def open_record(self, sender):
        if not self.desk.require_edit_session():
            self.close()
            return
        record = getattr(sender, "record", None)
        key = getattr(sender, "record_kind", "")
        if not record:
            alert("編集できません", "選んだ記録を読み取れませんでした。")
            return
        if key == "notes":
            editor = ExistingNoteEditor(self.desk, record, on_saved=self.render_list)
        elif key == "works":
            editor = ExistingWorkEditor(self.desk, record, on_saved=self.render_list)
        else:
            editor = ExistingUpdateEditor(self.desk, record, on_saved=self.render_list)
        editor.present("fullscreen", hide_title_bar=True)


class YumaniwaDesk(ui.View):
    TAB_TITLES = ["案内", "記事", "作品", "履歴", "町", "安全"]
    EDIT_TAB_INDEXES = (1, 2, 3, 4)

    def __init__(self):
        # Pythonistaの ui.View は必ず基底クラスを初期化します。
        super(YumaniwaDesk, self).__init__()
        ensure_desk_data_dir()
        self.name = APP_NAME
        self.background_color = COLORS["bg"]
        self.project_root = default_project_root()
        self.current_tab = 0
        self._last_layout_width = 0
        self._initial_page_built = False
        self.pending_town_import = None

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)

        self.title_label = make_label("湯間庭町 管理室 · STAGING", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.status_label = make_label("", 12, COLORS["muted"], lines=1, alignment=ui.ALIGN_RIGHT)
        self.header.add_subview(self.status_label)

        self.tabs = make_segmented(self.TAB_TITLES, 0)
        self.tabs.action = self.tab_changed
        self.add_subview(self.tabs)

        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)

        self.update_status()

    def layout(self):
        width, height = self.width, self.height
        self.header.frame = (0, 0, width, 58)
        self.title_label.frame = (18, 10, width * 0.54, 30)
        self.status_label.frame = (width * 0.52, 13, width * 0.44 - 16, 24)
        self.tabs.frame = (14, 62, width - 28, 34)
        self.scroll.frame = (0, 104, width, max(1, height - 104))
        # Pythonistaの手動生成Viewでは did_load が呼ばれない場合があるため、
        # 初期ページは最初の layout で一度だけ構築します。
        if not self._initial_page_built and width > 0:
            self._initial_page_built = True
            self.show_tab(0)
        elif self._last_layout_width and abs(self._last_layout_width - width) > 20:
            self.show_tab(self.current_tab)
        self._last_layout_width = width

    def update_status(self):
        if project_is_staging(self.project_root):
            info = safe_session_info(self.project_root)
            if info.get("pending_push"):
                self.status_label.text = "STAGING · 未Push確認あり"
                self.status_label.text_color = COLORS["accent"]
            elif info.get("valid"):
                self.status_label.text = "STAGING · 同期確認済み"
                self.status_label.text_color = COLORS["green"]
            else:
                self.status_label.text = "STAGING · 安全ロック中"
                self.status_label.text_color = COLORS["red"]
        else:
            self.status_label.text = "STAGING · 未接続"
            self.status_label.text_color = COLORS["red"]

    def clear_page(self):
        # Pythonista の ui.View には remove_from_superview() はありません。
        # 親ビュー側の remove_subview(view) を使って、安全に現在のページを外します。
        for child in list(self.scroll.subviews):
            self.scroll.remove_subview(child)
        self.scroll.content_offset = (0, 0)

    def tab_changed(self, sender):
        self.show_tab(sender.selected_index)

    def show_tab(self, index):
        self.current_tab = index
        self.tabs.selected_index = index
        self.clear_page()
        width = self.width if self.width > 0 else 390
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        builder = PageBuilder(page, width)

        if index in self.EDIT_TAB_INDEXES and not self.edit_session_ready():
            self.build_edit_lock(builder, index)
        elif index == 0:
            self.build_home(builder)
        elif index == 1:
            self.build_notes(builder)
        elif index == 2:
            self.build_works(builder)
        elif index == 3:
            self.build_updates(builder)
        elif index == 4:
            self.build_town(builder)
        else:
            self.build_safety(builder)

        total_height = builder.finish()
        self.scroll.content_size = (width, max(total_height, self.scroll.height + 1))
        self.update_status()

    def edit_session_ready(self):
        """編集UIを見せてよい状態か。プロジェクト接続と、この起動中の同期確認を両方要求する。"""
        return project_is_staging(self.project_root) and bool(safe_session_info(self.project_root).get("valid"))

    def build_edit_lock(self, b, index):
        tab_name = self.TAB_TITLES[index] if 0 <= index < len(self.TAB_TITLES) else "編集"
        b.title("安全ロック中", "{0}の入力欄は、Working Copyの同期確認が終わるまで表示しません。".format(tab_name))

        if not project_is_staging(self.project_root):
            b.section("先にstagingを接続")
            b.label("［案内］で『Working Copyのstagingを再検出』を押してください。staging と検証できる実パスが見つかるまで編集は開始できません。", lines=0, color=COLORS["red"], size=14, gap=12)
            b.button("案内へ戻る", "panel_alt", lambda sender: self.show_tab(0))
            return

        info = safe_session_info(self.project_root)
        b.section("作業前の確認")
        b.label("""1. Working CopyでStatusを開く
2. Pullを行う
3. HEAD / main / origin/main が一致し、未コミット変更がないことを確認
4. 下の『Pull・同期状態を確認済み』を押す""", lines=0, color=COLORS["text"], size=14, gap=12)
        git_info = info.get("git") or {}
        if project_is_staging(self.project_root):
            if git_info.get("metadata_visible"):
                b.label(
                    "staging identity: repository marker + Git origin/main を確認済み。",
                    lines=0, color=COLORS["green"], size=13, gap=6
                )
            else:
                b.label(
                    "staging identity: repository marker を確認済み。.git はFile Providerから非公開のためGit状態はWorking Copyで確認します。",
                    lines=0, color=COLORS["accent"], size=13, gap=6
                )
        if info.get("pending_push"):
            files = "、".join(info.get("last_change_files") or [])
            b.label("""前回の変更がWorking Copyに残っている可能性があります。Push済みかも確認してください。
対象: """ + (files or "変更ファイル"), lines=0, color=COLORS["accent"], size=14, gap=10)
        b.button("Working CopyのStatusを開く", "blue", self.open_working_copy_status)
        b.button("Pull・同期状態を確認済み", "panel_alt", self.confirm_working_copy_sync)
        b.section("なぜ入力欄を隠すか")
        b.label("同期前の古いWorking Copyに入力してしまい、あとから作業をやり直す事故を防ぐためです。同期確認が終わると、このタブをそのまま通常の編集画面へ切り替えます。", lines=0, color=COLORS["muted"], size=14, gap=14)

    def require_edit_session(self):
        """別室など、タブ外から編集画面を開く入口にも同じロックを適用する。"""
        if not project_is_staging(self.project_root):
            self.require_project()
            return False
        if safe_session_info(self.project_root).get("valid"):
            return True
        alert(
            "安全ロック中です",
            "入力を始める前に[案内]でWorking CopyのStatusを確認し、Pull後に『Pull・同期状態を確認済み』を押してください。\n\n同期確認が終わるまで編集画面は開きません。"
        )
        return False

    def require_project(self):
        identity = repository_identity_info(self.project_root)
        if identity.get("valid"):
            return True
        if project_looks_valid(self.project_root):
            alert(
                "staging identity を確認できません",
                identity.get("reason") or "このリポジトリへの接続を拒否しました。"
            )
        else:
            alert("staging が未接続です", "［案内］の『Working Copyのstagingを再検出』を押してください。保存済みの接続情報も staging と再検証してから利用します。")
        self.show_tab(0)
        return False

    def open_working_copy_status(self, sender):
        try:
            webbrowser.open("working-copy://open?repo={0}&mode=status".format(WORKING_COPY_REPO_NAME))
        except Exception as exc:
            alert("Working Copyを開けません", str(exc))

    def confirm_working_copy_sync(self, sender):
        if not project_is_staging(self.project_root):
            alert("staging が未接続です", "先に[案内]で Working Copy の yumaniwa-town-staging を再検出してください。")
            ui.delay(lambda: self.show_tab(0), 0.01)
            return
        git_info = git_repository_info(self.project_root)
        if git_info.get("metadata_visible"):
            if git_info.get("sync_state") == "match":
                git_note = "Git remote / main / HEAD=origin/main はDeskで確認済みです。"
            elif git_info.get("sync_state") == "mismatch":
                alert(
                    "同期できていません",
                    "HEAD と origin/main が一致していません。Working CopyでPull / Push状態を確認してください。"
                )
                return
            else:
                git_note = "Git remote / main はDeskで確認済みです。HEADとorigin/mainの一致はWorking Copyで確認してください。"
        else:
            git_note = "repository identity は確認済みです。.git はPythonistaから見えないため、Git状態はWorking Copyで確認してください。"

        message = (
            git_note
            + "\n\nWorking CopyでPullを行い、次を確認しましたか?\n\n"
            "・必要な場合は HEAD / main / origin/main が同じコミット\n"
            "・コミット前の変更ファイルが残っていない\n\n"
            "確認できている場合だけ同期済みにします。"
        )
        if not confirm("同期確認", message, "確認済み"):
            return

        try:
            confirm_safe_session(self.project_root)
            info = safe_session_info(self.project_root)
            if not info.get("valid"):
                raise RuntimeError(
                    "同期確認の保存後も安全ロックが解除されませんでした。"
                    "staging の接続状態を再確認してください。"
                )
        except Exception as exc:
            alert("同期確認に失敗しました", str(exc))
            return

        target_tab = self.current_tab
        hud("安全ロックを解除しました", "success")

        # button action は ui.in_background() で動くため、
        # View の作り直しはメインUIスレッドへ戻して行う。
        ui.delay(lambda: self.show_tab(target_tab), 0.05)

    # -----------------------------------------------------------------
    # 案内
    # -----------------------------------------------------------------
    def build_home(self, b):
        b.title("湯間庭町 管理室 · STAGING", "Deskはstagingだけを直接編集します。本番への反映はbranch → PR → safety checks → mergeで行います。")
        info = safe_session_info(self.project_root)
        b.section("作業前の安全確認")
        if info.get("valid"):
            when = info.get("confirmed_at").strftime("%H:%M") if info.get("confirmed_at") else ""
            b.label("同期確認済み ({0})。このセッションでは書き込みできます。".format(when), lines=0, color=COLORS["green"], size=14, gap=8)
        else:
            b.label("安全ロック中です。Pullと同期状態を確認するまで[記事][作品][履歴][町]の入力画面は開きません。", lines=0, color=COLORS["red"], size=14, gap=8)
        if info.get("pending_push"):
            files = "、".join(info.get("last_change_files") or [])
            b.label("前回の変更がWorking Copyに残っている可能性があります。Push済みか確認してください。\n対象: " + (files or "変更ファイル"), lines=0, color=COLORS["accent"], size=14, gap=8)
        b.button("Working CopyのStatusを開く", "blue", self.open_working_copy_status)
        b.button("Pull・同期状態を確認済み", "panel_alt", self.confirm_working_copy_sync)
        b.section("このアプリが扱うもの")
        b.label("・note記事の追加\n・作品台帳への登録\n・町の更新履歴の追加\n・開発モードで編集した町マップの取り込み\n・更新前バックアップと直前の取り消し", lines=0, color=COLORS["text"], size=15, gap=14)
        b.section("プロジェクト")
        root_text = self.project_root or "まだ自動検出できていません"
        root_view = make_text_view(root_text)
        root_view.editable = False
        b.add(root_view, 72, gap=10)
        b.button("Working Copyのstagingを再検出", "blue", self.detect_project_from_script)
        b.button("このリポジトリを確認する", "panel_alt", self.check_current_project)
        b.section("Working Copy 運用")
        b.label("Desk は検証済みの yumaniwa-town-staging 実パスだけへ接続します。保存すると Working Copy に変更として現れます。\n\n保存後は Working Copy で差分を確認 → Commit → Push。GPTがGitHub側を更新した後は、Deskを使う前に Working Copy で Pull します。", lines=0, color=COLORS["text"], size=15, gap=14)
        b.section("本番への反映")
        b.label("YumaniwaDesk から production は編集しません。staging で検証後、必要な差分だけを production 用 branch へ移し、PR → safety checks → merge で昇格します。緊急で本番修正した場合も、修正内容は必ず staging へ戻します。", lines=0, color=COLORS["accent"], size=14, gap=14)
        b.section("安全な使い方")
        b.label("作業前にWorking CopyでPullし、日々の台帳更新は[記事][作品][履歴]を使います。町の配置変更はWebの開発モード→[書き出す]→[町]から取り込みます。保存のたびに対象ファイルをリポジトリ外へバックアップします。\n\nmain.js / engine / works/*/sketch.js は直接編集しません。設定・バックアップ・Undo情報も Git の変更には出ません。", lines=0, color=COLORS["muted"], size=15, gap=14)
        b.section("過去の記録を直すとき")
        b.label("過去の記事・作品・更新履歴の編集は、追加画面とは別の編集室から行います。上書き保存の前には確認があり、削除機能はありません。", lines=0, color=COLORS["text"], size=15, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)
        b.section("管理データの保存先")
        b.label(DESK_DATA_DIR + "\n\nここには設定・バックアップ・Undo情報だけを保存します。湯間庭町リポジトリには作りません。", lines=0, color=COLORS["muted"], size=13)

    def detect_project_from_script(self, sender):
        global RUNTIME_SYNC_CONFIRMED, RUNTIME_SYNC_PROJECT_KEY

        root = find_verified_staging_root()
        if not root:
            self.project_root = ""
            RUNTIME_SYNC_CONFIRMED = False
            RUNTIME_SYNC_PROJECT_KEY = ""
            alert(
                "staging を見つけられません",
                "Pythonista から Working Copy の実パスを取得できませんでした。\n\n"
                "以前の接続情報が残っていれば、同じ親フォルダの yumaniwa-town-staging も自動探索しますが、"
                "staging と検証できないパスには接続しません。"
            )
            return

        try:
            require_staging_project(root)
            remember_verified_staging_root(root)
        except Exception as exc:
            self.project_root = ""
            RUNTIME_SYNC_CONFIRMED = False
            RUNTIME_SYNC_PROJECT_KEY = ""
            alert("staging の接続確認に失敗しました", str(exc))
            return

        self.project_root = root
        RUNTIME_SYNC_CONFIRMED = False
        RUNTIME_SYNC_PROJECT_KEY = ""
        hud("Working Copy の staging を検出しました", "success")
        ui.delay(lambda: self.show_tab(0), 0.05)

    def check_current_project(self, sender):
        if not project_is_staging(self.project_root):
            alert("接続できていません", "Working Copy の yumaniwa-town-staging 内からこのスクリプトを起動し、『Working Copyのstagingを再検出』を押してください。")
            return
        report = validate_project(self.project_root)
        title = "町の確認"
        body = "記事 {notes}件 / 作品 {works}件 / 公開中 {open_works}件\n\n".format(**report.get("stats", {}))
        if report["errors"]:
            body += "エラー:\n・" + "\n・".join(report["errors"])
            alert(title, body)
        else:
            body += "問題は見つかりませんでした。"
            if report["warnings"]:
                body += "\n\n注意:\n・" + "\n・".join(report["warnings"])
            alert(title, body)

    # -----------------------------------------------------------------
    # 記事
    # -----------------------------------------------------------------
    def build_notes(self, b):
        b.title("新しい記事を貼る", "data/notes.js の先頭へ安全に1件追加します。IDは自動で作られます。")
        self.note_title = b.field("記事タイトル", "例:湯間庭町を少しずつ更新できる形にする")
        self.note_url = b.field("note URL", "https://note.com/hamamah/n/...")
        self.note_date = b.field("公開日", "YYYY-MM-DD", today_iso())
        self.note_featured = b.switch("掲示板で優先表示する(featured)", False)
        b.section("保存前に確認すること")
        b.label("・同じURLは追加できません\n・URLは https:// で始めてください\n・保存前に notes.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("記事を追加する", "accent", self.add_note)

    def add_note(self, sender):
        if not self.require_project():
            return
        title = self.note_title.text.strip()
        url = self.note_url.text.strip()
        date = self.note_date.text.strip()
        featured = bool(self.note_featured.value)

        errors = []
        if not title:
            errors.append("記事タイトルを入力してください。")
        if not url.startswith("https://"):
            errors.append("note URL は https:// から始めてください。")
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("公開日は YYYY-MM-DD で入力してください。")
        notes = load_data_records(self.project_root, "notes")
        if any(article.get("url") == url for article in notes):
            errors.append("同じnote URLはすでに登録されています。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        note_id = "note-" + compact_date(date) + "-" + uuid.uuid4().hex[:8]
        article = {
            "id": note_id,
            "title": title,
            "url": url,
            "publishedAt": date,
            "featured": featured,
        }
        summary = "notes.js に1件追加します。\n\n" + title + "\n" + url
        if not confirm("記事を追加", summary):
            return

        try:
            rel, _var, marker = REQUIRED_DATA["notes"]
            tx = create_transaction(self.project_root, "add-note", [rel])
            insert_after_marker(os.path.join(self.project_root, rel), marker, note_entry(article))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("追加できませんでした", str(exc))
            return

        hud("新しい記事を貼りました", "success")
        self.show_tab(1)

    # -----------------------------------------------------------------
    # 作品
    # -----------------------------------------------------------------
    def build_works(self, b):
        b.title("新しい作品を置く", "data/works.js へ1件登録します。町内作品・itch.io・外部URLの3方式に対応します。")
        self.work_id = b.field("作品ID", "英小文字・数字・ハイフン 例:never-ending-loading")
        self.work_title = b.field("作品名", "例:Never Ending Loading")
        self.work_venue = b.segmented("設置場所", ["レジャー", "灯串横丁"], 0)
        self.work_kind = b.segmented("分類", ["触れるらくがき", "ゲーム"], 0)
        self.work_status = b.segmented("公開状態", ["準備中", "公開中", "非表示"], 0)
        self.work_launch = b.segmented("開き方", ["町内", "itch.io", "外部URL"], 0)

        b.section("起動先")
        self.work_entry = b.field("entry(町内プレイヤー)", "空欄なら ./works/<作品ID>/index.html")
        self.work_embed_url = b.field("embedUrl(itch.io埋め込み)", "https://itch.io/embed-upload/...")
        self.work_url = b.field("通常URL / 外部URL", "https://...")

        b.section("町内フレーム(空欄は自動設定)")
        self.work_frame_title = b.field("frameTitle", "空欄なら作品名")
        self.work_return_label = b.field("returnLabel", "空欄なら設置場所から自動設定")
        self.work_frame_mode = b.field("frameMode", "空欄ならレジャー=soft / 横丁=standard")
        self.work_player_layout = b.field("playerLayout(任意)", "例:phone")
        self.work_player_width = b.field("playerWidth(任意)", "例:360")
        self.work_player_height = b.field("playerHeight(任意)", "例:640")

        b.section("施設メニュー")
        self.work_menu_title = b.field("menuTitle(一覧用の短い名前・任意)", "空欄なら作品名を表示")
        self.work_menu_category = b.field("menuCategory", "空欄なら分類から自動設定")
        self.work_menu_description = b.text_view("menuDescription(任意)", "空欄なら短い説明を使用", height=74)
        self.work_description = b.text_view("短い説明(任意)", "作品そのものの短い説明", height=74)
        self.work_empty = b.text_view("準備中メッセージ", "公開前に使う町らしい一文", "この作品は準備中です。", height=74)
        self.work_make_folder = b.switch("町内プレイヤー用の作品フォルダを雛形から作る", True)

        b.section("保存前に確認すること")
        b.label("・作品IDは一度決めたら変えません\n・公開中の町内作品には index.html が必要です\n・公開中のitch.io作品には itch.io の embedUrl が必要です\n・公開中の外部作品には https URL が必要です\n・保存前に works.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("作品を登録する", "accent", self.add_work)
        b.section("過去の作品を変えるとき")
        b.label("既存作品は別室で、現在の表示設定を保持したまま編集できます。作品IDは固定です。", lines=0, color=COLORS["muted"], size=14, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)

    def current_work_fields(self):
        venue = "leisure_center" if self.work_venue.selected_index == 0 else "tomogushi_alley"
        kind = "work" if self.work_kind.selected_index == 0 else "game"
        status = ["preparing", "open", "hidden"][max(0, self.work_status.selected_index)]
        launch = ["embedded", "itch_embed", "external"][max(0, self.work_launch.selected_index)]
        return venue, kind, status, launch

    def add_work(self, sender):
        if not self.require_project():
            return
        work_id = self.work_id.text.strip()
        title = self.work_title.text.strip()
        venue, kind, status, launch = self.current_work_fields()
        entry = self.work_entry.text.strip()
        embed_url = self.work_embed_url.text.strip()
        url = self.work_url.text.strip()
        description = self.work_description.text.strip()
        menu_description = self.work_menu_description.text.strip() or description
        empty_text = self.work_empty.text.strip() or "この作品は準備中です。"
        make_folder = bool(self.work_make_folder.value)

        if not entry:
            entry = "./works/" + work_id + "/index.html"
        if launch != "embedded":
            make_folder = False

        errors = []
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", work_id):
            errors.append("作品IDは英小文字・数字・ハイフンだけで入力してください。")
        if not title:
            errors.append("作品名を入力してください。")

        works = load_data_records(self.project_root, "works")
        if any(work.get("id") == work_id for work in works):
            errors.append("同じ作品IDがすでにあります: " + work_id)

        created_rel = "works/" + work_id
        if launch == "embedded":
            safe_entry = relative_safe_path(entry)
            if not safe_entry:
                errors.append("entry はプロジェクト内の相対パスにしてください。")
            elif status == "open":
                final_entry = os.path.join(self.project_root, safe_entry)
                if not os.path.isfile(final_entry) and not make_folder:
                    errors.append("公開中の町内作品には entry の index.html が必要です。雛形を作るか、既存のentryを指定してください。")
            if make_folder and os.path.exists(os.path.join(self.project_root, created_rel)):
                errors.append("作品フォルダがすでにあります: " + created_rel)
            if make_folder and not os.path.isdir(os.path.join(self.project_root, "works", "_template")):
                errors.append("works/_template がありません。雛形フォルダを作れません。")
        elif launch == "itch_embed":
            if status == "open" and not embed_url.startswith("https://itch.io/"):
                errors.append("公開中のitch.io作品には https://itch.io/ で始まる embedUrl が必要です。")
            if url and not url.startswith("https://"):
                errors.append("itch.io作品の通常URLは https:// から始めてください。")
        elif status == "open" and not url.startswith("https://"):
            errors.append("公開中の外部作品には https URL が必要です。")

        dimensions = {}
        for key, field in (("playerWidth", self.work_player_width), ("playerHeight", self.work_player_height)):
            raw = field.text.strip()
            if not raw:
                continue
            try:
                value = int(raw)
                if value <= 0:
                    raise ValueError()
                dimensions[key] = value
            except ValueError:
                errors.append(key + " は正の整数で入力してください。")

        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        work = {
            "id": work_id,
            "title": title,
            "venue": venue,
            "kind": kind,
            "status": status,
            "launch": launch,
            "entry": entry,
            "embedUrl": embed_url,
            "url": url,
            "frameTitle": self.work_frame_title.text.strip() or title,
            "returnLabel": self.work_return_label.text.strip() or default_work_return_label(venue),
            "frameMode": self.work_frame_mode.text.strip() or default_work_frame_mode(venue),
            "playerLayout": self.work_player_layout.text.strip(),
            "menuTitle": self.work_menu_title.text.strip(),
            "menuCategory": self.work_menu_category.text.strip() or default_work_menu_category(kind),
            "menuDescription": menu_description,
            "description": description,
            "emptyText": empty_text,
        }
        work.update(dimensions)

        status_text = {"preparing": "準備中", "open": "公開中", "hidden": "非表示"}[status]
        launch_text = {"embedded": "町内プレイヤー", "itch_embed": "itch.io埋め込み", "external": "外部URL"}[launch]
        summary = "works.js に作品を1件登録します。\n\n{0}\nID: {1}\n{2} / {3}".format(title, work_id, status_text, launch_text)
        if make_folder:
            summary += "\n\nworks/{0}/ を雛形から作ります。".format(work_id)
        if not confirm("作品を登録", summary):
            return

        rel, _var, marker = REQUIRED_DATA["works"]
        tx = None
        created = False
        try:
            tx = create_transaction(
                self.project_root,
                "add-work",
                cache_transaction_paths([rel])
            )
            if make_folder:
                self.create_work_from_template(work_id, title)
                tx["created_paths"].append(created_rel)
                created = True
            if status == "open" and launch == "embedded":
                safe_entry = relative_safe_path(entry)
                if not safe_entry or not os.path.isfile(os.path.join(self.project_root, safe_entry)):
                    raise ValueError("雛形作成後も entry の index.html を確認できません。")
            insert_after_marker(os.path.join(self.project_root, rel), marker, work_entry(work))
            refresh_cache_revisions(self.project_root, [rel])
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            rollback_failures = restore_transaction_files(self.project_root, tx)
            if created:
                target = os.path.join(self.project_root, created_rel)
                if os.path.isdir(target):
                    shutil.rmtree(target, ignore_errors=True)
            message = str(exc)
            if rollback_failures:
                message += "\n\nrollback失敗:\n・" + "\n・".join(rollback_failures)
            alert("登録できませんでした", message)
            return

        hud("新しい作品を置きました", "success")
        self.show_tab(2)

    def open_existing_work_editor(self, sender):
        if not self.require_edit_session():
            return
        work = getattr(sender, "work_record", None)
        if not work or not work.get("id"):
            alert("編集できません", "作品情報を読み取れませんでした。")
            return
        editor = ExistingWorkEditor(self, work)
        editor.present("fullscreen", hide_title_bar=True)

    def save_existing_work(self, original_id, work):
        if not self.require_project():
            return False

        errors = []
        if not work.get("title"):
            errors.append("作品名を入力してください。")
        status = work.get("status")
        launch = work.get("launch")
        if status == "open" and launch == "embedded":
            entry = relative_safe_path(work.get("entry", ""))
            if not entry:
                errors.append("公開中の町内作品には entry が必要です。")
            elif not os.path.isfile(os.path.join(self.project_root, entry)):
                errors.append("entry の index.html が見つかりません: " + entry)
        elif status == "open" and launch == "itch_embed":
            if not work.get("embedUrl", "").startswith("https://itch.io/"):
                errors.append("公開中のitch.io作品には https://itch.io/ で始まる embedUrl が必要です。")
            if work.get("url") and not work.get("url", "").startswith("https://"):
                errors.append("itch.io作品の通常URLは https:// から始めてください。")
        elif status == "open" and launch == "external":
            if not work.get("url", "").startswith("https://"):
                errors.append("公開中の外部作品には https URL が必要です。")
        elif status == "open" and launch not in ("embedded", "itch_embed", "external"):
            errors.append("対応していない開き方です: " + str(launch))
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return False

        summary = "works.js の登録内容を更新します。\n\n{0}\n状態: {1}".format(
            work.get("title"), {"open": "公開中", "preparing": "準備中", "hidden": "非表示"}.get(status, status))
        if not confirm("作品を更新", summary):
            return False

        tx = None
        try:
            rel, var_name, _marker = REQUIRED_DATA["works"]
            tx = create_transaction(
                self.project_root,
                "edit-work",
                cache_transaction_paths([rel])
            )
            replace_object_by_id(
                os.path.join(self.project_root, rel),
                var_name,
                original_id,
                work_entry(work),
            )

            # 保存直後に対象IDを読み直し、台帳から消えていないことを確認する。
            saved_records = load_data_records(self.project_root, "works")
            saved = next((item for item in saved_records if item.get("id") == original_id), None)
            if not saved:
                raise ValueError("保存後の works.js から対象作品を確認できませんでした。")
            if saved.get("launch") != work.get("launch"):
                raise ValueError("保存後の launch が一致しません。")
            if work.get("launch") == "itch_embed" and saved.get("embedUrl") != work.get("embedUrl"):
                raise ValueError("保存後の embedUrl が一致しません。")

            refresh_cache_revisions(self.project_root, [rel])
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            rollback_failures = restore_transaction_files(self.project_root, tx)
            message = str(exc)
            if rollback_failures:
                message += "\n\nrollback失敗:\n・" + "\n・".join(rollback_failures)
            alert("更新できませんでした", message)
            return False

        hud("作品の台帳を更新しました", "success")
        return True

    def open_past_records(self, sender=None):
        if not self.require_edit_session():
            return
        message = "ここでは過去の note記事・作品・更新履歴を編集できます。\n\n追加画面とは分け、保存のたびに対象ファイルをバックアップします。削除はできません。"
        if not confirm("過去の記録を編集", message, "編集室を開く"):
            return
        editor = PastRecordsEditor(self)
        editor.present("fullscreen", hide_title_bar=True)

    def save_existing_note(self, original_id, article):
        if not self.require_project():
            return False
        title = article.get("title", "").strip()
        url = article.get("url", "").strip()
        date = (article.get("publishedAt") or article.get("publish_date") or "").strip()
        errors = []
        if not title:
            errors.append("記事タイトルを入力してください。")
        if not url.startswith("https://"):
            errors.append("note URL は https:// から始めてください。")
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("公開日は YYYY-MM-DD で入力してください。")
        notes = load_data_records(self.project_root, "notes")
        if any(item.get("url") == url and item.get("id") != original_id for item in notes):
            errors.append("同じnote URLはすでに別の記事として登録されています。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + item for item in errors))
            return False
        article["publishedAt"] = date
        summary = "notes.js の既存記事を置き換えます。\n\n" + title + "\n" + url
        if not confirm("過去の記事を更新", summary, "置き換える"):
            return False
        try:
            rel, var_name, _marker = REQUIRED_DATA["notes"]
            tx = create_transaction(self.project_root, "edit-note", [rel])
            replace_object_by_id(os.path.join(self.project_root, rel), var_name, original_id, note_entry(article))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("更新できませんでした", str(exc))
            return False
        hud("過去の記事を更新しました", "success")
        return True

    def save_existing_update(self, update):
        if not self.require_project():
            return False
        date = update.get("date", "").strip()
        title = update.get("title", "").strip()
        body = update.get("body", "").strip()
        errors = []
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("日付は YYYY-MM-DD で入力してください。")
        if not title:
            errors.append("見出しを入力してください。")
        if not body:
            errors.append("本文を入力してください。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + item for item in errors))
            return False
        summary = "updates.js の既存履歴を置き換えます。\n\n{0}\n{1}".format(title, body)
        if not confirm("過去の更新履歴を更新", summary, "置き換える"):
            return False
        tx = None
        try:
            rel, var_name, _marker = REQUIRED_DATA["updates"]
            tx = create_transaction(
                self.project_root,
                "edit-update",
                cache_transaction_paths([rel])
            )
            replace_object_by_index(
                os.path.join(self.project_root, rel),
                var_name,
                update.get("_record_index", -1),
                update_entry(update)
            )
            refresh_cache_revisions(self.project_root, [rel])
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            rollback_failures = restore_transaction_files(self.project_root, tx)
            message = str(exc)
            if rollback_failures:
                message += "\n\nrollback失敗:\n・" + "\n・".join(rollback_failures)
            alert("更新できませんでした", message)
            return False
        hud("過去の更新履歴を更新しました", "success")
        return True

    def create_work_from_template(self, work_id, title):
        source = os.path.join(self.project_root, "works", "_template")
        target = os.path.join(self.project_root, "works", work_id)
        if not os.path.isdir(source):
            raise FileNotFoundError("works/_template がありません。")
        if os.path.exists(target):
            raise FileExistsError("作品フォルダがすでにあります: " + target)
        shutil.copytree(source, target)

        meta_path = os.path.join(target, "work-meta.js")
        if os.path.isfile(meta_path):
            text = safe_read(meta_path)
            text = text.replace('id: "new-work-id"', 'id: ' + js_string(work_id))
            text = text.replace('title: "新しい触れるらくがき"', 'title: ' + js_string(title))
            atomic_write(meta_path, text)

        index_path = os.path.join(target, "index.html")
        if os.path.isfile(index_path):
            text = safe_read(index_path)
            text = text.replace("<title>新しい触れるらくがき</title>", "<title>" + title + "</title>")
            atomic_write(index_path, text)

    # -----------------------------------------------------------------
    # 更新履歴
    # -----------------------------------------------------------------
    def build_updates(self, b):
        b.title("更新履歴を書く", "data/updates.js の先頭へ1件追加します。観光案内所の更新履歴に自動で出ます。")
        self.update_date = b.field("日付", "YYYY-MM-DD", today_iso())
        self.update_title = b.field("見出し", "例:レジャーセンターに新しい筐体を設置")
        self.update_body = b.text_view("本文", "町に起きたことを短く書きます", height=110)
        self.update_tags = b.field("タグ(カンマ区切り)", "例:leisure-center, rakugaki, open")
        b.section("保存前に確認すること")
        b.label("・日付は YYYY-MM-DD\n・タグは任意。カンマで区切ると配列として保存\n・保存前に updates.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("更新履歴を追加する", "accent", self.add_update)

    def add_update(self, sender):
        if not self.require_project():
            return
        date = self.update_date.text.strip()
        title = self.update_title.text.strip()
        body = self.update_body.text.strip()
        tags = [tag.strip() for tag in self.update_tags.text.split(",") if tag.strip()]

        errors = []
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("日付は YYYY-MM-DD で入力してください。")
        if not title:
            errors.append("見出しを入力してください。")
        if not body:
            errors.append("本文を入力してください。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        update = {"date": date, "title": title, "body": body, "tags": tags}
        summary = "updates.js に1件追加します。\n\n{0}\n{1}".format(title, body)
        if not confirm("更新履歴を追加", summary):
            return

        tx = None
        try:
            rel, _var, marker = REQUIRED_DATA["updates"]
            tx = create_transaction(
                self.project_root,
                "add-update",
                cache_transaction_paths([rel])
            )
            insert_after_marker(
                os.path.join(self.project_root, rel),
                marker,
                update_entry(update)
            )
            refresh_cache_revisions(self.project_root, [rel])
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            rollback_failures = restore_transaction_files(self.project_root, tx)
            message = str(exc)
            if rollback_failures:
                message += "\n\nrollback失敗:\n・" + "\n・".join(rollback_failures)
            alert("追加できませんでした", message)
            return

        hud("町の記録を書きました", "success")
        self.show_tab(3)

    # -----------------------------------------------------------------
    # 町 / 開発モード取り込み
    # -----------------------------------------------------------------
    def build_town(self, b):
        b.title("町の編集を取り込む", "Webの開発モードで触った差分だけを読み取り、必要な正本ファイルへ安全に反映します。")
        info = safe_session_info(self.project_root)
        if not info.get("valid"):
            b.section("安全ロック")
            b.label("町へ反映する前に、Working CopyでPullと同期状態を確認してください。", lines=0, color=COLORS["red"], size=14, gap=8)
            b.button("Working CopyのStatusを開く", "blue", self.open_working_copy_status)
            b.button("Pull・同期状態を確認済み", "panel_alt", self.confirm_working_copy_sync)
        b.section("使い方")
        b.label("1. 作業前にWorking CopyでPull\n2. 湯間庭町を ?dev=1 で開く\n3. 開発モードで編集\n4. [書き出す]→コードをコピー\n5. この画面でクリップボードを確認\n6. 内容を確認して反映\n7. Working Copyで差分確認→Commit→Push", lines=0, color=COLORS["text"], size=14, gap=14)
        b.button("クリップボードの書き出しを確認", "blue", self.inspect_town_clipboard)

        plan = self.pending_town_import
        if not plan:
            b.section("対応しているもの")
            b.label("・駅前広場: data/station-plaza.js の完全版\n・灯串横丁 / 湯窓通り / 温泉方面 / レジャーセンター等: data/town-maps.js 内の該当シーンだけ\n\nWeb側からGitHubへ直接保存はしません。Deskがバックアップと検証をしてからWorking Copyへ反映します。", lines=0, color=COLORS["muted"], size=14, gap=14)
            return

        b.section("検出した書き出し")
        b.label("場所: {0}\nシーンID: {1}\n反映先: {2}".format(plan.get("title", ""), plan.get("scene_id", ""), plan.get("target_rel", "")), lines=0, color=COLORS["text"], size=15, gap=12)
        if plan.get("change_summary"):
            b.section("変更内容")
            b.label(plan.get("change_summary"), lines=0, color=COLORS["text"], size=14, gap=10)
        if plan.get("warnings"):
            b.label("注意:\n・" + "\n・".join(plan.get("warnings")), lines=0, color=COLORS["accent"], size=14, gap=10)
        if plan.get("changed"):
            b.label("現在のWorking Copyとの差分があります。反映すると上記ファイルが modified になります。", lines=0, color=COLORS["accent"], size=14, gap=12)
            b.button("この開発データを町へ反映する", "accent", self.apply_town_import)
        else:
            b.label("現在のWorking Copyと同じ内容です。反映する必要はありません。", lines=0, color=COLORS["green"], size=14, gap=12)
        b.button("取り込み候補を破棄", "panel_alt", self.clear_town_import)

    def inspect_town_clipboard(self, sender):
        if not self.require_project():
            return
        try:
            text = clipboard.get() or ""
            self.pending_town_import = plan_town_editor_import(self.project_root, text)
        except Exception as exc:
            self.pending_town_import = None
            alert("書き出しを読み取れません", str(exc))
            return
        self.show_tab(4)

    def clear_town_import(self, sender):
        self.pending_town_import = None
        self.show_tab(4)

    def apply_town_import(self, sender):
        if not self.require_project():
            return
        plan = self.pending_town_import
        if not plan:
            alert("取り込み候補がありません", "先にクリップボードの書き出しを確認してください。")
            return
        if not plan.get("changed"):
            alert("差分はありません", "現在のWorking Copyと同じ内容です。")
            return

        file_plans = plan.get("file_plans")
        if not isinstance(file_plans, list):
            alert(
                "反映できません",
                "取り込み計画の形式が不正です。変更差分をもう一度読み取ってください。"
            )
            self.pending_town_import = None
            return
        file_plans = [item for item in file_plans if item.get("changed")]
        target_rels = [item.get("target_rel", "") for item in file_plans if item.get("target_rel")]
        if not target_rels:
            alert("差分はありません", "反映が必要なファイルはありません。")
            return

        # プレビュー後に1つでもファイルが変わっていれば、全体を中止する。
        for item in file_plans:
            target_rel = item.get("target_rel", "")
            target_abs = os.path.join(self.project_root, target_rel)
            if not os.path.isfile(target_abs):
                alert("反映できません", target_rel + " が見つかりません。")
                return
            current = safe_read(target_abs)
            if _sha256_text(current) != item.get("current_hash"):
                self.pending_town_import = None
                alert("ファイルが更新されています", target_rel + " がプレビュー後に変わりました。Working Copyの状態を確認し、もう一度クリップボードから読み取ってください。")
                self.show_tab(4)
                return

        message = "{0}\n\n反映先:\n{1}\n\n変更前ファイルはすべてリポジトリ外へまとめてバックアップします。反映後はWorking Copyで差分を確認してください。".format(
            plan.get("summary", "町の編集データを反映"),
            "\n".join("・" + rel for rel in target_rels),
        )
        if not confirm("開発モードの編集を反映", message, "反映する"):
            return

        tx = None
        try:
            tx = create_transaction(
                self.project_root,
                "import-town-" + str(plan.get("scene_id") or "scene"),
                target_rels
            )

            for item in file_plans:
                target_rel = item.get("target_rel", "")
                target_abs = os.path.join(self.project_root, target_rel)
                atomic_write(target_abs, item.get("new_text", ""))

            # 全ファイルを再読込し、1つでも不一致なら例外に統一する。
            # rollback自体は下のexceptで必ず一括実行する。
            for item in file_plans:
                target_rel = item.get("target_rel", "")
                target_abs = os.path.join(self.project_root, target_rel)
                written = safe_read(target_abs)
                if target_rel.lower().endswith(".js"):
                    ok, syntax_message = basic_js_balance(written)
                    if not ok:
                        raise ValueError(
                            target_rel + " の構文確認に失敗: " + syntax_message
                        )
                if _sha256_text(written) != item.get("new_hash"):
                    raise ValueError(
                        target_rel + " に書き込んだ内容が予定内容と一致しません"
                    )

            finish_transaction(self.project_root, tx)
        except Exception as exc:
            rollback_failures = restore_transaction_files(
                self.project_root,
                tx
            )

            if rollback_failures:
                message = (
                    str(exc)
                    + "\n\nさらにrollbackに失敗しました。Working Copyで必ず確認してください:\n・"
                    + "\n・".join(rollback_failures)
                )
            elif tx:
                message = (
                    str(exc)
                    + "\n\n反映開始後に失敗したため、対象ファイルはすべて変更前へ戻しました。"
                )
            else:
                message = str(exc)

            alert("町へ反映できませんでした", message)
            return

        self.pending_town_import = None
        hud("町の変更差分をWorking Copyへ反映しました", "success")
        self.show_tab(4)

    # -----------------------------------------------------------------
    # 安全確認
    # -----------------------------------------------------------------
    def build_safety(self, b):
        b.title("町の状態を確認", "データの入口、重複、公開中作品のリンク先を確認します。")
        if not project_is_staging(self.project_root):
            b.label("まず Working Copy の yumaniwa-town-staging 内からこのスクリプトを起動し、[案内]でstagingを再検出してください。", lines=0, color=COLORS["red"], size=15, gap=14)
            return

        report = validate_project(self.project_root)
        stats = report.get("stats", {})
        b.section("現在の台帳")
        b.label("note記事: {notes}件\n作品: {works}件\n町に公開中の作品: {open_works}件".format(**stats), lines=0, color=COLORS["text"], size=16, gap=14)

        if report["errors"]:
            b.section("修正が必要")
            b.label("\n".join("・" + e for e in report["errors"]), lines=0, color=COLORS["red"], size=14, gap=14)
        else:
            b.section("確認結果")
            b.label("重大な問題は見つかりませんでした。", lines=0, color=COLORS["green"], size=15, gap=10)

        if report["warnings"]:
            b.section("注意")
            b.label("\n".join("・" + item for item in report["warnings"]), lines=0, color=COLORS["accent"], size=14, gap=14)

        b.button("もう一度確認する", "blue", self.refresh_safety)
        b.section("直前の更新")
        tx = last_transaction(self.project_root)
        if tx:
            state = "(戻し済み)" if tx.get("undone") else ""
            files = "、".join(tx.get("files", []))
            text = "{label} {state}\n{created_at}\n対象: {files}".format(
                label=tx.get("label", "update"), state=state,
                created_at=tx.get("created_at", ""), files=files)
            if tx.get("created_paths"):
                text += "\n作成: " + "、".join(tx.get("created_paths", []))
            b.label(text, lines=0, color=COLORS["text"], size=14, gap=10)
            if not tx.get("undone"):
                b.button("直前の更新を取り消す", "red", self.undo_last)
        else:
            b.label("まだこの管理室から保存した更新はありません。", lines=0, color=COLORS["muted"], size=14, gap=14)

        b.section("過去の記録を編集")
        b.label("追加画面とは分けてあります。既存の note記事・作品・更新履歴を直すときだけ、専用の編集室を開いてください。", lines=0, color=COLORS["muted"], size=14, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)
        b.section("バックアップ")
        b.label("保存ごとに、変更前のファイルを Git 管理外の Pythonista Documents/YumaniwaDesk-data/backups/ にコピーします。直前の1回はこの画面から取り消せます。古いバックアップは最大 {0} 件まで残します。\n\nWorking Copy には、実際に編集した町のファイルだけが変更として表示されます。".format(MAX_BACKUPS), lines=0, color=COLORS["muted"], size=14, gap=14)

    def refresh_safety(self, sender):
        self.show_tab(5)

    def undo_last(self, sender):
        if not self.require_project():
            return
        tx = last_transaction(self.project_root)
        if not tx or tx.get("undone"):
            alert("取り消せません", "戻せる直前の更新がありません。")
            return
        message = "次の更新を取り消します。\n\n{0}\n対象: {1}".format(tx.get("label", "update"), "、".join(tx.get("files", [])))
        if tx.get("created_paths"):
            message += "\n\n作成した作品フォルダも削除します:\n" + "、".join(tx.get("created_paths", []))
        if not confirm("直前の更新を取り消す", message, "取り消す"):
            return
        try:
            undo_last_transaction(self.project_root)
        except Exception as exc:
            alert("取り消せませんでした", str(exc))
            return
        hud("直前の更新を戻しました", "success")
        self.show_tab(5)


def main():
    try:
        desk = YumaniwaDesk()
        # 既存のnote.py / rakugaki_cabinet.pyと同じ、標準のfullscreen表示。
        desk.present("fullscreen")
    except Exception:
        details = traceback.format_exc()
        print(details)
        try:
            console.alert(APP_NAME + " の起動エラー", details)
        except Exception:
            pass
        raise


if __name__ == "__main__":
    main()
