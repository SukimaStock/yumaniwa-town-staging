"""Actual Desk functions, isolated staging copies; no persistent demo registration."""
import copy
import io
import json
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
from PIL import Image
import test_desk_repository as desk_tests
from test_scene_validation import ROOT


def fixture_png(scale=1):
    image = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y in range(4, 22):
        for x in range(5, 19):
            image.putpixel((x, y), (60, 170, 120, 255) if y < 17 else (140, 85, 45, 255))
    image = image.resize((24 * scale, 24 * scale), Image.Resampling.NEAREST)
    out = io.BytesIO()
    image.save(out, format='PNG')
    return out.getvalue()


def cleaner_sidecar():
    """Native envelope shape observed in Cleaner source and owner-provided export."""
    logical = {'width': 24.0, 'height': 24.0}
    physical = {'width': 72, 'height': 72}
    return {'schema': 'yumaniwa-world-object/0.1',
            'object': {'id': 'fixture_planter_01', 'label': '接続テスト植木', 'category': 'greenery', 'type': 'planter'},
            'target': {'profile': 'PROP_S'},
            'placementSnapshot': {'sceneId': 'station_plaza', 'x': -1.25, 'y': 2, 'unknown': [1, 2]},
            'pixelStandard': {'version': 'yumaniwa-pixel/0.2', 'worldPxPerLogicalPx': 1,
                'editingSpace': 'TOWN_LOGICAL_PIXELS', 'targetId': 'PROP_S', 'targetProfile': 'PROP_S',
                'logicalCanvasPx': logical, 'fileCanvasPx': physical, 'filePixelRatio': 3,
                'exportContract': 'yumaniwa-logical-canvas-physical-file/0.1', 'pixelSafe': True,
                'logicalRasterized': True, 'logicalRasterMethod': 'EXPLICIT_LOGICAL_NEAREST'},
            'finalization': {'status': 'final', 'pixelSafe': True, 'canvas': logical,
                'target': dict(logical, id='PROP_S'),
                'townCanvas': dict(logical, enabled=True, editable=True, exactFinal=True),
                'output': {'logicalCanvasPx': logical, 'fileCanvasPx': physical, 'physicalFileStatus': 'PASS',
                    'physicalFileInspected': True, 'physicalFileVerified': True, 'integerUniformScale': True,
                    'exportContract': 'yumaniwa-logical-canvas-physical-file/0.1',
                    'filePixelRatio': 3, 'filePixelRatioX': 3.0, 'filePixelRatioY': 3.0}}}


class MapRegistration(unittest.TestCase):
    setUpBase = desk_tests.DeskRepositorySession.setUp
    put = desk_tests.DeskRepositorySession.put
    select = desk_tests.DeskRepositorySession.select
    call = desk_tests.DeskRepositorySession.call
    snapshot = desk_tests.DeskRepositorySession.snapshot

    def setUp(self):
        self.setUpBase()
        self.d.update(tempfile=tempfile)
        for rel in ('data/world-objects.js', 'data/station-plaza.js', 'data/town-maps.js', 'town-ghost-npc.js', 'index.html'):
            self.put(rel, (ROOT / rel).read_text())
        for folder in self.d['MAP_OBJECT_FOLDERS'].values():
            (self.root / folder).mkdir(parents=True, exist_ok=True)
        self.call('confirm_safe_session', 'edit/town')
        self.png = fixture_png()
        self.obj = self.d['make_map_object_definition'](self.png, 'fixture_planter_01', '接続テスト植木', 'greenery', 'planter', 'PROP_S')
        self.obj['placementSnapshot'] = {'sceneId': 'station_plaza', 'x': -2.25, 'y': 1, 'custom': {'audit': True}}
        self.obj['artifact'] = {'schema': 'sukimastock-artifact/1', 'dependencies': [{'kind': 'map-factory-asset', 'id': 'special_1234567890123'}]}

    def plan(self, obj=None, png=None):
        return self.call('plan_map_object_registration', self.png if png is None else png, json.dumps(self.obj if obj is None else obj))

    def test_plan_is_read_only_and_registration_preserves_snapshot_and_existing_objects(self):
        before = self.snapshot()
        plan = self.plan()
        self.assertEqual(self.snapshot(), before)
        old = self.d['_read_var_object_value']((self.root / 'data/world-objects.js').read_text(), 'objects')
        self.assertTrue(self.call('apply_map_object_registration', plan, True))
        objects = self.d['_read_var_object_value']((self.root / 'data/world-objects.js').read_text(), 'objects')
        new = objects.pop(self.obj['id'])
        self.assertEqual(objects, old)
        self.assertEqual(new['placementSnapshot'], self.obj['placementSnapshot'])
        self.assertEqual(new['artifact'], self.obj['artifact'])
        self.assertFalse(new['finalization']['pixelSafe'])
        self.assertEqual((self.root / new['src']).read_bytes(), self.png)
        self.assertEqual({k for k in self.snapshot() if self.snapshot()[k] != before.get(k)},
                         {'data/world-objects.js', 'index.html', new['src']})
        rev = self.d['_script_cache_revision']((self.root / 'index.html').read_text(), './data/world-objects.js')
        self.assertEqual(rev, self.d['_cache_revision_for_text']((self.root / 'data/world-objects.js').read_text()))
        self.call('undo_last_transaction')
        self.assertEqual(self.snapshot(), before)

    def test_cancel_at_apply_leaves_every_byte_unchanged(self):
        before = self.snapshot()
        self.assertFalse(self.call('apply_map_object_registration', self.plan()))
        self.assertEqual(before, self.snapshot())

    def test_duplicate_id_file_and_catalog_key_are_rejected(self):
        for field, value in [('id', 'planter_01'), ('src', 'assets/maps/objects/greenery/occupied.png'), ('catalogKey', 'bench')]:
            with self.subTest(field=field):
                obj = copy.deepcopy(self.obj)
                if field == 'catalogKey':
                    obj['editor'][field] = value
                else:
                    obj[field] = value
                self.put('assets/maps/objects/greenery/occupied.png', 'do not overwrite')
                before = self.snapshot()
                with self.assertRaises(ValueError):
                    self.plan(obj)
                self.assertEqual(before, self.snapshot())

    def test_invalid_json_and_code_never_execute(self):
        for text in ('{', '[]', '{"id":"a","id":"b"}', '{"__proto__":{}}', '{"x":NaN}', '{"x":1e999}', 'require("fs").writeFileSync("oops", "oops")'):
            with self.subTest(text=text):
                before = self.snapshot()
                with self.assertRaises((ValueError, TypeError)):
                    self.call('plan_map_object_registration', self.png, text)
                self.assertEqual(before, self.snapshot())

    def test_invalid_png_is_rejected(self):
        jpeg = io.BytesIO()
        Image.new('RGB', (24, 24)).save(jpeg, 'JPEG')
        for data in (b'not an image', self.png[:50], self.png[:-20], jpeg.getvalue()):
            with self.subTest(data=data[:12]):
                before = self.snapshot()
                with self.assertRaises((ValueError, OSError, SyntaxError)):
                    self.plan(png=data)
                self.assertEqual(before, self.snapshot())

    def test_required_metadata_and_dimensions_fail_before_writes(self):
        cases = [(['id'], 'special_1234567890123'), (['category'], 'new_category'),
                 (['editor', 'label'], ''), (['editor', 'label'], '<img onerror=alert(1)>'), (['editor', 'order'], True),
                 (['editor', 'defaults', 'w'], True), (['editor', 'defaults', 'h'], 2),
                 (['editor', 'defaults', 'collision', 'w'], 0),
                 (['finalization', 'logicalCanvasPx'], [25, 24]),
                 (['finalization', 'fileCanvasPx'], [48, 48]),
                 (['finalization', 'exportScale'], 2), (['finalization', 'exportScale'], True),
                 (['finalization', 'townCanvas', 'exactFinal'], False),
                 (['finalization', 'pixelSafe'], 'true'), (['finalization', 'status'], 'draft')]
        for path, value in cases:
            with self.subTest(path=path, value=value):
                obj = copy.deepcopy(self.obj)
                parent = obj
                for key in path[:-1]:
                    parent = parent[key]
                parent[path[-1]] = value
                before = self.snapshot()
                with self.assertRaises(ValueError):
                    self.plan(obj)
                self.assertEqual(before, self.snapshot())

    def test_paths_and_symlinks(self):
        for src in ('/tmp/out.png', '../out.png', 'assets/../out.png', 'C:\\out.png',
                    'assets/maps/objects/greenery/../../out.png', 'assets/maps/objects/greenery//out.png'):
            with self.subTest(src=src):
                obj = dict(self.obj, src=src)
                before = self.snapshot()
                with self.assertRaises(ValueError):
                    self.plan(obj)
                self.assertEqual(before, self.snapshot())
        folder = self.root / 'assets/maps/objects/greenery'
        folder.rmdir()
        folder.symlink_to(self.base, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.plan()
        self.assertFalse((self.base / 'fixture_planter_01.png').exists())

    def test_lossless_three_x_and_nonuniform_rejection(self):
        png = fixture_png(3)
        obj = copy.deepcopy(self.obj)
        obj['finalization'].update(fileCanvasPx=[72, 72], exportScale=3)
        plan = self.plan(obj, png)
        self.assertEqual(self.d['_map_png'](plan['png']).tobytes(), self.d['_map_png'](self.png).tobytes())
        self.assertEqual(plan['object']['finalization']['fileCanvasPx'], [72, 72])
        self.assertEqual(plan['object']['finalization']['townAssetFilePx'], [24, 24])
        self.assertFalse(plan['object']['finalization']['pixelSafe'])
        image = self.d['_map_png'](png)
        image.putpixel((0, 0), (255, 0, 0, 255))
        out = io.BytesIO(); image.save(out, 'PNG')
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, '不均一'):
            self.plan(obj, out.getvalue())
        self.assertEqual(before, self.snapshot())

    def test_collision_outside_unit_bounds_is_preserved(self):
        self.obj['editor']['defaults']['collision'] = {'enabled': True, 'x': -0.75, 'y': 1.1, 'w': 2.5, 'h': 0.35}
        plan = self.plan()
        self.assertEqual(plan['object']['editor']['defaults']['collision'], self.obj['editor']['defaults']['collision'])

    def test_missing_editor_requires_explicit_label(self):
        del self.obj['editor']
        with self.assertRaises(ValueError):
            self.plan()
        plan = self.call('plan_map_object_registration', self.png, json.dumps(self.obj), '明示した名前')
        self.assertEqual(plan['object']['editor']['label'], '明示した名前')

    def test_stale_sources_and_late_destination_collision(self):
        for rel in ('data/world-objects.js', 'index.html', 'data/station-plaza.js'):
            with self.subTest(rel=rel):
                plan = self.plan()
                self.put(rel, (self.root / rel).read_text() + '\n// concurrent change\n')
                before = self.snapshot()
                with self.assertRaisesRegex(ValueError, '更新'):
                    self.call('apply_map_object_registration', plan, True)
                self.assertEqual(before, self.snapshot())
        plan = self.plan()
        self.put(plan['target_rel'], 'late independent file')
        before = self.snapshot()
        with self.assertRaises(ValueError):
            self.call('apply_map_object_registration', plan, True)
        self.assertEqual(before, self.snapshot())

    def test_wrong_repository_marker_branch_and_plan_mutation(self):
        plan = self.plan()
        for change in ('production-marker', 'branch', 'plan'):
            with self.subTest(change=change):
                if change == 'production-marker':
                    marker = json.loads((self.root / 'data/repository-identity.json').read_text())
                    marker['repository'] = 'SukimaStock/yumaniwa-town'
                    self.put('data/repository-identity.json', json.dumps(marker))
                elif change == 'branch':
                    self.select('edit/other', 'a' * 40)
                else:
                    plan['file_plans'][0]['new_text'] += '\n// tampered'
                before = self.snapshot()
                with self.assertRaises((ValueError, RuntimeError)):
                    self.call('apply_map_object_registration', plan, True)
                self.assertEqual(before, self.snapshot())
                self.put('data/repository-identity.json', (ROOT / 'data/repository-identity.json').read_text())
                self.select('edit/town', 'a' * 40)
        self.root.rename(self.base / 'yumaniwa-town')
        with self.assertRaises(RuntimeError):
            self.d['plan_map_object_registration'](str(self.base / 'yumaniwa-town'), self.png, json.dumps(self.obj))

    def test_native_cleaner_sidecar_preserves_provenance_and_accepts_explicit_adoption_id(self):
        source = cleaner_sidecar()
        original = copy.deepcopy(source)
        source['object']['id'] = 'planter_01'
        with self.assertRaises(ValueError):
            self.plan(source, fixture_png(3))
        plan = self.call('plan_map_object_registration', fixture_png(3), json.dumps(source), '採用名', 'adopted_planter_01')
        self.assertEqual(plan['object']['id'], 'adopted_planter_01')
        self.assertEqual(plan['object']['editor']['label'], '採用名')
        self.assertEqual(plan['object']['cleanerMetadata'], source)
        self.assertEqual(plan['object']['placementSnapshot'], original['placementSnapshot'])
        self.assertTrue(plan['object']['finalization']['pixelSafe'])
        self.assertEqual(plan['logical'], [24, 24])
        self.assertEqual(plan['physical'], [72, 72])
        self.call('apply_map_object_registration', plan, True)

    def test_native_cleaner_inconsistent_or_unverified_metadata_is_rejected(self):
        cases = [(['finalization', 'output', 'physicalFileStatus'], 'UNKNOWN'),
                 (['finalization', 'output', 'filePixelRatioY'], 2),
                 (['pixelStandard', 'logicalCanvasPx', 'height'], 23),
                 (['target', 'profile'], 'PROP_M'),
                 (['pixelStandard', 'logicalRasterized'], False)]
        for keys, value in cases:
            with self.subTest(keys=keys):
                source = copy.deepcopy(cleaner_sidecar())
                parent = source
                for key in keys[:-1]: parent = parent[key]
                parent[keys[-1]] = value
                before = self.snapshot()
                with self.assertRaises(ValueError): self.plan(source, fixture_png(3))
                self.assertEqual(before, self.snapshot())

    def test_write_and_transaction_failures_restore_all_files_and_undo_state(self):
        for fail_at in ('png', 'catalog', 'index', 'finish'):
            with self.subTest(fail_at=fail_at):
                plan = self.plan()
                before = self.snapshot()
                old_state = Path(self.d['SETTINGS_PATH']).read_bytes()
                write = self.d['atomic_write']; finish = self.d['finish_transaction']
                def failing_write(path, value):
                    write(path, value)
                    if (fail_at == 'catalog' and path.endswith('world-objects.js')) or (fail_at == 'index' and path.endswith('index.html')):
                        raise OSError('injected write failure')
                def failing_finish(root, tx):
                    finish(root, tx)
                    raise OSError('injected finish failure')
                original_open = open
                class BrokenPNG:
                    def __enter__(inner):
                        inner.stream = original_open(self.root / plan['target_rel'], 'xb')
                        return inner
                    def write(inner, value):
                        inner.stream.write(value[:20])
                        raise OSError('injected PNG failure')
                    def __exit__(inner, *args):
                        inner.stream.close()
                def failing_open(path, mode='r', *args, **kwargs):
                    if mode == 'xb':
                        return BrokenPNG()
                    return original_open(path, mode, *args, **kwargs)
                # Backup names use seconds; discard test backups between injected failures.
                import shutil
                shutil.rmtree(self.d['BACKUP_ROOT_DIR'], ignore_errors=True)
                with patch.dict(self.d, atomic_write=failing_write,
                                finish_transaction=failing_finish if fail_at == 'finish' else finish):
                    with patch('builtins.open', failing_open if fail_at == 'png' else original_open):
                        with self.assertRaises(OSError):
                            self.call('apply_map_object_registration', plan, True)
                self.assertEqual(before, self.snapshot())
                self.assertEqual(old_state, Path(self.d['SETTINGS_PATH']).read_bytes())
                self.assertFalse(Path(self.d['last_transaction_path'](str(self.root))).exists())



def browser_fixture(mode, directory):
    """CLI bridge invokes actual Desk planners/transactions against a temp copy."""
    import ast
    import datetime
    import shutil
    import types
    from test_scene_validation import desk_functions
    base = Path(directory)
    root = base / 'yumaniwa-town-staging'
    branch = 'edit/map-fixture'
    if mode == 'prepare':
        root.mkdir()
        for file in ROOT.iterdir():
            if file.is_file():
                shutil.copyfile(file, root / file.name)
        for folder in ('data', 'assets'):
            shutil.copytree(ROOT / folder, root / folder)
        (root / 'works').mkdir()
        for rel, value in {'.git/config': '[remote "origin"]\n url = https://github.com/SukimaStock/yumaniwa-town-staging.git\n',
                           '.git/HEAD': 'ref: refs/heads/' + branch,
                           '.git/refs/heads/' + branch: 'a' * 40,
                           '.git/refs/remotes/origin/' + branch: 'a' * 40}.items():
            path = root / rel; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(value)
    d = desk_functions()
    d.update(datetime=datetime, shutil=shutil, tempfile=tempfile, DESK_DATA_DIR=str(base / 'desk'),
             BACKUP_ROOT_DIR=str(base / 'desk/backups'), STATE_ROOT_DIR=str(base / 'desk/state'),
             SETTINGS_PATH=str(base / 'desk/settings.json'))
    d['confirm_safe_session'](str(root), branch)
    if mode == 'prepare':
        import os
        png = Path(os.environ['MAP_CLEANER_PNG']).read_bytes() if os.environ.get('MAP_CLEANER_PNG') else fixture_png(3)
        obj = json.loads(Path(os.environ['MAP_CLEANER_JSON']).read_text()) if os.environ.get('MAP_CLEANER_JSON') else cleaner_sidecar()
        (base / 'completed.png').write_bytes(png)
        (base / 'object.json').write_text(json.dumps(obj))
        plan = d['plan_map_object_registration'](str(root), png, json.dumps(obj), '接続テスト植木', 'fixture_planter_01')
        (base / 'registration-preview.json').write_text(json.dumps({k: plan[k] for k in ('object', 'root', 'branch', 'physical', 'logical', 'target_rel')}))
        scenes = {p: (root / p).read_bytes() for p in ('data/station-plaza.js', 'data/town-maps.js')}
        assert d['apply_map_object_registration'](str(root), plan, confirmed=True)
        assert scenes == {p: (root / p).read_bytes() for p in scenes}
        print(json.dumps({'root': str(root), 'objectId': plan['object']['id'], 'logical': plan['logical'], 'preview': str(base / 'registration-preview.json')}))
    elif mode == 'apply':
        plan = d['plan_town_editor_import'](str(root), (base / 'editor-export.txt').read_text())
        # Execute the actual UI apply method with only dialogs/view shell adapted.
        tree = ast.parse((ROOT / 'tools/YumaniwaDesk.py').read_text())
        klass = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'YumaniwaDesk')
        method = next(n for n in klass.body if isinstance(n, ast.FunctionDef) and n.name == 'apply_town_import')
        messages = []
        d.update(confirm=lambda *args: True, alert=lambda *args: messages.append(args), hud=lambda *args: None)
        exec(compile(ast.Module(body=[method], type_ignores=[]), 'actual-desk-apply', 'exec'), d)
        app = types.SimpleNamespace(project_root=str(root), pending_town_import=plan,
                                    require_project=lambda: bool(d['require_safe_write_session'](str(root))), show_tab=lambda *args: None)
        d['apply_town_import'](app, None)
        assert not messages, messages
        assert app.pending_town_import is None
        print(json.dumps({'applied': True, 'files': plan['target_rels']}))
    else:
        raise ValueError(mode)


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 4 and sys.argv[1] == '--browser':
        browser_fixture(sys.argv[2], sys.argv[3])
    else:
        unittest.main(verbosity=2)
