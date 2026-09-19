import clipboard
import re
import os
import shutil
from datetime import datetime


def clean_code_block(code_str):
    code_str = code_str.strip()

    # ```javascript id="xxxx" のような属性付きコードブロックにも対応
    code_str = re.sub(
        r'^```[^\n]*\n',
        '',
        code_str
    )

    code_str = re.sub(
        r'\n```\s*$',
        '',
        code_str
    )

    code_str = re.sub(
        r'^(javascript|JavaScript|js|python|Python)\s*\n',
        '',
        code_str.strip(),
        flags=re.IGNORECASE
    )

    return code_str.strip()


def check_dangerous_syntax(code_str):
    lines = code_str.split('\n')
    for i, line in enumerate(lines):
        if '${' in line and '`' not in line:
            return True, i + 1, line.strip()
    return False, 0, ""


def extract_patch_blocks(clean_text):
    """
    正規表現一発ではなく、行単位で PATCH ブロックを抽出する。
    コードブロック属性や余計な行が混ざっても、開始/終了マーカーだけを信じる。
    """
    lines = clean_text.split('\n')

    # [PATCH: ...], [ADD_AFTER: ...] などのマーカーを確実に捉えるように修正
    start_pattern = re.compile(
        r'^\s*//\s*\[(PATCH|ADD_AFTER|DELETE_ALL|DELETE_LINES_CONTAINING|REPLACE_EXACT):\s*(.+?)\]\s*$'
    )

    end_pattern = re.compile(
        r'^\s*//\s*\[END_PATCH\]\s*$'
    )

    matches = []
    current = None

    for line in lines:
        if current is None:
            start_match = start_pattern.match(line)

            if start_match:
                current = {
                    'action': start_match.group(1),
                    'target': start_match.group(2).strip(),
                    'body': [],
                }
            continue

        if end_pattern.match(line):
            matches.append(
                (
                    current['action'],
                    current['target'],
                    '\n'.join(current['body'])
                )
            )
            current = None
            continue

        current['body'].append(line)

    return matches


# =========================================
# REPLACE_EXACT の [FIND] / [REPLACE] 解析
# =========================================
def parse_replace_exact_sections(body):
    """
    REPLACE_EXACT ブロックの中から、次の 2 区間をそのまま取り出す。

        // [FIND]
        ...対象ファイルに現在ある文字列...
        // [REPLACE]
        ...置き換える文字列...

    FIND / REPLACE の前後にある空白や改行も比較対象になるため、
    対象コードをそのままコピーして使う。
    """
    lines = body.split('\n')

    find_marker = re.compile(
        r'^\s*//\s*\[FIND\]\s*$'
    )

    replace_marker = re.compile(
        r'^\s*//\s*\[REPLACE\]\s*$'
    )

    find_index = None
    replace_index = None

    for index, line in enumerate(lines):
        if find_marker.match(line):
            if find_index is not None:
                return "", "", "FIND マーカーが複数あります"

            if replace_index is not None:
                return "", "", "FIND が REPLACE の後にあります"

            find_index = index
            continue

        if replace_marker.match(line):
            if replace_index is not None:
                return "", "", "REPLACE マーカーが複数あります"

            replace_index = index

    if find_index is None:
        return "", "", "FIND マーカーがありません"

    if replace_index is None:
        return "", "", "REPLACE マーカーがありません"

    if find_index > replace_index:
        return "", "", "FIND が REPLACE の後にあります"

    find_text = '\n'.join(
        lines[find_index + 1:replace_index]
    )

    replace_text = '\n'.join(
        lines[replace_index + 1:]
    )

    if find_text == "":
        return "", "", "FIND の内容が空です"

    return find_text, replace_text, "SUCCESS"


def replace_exact_once(content, find_text, replace_text):
    """
    FIND の完全一致が 1 件だけの時に限り置換する。
    0 件なら NOT_FOUND、2 件以上なら AMBIGUOUS として止める。
    """
    match_count = content.count(
        find_text
    )

    if match_count == 0:
        return content, match_count, "NOT_FOUND"

    if match_count != 1:
        return content, match_count, "AMBIGUOUS"

    replaced = content.replace(
        find_text,
        replace_text,
        1
    )

    return replaced, match_count, "SUCCESS"


# =========================================
# 1. 関数・代入形式関数の範囲を特定するエンジン
# =========================================
def find_balanced_brace_end(content, brace_start):
    """
    開き波括弧の位置から、文字列・コメントを考慮して対応する
    閉じ波括弧の直後インデックスを返す。
    """
    brace_count = 0

    in_string = False
    string_char = ''
    in_line_comment = False
    in_block_comment = False
    escape_next = False

    for i in range(brace_start, len(content)):
        char = content[i]
        next_char = content[i + 1] if i + 1 < len(content) else ''

        if escape_next:
            escape_next = False
            continue

        if char == '\\':
            escape_next = True
            continue

        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            continue

        if in_block_comment:
            if char == '*' and next_char == '/':
                in_block_comment = False
                escape_next = True
            continue

        if in_string:
            if char == string_char:
                in_string = False
            continue

        if char == '/' and next_char == '/':
            in_line_comment = True
            escape_next = True
            continue

        if char == '/' and next_char == '*':
            in_block_comment = True
            escape_next = True
            continue

        if char in ('"', "'", '`'):
            in_string = True
            string_char = char
            continue

        if char == '{':
            brace_count += 1

        elif char == '}':
            brace_count -= 1

            if brace_count == 0:
                return i + 1

    return -1


def consume_assignment_terminator(content, end_index):
    """
    `target = function () { ... };` の末尾セミコロンだけを含める。
    改行は食べないので、後続コードの位置は崩さない。
    """
    cursor = end_index

    while (
        cursor < len(content) and
        content[cursor] in (' ', '\t')
    ):
        cursor += 1

    if (
        cursor < len(content) and
        content[cursor] == ';'
    ):
        cursor += 1

    return cursor


def find_function_bounds(content, func_name):
    func_name = func_name.strip()
    pattern = (
        rf'(?:async\s+)?function\s+'
        rf'{re.escape(func_name)}\s*\('
    )
    match = re.search(pattern, content)

    if not match:
        return -1, -1, "NOT_FOUND"

    start_index = match.start()
    brace_start = content.find('{', match.end())

    if brace_start == -1:
        return -1, -1, "「{」が見つかりません"

    end_index = find_balanced_brace_end(
        content,
        brace_start
    )

    if end_index != -1:
        return start_index, end_index, "SUCCESS"

    return -1, -1, "「}」が正しく閉じていません"


def find_assigned_function_bounds(content, func_name):
    """
    次のような「代入形式の関数」を対象にする。

        drawTitle = function() { ... };
        drawTitle = async function() { ... };
        drawTitle = () => { ... };

    let / const / var 付きの宣言は find_variable_bounds() が先に拾うため、
    ここでは裸の代入を主に扱う。
    """
    func_name = func_name.strip()

    classic_pattern = (
        rf'(?<![\w$.]){re.escape(func_name)}\s*=\s*'
        rf'(?:async\s+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\('
    )

    match = re.search(
        classic_pattern,
        content
    )

    if match:
        start_index = match.start()
        brace_start = content.find(
            '{',
            match.end()
        )

        if brace_start == -1:
            return -1, -1, "「{」が見つかりません"

        end_index = find_balanced_brace_end(
            content,
            brace_start
        )

        if end_index == -1:
            return -1, -1, "「}」が正しく閉じていません"

        return (
            start_index,
            consume_assignment_terminator(
                content,
                end_index
            ),
            "SUCCESS"
        )

    # ブロック本体を持つアロー関数も扱う。
    arrow_pattern = (
        rf'(?<![\w$.]){re.escape(func_name)}\s*=\s*'
        rf'(?:async\s*)?(?:\([^;]*?\)|[A-Za-z_$][\w$]*)\s*=>\s*\{{'
    )

    match = re.search(
        arrow_pattern,
        content,
        re.DOTALL
    )

    if not match:
        return -1, -1, "NOT_FOUND"

    start_index = match.start()
    brace_start = match.end() - 1

    end_index = find_balanced_brace_end(
        content,
        brace_start
    )

    if end_index == -1:
        return -1, -1, "「}」が正しく閉じていません"

    return (
        start_index,
        consume_assignment_terminator(
            content,
            end_index
        ),
        "SUCCESS"
    )


# =========================================
# 2. 定数・変数の範囲を特定するエンジン
# =========================================
def find_variable_bounds(content, var_name):
    var_name = var_name.strip()

    pattern = rf'(?:const|let|var)\s+{re.escape(var_name)}\b'
    match = re.search(pattern, content)

    if not match:
        return -1, -1, "NOT_FOUND"

    start_index = match.start()
    parse_start = match.end()

    brace_count = 0
    bracket_count = 0
    paren_count = 0
    end_index = -1

    in_string = False
    string_char = ''
    in_line_comment = False
    in_block_comment = False
    escape_next = False

    for i in range(parse_start, len(content)):
        char = content[i]
        next_char = content[i + 1] if i + 1 < len(content) else ''

        if escape_next:
            escape_next = False
            continue

        if char == '\\':
            escape_next = True
            continue

        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            continue

        if in_block_comment:
            if char == '*' and next_char == '/':
                in_block_comment = False
                escape_next = True
            continue

        if in_string:
            if char == string_char:
                in_string = False
            continue

        if char == '/' and next_char == '/':
            in_line_comment = True
            escape_next = True
            continue

        if char == '/' and next_char == '*':
            in_block_comment = True
            escape_next = True
            continue

        if char in ('"', "'", '`'):
            in_string = True
            string_char = char
            continue

        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        elif char == '[':
            bracket_count += 1
        elif char == ']':
            bracket_count -= 1
        elif char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1

        if brace_count == 0 and bracket_count == 0 and paren_count == 0:
            if char == ';':
                end_index = i + 1
                break

    if end_index != -1:
        return start_index, end_index, "SUCCESS"

    return -1, -1, "変数の終端となるセミコロン(;)が見つかりません"


def find_named_target_bounds(content, target_name):
    """
    PATCH / ADD_AFTER / DELETE_ALL で共通利用する探索順。

    1. function foo() { ... }
    2. const / let / var foo = ...;
    3. foo = function() { ... };
       foo = () => { ... };
    """
    start_idx, end_idx, msg = find_function_bounds(
        content,
        target_name
    )

    if msg == "NOT_FOUND":
        start_idx, end_idx, msg = find_variable_bounds(
            content,
            target_name
        )

    if msg == "NOT_FOUND":
        start_idx, end_idx, msg = find_assigned_function_bounds(
            content,
            target_name
        )

    return start_idx, end_idx, msg


# =========================================
# 3. 削除系エンジン
# =========================================
def delete_all_named_targets(content, target_name):
    target_name = target_name.strip()
    deleted_count = 0

    while True:
        start_idx, end_idx, msg = find_named_target_bounds(
            content,
            target_name
        )

        if msg != "SUCCESS":
            break

        content = content[:start_idx] + content[end_idx:]
        deleted_count += 1

    return content, deleted_count


def delete_lines_containing(content, keyword):
    keyword = keyword.strip()
    lines = content.split('\n')

    new_lines = []
    deleted_count = 0

    for line in lines:
        if keyword in line:
            deleted_count += 1
            continue

        new_lines.append(line)

    return '\n'.join(new_lines), deleted_count


# =========================================
# 4. バックアップ
# =========================================
def create_backup(file_path):
    if not os.path.exists(file_path):
        return

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    base_name, ext = os.path.splitext(file_path)
    backup_path = f"{base_name}_{timestamp}{ext}"

    shutil.copy2(file_path, backup_path)
    print(f"📦 バックアップ保存: {backup_path}")


# =========================================
# 5. メイン処理
# =========================================
def apply_patch_from_clipboard(target_file):
    raw_text = clipboard.get()

    # 強化された見えない文字の削除
    clean_text = (
        raw_text
        .replace('\xa0', ' ')
        .replace('\ufeff', '')
        .replace('\u200b', '')
        .replace('\u200c', '')
        .replace('\u200d', '')
        .replace('\u2060', '')
        .replace('\r\n', '\n')
        .replace('\r', '\n')
    )

    matches = extract_patch_blocks(clean_text)

    print(f"🔎 パッチ検出: {len(matches)}件")
    for index, item in enumerate(matches, start=1):
        print(f"   {index}. {item[0]}: {item[1]}")

    if not matches:
        print("❌ パッチ形式が見つかりません。")
        print("   使用可能:")
        print("   // [PATCH: name]")
        print("   // [ADD_AFTER: name]")
        print("   // [DELETE_ALL: name]  # function / variable / assignment function")
        print("   // [DELETE_LINES_CONTAINING: keyword]")
        print("   // [REPLACE_EXACT: label]")
        print("   // [FIND]")
        print("   // ...対象ファイルにある文字列をそのまま貼る...")
        print("   // [REPLACE]")
        print("   // ...置き換える文字列...")
        print("   // [END_PATCH]")
        return

    if not os.path.exists(target_file):
        print(f"❌ 対象ファイルが見つかりません: {target_file}")
        return

    with open(target_file, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # 途中で失敗した場合も元ファイルを一切書き換えない。
    content = original_content
    success_count = 0
    failure_count = 0

    for action, target_name, new_code in matches:
        target_name = target_name.strip()
        new_code_clean = clean_code_block(new_code)

        # =========================================
        # DELETE_ALL
        # =========================================
        if action == "DELETE_ALL":
            next_content, deleted_count = delete_all_named_targets(
                content,
                target_name
            )

            if deleted_count > 0:
                content = next_content
                print(
                    f"🗑️ 全削除完了: {target_name} を "
                    f"{deleted_count} 個削除しました"
                )
                success_count += 1
            else:
                print(
                    f"❌ 全削除失敗: {target_name} が見つかりません"
                )
                failure_count += 1

            continue

        # =========================================
        # DELETE_LINES_CONTAINING
        # =========================================
        if action == "DELETE_LINES_CONTAINING":
            next_content, deleted_count = delete_lines_containing(
                content,
                target_name
            )

            if deleted_count > 0:
                content = next_content
                print(
                    f"🧹 行削除完了: '{target_name}' を含む行を "
                    f"{deleted_count} 行削除しました"
                )
                success_count += 1
            else:
                print(
                    f"❌ 行削除失敗: '{target_name}' を含む行が"
                    "見つかりません"
                )
                failure_count += 1

            continue

        # =========================================
        # REPLACE_EXACT
        # =========================================
        if action == "REPLACE_EXACT":
            find_text, replace_text, parse_msg = (
                parse_replace_exact_sections(
                    new_code
                )
            )

            if parse_msg != "SUCCESS":
                print(
                    f"❌ 部分置換失敗: {target_name} - "
                    f"{parse_msg}"
                )
                failure_count += 1
                continue

            is_dangerous, line_num, bad_line = (
                check_dangerous_syntax(
                    replace_text
                )
            )

            if is_dangerous:
                print(
                    f"⚠️ 【安全装置作動】 {target_name} の"
                    "部分置換を中止しました。"
                )
                print(
                    f"   原因: {line_num}行目に"
                    "バッククォート(`)が欠落した変数展開"
                    "(${...})が含まれています。"
                )
                print(
                    f"   問題のコード: {bad_line}"
                )
                failure_count += 1
                continue

            next_content, match_count, replace_msg = (
                replace_exact_once(
                    content,
                    find_text,
                    replace_text
                )
            )

            if replace_msg == "SUCCESS":
                content = next_content
                print(
                    f"🔁 部分置換完了: {target_name} "
                    "を 1 か所置き換えました"
                )
                success_count += 1
            elif replace_msg == "NOT_FOUND":
                print(
                    f"❌ 部分置換失敗: {target_name} - "
                    "NOT_FOUND（FIND の完全一致が見つかりません）"
                )
                failure_count += 1
            else:
                print(
                    f"❌ 部分置換失敗: {target_name} - "
                    f"AMBIGUOUS（FIND が {match_count} 件見つかりました）"
                )
                failure_count += 1

            continue

        # =========================================
        # PATCH / ADD_AFTER 用の安全チェック
        # =========================================
        is_dangerous, line_num, bad_line = check_dangerous_syntax(
            new_code_clean
        )

        if is_dangerous:
            print(
                f"⚠️ 【安全装置作動】 {target_name} の"
                "パッチ適用を中止しました。"
            )
            print(
                f"   原因: {line_num}行目にバッククォート(`)が"
                "欠落した変数展開(${...})が含まれています。"
            )
            print(
                f"   問題のコード: {bad_line}"
            )
            failure_count += 1
            continue

        start_idx, end_idx, msg = find_named_target_bounds(
            content,
            target_name
        )

        # =========================================
        # PATCH
        # =========================================
        if action == "PATCH":
            if msg == "SUCCESS":
                content = (
                    content[:start_idx] +
                    new_code_clean +
                    "\n" +
                    content[end_idx:]
                )
                print(
                    f"✅ 上書き完了: {target_name}"
                )
                success_count += 1
            else:
                print(
                    f"❌ 上書き失敗: {target_name} - {msg}"
                )
                failure_count += 1

        # =========================================
        # ADD_AFTER
        # =========================================
        elif action == "ADD_AFTER":
            if msg == "SUCCESS":
                content = (
                    content[:end_idx] +
                    f"\n\n{new_code_clean}\n" +
                    content[end_idx:]
                )
                print(
                    f"✨ 追加完了: {target_name} の直後に"
                    "新規コードを挿入しました"
                )
                success_count += 1
            else:
                print(
                    f"❌ 追加失敗: 基準となる名前 {target_name} "
                    f"が見つかりません - {msg}"
                )
                failure_count += 1
        else:
            print(
                f"❌ 未対応の操作です: {action}"
            )
            failure_count += 1

    if failure_count > 0:
        print(
            "⚠️ 1件以上のパッチに失敗したため、"
            "安全のためファイルは更新していません。"
        )
        return

    if success_count <= 0:
        print("⚠️ 適用された変更はありませんでした。")
        return

    create_backup(target_file)

    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ すべてのパッチを検証し、ファイルを更新しました。")


apply_patch_from_clipboard('sketch.js')
