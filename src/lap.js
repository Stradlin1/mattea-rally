// Start/finish lap validation without checkpoints or mandatory course progress.
// Any shortcut is legal. Only a real excursion away from the start area plus
// meaningful physical travel and a forward finish-line crossing count a lap.
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));

export function createLapTracker(samples, roadWidth, startIndex = samples.length - 9) {
  if (!Array.isArray(samples) || samples.length < 8) {
    throw new Error('A closed circuit with at least 8 samples is required');
  }
  let lapLength=0,maxStartDistance=0;
  const start=samples[0];
  for(let i=0;i<samples.length;i++){
    const p=samples[i],next=samples[(i+1)%samples.length];
    lapLength+=Math.hypot(next.x-p.x,next.z-p.z);
    maxStartDistance=Math.max(maxStartDistance,Math.hypot(p.x-start.x,p.z-start.z));
  }
  // A radius-dependent guard prevents repeated near-start weaving, while the
  // travel threshold is deliberately much shorter than the full course.
  const startGuardRadius=Math.max(62,roadWidth*2.5);
  const farRadius=clamp(maxStartDistance*.34,130,185);
  const minimumTravel=Math.max(250,lapLength*.16);
  return {
    samples,roadWidth,start,lapLength,startIndex,
    startGuardRadius,farRadius,minimumTravel,
    traveled:0,maxDeparture:0,leftStart:false,farExcursion:false,
    ready:false,progress:0
  };
}

export function updateLapTracker(tracker,oldX,oldZ,newX,newZ,nearest,lapTime) {
  const traveled=Math.hypot(newX-oldX,newZ-oldZ);
  tracker.traveled+=traveled;
  const start=tracker.start;
  const departure=Math.hypot(newX-start.x,newZ-start.z);
  tracker.maxDeparture=Math.max(tracker.maxDeparture,departure);
  if(tracker.maxDeparture>=tracker.startGuardRadius)tracker.leftStart=true;
  if(tracker.maxDeparture>=tracker.farRadius)tracker.farExcursion=true;

  // No waypoint projection, route-completion %, near-road condition, or
  // signed course progression gates are used for lap certification.
  tracker.ready=tracker.leftStart&&tracker.farExcursion&&
    tracker.traveled>=tracker.minimumTravel&&lapTime>=8;
  tracker.progress=clamp(Math.min(
    tracker.maxDeparture/tracker.farRadius,
    tracker.traveled/tracker.minimumTravel
  ),0,1);

  // Signed start-line segment crossing: opposite-direction drives do not count.
  const oldAlong=(oldX-start.x)*start.tx+(oldZ-start.z)*start.tz;
  const newAlong=(newX-start.x)*start.tx+(newZ-start.z)*start.tz;
  const lateral=Math.abs((newX-start.x)*(-start.tz)+(newZ-start.z)*start.tx);
  const crossingForward=oldAlong<0&&newAlong>=0&&lateral<tracker.roadWidth*.5+7;
  const valid=crossingForward&&tracker.ready;

  if(valid){
    tracker.traveled=0;tracker.maxDeparture=0;
    tracker.leftStart=false;tracker.farExcursion=false;
    tracker.ready=false;tracker.progress=0;
  }
  return {
    completed:valid,crossedStart:crossingForward,
    ready:tracker.ready,progress:tracker.progress,
    departure,travel:tracker.traveled
  };
}
