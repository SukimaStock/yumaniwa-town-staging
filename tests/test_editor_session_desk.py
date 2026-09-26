"""Real Editor session export -> actual Desk planner -> temporary canonical reload."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from test_scene_validation import D, ROOT


class SessionRoundtrip(unittest.TestCase):
    def test_session_export_desk_and_reload(self):
        output = subprocess.check_output(['node', str(ROOT / 'tests/test-editor-session.cjs'), '--desk-export'], text=True)
        payload = json.loads(output.splitlines()[-1])
        manifest, expected = payload['manifest'], payload['after']
        self.assertTrue(all(manifest['changes'][key] for key in ('props', 'triggers', 'collision', 'areaZones')))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = ('data/station-plaza.js', 'data/town-maps.js', 'town-ghost-npc.js', 'data/world-objects.js')
            for rel in sources + ('index.html',):
                dest = root / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / rel, dest)
            before = {rel: (root / rel).read_bytes() for rel in sources}
            plan = D['_plan_editor_diff_import'](str(root), manifest)
            self.assertEqual(before, {rel: (root / rel).read_bytes() for rel in sources})
            D['_assert_editor_plan_current'](str(root), plan)
            for item in plan['file_plans']:
                (root / item['target_rel']).write_text(item['new_text'])
            texts = {rel: (root / rel).read_text() for rel in sources}
            actual = D['_read_scene_contract'](str(root), manifest['scene'], texts)
            for key in ('props', 'triggers', 'passableRects', 'blockedRects', 'blockedPoints', 'areaZones'):
                self.assertEqual(actual[key], expected[key], key)
            objects = D['_read_var_object_value'](texts['data/world-objects.js'], 'objects')
            self.assertTrue(D['validate_scene_data'](actual, objects)['ok'])
            # Reload through the actual runtime source loader and validator.
            for rel in ('data/works.js', 'data/notes.js', 'data/places.js', 'town-scene-validation.js',
                        'town-editor-session.js', 'main.js', 'town-interaction-flow.js'):
                shutil.copyfile(ROOT / rel, root / rel)
            reload = json.loads(subprocess.check_output(['node', str(ROOT / 'tests/scene-validation-node.cjs'), directory], text=True))
            for key in ('props', 'triggers', 'passableRects', 'blockedRects', 'blockedPoints', 'areaZones'):
                self.assertEqual(reload['scenes'][manifest['scene']][key], expected[key], key)


if __name__ == '__main__':
    unittest.main(verbosity=2)
