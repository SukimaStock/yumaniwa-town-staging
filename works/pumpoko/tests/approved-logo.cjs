'use strict';
// Owner-supplied SVG, accepted 2026-10-10. Legacy byte guards still protect
// every other asset, and this guard allows only the aspect-ratio expression.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const BASE='4c4c24ead66b4cc8e8ea2e5fc6392d519fc28855';
const SHA256='09e3cb1558423d6df7baee46ac8889431b2e7379a74b0497591e8ed7b23db63e';
function protectLogo(){
 const root=path.resolve(__dirname,'../../..');
 const svg=fs.readFileSync(path.join(__dirname,'../assets/pumpoko-logo.svg'));
 assert.equal(createHash('sha256').update(svg).digest('hex'),SHA256,'approved supplied logo bytes');
 const before=execFileSync('git',['show',BASE+':works/pumpoko-02/title-draw.js'],{cwd:root,encoding:'utf8'});
 assert.equal(fs.readFileSync(path.join(__dirname,'../title-draw.js'),'utf8'),before.replace('317.4 * 654 / 2064','317.4 * titleArt.naturalHeight / titleArt.naturalWidth'),'title renderer changes only intrinsic logo proportions');
}
function approvedLogoPath(p){
 if(!['works/pumpoko-02/assets/pumpoko-logo.svg','works/pumpoko-02/title-draw.js'].includes(p))return false;
 protectLogo();return true;
}
module.exports={protectLogo,approvedLogoPath};
