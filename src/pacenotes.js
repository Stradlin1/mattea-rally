// Pure course-geometry rally pace notes. No driving physics, checkpoints,
// lap conditions, or off-road restrictions are defined in this module.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
function turnAngle(a,b){
  // In X/Z road coordinates, negative cross = left turn.
  return Math.atan2(a.tx*b.tz-a.tz*b.tx,a.tx*b.tx+a.tz*b.tz);
}
function gradeForAngle(degrees){
  if(degrees>=140)return 1;
  if(degrees>=105)return 2;
  if(degrees>=75)return 3;
  if(degrees>=50)return 4;
  if(degrees>=30)return 5;
  return 6;
}
export function createPacenotes(samples){
  if(!Array.isArray(samples)||samples.length<36)return {length:0,notes:[],cumulative:new Float64Array(0),samplesCount:0};
  const n=samples.length,cumulative=new Float64Array(n);
  let lapLength=0;
  for(let i=1;i<n;i++){
    lapLength+=Math.hypot(samples[i].x-samples[i-1].x,samples[i].z-samples[i-1].z);
    cumulative[i]=lapLength;
  }
  lapLength+=Math.hypot(samples[0].x-samples[n-1].x,samples[0].z-samples[n-1].z);
  const stride=clamp(Math.round(12/(lapLength/n)),6,22);
  const angular=new Float64Array(n);
  for(let i=0;i<n;i++){
    const before=samples[(i-stride+n)%n],after=samples[(i+stride)%n];
    angular[i]=turnAngle(before,after);
  }
  // Low-pass angle spikes from nearby chicanes, retaining turn direction.
  const smoothed=new Float64Array(n);
  for(let i=0;i<n;i++){
    smoothed[i]=(angular[(i-2+n)%n]+2*angular[(i-1+n)%n]+
      3*angular[i]+2*angular[(i+1)%n]+angular[(i+2)%n])/9;
  }
  const candidates=[];
  const peakThreshold=.205; // ~12 deg across the local road segment
  let run=null;
  const finish=()=>{
    if(!run)return;
    const {first,last,peakIndex,peak}=run;
    const start=samples[(first-stride+n)%n],end=samples[(last+stride)%n];
    const totalAngle=Math.abs(turnAngle(start,end))*180/Math.PI;
    const intensity=Math.max(totalAngle,Math.abs(peak)*180/Math.PI*1.4);
    const width=(last-first+1)*lapLength/n;
    if(intensity>=17&&width>=3.5){
      const degree=Math.round(intensity);
      const grade=gradeForAngle(degree);
      const direction=peak<0?'left':'right';
      candidates.push({
        id:'bend-'+peakIndex,index:peakIndex,distance:cumulative[peakIndex],
        direction,grade,angle:degree,hairpin:grade===1,
        label:(direction==='left'?'LEFT':'RIGHT')+' '+grade,
        spoken:(direction==='left'?'左':'右')+(grade===1?'一，发卡弯':String(grade))
      });
    }
    run=null;
  };
  for(let i=0;i<n;i++){
    const a=smoothed[i],sign=Math.sign(a);
    if(Math.abs(a)<peakThreshold){
      if(run&&i-run.last>6)finish();
      continue;
    }
    if(!run){
      run={first:i,last:i,peakIndex:i,peak:a,sign};
    }else if(sign!==run.sign||i-run.last>7){
      finish();
      run={first:i,last:i,peakIndex:i,peak:a,sign};
    }else{
      run.last=i;
      if(Math.abs(a)>Math.abs(run.peak)){run.peak=a;run.peakIndex=i;}
    }
  }
  finish();
  candidates.sort((a,b)=>a.distance-b.distance);
  // Merge double peaks in one continuous corner, never merge an S-bend.
  const notes=[];
  for(const note of candidates){
    const prior=notes[notes.length-1];
    if(prior&&prior.direction===note.direction&&note.distance-prior.distance<31){
      if(note.angle>prior.angle)notes[notes.length-1]=note;
    }else notes.push(note);
  }
  if(notes.length>1){
    const first=notes[0],last=notes[notes.length-1];
    if(first.direction===last.direction&&lapLength-last.distance+first.distance<31){
      if(last.angle>first.angle)notes.shift();
      else notes.pop();
    }
  }
  return {length:lapLength,notes,cumulative,samplesCount:n};
}

export function nextPacenotes(book,index){
  if(!book?.notes?.length||!book.length)return [];
  const current=clamp(index|0,0,Number.MAX_SAFE_INTEGER);
  const distance=book.cumulative?book.cumulative[Math.min(current,book.cumulative.length-1)]:null;
  const at=distance===null?(book.samplesCount?current/book.samplesCount*book.length:0):distance;
  return book.notes.map(n=>({...n,ahead:(n.distance-at+book.length)%book.length}))
    .sort((a,b)=>a.ahead-b.ahead);
}
