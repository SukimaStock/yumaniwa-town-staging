// Keep first encounters by event kind and region plus recorded antecedents of inquiries.
export function compactFacts(events,townEvents) {
  const encounters=new Set(), linkedArrivals=new Set(), arrivalsById=new Map(
    events.filter(event=>event.kind==='arrival').map(event=>[event.ids.townEventId,event]));
  for (const event of events) {
    if (!['arrival','inquiry','visit'].includes(event.kind)) continue;
    const key=`${event.kind}:${event.ids.regionId}`;
    if (encounters.has(key)) continue;
    encounters.add(key);
    if (event.kind==='inquiry') {
      const arrival=event.evidence.sourceChain.findLast(id=>arrivalsById.has(id));
      if (arrival) linkedArrivals.add(arrival);
    }
  }
  encounters.clear();
  const omitted={
    directArrivals:townEvents.filter(event=>event.type==='arrival' && event.channel==='direct').length,
    repeatedArrivals:0,repeatedInquiries:0,repeatedVisits:0,
    internalTownEvents:townEvents.filter(event=>!['arrival','inquiry','visit'].includes(event.type)).length,
  };
  const counters={arrival:'repeatedArrivals',inquiry:'repeatedInquiries',visit:'repeatedVisits'};
  const visible=events.filter(event=>{
    if (!Object.hasOwn(counters,event.kind)) return true;
    const key=`${event.kind}:${event.ids.regionId}`;
    if (encounters.has(key) && (event.kind!=='arrival' || !linkedArrivals.has(event.ids.townEventId))) {
      omitted[counters[event.kind]]++;
      return false;
    }
    encounters.add(key);
    return true;
  });
  let lastOperation, ordinal=0;
  return {omitted,events:visible.map(event=>{
    if (event.operationIndex!==lastOperation) ordinal=0;
    lastOperation=event.operationIndex;
    return {...event,ordinal:ordinal++};
  })};
}
