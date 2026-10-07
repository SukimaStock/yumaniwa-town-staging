"""Small static/wiring checks; these do not verify a browser or audible output."""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
CANARY = ROOT / 'works/engine-canary'


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.scripts = [], [], []
        self.feed(source)
        self.close()
        if self.stack:
            raise AssertionError(f'Unclosed tags: {self.stack}')

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script':
            self.scripts.append(attrs.get('src'))
            assert 'defer' in attrs
        if tag not in {'meta', 'link', 'br', 'input', 'hr', 'img'}:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, f'Mismatched {tag}'


class EngineCanaryTests(unittest.TestCase):
    def test_html_and_canonical_references(self):
        page = Page((CANARY / 'index.html').read_text())
        self.assertEqual(len(page.ids), len(set(page.ids)))
        self.assertEqual(page.scripts, ['../../engine/codea-lite.v1.0.0.js',
                                      '../../engine/sukimastock-engine.v0.3.0.js', 'app.js'])
        for src in page.scripts:
            self.assertTrue((CANARY / src).is_file())
        source = (CANARY / 'app.js').read_text()
        referenced = re.findall(r"(?:\$|put)\('([^']+)'", source)
        self.assertTrue(set(referenced).issubset(page.ids))
        self.assertEqual({p.name for p in CANARY.iterdir()}, {'index.html', 'style.css', 'app.js'})

    def test_javascript_syntax(self):
        subprocess.run(['node', '--check', str(CANARY / 'app.js')], check=True, capture_output=True)

    def test_canary_wiring_and_fixture(self):
        # API doubles exercise the page wiring only, never real runtime readiness.
        harness = r'''
const assert = require('node:assert/strict');
const elements = new Map(), listeners = new Map(), loads = [];
const element = id => { if (!elements.has(id)) elements.set(id, {_text:'', get textContent(){return this._text;}, set textContent(v){this._text=String(v);}, value:'NOT TESTED', addEventListener(t, fn){this[t]=fn;}}); return elements.get(id); };
global.window = global;
global.document = {getElementById:element, activeElement:{id:'canvas'}, visibilityState:'visible', hidden:false, addEventListener(t,fn){listeners.set(t,fn);}};
global.addEventListener = (t,fn) => listeners.set(t,fn);
global.innerWidth=390; global.innerHeight=844; global.setInterval=()=>0;
global.btoa = s => Buffer.from(s,'binary').toString('base64');
global.BEGAN='BEGAN'; global.ENDED='ENDED'; global.CANCELLED='CANCELLED';
let config, tones=0, unlocks=0, pressed=false;
global.SSE={VERSION:'test', createApp(c){config=c;}, input:{actionPressed(){const p=pressed; pressed=false; return p;}}, viewport:{configure(){}},
 lifecycle:{onPause(){},onResume(){}}, audio:{enabled:true,ctx:{state:'suspended'}, resourceState(){return {status:'idle'};}, unlock(){unlocks++;}, tone(){tones++; return true;}},
 assets:{status(){return 'idle';}, record(){return {};}, async preload(names){loads.push(names);}}};
global.CodeaLite={VERSION:'test', start(){config.setup();}};
require(process.argv[1]);
assert.equal(loads.length,0); assert.equal(element('space').textContent,'NOT TESTED');
assert.equal(config.analytics.enabled,false);
const wav=Buffer.from(config.audio.sounds.validBuffer.file.split(',')[1],'base64');
assert.equal(wav.toString('ascii',0,4),'RIFF'); assert.equal(wav.toString('ascii',8,12),'WAVE');
assert.equal(wav.readUInt32LE(4)+8,wav.length); assert.equal(wav.readUInt32LE(24),8000);
assert.equal(wav.readUInt32LE(40)+44,wav.length); assert.equal(wav.readUInt16LE(34),16);
assert.equal(config.audio.music.validMedia.file,config.audio.sounds.validBuffer.file);
const lifecycleWav=Buffer.from(config.audio.music.lifecycleMusic.file.split(',')[1],'base64');
assert.equal(lifecycleWav.readUInt32LE(40),64000*2); assert.equal(config.audio.music.lifecycleMusic.loop,true);
assert.equal(element('resume-heard').value,'NOT TESTED'); // fake select never auto-passes
assert.equal(config.audio.sounds.missing.file,'./__missing_audio_canary__.wav');
config.scenes.test.touch({state:BEGAN,id:1,x:20,y:30});
config.scenes.test.touch({state:ENDED,id:1,x:20,y:30});
assert.equal(element('taps').textContent,'1'); assert.equal(element('held').textContent,'OFF');
pressed=true; config.scenes.test.update(); config.scenes.test.update(); assert.equal(element('space').textContent,'1');
element('tone').click(); assert.equal(tones,1); assert.equal(unlocks,1); assert.equal(element('heard').value,'NOT TESTED');
document.hidden=true; listeners.get('visibilitychange')(); document.hidden=false; listeners.get('visibilitychange')();
assert.equal(element('hidden-count').textContent,'1'); assert.equal(element('restore-count').textContent,'1');
(async()=>{ await element('load-missing').click(); assert.deepEqual(loads,[['missing']]);
await element('load-valid').click(); assert.deepEqual(loads[1],['validBuffer','validMedia']); })().catch(e=>{console.error(e);process.exitCode=1;});
'''
        result = subprocess.run(['node', '-e', harness, str(CANARY / 'app.js')], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
