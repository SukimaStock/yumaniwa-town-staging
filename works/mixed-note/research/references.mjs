import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
export const provenance=JSON.parse(readFileSync(new URL('./provenance.json',import.meta.url)));
export function references(root) {
  if(!root)throw new Error('Supply the directory containing jaime-reference and hechima-reference checkouts');
  const result={};
  for(const name of ['jaime','hechima']){
    const dir=resolve(root,`${name}-reference`), pin=provenance[name];
    const revision=execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    if(revision!==pin.revision)throw new Error(`${name}: revision mismatch`);
    result[name]={dir,files:{}};
    for(const [file,sha]of Object.entries(pin.files)){
      const bytes=readFileSync(resolve(dir,file));
      if(createHash('sha256').update(bytes).digest('hex')!==sha)throw new Error(`${name}/${file}: hash mismatch`);
      result[name].files[file]=bytes;
    }
  }
  return result;
}
