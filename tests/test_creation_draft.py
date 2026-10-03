"""Actual Desk ZIP/combined adoption in disposable staging copies only."""
import copy
import hashlib
import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
import test_map_asset_registration as maptests
fixture_png = maptests.fixture_png
cleaner_sidecar = maptests.cleaner_sidecar
from test_scene_validation import ROOT, desk_functions


def zip_bytes(manifest, images, extra=None):
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_STORED) as z:
        z.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False))
        for key,data in images.items(): z.writestr('images/'+key+'.png',data)
        for name,data in (extra or {}).items(): z.writestr(name,data)
    return output.getvalue()


def adoption_lock(root, targets):
    lock=json.loads((ROOT/'.change-plans/editor-creation-draft-v1-20261003/r0.lock.json').read_text())
    plan=lock['plan'];plan.update(changeId='fixture-creation-adoption',baseSha='a'*40,allowedPaths=targets,forbiddenPaths=[],conditionalPaths=[])
    planfile=root.parent/'plan.json';planfile.write_text(json.dumps(plan))
    output=subprocess.check_output(['node',str(ROOT/'tools/change-plan-lock.cjs'),'create','--plan',str(planfile)])
    rel='.change-plans/fixture-creation-adoption/r0.lock.json'
    (root/rel).parent.mkdir(parents=True,exist_ok=True);(root/rel).write_bytes(output)
    return rel


class CreationDraft(unittest.TestCase):
    setUpBase = maptests.MapRegistration.setUpBase
    put = maptests.MapRegistration.put
    select = maptests.MapRegistration.select
    call = maptests.MapRegistration.call
    snapshot = maptests.MapRegistration.snapshot
    def setUp(self):
        maptests.MapRegistration.setUp(self)
        keys=['k_'+str(i)*32 for i in (1,2)]
        imgs={keys[0]:fixture_png(),keys[1]:fixture_png(3)}
        scene='station_plaza'
        sources={rel:hashlib.sha256((self.root/rel).read_bytes()).hexdigest() for rel in self.d['CREATION_SOURCES']}
        self.manifest={'format':'yumaniwa-creation-draft','version':1,'purpose':'adoption','draftKey':'k_'+'a'*32,
            'repository':'SukimaStock/yumaniwa-town-staging','scene':{'id':scene,'coordinates':'scene-tiles','tileSize':16,'mapWidth':24,'mapHeight':24},
            'sources':sources,'assets':[{'key':k,'path':'images/'+k+'.png','name':'same.png','sha256':hashlib.sha256(data).hexdigest(),
                'bytes':len(data),'physical':[24*(3 if i else 1)]*2,'metadata':cleaner_sidecar() if i else None} for i,(k,data) in enumerate(imgs.items())],
            'placements':[{'key':'k_'+str(i+3)*32,'assetKey':k,'x':8+i*2,'y':7,'w':2.1,'h':2.1,'footY':8.85,'visible':True} for i,k in enumerate(keys)],
            'adoption':['k_'+'3'*32,'k_'+'4'*32],'formal':None}
        texts={rel:(self.root/rel).read_text() for rel in self.d['CREATION_SOURCES']}
        scene_data=self.d['_read_scene_contract'](str(self.root),scene,texts)
        self.manifest['scene'].update({k:scene_data[k] for k in ('mapWidth','mapHeight')})
        self.images=imgs
        self.choices={k:{'objectId':'creation_fixture_'+str(i),'label':'検証'+str(i),'category':'greenery','target':'PROP_S'} for i,k in enumerate(keys)}
        targets=['data/world-objects.js','data/station-plaza.js','town-ghost-npc.js','index.html']+['assets/maps/objects/greenery/creation_fixture_'+str(i)+'.png' for i in range(2)]
        self.lock=adoption_lock(self.root,targets)

    def draft_plan(self,manifest=None,choices=None):
        return self.call('plan_creation_draft_adoption',zip_bytes(manifest or self.manifest,self.images),choices or self.choices,self.lock)

    def test_combined_adoption_readonly_bytes_geometry_and_undo(self):
        before=self.snapshot();plan=self.draft_plan();self.assertEqual(self.snapshot(),before)
        for image,a in zip(plan['images'],self.manifest['assets']):self.assertEqual(hashlib.sha256(image['original_png']).hexdigest(),a['sha256'])
        self.assertTrue(self.call('apply_creation_draft_adoption',plan,True))
        texts={rel:(self.root/rel).read_text() for rel in self.d['CREATION_SOURCES']}
        actual=self.d['_read_scene_contract'](str(self.root),'station_plaza',texts)
        for mapping,p in zip(plan['mapping'],self.manifest['placements']):
            prop=next(x for x in actual['props'] if x['id']==mapping['prop']['id'])
            self.assertEqual({k:prop[k] for k in ('x','y','w','h','footY')},{k:p[k] for k in ('x','y','w','h','footY')})
            self.assertNotIn('src',prop);self.assertNotIn('metadata',prop)
        objects=self.d['_read_var_object_value'](texts['data/world-objects.js'],'objects')
        self.assertTrue(self.d['validate_scene_data'](actual,objects)['ok'])
        self.assertEqual(self.d['_script_cache_revision']((self.root/'index.html').read_text(),'./data/world-objects.js'),self.d['_cache_revision_for_text'](texts['data/world-objects.js']))
        self.assertFalse(plan['objects'][0]['finalization']['pixelSafe'])
        self.assertEqual(plan['images'][1]['logical'],[24,24]);self.assertEqual(plan['images'][1]['physical'],[72,72])
        self.call('undo_last_transaction');self.assertEqual(self.snapshot(),before)

    def test_combined_cancellation_stale_mutation_id_and_duplicate_rejection(self):
        before=self.snapshot();plan=self.draft_plan();self.assertFalse(self.call('apply_creation_draft_adoption',plan));self.assertEqual(before,self.snapshot())
        choices=copy.deepcopy(self.choices);choices[next(iter(choices))]['objectId']='bench_wood_01'
        with self.assertRaises(ValueError):self.draft_plan(choices=choices)
        self.assertEqual(before,self.snapshot())
        mutated=copy.deepcopy(plan);mutated['mapping'][0]['prop']['x']+=1
        with self.assertRaises(ValueError):self.call('apply_creation_draft_adoption',mutated,True)
        self.put('data/world-objects.js',(self.root/'data/world-objects.js').read_text()+'\n// newer source\n')
        with self.assertRaises(ValueError):self.call('apply_creation_draft_adoption',plan,True)
        (self.root/'data/world-objects.js').write_bytes(before['data/world-objects.js'])
        self.call('apply_creation_draft_adoption',plan,True)
        with self.assertRaises(ValueError):self.draft_plan()
        # Even a re-export with new hashes and a different formal ID cannot duplicate provenance.
        m=copy.deepcopy(self.manifest);m['sources']={rel:hashlib.sha256((self.root/rel).read_bytes()).hexdigest() for rel in self.d['CREATION_SOURCES']}
        choices=copy.deepcopy(self.choices)
        for c in choices.values():c['objectId']+='another'
        with self.assertRaisesRegex(ValueError,'既に採用'):self.draft_plan(m,choices)

    def test_combined_failure_rolls_back_every_file_and_state(self):
        for failed in ('atomic_write','finish_transaction'):
            with self.subTest(failed=failed):
                plan=self.draft_plan();before=self.snapshot()
                with patch.dict(self.d,{failed:lambda *args:(_ for _ in ()).throw(RuntimeError('injected'))}):
                    with self.assertRaisesRegex(RuntimeError,'injected'):self.call('apply_creation_draft_adoption',plan,True)
                self.assertEqual(self.snapshot(),before)
        # Late exclusive-create collision is preserved, earlier new image rolled back.
        plan=self.draft_plan();before=self.snapshot();second=self.root/plan['images'][1]['target_rel']
        original=self.d['create_transaction']
        def race(*args):
            tx=original(*args);second.write_bytes(b'late-owner');return tx
        with patch.dict(self.d,create_transaction=race):
            with self.assertRaises(FileExistsError):self.call('apply_creation_draft_adoption',plan,True)
        self.assertEqual(second.read_bytes(),b'late-owner');second.unlink();self.assertEqual(self.snapshot(),before)

    def test_manifest_security_size_path_hash_coordinates_and_plan(self):
        before=self.snapshot()
        for modify in (lambda m:m['placements'][0].update(x=float('inf')),
                       lambda m:m['assets'][0].update(path='../x.png'),
                       lambda m:m['assets'][0].update(metadata={'src':'https://invalid.example/p.png'}),
                       lambda m:m['assets'][0].update(sha256='0'*64),
                       lambda m:m['assets'][0].update(bytes=17*1024*1024),
                       lambda m:m['scene'].update(mapWidth=1),
                       lambda m:m.update(assets=m['assets']*9)):
            m=copy.deepcopy(self.manifest);modify(m)
            with self.assertRaises((ValueError,KeyError)):self.draft_plan(m)
        with self.assertRaises(ValueError):self.d['read_creation_draft_zip'](zip_bytes(self.manifest,self.images,{'../escape':b'a'}))
        self.assertEqual(self.snapshot(),before)
        lock=json.loads((self.root/self.lock).read_text());lock['plan']['allowedPaths']=[];self.put(self.lock,json.dumps(lock))
        with self.assertRaises(ValueError):self.draft_plan()

    def test_formal_diff_is_included_and_inconsistent_snapshot_rejected(self):
        texts={rel:(self.root/rel).read_text() for rel in self.d['CREATION_SOURCES']}
        baseline=self.d['_read_scene_contract'](str(self.root),'station_plaza',texts)
        snapshot=copy.deepcopy(baseline);before=copy.deepcopy(snapshot['props'][0]);snapshot['props'][0]['x']+=0.125
        diff={'format':'yumaniwa-editor-diff-v1','scene':'station_plaza','title':'fixture','changes':{'props':[{'op':'update','id':before['id'],'source':'data/station-plaza.js','before':before,'after':copy.deepcopy(snapshot['props'][0])}],'triggers':[],'collision':None,'areaZones':None}}
        m=copy.deepcopy(self.manifest);m['formal']={'baseline':baseline,'snapshot':snapshot,'diff':diff}
        plan=self.draft_plan(m);self.assertIn('パーツ更新',plan['formal_summary']);self.call('apply_creation_draft_adoption',plan,True)
        actual=self.d['_read_scene_contract'](str(self.root),'station_plaza',{rel:(self.root/rel).read_text() for rel in self.d['CREATION_SOURCES']})
        self.assertEqual(actual['props'][0]['x'],snapshot['props'][0]['x'])
        self.call('undo_last_transaction')
        m['formal']['snapshot']['props'][0]['x']+=1
        with self.assertRaisesRegex(ValueError,'snapshot'):self.draft_plan(m)


def browser_bridge(mode,directory):
    import datetime
    directory=Path(directory);root=directory/'yumaniwa-town-staging'
    if mode=='prepare':
        shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','__pycache__'))
        for rel,value in {'.git/HEAD':'ref: refs/heads/edit/creation', '.git/config':'[remote "origin"]\n url = https://github.com/SukimaStock/yumaniwa-town-staging.git\n',
                          '.git/refs/heads/edit/creation':'a'*40,'.git/refs/remotes/origin/edit/creation':'a'*40}.items():
            (root/rel).parent.mkdir(parents=True,exist_ok=True);(root/rel).write_text(value)
        for i,scale in enumerate((1,3,1)):(directory/('fixture-'+str(i)+'.png')).write_bytes(fixture_png(scale))
        (directory/'metadata.json').write_text(json.dumps(cleaner_sidecar()))
        targets=['data/world-objects.js','data/station-plaza.js','town-ghost-npc.js','index.html']+['assets/maps/objects/greenery/browser_creation_'+str(i)+'.png' for i in range(2)]
        lock=adoption_lock(root,targets);(directory/'lock-path.txt').write_text(lock)
        print(json.dumps({'root':str(root),'fixtures':[str(directory/('fixture-'+str(i)+'.png')) for i in range(3)]}));return
    d=desk_functions();d.update(datetime=datetime,shutil=shutil,tempfile=tempfile,DESK_DATA_DIR=str(directory/'desk'),BACKUP_ROOT_DIR=str(directory/'desk/backups'),STATE_ROOT_DIR=str(directory/'desk/state'),SETTINGS_PATH=str(directory/'desk/settings.json'))
    data=(directory/'adoption.zip').read_bytes();m=d['read_creation_draft_zip'](data)['manifest']
    choices={a['key']:{'objectId':'browser_creation_'+str(i),'label':'ブラウザ検証'+str(i),'category':'greenery','target':'PROP_S'} for i,a in enumerate(m['assets'])}
    d['confirm_safe_session'](str(root),'edit/creation')
    plan=d['plan_creation_draft_adoption'](str(root),data,choices,(directory/'lock-path.txt').read_text())
    d['apply_creation_draft_adoption'](str(root),plan,True)
    print(json.dumps({'mapping':plan['mapping'],'images':[{'physical':i['physical'],'logical':i['logical']} for i in plan['images']],'formal':plan['formal_summary'],'applied':True}))


if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--browser':browser_bridge(sys.argv[2],sys.argv[3])
    else:unittest.main(verbosity=2)
