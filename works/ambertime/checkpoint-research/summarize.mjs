// Aggregate completed research conditions only. Never reruns simulation or changes saves.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function summarize(input){
 const aggregate=typeof input==='string'?JSON.parse(readFileSync(input,'utf8')):input;
 assert.equal(aggregate.complete,true,'Do not publish a partial aggregate as complete');
 const {results}=aggregate;assert.equal(results.length,12);
 assert.equal(new Set(results.map(r=>r.id+':'+r.month)).size,12,'Duplicate condition');
 assert.equal(new Set(results.map(r=>r.codeFingerprint)).size,1,'Mixed research revisions');
 assert.equal(new Set(results.map(r=>r.modelFingerprint)).size,1,'Mixed game models');
 for(const id of ['local','wide','mixed'])for(const month of [360,720,1080,1200])assert(results.some(r=>r.id===id&&r.month===month),'Missing condition');
 for(const r of results){assert.equal(r.status,'complete');assert.equal(r.policies.length,5);for(const p of r.policies){assert(p.tailOperations>0);assert(p.stateEqual&&p.contextEqual&&p.projectionEqual&&p.recallEqual);assert.equal(p.formalEquivalentValidationMs,null);assert.equal(p.projectionDigest,r.projectionDigest);assert.equal(p.recallDigest,r.recallDigest);}}
 const label={local:'地元密着',wide:'広域展開',mixed:'混合'},fmt=(n,d=2)=>n.toFixed(d),s=n=>fmt(n/1000),mib=n=>fmt(n/1048576);
 let report=`# H1-A2 checkpoint＋tail 実測\n\n12条件すべてで、研究checkpointから実際のtailを適用した正式状態・再生context・帳面資料・回想候補/境界/seed/採用順/文章が、同条件の全再生に一致した。研究用のローカル整合性検査であり、正式保存への導入や同等の永続checkpoint検証保証を証明するものではない。\n\n## 環境と保証\n\nNode ${results[0].node} / ${results[0].platform} ${results[0].arch}。各条件を独立processで逐次実行し、未変更の正式readerによるcold復元1回を基準にした。統計的信頼区間はない。旧H1-A1の異なるhostの秒数から倍率を算出しない。全入力はH1-A1のSHAと容量に一致し、終了時にも不変を照合した。部分再生は正式復元・全資料再生後の同じwarm processで各1回実行し、資料付き再生は純粋tailの後に行った。JIT/import/OS cache条件はcold正式復元と異なる。状態だけの合計も、保守的に資料sidecarを含むファイルの読込/parseを計上する。\n\n部分再生値はcheckpointのJSON読込/parse、ローカルhash・版・source/prefix照合、状態複製、tail適用、抽出途中/試飲の最終化、最終保存JSON一致を含む。純粋tailはobserverなしで別に再生し、帳面/回想collectorを使う資料付き再生と分けた。資料付きtail時間は通知とsnapshot複製を含む。collector自身の通知処理時間とhydrate時間も別記録した。\n\n完全再生によるcheckpoint生成・独立した正式readerとの比較は研究の事前検証であり、毎回の部分再生時間には含めない。現行と同等の永続checkpoint信頼保証を実装した場合の復元時間は未実装のため不明。元保存・全操作prefixを保持し、容量削減は主張しない。\n\n## 全再生の基準\n\n| 方針 | 年 | 正式cold復元 秒 | warm再保存 ms | 全再生＋collector＋checkpoint作成 秒 | collector通知内数 秒 | checkpoint作成内数 秒 | process peak RSS MiB |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
 for(const r of results)report+=`| ${label[r.id]} | ${r.month/12} | ${s(r.officialRestoreMs)} | ${fmt(r.officialWarmResaveMs)} | ${s(r.fullTrajectory.wallMs)} | ${s(r.fullTrajectory.collectorMs)} | ${s(r.fullTrajectory.captureMs)} | ${mib(r.peakRssBytes)} |\n`;
 report+='\n## 100年時点の方式比較\n\ncheckpoint数は開始からの作成trigger数。最後の操作そのもののcheckpointは計測に使わず、必ず非空tailを再生した。年次は12か月、操作数は64/128件、負荷方式は直近の状態JSON容量×操作数が64 MiBに達した時点。負荷方式は実CPU時間に基づく最適化ではない。\n\n| 方針 | 方式 | trigger数 | tail月 | tail操作 | checkpoint MiB | 資料prefix MiB | 読込/parse ms | ローカル検証 ms | 純粋tail 秒 | ローカル検証付き合計 秒 | 資料付きtail 秒 | collector内数 秒 | 資料検証合計 秒 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n';
 for(const r of results.filter(r=>r.month===1200))for(const p of r.policies)report+=`| ${label[r.id]} | ${p.policy} | ${p.checkpointCount} | ${p.tailMonths} | ${p.tailOperations} | ${mib(p.checkpointBytes)} | ${mib(p.projectionPrefixBytes)} | ${fmt(p.checkpointReadParseMs)} | ${fmt(p.verifyMs)} | ${s(p.pureTailMs)} | ${s(p.localPartialTotalMs)} | ${s(p.tailMs)} | ${s(p.projectionObserveMs)} | ${s(p.materialTotalMs)} |\n`;
 report+='\ncheckpointは現在状態に加え正式操作prefix、manual/nearby context、資料collectorのMaps/Setsを保持する。資料prefixを除いた状態checkpointだけの容量と資料prefixを分けた。元保存は別途完全保持しているため、実運用の総保存量削減とは扱わない。\n\n## 同値検証\n\n| 方針 | 年 | raw事実 | 共有候補 | 回想境界＋周年 | 状態/context/帳面/回想 |\n| --- | ---: | ---: | ---: | ---: | --- |\n';
 for(const r of results)report+=`| ${label[r.id]} | ${r.month/12} | ${r.projectedCounts.rawEvents} | ${r.projectedCounts.candidateEvents} | ${r.projectedCounts.snapshots} | 5方式すべて一致 |\n`;
 report+='\n回想archiveの件数・バイト容量、周年の採用ID順とseedはH1-A1結果にも一致した。全再生とtailでは境界ごとの候補、根拠chain、cutoff、seed、採用順、D1.2の一文を比較した。30年・100年では既存H2-5公開資料の候補集合・ordinal差分・境界・frames・audit・文章とも照合した（100年の9交代境界を含む）。帳面は仕込み/樽/瓶詰め資料、発売、店別納品、歩み、世代集計、ブランド資料の元データを比較した。DOM表示やSafari操作の計測ではない。\n\n## 解釈と限界\n\n- 年次・操作数・負荷方式はtailを短くする一方、作成頻度と大きな状態の複製・検証コストが増える。世代方式は境界を揃えやすいが、長いtailが残る。正式な閾値は未採用。\n- 状態checkpointだけではprefixの帳面collectorや歴史根拠は復元できない。研究では別のprefix資料を保持した。\n- peak RSSはprocess全体の累積最大で、正式状態・比較用コピー・複数checkpoint等を同時保持する。個別復元phaseの実機必要メモリとは異なる。heap前後差はresults.jsonに記録し、負の差もGCの影響を含む。\n- ローカルhashは破損や誤接続を検出する。攻撃者が状態とhashを同時に作り直す場合の正当性証明ではない。\n- 正式保存の圧縮・削除・移行、正式readerへの接続、Production変更、iPhone Safari実機確認は行っていない。\n\n詳細値・source SHA・fingerprint・各方式の検証時間・比較追加負荷・heap/RSSは[results.json](results.json)。再生契約・信頼境界と次段階は[CONTRACT.md](CONTRACT.md)。\n';
 const columns=['scenario','years','policy','checkpointCount','checkpointMonth','tailMonths','tailOperations','checkpointBytes','projectionPrefixBytes','checkpointReadParseMs','pureVerifyMs','pureTailMs','pureFinalizeMs','pureCompareMs','localPartialTotalMs','projectionHydrateMs','verifyMs','tailMs','projectionObserveMs','finalizeMs','finalStateCompareMs','additionalComparisonMs','partialTotalMs','materialTotalMs','checkpointCreateMs','stateCheckpointCreateMs','projectionCheckpointCreateMs','officialRestoreMs','stateEqual','contextEqual','projectionEqual','recallEqual'];
 const csv=[columns.join(',')];
 for(const r of results)for(const p of r.policies){const row={scenario:r.id,years:r.month/12,...p,officialRestoreMs:r.officialRestoreMs};csv.push(columns.map(key=>row[key]).join(','));}
 return {report,csv:csv.join('\n')+'\n',results};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [input,directory]=process.argv.slice(2);assert(input&&directory,'summarize.mjs <complete-results.json> <output-directory>');
 const out=summarize(input);writeFileSync(resolve(directory,'REPORT.md'),out.report);writeFileSync(resolve(directory,'metrics.csv'),out.csv);
}
