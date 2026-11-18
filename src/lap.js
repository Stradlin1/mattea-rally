// Start/finish-only lap timing. No checkpoint or waypoint objects exist.
// A full signed course traversal plus a forward line crossing validates a lap.
// Projected progress permits reasonable off-road shortcuts while preventing
// repeated back-and-forth crossings of the start line.
export function createLapTracker(samples, roadWidth, startIndex = samples.length - 9) {
  if (!Array.isArray(samples) || samples.length < 8) {
    throw new Error('A closed circuit with at least 8 samples is required');
  }
  let length = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i], b = samples[(i + 1) % samples.length];
    length += Math.hypot(a.x-b.x,a.z-b.z);
  }
  return {
    samples,
    roadWidth,
    previousIndex: startIndex,
    start: samples[0],
    progress: 0,
    traveled: 0,
    leftStart: false,
    averageSpacing: length/samples.length,
    lapLength: length
  };
}

export function updateLapTracker(tracker, oldX, oldZ, newX, newZ, nearest, lapTime) {
  const n=tracker.samples.length;
  const index=nearest.index;
  const traveled=Math.hypot(newX-oldX,newZ-oldZ);
  tracker.traveled+=traveled;
  const start=tracker.start;
  const departure=Math.hypot(newX-start.x,newZ-start.z);
  if (departure > Math.max(40,tracker.roadWidth*1.5)) tracker.leftStart=true;

  // Continuous signed circular progress. Backtracking subtracts progress.
  let delta=index-tracker.previousIndex;
  if(delta>n/2)delta-=n;
  if(delta< -n/2)delta+=n;
  tracker.previousIndex=index;

  // Ignore ambiguous projections at tight parallel hairpins or when far
  // from the course. This never blocks free exploration or car movement.
  const maximumAdvance=Math.max(8,Math.ceil((traveled*3+2)/tracker.averageSpacing));
  const nearCourse=nearest.d < tracker.roadWidth*.5 + 24;
  if (nearCourse && Math.abs(delta)<=maximumAdvance) {
    tracker.progress=Math.max(-.5,Math.min(1.6,tracker.progress+delta/n));
  }

  const oldAlong=(oldX-start.x)*start.tx+(oldZ-start.z)*start.tz;
  const newAlong=(newX-start.x)*start.tx+(newZ-start.z)*start.tz;
  const lateral=Math.abs((newX-start.x)*(-start.tz)+(newZ-start.z)*start.tx);
  const crossingForward=oldAlong<0 && newAlong>=0 && lateral<tracker.roadWidth*.5+7;
  const valid=crossingForward && tracker.leftStart && tracker.progress>=.74 &&
    tracker.traveled>=tracker.lapLength*.70 && lapTime>=10;
  if(valid){
    tracker.progress=0;
    tracker.traveled=0;
    tracker.leftStart=false;
  }
  return {completed:valid,progress:Math.max(0,Math.min(1,tracker.progress)),
    crossedStart:crossingForward};
}
