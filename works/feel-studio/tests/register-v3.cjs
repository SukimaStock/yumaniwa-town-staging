/* Work-local registration helper. Does not rewrite immutable old manifests. */
'use strict';const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..');const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
function register(catalog,definition){if(catalog.builds.some(b=>b.id===definition.id))throw Error('Installed build IDs are immutable');const {assets,...b}=definition;b.codeHash=hash(b.source);b.htmlHash=hash(b.url);b.dependencies=assets.map(p=>({path:p,sha256:hash(p)}));catalog.builds.push(b);return b;}
module.exports={register,hash};
