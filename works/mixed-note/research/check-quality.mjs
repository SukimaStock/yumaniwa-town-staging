import {readFileSync} from 'node:fs';
const file=process.argv[2];if(!file)throw new Error('Usage: check-quality.mjs <results.json>');
const result=JSON.parse(readFileSync(file));
const fixtures=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url)));
const failures=[];
for(const f of fixtures.cases){
  const r=result.cases.find(c=>c.id===f.id);
  if(!r||r.input!==f.input||r.target!==f.target)throw new Error(`Missing/stale result: ${f.id}`);
  if(f.mandatory){
    if(r.baseline!==f.target)console.log(`BASELINE FAIL ${f.id}: ${r.baseline}`);
    if(r.jaimeRaw.output!==f.target)console.log(`JAIME RAW FAIL ${f.id}: ${r.jaimeRaw.output ?? r.jaimeRaw.error}`);
    if(r.automaticOutput!==f.target)failures.push(`End-to-end regression ${f.id} has no validated natural Japanese output.`);
    if(r.automaticOutput?.includes('なんんとも'))failures.push('Forbidden duplicated nn output.');
    console.log(`MOZC ORACLE ${f.id}: top1=${r.mozcOracle.top1Exact}, selectable=${r.mozcOracle.targetSelectable}`);
  }
}
if(result.automaticDetection!=='VALIDATED')failures.push('Automatic local Detection/Segmentation has not been implemented/validated.');
if(result.physicalIphoneSafari!=='PASS')failures.push('Physical iPhone Safari multi-paragraph writing quality has not passed.');
if(result.paragraphReview!=='PASS')failures.push('Multi-paragraph note-writing review has not passed.');
if(!result.integrationEligible)failures.push('Integration eligibility is false.');
for(const failure of failures)console.log(`QUALITY BLOCKED: ${failure}`);
process.exitCode=failures.length?1:0;
