import {restoreDistillery} from '../partner-orders.mjs?v=market-rules-r1';
import {readSession} from '../placement-save.mjs';
import {PARALLEL_PARAMETERS as clock} from '../parallel-parameters.mjs';
import {analyzeHistory} from './analysis.mjs';

self.onmessage = async ({data:file}) => {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const state = parsed.version === 2
      ? readSession(text,{enabled:true,restore:restoreDistillery,monthMs:clock.monthMs,stepMs:clock.distillStepMs}).game
      : restoreDistillery(text);
    self.postMessage({analysis:analyzeHistory(state)});
  } catch {
    self.postMessage({error:true});
  }
};
