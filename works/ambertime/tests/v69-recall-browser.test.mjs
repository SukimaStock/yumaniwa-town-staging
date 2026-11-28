import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const origin = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const saveKey = 'sukimastock.local-ambertime.main.v69';
const mime = {html:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',png:'image/png',wav:'audio/wav',ttf:'font/ttf'};

for (const bgmOn of [true, false]) test('recall entrance, chapter controls and succession with music ' + (bgmOn ? 'on' : 'off'), {
  skip:!process.env.AMBER_BROWSER_MODULE,timeout:90000
}, async () => {
  const cases = await readFile(new URL('v69/preview-cases-a.js',root),'utf8');
  const record = vm.runInNewContext(cases+";amberTimePreviewCasesA['national-handover']");
  const {chromium} = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport:{width:390,height:680},hasTouch:true,reducedMotion:'no-preference'});
    page.setDefaultTimeout(10000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url = route.request().url();
      if (!url.startsWith(origin)) return route.abort();
      const file = url.slice(origin.length).split('?')[0] || 'index.html';
      await route.fulfill({body:await readFile(new URL(file,root)), contentType:mime[file.split('.').at(-1)]});
    });
    await page.addInitScript(({saveKey,record})=>{
      if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey,record);
    },{saveKey,record});
    const tap = selector=>page.locator(selector).first().tap();
    await page.addInitScript(on => {
      localStorage.setItem('ambertime-bgm-preferences-v1',JSON.stringify({on,volume:32}));
      window.phases=[];
      document.addEventListener('amber-recall-audio',e => window.phases.push([e.detail.phase,performance.now()]));
    },bgmOn);
    await page.goto(origin+'?debug=1&audio-test=1');
    await tap('#entry-continue');
    const player=page.locator('.at-recall-player[open]');
    const next=player.locator('[data-recall-action="next"]');
    await player.waitFor();
    await next.waitFor();
    const phases=await page.evaluate(()=>window.phases);
    assert.deepEqual(phases.map(p=>p[0]),['fade','quiet']);
    assert.ok(phases[1][1]-phases[0][1]>=1000);
    assert.ok(await page.evaluate(()=>performance.now()-window.phases[1][1])>=330);
    assert.equal(await page.evaluate(()=>window.__amberAudioDiagnostics.musicPlaying),false);
    const toggle=player.locator('[data-recall-action="toggle"]');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-label'),'再開');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-label'),'一時停止');
    await next.click();
    await player.getByRole('button',{name:'前の場面',exact:true}).click();
    assert.match(await player.locator('[data-recall-counter]').innerText(),/^1 \/ /);
    const total=Number((await player.locator('[data-recall-counter]').innerText()).split('/')[1]);
    for(let n=1;n<total;n++)await next.click();
    assert.equal(await next.innerText(),'次の代へ');
    await next.click();
    await player.waitFor({state:'hidden'});
    await page.waitForFunction(()=>window.amberPlacement.snapshot().generations.active.id===2);
    assert.equal(await page.evaluate(()=>window.phases.at(-1)[0]),'end');
    await page.waitForFunction(on=>window.__amberAudioDiagnostics.musicPlaying===on,bgmOn);
    assert.equal(await page.evaluate(()=>window.__amberAudioDiagnostics.options.bgmVolume),32);
    await page.reload();
    await tap('#entry-continue');
    await page.waitForFunction(()=>window.amberPlacement?.snapshot()?.generations?.active.id===2);
    assert.equal(await page.evaluate(()=>window.amberPlacement.snapshot().generations.completed.length),1);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
