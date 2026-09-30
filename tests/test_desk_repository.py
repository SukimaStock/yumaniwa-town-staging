"""Exercise actual Desk identity/session functions without Pythonista or Git writes."""
import datetime
import json
import shutil
from pathlib import Path
import tempfile
import unittest
from test_scene_validation import desk_functions, ROOT


class DeskRepositorySession(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'yumaniwa-town-staging'
        self.root.mkdir()
        self.git = self.root / '.git'
        self.git.mkdir()
        for rel in ('index.html', 'data/notes.js', 'data/works.js', 'data/updates.js'):
            self.put(rel, '')
        (self.root / 'works').mkdir()
        self.put('data/repository-identity.json', (ROOT / 'data/repository-identity.json').read_text())
        self.put('.git/config', '[remote "origin"]\n url = https://github.com/SukimaStock/yumaniwa-town-staging.git\n')
        self.d = desk_functions()
        self.d.update(datetime=datetime, shutil=shutil, DESK_DATA_DIR=str(self.base / 'desk'),
                      BACKUP_ROOT_DIR=str(self.base / 'desk/backups'),
                      STATE_ROOT_DIR=str(self.base / 'desk/state'),
                      SETTINGS_PATH=str(self.base / 'desk/settings.json'))
        self.select('edit/town', 'a' * 40)
        self.put('.git/refs/remotes/origin/main', 'b' * 40)

    def put(self, rel, value):
        target = self.root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value)

    def select(self, branch, sha, remote=True):
        self.put('.git/HEAD', 'ref: refs/heads/' + branch)
        self.put('.git/refs/heads/' + branch, sha)
        if remote:
            self.put('.git/refs/remotes/origin/' + branch, sha)

    def call(self, name, *args):
        return self.d[name](str(self.root), *args)

    def snapshot(self):
        return {str(p.relative_to(self.root)): p.read_bytes()
                for p in self.root.rglob('*') if p.is_file()}

    def test_selected_branch_uses_own_remote_and_does_not_write_repository(self):
        before = self.snapshot()
        info = self.call('git_repository_info')
        self.assertEqual(info['branch'], 'edit/town')
        self.assertEqual(info['sync_state'], 'match')
        self.assertTrue(self.call('repository_identity_info')['valid'])
        self.call('confirm_safe_session', 'edit/town', 'a' * 40)
        self.assertTrue(self.call('require_safe_write_session'))
        self.assertEqual(self.call('safe_session_info')['branch'], 'edit/town')
        self.assertEqual(self.snapshot(), before)

    def test_main_can_connect_but_cannot_edit(self):
        self.select('main', 'a' * 40)
        self.assertTrue(self.call('repository_identity_info')['valid'])
        with self.assertRaisesRegex(RuntimeError, 'main'):
            self.call('confirm_safe_session', 'main')
        with self.assertRaises(RuntimeError):
            self.call('require_safe_write_session')

    def test_missing_or_mismatched_same_name_remote_blocks_confirmation(self):
        self.select('edit/new', 'a' * 40, remote=False)
        with self.assertRaisesRegex(RuntimeError, 'origin/edit/new'):
            self.call('confirm_safe_session', 'edit/new')
        self.put('.git/refs/remotes/origin/edit/new', 'b' * 40)
        with self.assertRaisesRegex(RuntimeError, '一致'):
            self.call('confirm_safe_session', 'edit/new')

    def test_same_sha_branch_switch_and_changed_head_relock_writes(self):
        self.call('confirm_safe_session', 'edit/town')
        self.select('edit/other', 'a' * 40)
        self.assertFalse(self.call('safe_session_info')['valid'])
        with self.assertRaises(RuntimeError):
            self.call('require_safe_write_session')
        self.call('confirm_safe_session', 'edit/other')
        self.select('edit/other', 'b' * 40)
        self.assertFalse(self.call('safe_session_info')['valid'])
        with self.assertRaises(RuntimeError):
            self.call('require_safe_write_session')

    def test_confirmation_dialog_branch_and_head_races_fail(self):
        with self.assertRaisesRegex(RuntimeError, 'branch'):
            self.call('confirm_safe_session', 'edit/other')
        with self.assertRaisesRegex(RuntimeError, 'HEAD'):
            self.call('confirm_safe_session', 'edit/town', 'b' * 40)

    def test_detached_malformed_or_missing_head_rejects_identity(self):
        for head in ('a' * 40, 'ref: refs/heads/../outside', '', 'ref: refs/heads/edit/missing'):
            with self.subTest(head=head):
                self.put('.git/HEAD', head)
                self.assertFalse(self.call('repository_identity_info')['valid'])
                with self.assertRaises(RuntimeError):
                    self.call('confirm_safe_session', 'edit/town')

    def test_remote_marker_and_production_directory_still_rejected(self):
        self.put('.git/config', '[remote "origin"]\n url = https://github.com/SukimaStock/yumaniwa-town.git\n')
        self.assertFalse(self.call('repository_identity_info')['valid'])
        with self.assertRaises(RuntimeError):
            self.call('confirm_safe_session', 'edit/town')
        self.put('.git/config', '[remote "origin"]\n url = https://github.com/SukimaStock/yumaniwa-town-staging.git\n')
        self.put('data/repository-identity.json', '{}')
        self.assertFalse(self.call('repository_identity_info')['valid'])
        self.put('data/repository-identity.json', (ROOT / 'data/repository-identity.json').read_text())
        target = self.base / 'yumaniwa-town'
        self.root.rename(target)
        self.root = target
        self.assertFalse(self.call('repository_identity_info')['valid'])

    def test_hidden_git_requires_explicit_non_main_manual_branch(self):
        self.git.rename(self.base / 'hidden-git')
        self.assertTrue(self.call('repository_identity_info')['valid'])
        self.assertFalse(self.call('safe_session_info')['valid'])
        for branch in ('', 'main', 'bad branch', '../outside'):
            with self.assertRaises(RuntimeError):
                self.call('confirm_safe_session', branch)
        self.call('confirm_safe_session', 'edit/mobile')
        self.assertTrue(self.call('require_safe_write_session'))
        info = self.call('safe_session_info')
        self.assertEqual(info['branch'], 'edit/mobile')
        self.assertFalse(info['git']['metadata_visible'])

    def test_git_visibility_change_never_reuses_existing_confirmation(self):
        self.call('confirm_safe_session', 'edit/town')
        hidden = self.base / 'hidden-git'
        self.git.rename(hidden)
        self.assertFalse(self.call('safe_session_info')['valid'])
        self.call('confirm_safe_session', 'edit/town')
        hidden.rename(self.git)
        self.assertFalse(self.call('safe_session_info')['valid'])

    def test_restart_expiry_and_legacy_session_require_confirmation(self):
        self.call('confirm_safe_session', 'edit/town')
        self.d['RUNTIME_SYNC_CONFIRMED'] = False
        self.assertFalse(self.call('safe_session_info')['valid'])
        self.call('confirm_safe_session', 'edit/town')
        state = self.call('operation_state')
        state['sync_confirmed_at'] = (datetime.datetime.now() - datetime.timedelta(hours=4)).isoformat()
        self.call('save_operation_state', state)
        self.assertFalse(self.call('safe_session_info')['valid'])
        self.call('confirm_safe_session', 'edit/town')
        state = self.call('operation_state')
        del state['sync_branch']
        self.call('save_operation_state', state)
        self.assertFalse(self.call('safe_session_info')['valid'])

    def test_packed_refs_are_supported_and_invalid_names_fail(self):
        (self.git / 'refs/heads/edit/town').unlink()
        (self.git / 'refs/remotes/origin/edit/town').unlink()
        self.put('.git/packed-refs', 'a' * 40 + ' refs/heads/edit/town\n' + 'a' * 40 + ' refs/remotes/origin/edit/town\n')
        self.call('confirm_safe_session', 'edit/town')
        self.assertTrue(self.call('require_safe_write_session'))
        for branch in ('a\\b', 'a[0]', 'a..b', 'a.lock', '.hidden', 'a//b', 'a@{b', 'a\nb'):
            self.assertTrue(self.d['work_branch_error'](branch), branch)

    def test_undo_and_rollback_do_not_restore_another_branch_or_legacy_history(self):
        self.call('confirm_safe_session', 'edit/town')
        self.put('data/notes.js', 'before')
        tx = self.call('create_transaction', 'edit-note', ['data/notes.js'])
        self.assertEqual(tx['branch'], 'edit/town')
        self.put('data/notes.js', 'after')
        self.call('finish_transaction', tx)
        self.select('edit/other', 'a' * 40)
        self.call('confirm_safe_session', 'edit/other')
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'branch'):
            self.call('undo_last_transaction')
        self.assertTrue(self.call('restore_transaction_files', tx))
        self.assertEqual(self.snapshot(), before)
        self.select('edit/town', 'a' * 40)
        self.call('confirm_safe_session', 'edit/town')
        self.assertEqual(self.call('restore_transaction_files', tx), [])
        self.assertEqual((self.root / 'data/notes.js').read_text(), 'before')
        self.put('data/notes.js', 'after')
        self.call('undo_last_transaction')
        self.assertEqual((self.root / 'data/notes.js').read_text(), 'before')
        del tx['branch']
        self.call('finish_transaction', tx)
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, '旧履歴'):
            self.call('undo_last_transaction')
        self.assertTrue(self.call('restore_transaction_files', tx))
        self.assertEqual(self.snapshot(), before)

    def make_undo_transaction(self):
        self.call('confirm_safe_session', 'edit/town')
        self.put('data/notes.js', 'before')
        tx = self.call('create_transaction', 'revision-test', ['data/notes.js'])
        self.put('data/notes.js', 'after')
        self.put('works/new-work/index.html', 'created by transaction')
        tx['created_paths'] = ['works/new-work']
        self.call('finish_transaction', tx)
        return tx

    def assert_stale_undo_is_read_only(self, tx, message='revision'):
        before = self.snapshot()
        history = {str(p.relative_to(self.base / 'desk')): p.read_bytes()
                   for p in (self.base / 'desk').rglob('*') if p.is_file()}
        with self.assertRaisesRegex(ValueError, message):
            self.call('undo_last_transaction')
        self.assertTrue(self.call('restore_transaction_files', tx))
        self.assertEqual(self.snapshot(), before)
        self.assertEqual({str(p.relative_to(self.base / 'desk')): p.read_bytes()
                          for p in (self.base / 'desk').rglob('*') if p.is_file()}, history)
        self.assertTrue((self.root / 'works/new-work/index.html').is_file())

    def test_same_valid_session_undo_restores_files_and_removes_created_paths(self):
        tx = self.make_undo_transaction()
        self.assertEqual(tx['revision'], 'git:' + 'a' * 40)
        self.assertTrue(self.call('safe_session_info')['valid'])
        self.call('undo_last_transaction')
        self.assertEqual((self.root / 'data/notes.js').read_text(), 'before')
        self.assertFalse((self.root / 'works/new-work').exists())

    def test_recreated_same_name_branch_does_not_own_old_transaction(self):
        tx = self.make_undo_transaction()
        (self.git / 'refs/heads/edit/town').unlink()
        (self.git / 'refs/remotes/origin/edit/town').unlink()
        self.select('edit/town', 'b' * 40)
        self.put('data/notes.js', 'new history content')
        self.put('works/new-work/index.html', 'belongs to new history')
        self.call('confirm_safe_session', 'edit/town')
        self.assertTrue(self.call('safe_session_info')['valid'])
        self.assert_stale_undo_is_read_only(tx)

    def test_different_branch_same_revision_cannot_modify_or_delete(self):
        tx = self.make_undo_transaction()
        self.select('edit/other', 'a' * 40)
        self.call('confirm_safe_session', 'edit/other')
        self.assert_stale_undo_is_read_only(tx, 'branch')

    def test_same_revision_reconfirmation_preserves_undo_but_commit_ends_session(self):
        tx = self.make_undo_transaction()
        self.call('confirm_safe_session', 'edit/town')
        self.assertEqual(self.call('transaction_owner_error', tx), '')
        self.select('edit/town', 'b' * 40)  # Working Copy commit/push changes HEAD.
        before = self.snapshot()
        with self.assertRaises(RuntimeError):
            self.call('undo_last_transaction')
        self.assertEqual(self.snapshot(), before)
        self.call('confirm_safe_session', 'edit/town')
        self.assert_stale_undo_is_read_only(tx)

    def test_hidden_git_undo_is_bound_to_one_explicit_confirmation(self):
        self.git.rename(self.base / 'hidden-git')
        tx = self.make_undo_transaction()
        self.assertTrue(tx['revision'].startswith('manual:'))
        self.assertEqual(self.call('transaction_owner_error', tx), '')
        self.assertEqual(self.call('restore_transaction_files', tx), [])
        self.call('confirm_safe_session', 'edit/town')
        self.assert_stale_undo_is_read_only(tx)

    def test_revisionless_or_wrong_repository_transaction_is_rejected(self):
        tx = self.make_undo_transaction()
        revision = tx.pop('revision')
        self.call('finish_transaction', tx)
        self.assert_stale_undo_is_read_only(tx)
        tx['revision'] = revision
        tx['project_root'] = str(self.base / 'other-repository')
        self.call('finish_transaction', tx)
        self.assert_stale_undo_is_read_only(tx, 'repository')


if __name__ == '__main__':
    unittest.main(verbosity=2)
