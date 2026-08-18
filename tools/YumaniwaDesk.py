# coding: utf-8
"""
Yumaniwa Desk v0.9
Pythonista 用:湯間庭町の「中身」だけを安全に更新する小さな管理室。

Working Copy 運用の想定配置:
  yumaniwa-town/              ← GitHub から clone した正規ローカルコピー
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


APP_NAME = "Yumaniwa Desk"

# Pythonistaでは起動方法によって __file__ が無い場合があります。
# note.py / rakugaki_cabinet.py と同じく、安全に作業フォルダへフォールバックします。
try:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    APP_DIR = os.getcwd()

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
OPERATION_STATE_KEY = "operation_state"
WORKING_COPY_REPO_NAME = "yumaniwa-town"

# 同期確認は「このDeskを起動している間」だけ有効にする。
# settings.json には前回確認時刻を残すが、アプリを起動し直したら必ず再確認する。
RUNTIME_SYNC_CONFIRMED = False

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
    if not root or not os.path.isdir(root):
        return False
    required = [
        "index.html",
        "data/notes.js",
        "data/works.js",
        "data/updates.js",
        "works",
    ]
    return all(os.path.exists(os.path.join(root, rel)) for rel in required)


def find_project_root(start_path):
    current = os.path.abspath(start_path)
    if os.path.isfile(current):
        current = os.path.dirname(current)
    for _ in range(9):
        if project_looks_valid(current):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return None


def ensure_desk_data_dir():
    for path in (DESK_DATA_DIR, BACKUP_ROOT_DIR, STATE_ROOT_DIR):
        if not os.path.isdir(path):
            os.makedirs(path)


def project_storage_key(root):
    root = os.path.abspath(root or "")
    base = os.path.basename(root.rstrip("/")) or "yumaniwa-town"
    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "project"
    digest = hashlib.sha1(root.encode("utf-8")).hexdigest()[:8]
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


def default_project_root():
    direct = find_project_root(APP_DIR)
    if direct:
        return direct
    settings = read_settings()
    stored = settings.get("project_root", "")
    if project_looks_valid(stored):
        return stored
    return ""


def _parse_iso_datetime(value):
    if not value:
        return None
    try:
        return datetime.datetime.fromisoformat(str(value))
    except Exception:
        return None


def operation_state():
    settings = read_settings()
    state = settings.get(OPERATION_STATE_KEY, {})
    return dict(state) if isinstance(state, dict) else {}


def save_operation_state(state):
    settings = read_settings()
    settings[OPERATION_STATE_KEY] = dict(state or {})
    save_settings(settings)


def safe_session_info():
    state = operation_state()
    confirmed = _parse_iso_datetime(state.get("sync_confirmed_at"))
    age_minutes = None
    valid = False
    if confirmed is not None:
        try:
            age_minutes = max(0.0, (datetime.datetime.now() - confirmed).total_seconds() / 60.0)
            # 時刻だけではなく、このDesk起動中に確認したことも必須。
            valid = bool(RUNTIME_SYNC_CONFIRMED) and age_minutes <= SAFE_SESSION_MAX_MINUTES
        except Exception:
            pass
    return {
        "valid": valid,
        "confirmed_at": confirmed,
        "age_minutes": age_minutes,
        "pending_push": bool(state.get("pending_push")),
        "last_change_label": str(state.get("last_change_label") or ""),
        "last_change_files": list(state.get("last_change_files") or []),
    }


def confirm_safe_session():
    global RUNTIME_SYNC_CONFIRMED
    state = operation_state()
    now = datetime.datetime.now().isoformat(timespec="seconds")
    state["sync_confirmed_at"] = now
    state["pending_push"] = False
    state["last_sync_confirmed_at"] = now
    save_operation_state(state)
    RUNTIME_SYNC_CONFIRMED = True


def require_safe_write_session():
    info = safe_session_info()
    if info.get("valid"):
        return True
    raise RuntimeError(
        "安全ロック中です。書き込む前に[案内]でWorking Copyを開き、"
        "Pull後に HEAD / main / origin/main が一致し、未コミット変更がないことを確認してから"
        "「同期確認済み」を押してください。"
    )


def mark_pending_push(label, files):
    state = operation_state()
    state["pending_push"] = True
    state["last_change_label"] = str(label or "update")
    state["last_change_files"] = list(files or [])
    state["last_change_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    save_operation_state(state)


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


def _extract_scene_export(text):
    """
    開発モードが生成する
      scene_id: { ... },
    形式から scene_id と JSON オブジェクトを取り出す。
    JSON.stringify 由来なのでオブジェクト本体は json.loads で検証できる。
    """
    match = re.search(r"(?m)^\s*([A-Za-z0-9_]+)\s*:\s*(\{)", text)
    if not match:
        raise ValueError("町マップのシーン定義を見つけられません。")
    scene_id = match.group(1)
    open_index = match.start(2)
    close_index = find_matching(text, open_index, "{", "}")
    if close_index < 0:
        raise ValueError("町マップのシーン定義の括弧が閉じていません。")
    object_text = text[open_index:close_index + 1]
    try:
        data = json.loads(object_text)
    except Exception as exc:
        raise ValueError("町マップの書き出しJSONを読めません: " + str(exc))
    if not isinstance(data, dict):
        raise ValueError("町マップの書き出し内容がオブジェクトではありません。")
    if str(data.get("id", "")) != scene_id:
        raise ValueError("シーンIDと書き出しデータ内の id が一致しません。")
    return scene_id, data


def _replace_scene_in_town_maps(current_text, scene_id, scene_data):
    root_match = re.search(r"window\.TOWN_SCENE_MAPS\s*=\s*\{", current_text)
    if not root_match:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS を見つけられません。")
    root_open = current_text.find("{", root_match.start())
    root_close = find_matching(current_text, root_open, "{", "}")
    if root_close < 0:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS が閉じていません。")

    body_start = root_open + 1
    body = current_text[body_start:root_close]
    pattern = re.compile(r"(?m)^([ \t]*)" + re.escape(scene_id) + r"\s*:\s*(\{)")
    matches = list(pattern.finditer(body))
    if len(matches) != 1:
        if not matches:
            raise ValueError("data/town-maps.js にシーンがありません: " + scene_id)
        raise ValueError("data/town-maps.js に同じシーンIDが複数あります: " + scene_id)

    match = matches[0]
    indent = match.group(1)
    abs_property_start = body_start + match.start()
    abs_open = body_start + match.start(2)
    abs_close = find_matching(current_text, abs_open, "{", "}")
    if abs_close < 0 or abs_close > root_close:
        raise ValueError("置換対象シーンの括弧を正しく読めません。")

    abs_end = abs_close + 1
    while abs_end < root_close and current_text[abs_end] in " \t":
        abs_end += 1
    if abs_end < root_close and current_text[abs_end] == ",":
        abs_end += 1

    json_text = json.dumps(scene_data, ensure_ascii=False, indent=4)
    json_lines = json_text.splitlines()
    replacement = indent + scene_id + ": " + json_lines[0]
    if len(json_lines) > 1:
        replacement += "\n" + "\n".join(indent + line for line in json_lines[1:])
    replacement += ","

    result = current_text[:abs_property_start] + replacement + current_text[abs_end:]
    ok, message = basic_js_balance(result)
    if not ok:
        raise ValueError("town-maps.js へ反映すると構文が崩れます: " + message)
    return result



def _extract_scene_block(current_text, scene_id):
    root_match = re.search(r"window\.TOWN_SCENE_MAPS\s*=\s*\{", current_text)
    if not root_match:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS を見つけられません。")
    root_open = current_text.find("{", root_match.start())
    root_close = find_matching(current_text, root_open, "{", "}")
    if root_close < 0:
        raise ValueError("data/town-maps.js の TOWN_SCENE_MAPS が閉じていません。")
    body_start = root_open + 1
    body = current_text[body_start:root_close]
    pattern = re.compile(r"(?m)^([ \t]*)" + re.escape(scene_id) + r"\s*:\s*(\{)")
    matches = list(pattern.finditer(body))
    if len(matches) != 1:
        raise ValueError("data/town-maps.js のシーンを一意に読めません: " + scene_id)
    match = matches[0]
    abs_open = body_start + match.start(2)
    abs_close = find_matching(current_text, abs_open, "{", "}")
    if abs_close < 0:
        raise ValueError("シーンの括弧を読めません: " + scene_id)
    return current_text[abs_open:abs_close + 1]


def _top_level_object_keys(object_text):
    text = object_text or ""
    keys = set()
    if not text.lstrip().startswith("{"):
        return keys
    start = text.find("{")
    i = start + 1
    depth = 1
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < len(text) and depth > 0:
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

        if ch == "{":
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            i += 1
            continue

        if depth == 1 and (ch.isspace() or ch == ","):
            i += 1
            continue

        if depth == 1:
            key = None
            j = i
            if ch in ("'", '"'):
                q = ch
                j += 1
                buf = []
                esc = False
                while j < len(text):
                    c = text[j]
                    if esc:
                        buf.append(c)
                        esc = False
                    elif c == "\\":
                        esc = True
                    elif c == q:
                        break
                    else:
                        buf.append(c)
                    j += 1
                if j < len(text) and text[j] == q:
                    key = "".join(buf)
                    j += 1
            else:
                m = re.match(r"[A-Za-z_][A-Za-z0-9_]*", text[i:])
                if m:
                    key = m.group(0)
                    j = i + len(key)

            if key:
                while j < len(text) and text[j].isspace():
                    j += 1
                if j < len(text) and text[j] == ":":
                    keys.add(key)
                    i = j + 1
                    continue

        if ch in ("'", '"', "`"):
            quote = ch
        i += 1

    return keys


def _extract_named_array(object_text, key):
    pattern = re.compile(r'(?m)(?:"' + re.escape(key) + r'"|' + re.escape(key) + r')\s*:\s*(\[)')
    m = pattern.search(object_text or "")
    if not m:
        return ""
    open_index = m.start(1)
    close_index = find_matching(object_text, open_index, "[", "]")
    if close_index < 0:
        return ""
    return object_text[open_index + 1:close_index]


def _array_object_ids(array_body):
    ids = []
    for block in extract_object_blocks(array_body or ""):
        m = re.search(r'\b(?:id)\s*:\s*"([^"]+)"', block)
        if not m:
            m = re.search(r'"id"\s*:\s*"([^"]+)"', block)
        if m:
            ids.append(m.group(1))
    return ids


def _count_rect_items(array_body):
    if not (array_body or "").strip():
        return 0
    rect_calls = len(re.findall(r'\brect\s*\(', array_body))
    objects = len(extract_object_blocks(array_body))
    return rect_calls + objects


def _scene_change_summary(current_text, scene_id, scene_data):
    old_block = _extract_scene_block(current_text, scene_id)
    old_props = _array_object_ids(_extract_named_array(old_block, "props"))
    old_triggers = _array_object_ids(_extract_named_array(old_block, "triggers"))
    new_props = [str(p.get("id") or "") for p in (scene_data.get("props") or []) if isinstance(p, dict)]
    new_triggers = [str(t.get("id") or "") for t in (scene_data.get("triggers") or []) if isinstance(t, dict)]

    old_prop_set, new_prop_set = set(old_props), set(new_props)
    old_trigger_set, new_trigger_set = set(old_triggers), set(new_triggers)

    old_passable = _count_rect_items(_extract_named_array(old_block, "passableRects"))
    old_blocked = _count_rect_items(_extract_named_array(old_block, "blockedRects"))
    new_passable = len(scene_data.get("passableRects") or [])
    new_blocked = len(scene_data.get("blockedRects") or [])

    lines = [
        "パーツ: {0} → {1}".format(len(old_props), len(new_props)),
        "トリガー: {0} → {1}".format(len(old_triggers), len(new_triggers)),
        "通行領域: {0} → {1}".format(old_passable, new_passable),
        "通行不可領域: {0} → {1}".format(old_blocked, new_blocked),
    ]
    added_props = sorted(new_prop_set - old_prop_set)
    removed_props = sorted(old_prop_set - new_prop_set)
    added_triggers = sorted(new_trigger_set - old_trigger_set)
    removed_triggers = sorted(old_trigger_set - new_trigger_set)
    if added_props:
        lines.append("追加パーツ: " + ", ".join(added_props))
    if removed_props:
        lines.append("削除パーツ: " + ", ".join(removed_props))
    if added_triggers:
        lines.append("追加トリガー: " + ", ".join(added_triggers))
    if removed_triggers:
        lines.append("削除トリガー: " + ", ".join(removed_triggers))
    return "\n".join(lines)


def _known_scene_ids(current_text):
    result = {"station_plaza"}
    root_match = re.search(r"window\.TOWN_SCENE_MAPS\s*=\s*\{", current_text or "")
    if not root_match:
        return result
    root_open = current_text.find("{", root_match.start())
    root_close = find_matching(current_text, root_open, "{", "}")
    if root_close < 0:
        return result
    body = current_text[root_open + 1:root_close]
    for m in re.finditer(r'(?m)^[ \t]*(?:\"([^"]+)\"|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\{', body):
        result.add(m.group(1) or m.group(2))
    return result


def _validate_scene_export(root, current_text, scene_id, scene_data):
    errors = []
    warnings = []

    if not isinstance(scene_data, dict) or scene_data.get("id") != scene_id:
        errors.append("シーンIDが一致していません。")

    try:
        map_w = float(scene_data.get("mapWidth"))
        map_h = float(scene_data.get("mapHeight"))
        if not (1 <= map_w <= 128 and 1 <= map_h <= 128):
            errors.append("マップサイズが想定範囲外です。")
    except Exception:
        errors.append("mapWidth / mapHeight を数値として読めません。")
        map_w = map_h = 24

    triggers = scene_data.get("triggers") or []
    props = scene_data.get("props") or []
    if not isinstance(triggers, list) or not isinstance(props, list):
        errors.append("triggers / props が配列ではありません。")
        return errors, warnings

    trigger_ids = [str(t.get("id") or "") for t in triggers if isinstance(t, dict)]
    prop_ids = [str(p.get("id") or "") for p in props if isinstance(p, dict)]
    if any(not x for x in trigger_ids):
        errors.append("IDのないトリガーがあります。")
    if any(not x for x in prop_ids):
        errors.append("IDのないパーツがあります。")
    if len(trigger_ids) != len(set(trigger_ids)):
        errors.append("トリガーIDが重複しています。")
    if len(prop_ids) != len(set(prop_ids)):
        errors.append("パーツIDが重複しています。")

    trigger_set = set(trigger_ids)
    for prop in props:
        if not isinstance(prop, dict):
            errors.append("パーツデータにオブジェクト以外が含まれています。")
            continue
        for key in ("x", "y", "w", "h"):
            try:
                value = float(prop.get(key))
                if not math.isfinite(value):
                    raise ValueError()
                limit = max(map_w, map_h) * 3
                if abs(value) > limit:
                    errors.append("{0} の {1} が異常に大きい値です。".format(prop.get("id", "part"), key))
            except Exception:
                errors.append("{0} の {1} を数値として読めません。".format(prop.get("id", "part"), key))
        src = str(prop.get("src") or "")
        if src and not src.startswith(("http://", "https://")):
            rel = src.split("?", 1)[0].split("#", 1)[0].lstrip("./")
            if rel and not os.path.exists(os.path.join(root, rel)):
                errors.append("画像ファイルが見つかりません: " + rel)
        interaction = prop.get("interaction") or {}
        if isinstance(interaction, dict) and interaction.get("enabled"):
            trigger_id = str(interaction.get("triggerId") or "")
            if trigger_id and trigger_id not in trigger_set:
                errors.append("{0} の interaction が存在しないtriggerIdを参照しています: {1}".format(prop.get("id", "part"), trigger_id))

    work_ids = set()
    try:
        for work in load_data_records(root, "works"):
            if work.get("id"):
                work_ids.add(str(work.get("id")))
    except Exception:
        pass

    known_scenes = _known_scene_ids(current_text)
    for trigger in triggers:
        if not isinstance(trigger, dict):
            continue
        if trigger.get("type") == "work":
            work_id = str(trigger.get("workId") or "")
            if work_id and work_ids and work_id not in work_ids:
                errors.append("作品トリガーが存在しないworkIdを参照しています: " + work_id)

    for warp in scene_data.get("edgeWarps") or []:
        if isinstance(warp, dict):
            target = str(warp.get("target") or "")
            if target and target not in known_scenes:
                errors.append("edgeWarpが存在しないシーンを参照しています: " + target)

    old_block = _extract_scene_block(current_text, scene_id)
    old_keys = _top_level_object_keys(old_block)
    new_keys = set(scene_data.keys())
    lost = sorted(old_keys - new_keys)
    if lost:
        errors.append("この書き出しを反映すると既存フィールドが消えます: " + ", ".join(lost))

    return errors, warnings



EDITOR_DIFF_FORMAT = "yumaniwa-editor-diff-v1"
EDITOR_DIFF_ALLOWED_SOURCES = {
    "data/station-plaza.js",
    "data/town-maps.js",
    "data/town-runtime-fixes.js",
    "town-update-sign.js",
    "town-feedback-box.js",
    "town-ghost-npc.js",
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


def _replace_var_array_object(text, var_name, object_id, after):
    open_index, close_index = _find_var_array_span(text, var_name)
    return _replace_object_in_array(text, open_index, close_index, object_id, after)


def _replace_scene_array_object(text, scene_id, array_name, object_id, after):
    scene_open, scene_close = _find_scene_span(text, scene_id)
    arr_open, arr_close = _find_named_array_span(text, array_name, scene_open, scene_close)
    return _replace_object_in_array(text, arr_open, arr_close, object_id, after)


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


def _changed_top_keys(before, after):
    before = before if isinstance(before, dict) else {}
    after = after if isinstance(after, dict) else {}
    keys = set(before.keys()) | set(after.keys())
    return {key for key in keys if before.get(key) != after.get(key)}


def _patch_ghost_prop(text, before, after):
    allowed = {"x", "y", "w", "h", "footY"}
    unsupported = _changed_top_keys(before, after) - allowed
    if unsupported:
        raise ValueError("おばけNPCで位置・大きさ以外の変更はDeskから安全に反映できません: " + ", ".join(sorted(unsupported)))
    text = _replace_simple_var_number(text, "propW", after.get("w"))
    text = _replace_simple_var_number(text, "propH", after.get("h"))
    text = _replace_simple_var_number(text, "baseFootY", after.get("footY"))
    text = _replace_simple_var_number(text, "baseX", after.get("x"))
    text = _replace_simple_var_number(text, "baseY", after.get("y"))
    return text


def _validate_diff_part(root, change):
    after = change.get("after")
    if not isinstance(after, dict):
        raise ValueError("props の after がオブジェクトではありません: " + str(change.get("id") or ""))
    object_id = str(change.get("id") or "")
    if not object_id or str(after.get("id") or "") != object_id:
        raise ValueError("props のIDが一致しません: " + object_id)
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


def _normalize_diff_source(value):
    rel = relative_safe_path(str(value or ""))
    if not rel or rel not in EDITOR_DIFF_ALLOWED_SOURCES:
        raise ValueError("差分の反映先が許可されていません: " + str(value or ""))
    return rel


def _patch_diff_file(source, current_text, scene_id, prop_changes, trigger_changes, collision_change, area_change):
    result = current_text

    for change in prop_changes:
        object_id = str(change.get("id") or "")
        after = change.get("after")
        before = change.get("before")
        if source == "data/station-plaza.js":
            result = _replace_var_array_object(result, "stationPlazaProps", object_id, after)
        elif source == "data/town-maps.js":
            result = _replace_scene_array_object(result, scene_id, "props", object_id, after)
        elif source in ("town-update-sign.js", "town-feedback-box.js"):
            result = _replace_var_object(result, "prop", after)
        elif source == "town-ghost-npc.js":
            result = _patch_ghost_prop(result, before, after)
        elif source == "data/town-runtime-fixes.js":
            if object_id in ("yakitori_yumado_shop", "common_temporary_storefront"):
                unsupported = _changed_top_keys(before, after) - {"x", "y", "w", "h", "footY"}
                if unsupported:
                    raise ValueError(object_id + " で位置・大きさ以外の変更は安全に反映できません: " + ", ".join(sorted(unsupported)))
                result = _replace_prop_assignment_block(result, object_id, after)
            elif object_id in ("no_entry_sign", "standing_signboard"):
                result = _replace_literal_id_object(result, object_id, after)
            else:
                raise ValueError("runtime-fixes.js の未対応パーツです: " + object_id)
        else:
            raise ValueError("props の未対応反映先です: " + source)

    for change in trigger_changes:
        object_id = str(change.get("id") or "")
        after = change.get("after")
        if not isinstance(after, dict) or str(after.get("id") or "") != object_id:
            raise ValueError("trigger のIDが一致しません: " + object_id)
        if source == "data/station-plaza.js":
            result = _replace_var_array_object(result, "triggers", object_id, after)
        elif source == "data/town-maps.js":
            result = _replace_scene_array_object(result, scene_id, "triggers", object_id, after)
        elif source in ("town-update-sign.js", "town-feedback-box.js", "town-ghost-npc.js"):
            result = _replace_var_object(result, "trigger", after)
        else:
            raise ValueError("triggers の未対応反映先です: " + source)

    if collision_change:
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

    for change in props:
        if not isinstance(change, dict) or change.get("op") != "update":
            raise ValueError("v0.9 は props の update 差分だけを安全に取り込めます。")
        _validate_diff_part(root, change)
        source = _normalize_diff_source(change.get("source"))
        bucket(source)["props"].append(change)
        detail_lines.append("・{0}: パーツ {1}".format(source, change.get("id")))

    for change in triggers:
        if not isinstance(change, dict) or change.get("op") != "update":
            raise ValueError("v0.9 は triggers の update 差分だけを安全に取り込めます。")
        source = _normalize_diff_source(change.get("source"))
        bucket(source)["triggers"].append(change)
        detail_lines.append("・{0}: トリガー {1}".format(source, change.get("id")))

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

    # v0.9: 新しい差分形式を最優先で読む。
    manifest = _extract_editor_diff_manifest(text)
    if manifest is not None:
        return _plan_editor_diff_import(root, manifest)

    # 旧形式も互換のため残す。
    looks_like_station_export = (
        "data/station-plaza.js" in text
        and "var stationPlazaProps" in text
        and "var MAP_WIDTH" in text
    )
    looks_like_scene_export = (
        "data/town-maps.js" in text
        and re.search(r"(?m)^\s*[A-Za-z0-9_]+\s*:\s*\{", text) is not None
    )
    if not looks_like_station_export and not looks_like_scene_export:
        raise ValueError(
            "湯間庭町の開発モード書き出しとして認識できません。"
            " [変更を書き出す]→[変更差分をコピー]をもう一度行ってください。"
        )

    if looks_like_station_export:
        target_rel = "data/station-plaza.js"
        target_abs = os.path.join(root, target_rel)
        if not os.path.isfile(target_abs):
            raise FileNotFoundError(target_rel + " がありません。")
        ok, message = basic_js_balance(text)
        if not ok:
            raise ValueError("駅前広場の書き出しコードを反映できません: " + message)
        current = safe_read(target_abs)
        return {
            "kind": "station-data",
            "scene_id": "station_plaza",
            "title": "駅前広場",
            "target_rel": target_rel,
            "target_rels": [target_rel],
            "current_hash": _sha256_text(current),
            "new_hash": _sha256_text(text),
            "new_text": text,
            "changed": current.replace("\r\n", "\n") != text,
            "summary": "駅前広場の完全版を data/station-plaza.js へ反映",
            "change_summary": "旧形式です。駅前広場の専用データファイル全体を置換します。",
            "warnings": ["旧形式の完全版取り込みです。可能なら新しい変更差分形式を使ってください。"],
        }

    if looks_like_scene_export:
        scene_id, scene_data = _extract_scene_export(text)
        target_rel = "data/town-maps.js"
        target_abs = os.path.join(root, target_rel)
        if not os.path.isfile(target_abs):
            raise FileNotFoundError(target_rel + " がありません。")
        current = safe_read(target_abs)
        errors, warnings = _validate_scene_export(root, current, scene_id, scene_data)
        if errors:
            raise ValueError("安全確認に失敗しました:\n・" + "\n・".join(errors))
        new_text = _replace_scene_in_town_maps(current, scene_id, scene_data)
        title = str(scene_data.get("title") or scene_id)
        warnings = list(warnings) + ["旧形式のシーン完全版取り込みです。可能なら新しい変更差分形式を使ってください。"]
        return {
            "kind": "scene-definition",
            "scene_id": scene_id,
            "title": title,
            "target_rel": target_rel,
            "target_rels": [target_rel],
            "current_hash": _sha256_text(current),
            "new_hash": _sha256_text(new_text),
            "new_text": new_text,
            "changed": current != new_text,
            "summary": title + " (" + scene_id + ") を data/town-maps.js 内で置換",
            "change_summary": _scene_change_summary(current, scene_id, scene_data),
            "warnings": warnings,
        }

    raise ValueError("対応する書き出し形式ではありません。")

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
    require_safe_write_session()
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
    mark_pending_push(transaction.get("label", "update"), transaction.get("files", []))


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


def undo_last_transaction(root):
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
    mark_pending_push("undo-" + str(tx.get("label") or "update"), tx.get("files", []))


def validate_project(root):
    report = {"errors": [], "warnings": [], "ok": []}
    if not project_looks_valid(root):
        report["errors"].append("湯間庭町のプロジェクトとして認識できません。index.html / data / works を確認してください。")
        return report

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
        if project_looks_valid(self.project_root):
            settings = read_settings()
            settings["project_root"] = self.project_root
            save_settings(settings)
        self.current_tab = 0
        self._last_layout_width = 0
        self._initial_page_built = False
        self.pending_town_import = None

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)

        self.title_label = make_label("湯間庭町 管理室", 20, COLORS["text"], lines=1)
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
        if project_looks_valid(self.project_root):
            name = os.path.basename(self.project_root.rstrip("/")) or "湯間庭町"
            info = safe_session_info()
            if info.get("pending_push"):
                self.status_label.text = "未Push確認あり"
                self.status_label.text_color = COLORS["accent"]
            elif info.get("valid"):
                self.status_label.text = "同期確認済み"
                self.status_label.text_color = COLORS["green"]
            else:
                self.status_label.text = "安全ロック中"
                self.status_label.text_color = COLORS["red"]
        else:
            self.status_label.text = "プロジェクト未選択"
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
        return project_looks_valid(self.project_root) and bool(safe_session_info().get("valid"))

    def build_edit_lock(self, b, index):
        tab_name = self.TAB_TITLES[index] if 0 <= index < len(self.TAB_TITLES) else "編集"
        b.title("安全ロック中", "{0}の入力欄は、Working Copyの同期確認が終わるまで表示しません。".format(tab_name))

        if not project_looks_valid(self.project_root):
            b.section("先にプロジェクトを接続")
            b.label("Working Copy の yumaniwa-town 内からこのDeskを起動し、[案内]で町を再検出してください。接続できるまで編集は開始できません。", lines=0, color=COLORS["red"], size=14, gap=12)
            b.button("案内へ戻る", "panel_alt", lambda sender: self.show_tab(0))
            return

        info = safe_session_info()
        b.section("作業前の確認")
        b.label("""1. Working CopyでStatusを開く
2. Pullを行う
3. HEAD / main / origin/main が一致し、未コミット変更がないことを確認
4. 下の『Pull・同期状態を確認済み』を押す""", lines=0, color=COLORS["text"], size=14, gap=12)
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
        if not project_looks_valid(self.project_root):
            self.require_project()
            return False
        if safe_session_info().get("valid"):
            return True
        alert(
            "安全ロック中です",
            "入力を始める前に[案内]でWorking CopyのStatusを確認し、Pull後に『Pull・同期状態を確認済み』を押してください。\n\n同期確認が終わるまで編集画面は開きません。"
        )
        return False

    def require_project(self):
        if project_looks_valid(self.project_root):
            return True
        alert("プロジェクトが未選択です", "Working Copy の yumaniwa-town 内(直下または tools/)にこのスクリプトを置いて起動し、[案内]の『Working Copyの町を再検出』を押してください。")
        self.show_tab(0)
        return False

    def open_working_copy_status(self, sender):
        try:
            webbrowser.open("working-copy://open?repo={0}&mode=status".format(WORKING_COPY_REPO_NAME))
        except Exception as exc:
            alert("Working Copyを開けません", str(exc))

    def confirm_working_copy_sync(self, sender):
        if not project_looks_valid(self.project_root):
            alert("プロジェクトが未選択です", "先に[案内]でWorking Copyの湯間庭町を再検出してください。")
            self.show_tab(0)
            return
        message = (
            "Working CopyでPullを行い、次の2点を確認しましたか?\n\n"
            "・HEAD / main / origin/main が同じコミット\n"
            "・コミット前の変更ファイルが残っていない\n\n"
            "確認できている場合だけ同期済みにします。"
        )
        if not confirm("同期確認", message, "確認済み"):
            return
        confirm_safe_session()
        hud("安全ロックを解除しました", "success")
        self.show_tab(self.current_tab)

    # -----------------------------------------------------------------
    # 案内
    # -----------------------------------------------------------------
    def build_home(self, b):
        b.title("湯間庭町 管理室", "Working Copy の町を直接編集します。GitHubへの反映は Working Copy で差分確認してから行います。")
        info = safe_session_info()
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
        b.button("Working Copyの町を再検出", "blue", self.detect_project_from_script)
        b.button("このリポジトリを確認する", "panel_alt", self.check_current_project)
        b.section("Working Copy 運用")
        b.label("このスクリプトを Working Copy の yumaniwa-town 内(直下または tools/)に置いて起動します。保存すると Working Copy に変更として現れます。\n\n保存後は Working Copy で差分を確認 → Commit → Push。GPTがGitHub側を更新した後は、Deskを使う前に Working Copy で Pull します。", lines=0, color=COLORS["text"], size=15, gap=14)
        b.section("安全な使い方")
        b.label("作業前にWorking CopyでPullし、日々の台帳更新は[記事][作品][履歴]を使います。町の配置変更はWebの開発モード→[書き出す]→[町]から取り込みます。保存のたびに対象ファイルをリポジトリ外へバックアップします。\n\nmain.js / engine / works/*/sketch.js は直接編集しません。設定・バックアップ・Undo情報も Git の変更には出ません。", lines=0, color=COLORS["muted"], size=15, gap=14)
        b.section("過去の記録を直すとき")
        b.label("過去の記事・作品・更新履歴の編集は、追加画面とは別の編集室から行います。上書き保存の前には確認があり、削除機能はありません。", lines=0, color=COLORS["text"], size=15, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)
        b.section("管理データの保存先")
        b.label(DESK_DATA_DIR + "\n\nここには設定・バックアップ・Undo情報だけを保存します。湯間庭町リポジトリには作りません。", lines=0, color=COLORS["muted"], size=13)

    def detect_project_from_script(self, sender):
        root = find_project_root(APP_DIR)
        if not root:
            alert("湯間庭町を見つけられません", "この YumaniwaDesk.py を Working Copy の yumaniwa-town 直下、またはその中の tools/ フォルダへ置いてからもう一度実行してください。\n\nファイルピッカー経由の一時ファイルには接続しません。")
            return
        self.project_root = root
        settings = read_settings()
        settings["project_root"] = root
        save_settings(settings)
        hud("Working Copy の湯間庭町を検出しました", "success")
        self.show_tab(0)

    def check_current_project(self, sender):
        if not project_looks_valid(self.project_root):
            alert("接続できていません", "Working Copy の yumaniwa-town 内からこのスクリプトを起動し、『Working Copyの町を再検出』を押してください。")
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
            tx = create_transaction(self.project_root, "add-work", [rel])
            if make_folder:
                self.create_work_from_template(work_id, title)
                tx["created_paths"].append(created_rel)
                created = True
            if status == "open" and launch == "embedded":
                safe_entry = relative_safe_path(entry)
                if not safe_entry or not os.path.isfile(os.path.join(self.project_root, safe_entry)):
                    raise ValueError("雛形作成後も entry の index.html を確認できません。")
            insert_after_marker(os.path.join(self.project_root, rel), marker, work_entry(work))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            if created:
                target = os.path.join(self.project_root, created_rel)
                if os.path.isdir(target):
                    shutil.rmtree(target, ignore_errors=True)
            alert("登録できませんでした", str(exc))
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
            tx = create_transaction(self.project_root, "edit-work", [rel])
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

            finish_transaction(self.project_root, tx)
        except Exception as exc:
            # 保存後検証で異常を見つけた場合は、その場で works.js を元へ戻す。
            if tx:
                backup_abs = backup_abs_from_transaction(self.project_root, tx)
                for rel_path in tx.get("files", []):
                    source = os.path.join(backup_abs, rel_path)
                    target = os.path.join(self.project_root, rel_path)
                    if os.path.isfile(source):
                        shutil.copy2(source, target)
            alert("更新できませんでした", str(exc))
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
        try:
            rel, var_name, _marker = REQUIRED_DATA["updates"]
            tx = create_transaction(self.project_root, "edit-update", [rel])
            replace_object_by_index(os.path.join(self.project_root, rel), var_name, update.get("_record_index", -1), update_entry(update))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("更新できませんでした", str(exc))
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

        try:
            rel, _var, marker = REQUIRED_DATA["updates"]
            tx = create_transaction(self.project_root, "add-update", [rel])
            insert_after_marker(os.path.join(self.project_root, rel), marker, update_entry(update))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("追加できませんでした", str(exc))
            return

        hud("町の記録を書きました", "success")
        self.show_tab(3)

    # -----------------------------------------------------------------
    # 町 / 開発モード取り込み
    # -----------------------------------------------------------------
    def build_town(self, b):
        b.title("町の編集を取り込む", "Webの開発モードで触った差分だけを読み取り、必要な正本ファイルへ安全に反映します。")
        info = safe_session_info()
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

        # 新しい差分形式は複数ファイル、旧形式は1ファイル。ここで同じ形へ揃える。
        file_plans = plan.get("file_plans")
        if not isinstance(file_plans, list):
            target_rel = plan.get("target_rel", "")
            file_plans = [{
                "target_rel": target_rel,
                "current_hash": plan.get("current_hash"),
                "new_hash": plan.get("new_hash"),
                "new_text": plan.get("new_text", ""),
                "changed": plan.get("changed"),
            }]
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

        try:
            tx = create_transaction(self.project_root, "import-town-" + str(plan.get("scene_id") or "scene"), target_rels)
            for item in file_plans:
                target_rel = item.get("target_rel", "")
                target_abs = os.path.join(self.project_root, target_rel)
                atomic_write(target_abs, item.get("new_text", ""))

            # 全ファイルを再読込し、1つでも不一致なら全体をバックアップから戻す。
            failure = None
            for item in file_plans:
                target_rel = item.get("target_rel", "")
                target_abs = os.path.join(self.project_root, target_rel)
                written = safe_read(target_abs)
                ok, syntax_message = basic_js_balance(written)
                if not ok:
                    failure = target_rel + " の構文確認に失敗: " + syntax_message
                    break
                if _sha256_text(written) != item.get("new_hash"):
                    failure = target_rel + " に書き込んだ内容が予定内容と一致しません"
                    break

            if failure:
                backup_abs = backup_abs_from_transaction(self.project_root, tx)
                for rel in target_rels:
                    backup_file = os.path.join(backup_abs, rel)
                    target_abs = os.path.join(self.project_root, rel)
                    shutil.copyfile(backup_file, target_abs)
                raise ValueError("反映後の安全確認に失敗したため全ファイルを元へ戻しました: " + failure)

            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("町へ反映できませんでした", str(exc))
            return

        self.pending_town_import = None
        hud("町の変更差分をWorking Copyへ反映しました", "success")
        self.show_tab(4)

    # -----------------------------------------------------------------
    # 安全確認
    # -----------------------------------------------------------------
    def build_safety(self, b):
        b.title("町の状態を確認", "データの入口、重複、公開中作品のリンク先を確認します。")
        if not project_looks_valid(self.project_root):
            b.label("まず Working Copy の yumaniwa-town 内からこのスクリプトを起動し、[案内]で町を再検出してください。", lines=0, color=COLORS["red"], size=15, gap=14)
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
