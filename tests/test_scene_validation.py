"""Run with: python3 tests/test_scene_validation.py (Node required for JS parity only).
Production Desk never invokes Node. Tests use isolated temporary repositories.
"""
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def desk_functions():
    # Load the actual pure Desk functions without importing Pythonista UI or
    # executing its filesystem/UI startup. Do not maintain a test copy of them.
    tree = ast.parse((ROOT / 'tools/YumaniwaDesk.py').read_text())
    cutoff = next(n.lineno for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'hud')
    nodes = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.lineno < cutoff]
    ns = dict(ast=ast, hashlib=hashlib, json=json, math=math, os=os, re=re)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            try:
                value = ast.literal_eval(node.value)
            except (ValueError, TypeError):
                continue
            for target in node.targets:
                if isinstance(target, ast.Name):
                    ns[target.id] = value
    exec(compile(ast.Module(body=nodes, type_ignores=[]), 'actual-desk-functions', 'exec'), ns)
    return ns


D = desk_functions()


def apply_changes(scene, changes):
    for change in changes:
        parent = scene
        for key in change['path'][:-1]:
            parent = parent[key]
        key = change['path'][-1]
        if change.get('remove'):
            del parent[key]
        elif isinstance(parent, list) and key == len(parent):
            parent.append(copy.deepcopy(change['value']))
        else:
            parent[key] = copy.deepcopy(change['value'])


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node = json.loads(subprocess.check_output(['node', str(ROOT / 'tests/scene-validation-node.cjs')], text=True))
        cls.cases = json.loads((ROOT / 'tests/scene-validation-cases.json').read_text())

    def test_current_scenes_and_authored_reader(self):
        texts = {p: (ROOT / p).read_text() for p in ('data/station-plaza.js', 'data/town-maps.js', 'town-ghost-npc.js', 'data/world-objects.js')}
        objects = D['_read_var_object_value'](texts['data/world-objects.js'], 'objects')
        self.assertEqual(objects, self.node['objects'])
        fields = ('mapWidth', 'mapHeight', 'props', 'triggers', 'passableRects', 'blockedRects', 'blockedPoints', 'areaZones')
        for scene_id, scene in self.node['scenes'].items():
            with self.subTest(scene=scene_id):
                authored = D['_read_scene_contract'](str(ROOT), scene_id, texts)
                self.assertEqual({k: authored[k] for k in fields}, {k: scene[k] for k in fields})
                self.assertTrue(D['validate_scene_data'](authored, objects)['ok'])
        self.assertEqual(len(self.node['scenes']), 6)
        self.assertEqual(sum(len(s['props']) for s in self.node['scenes'].values()), 28)

    def test_shared_fixtures_exact_error_parity_and_purity(self):
        self.assertEqual(len(self.cases), len(self.node['results']))
        for case, js_result in zip(self.cases, self.node['results']):
            with self.subTest(case=case['name']):
                scene = copy.deepcopy(self.node['scenes'][case.get('scene', 'station_plaza')])
                apply_changes(scene, case['changes'])
                before = copy.deepcopy(scene)
                result = D['validate_scene_data'](scene, self.node['objects'])
                self.assertEqual(result['ok'], case['ok'])
                self.assertEqual(result, {k: js_result[k] for k in ('ok', 'errors')})
                self.assertEqual(scene, before)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        for rel in ('data/station-plaza.js', 'data/town-maps.js', 'town-ghost-npc.js', 'data/world-objects.js', 'index.html', 'data/repository-identity.json'):
            dest = self.root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / rel, dest)
        self.prop = copy.deepcopy(self.node['scenes']['station_plaza']['props'][0])

    def tearDown(self):
        self.tmp.cleanup()

    def digest(self):
        return {str(p.relative_to(self.root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in self.root.rglob('*') if p.is_file()}

    def manifest(self, changes=None, scene='station_plaza'):
        return dict(format='yumaniwa-editor-diff-v1', scene=scene, changes=changes or {})

    def update(self, value=None):
        after = copy.deepcopy(self.prop if value is None else value)
        return dict(op='update', id=self.prop['id'], source='data/station-plaza.js', before=copy.deepcopy(self.prop), after=after)

    def plan(self, manifest):
        before = self.digest()
        try:
            return D['_plan_editor_diff_import'](str(self.root), manifest)
        finally:
            self.assertEqual(before, self.digest(), 'planning/validation must never write files')

    def test_reject_invalid_candidate(self):
        for field, value in [('w', -1), ('h', 0), ('objectId', 'missing'), ('src', None), ('x', '2')]:
            with self.subTest(field=field):
                after = dict(self.prop, **{field: value})
                with self.assertRaises(ValueError):
                    self.plan(self.manifest(dict(props=[self.update(after)])))

    def test_source_scene_and_ghost_source_rejected(self):
        change = self.update(dict(self.prop, x=2))
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(props=[change]), 'tomogushi_alley_map'))
        change['source'] = 'town-ghost-npc.js'
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(props=[change])))
        with self.assertRaises(ValueError):
            self.plan(self.manifest(scene='missing_scene'))

    def test_before_mismatch_rejects_whole_batch(self):
        changes = [self.update(dict(self.prop, x=2))]
        second = copy.deepcopy(self.node['scenes']['station_plaza']['props'][1])
        changes.append(dict(op='update', id=second['id'], source='data/station-plaza.js', before=dict(second, x=99), after=dict(second, x=3)))
        with self.assertRaisesRegex(ValueError, '正本が'):
            self.plan(self.manifest(dict(props=changes)))

    def test_prop_and_trigger_addition_and_roundtrip(self):
        prop = dict(self.prop, id='phase1_probe', interaction=dict(enabled=True, triggerId='phase1_trigger', x=0, y=0, w=1, h=1))
        trigger = dict(id='phase1_trigger', type='inspect', text='test', area=dict(x=1,y=1,w=1,h=1))
        changes = dict(props=[dict(op='add', id=prop['id'], source='data/station-plaza.js', after=prop)],
                       triggers=[dict(op='add', id=trigger['id'], source='data/station-plaza.js', after=trigger)])
        plan = self.plan(self.manifest(changes))
        self.assertTrue(plan['changed'])
        for item in plan['file_plans']:
            (self.root / item['target_rel']).write_text(item['new_text'])
        # Real runtime reader/validator accepts the written candidate too.
        result = json.loads(subprocess.check_output(['node', str(ROOT / 'tests/scene-validation-node.cjs'), str(self._runtime_tree())], text=True))
        self.assertTrue(any(p['id'] == prop['id'] for p in result['scenes']['station_plaza']['props']))
        self.assertFalse(self.plan(self.manifest())['changed'])

    def _runtime_tree(self):
        for rel in ('data/works.js', 'data/notes.js', 'data/places.js', 'town-scene-validation.js', 'main.js', 'town-interaction-flow.js'):
            shutil.copyfile(ROOT / rel, self.root / rel)
        return self.root

    def test_prop_without_trigger_rejected(self):
        prop = dict(self.prop, id='phase1_probe', interaction=dict(enabled=True, triggerId='missing', x=0, y=0, w=1, h=1))
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(props=[dict(op='add', id=prop['id'], source='data/station-plaza.js', after=prop)])))

    def test_trigger_delete_leaving_link_rejected(self):
        trigger = copy.deepcopy(self.node['scenes']['station_plaza']['triggers'][1])
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(triggers=[dict(op='delete', id=trigger['id'], source='data/station-plaza.js', before=trigger)])))

    def test_all_scene_noop_plans_and_ghost_update(self):
        for scene in self.node['scenes']:
            self.assertFalse(self.plan(self.manifest(scene=scene))['changed'])
        ghost = next(p for p in self.node['scenes']['station_plaza']['props'] if p['id']=='station_ghost_npc')
        change = dict(op='update', id=ghost['id'], source='town-ghost-npc.js', before=ghost, after=dict(ghost, x=20.125))
        self.assertTrue(self.plan(self.manifest(dict(props=[change])))['changed'])

    def test_invalid_collision_and_area_candidate(self):
        scene = self.node['scenes']['station_plaza']
        collision = {k: copy.deepcopy(scene[k]) for k in ('passableRects','blockedRects','blockedPoints')}
        after = copy.deepcopy(collision)
        after['blockedPoints'] = [dict(x=1.5,y=1)]
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(collision=dict(source='data/station-plaza.js', before=collision, after=after))))
        zones = copy.deepcopy(scene['areaZones'])
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(areaZones=dict(source='data/station-plaza.js', before=zones, after=zones+zones))))

    def test_before_types_and_collision_shape_are_not_coerced(self):
        change = self.update(dict(self.prop, x=2))
        change['before']['interaction']['enabled'] = 1
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(props=[change])))
        scene = self.node['scenes']['station_plaza']
        collision = {k: copy.deepcopy(scene[k]) for k in ('passableRects', 'blockedRects', 'blockedPoints')}
        for value in (None, False, {}, ""):
            with self.subTest(value=value):
                after = dict(collision, blockedPoints=value)
                with self.assertRaises(ValueError):
                    self.plan(self.manifest(dict(collision=dict(source='data/station-plaza.js', before=collision, after=after))))
        before = copy.deepcopy(collision)
        before['passableRects'][0]['x'] = str(before['passableRects'][0]['x'])
        with self.assertRaises(ValueError):
            self.plan(self.manifest(dict(collision=dict(source='data/station-plaza.js', before=before, after=collision))))

    def test_invalid_unchanged_part_blocks_otherwise_valid_edit(self):
        p = self.root / 'town-ghost-npc.js'
        source = p.read_text()
        ghost = D['_read_var_object_value'](source, 'prop')
        p.write_text(D['_replace_var_object'](source, 'prop', dict(ghost, objectId='missing')))
        with self.assertRaisesRegex(ValueError, '候補scene'):
            self.plan(self.manifest(dict(props=[self.update(dict(self.prop, x=2))])))

    def test_collision_before_allows_equivalent_cell_partition(self):
        scene = self.node['scenes']['station_plaza']
        current = {k: copy.deepcopy(scene[k]) for k in ('passableRects', 'blockedRects', 'blockedPoints')}
        before = copy.deepcopy(current)
        r = before['passableRects'].pop(0)
        before['passableRects'].extend(dict(x=r['x']+x, y=r['y']+y, w=1, h=1)
                                      for y in range(r['h']) for x in range(r['w']))
        self.plan(self.manifest(dict(collision=dict(source='data/station-plaza.js', before=before, after=current))))

    def test_repository_identity_rejects_production_and_wrong_marker(self):
        for rel in ('data/notes.js', 'data/works.js', 'data/updates.js'):
            shutil.copyfile(ROOT / rel, self.root / rel)
        (self.root / 'works').mkdir()
        # Folder-name check also matters on Pythonista where .git is invisible.
        with patch.dict(D, project_repo_name=lambda root: 'yumaniwa-town-staging'):
            self.assertTrue(D['require_staging_project'](str(self.root)))
            self.assertFalse(D['plan_town_editor_import'](str(self.root), json.dumps(self.manifest()))['changed'])
            marker = self.root / 'data/repository-identity.json'
            data = json.loads(marker.read_text())
            data['repository'] = 'SukimaStock/yumaniwa-town'
            marker.write_text(json.dumps(data))
            with self.assertRaises(RuntimeError):
                D['plan_town_editor_import'](str(self.root), json.dumps(self.manifest()))
        with patch.dict(D, project_repo_name=lambda root: 'yumaniwa-town'):
            with self.assertRaises(RuntimeError):
                D['plan_town_editor_import'](str(self.root), json.dumps(self.manifest()))

    def test_hash_recheck_includes_unchanged_dependencies(self):
        plan = self.plan(self.manifest(dict(props=[self.update(dict(self.prop, x=2))])))
        D['_assert_editor_plan_current'](str(self.root), plan)
        p = self.root / 'data/world-objects.js'
        p.write_text(p.read_text() + '\n// concurrent catalog change\n')
        with self.assertRaises(ValueError):
            D['_assert_editor_plan_current'](str(self.root), plan)


if __name__ == '__main__':
    unittest.main(verbosity=2)
