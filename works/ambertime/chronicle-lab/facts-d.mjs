// Keep the original fixture for A/B/C. Replay positions are separate from
// compact ordinals, which remain part of D's historical cutoff seed.
export function withReputationCandidates(record,supplement) {
  if (!supplement || supplement.sourceSha256 !== record.sourceSha256) {
    throw new Error('回想候補と元記録が一致しません。');
  }
  return {...record,events:[
    ...record.events.map(event => ({
      ...event,replayOrdinal:supplement.replayOrdinals[event.id] ?? event.ordinal,
    })),
    ...supplement.events,
  ]};
}
