import test from 'node:test';
import assert from 'node:assert/strict';
import { createLapTracker, updateLapTracker } from '../src/lap.js';

// World-space circuit, with the start line at x=190 and forward direction +Z.
const N=256,R=190;
const course=Array.from({length:N},(_,i)=>{
  const a=i*Math.PI*2/N;
  return {x:R*Math.cos(a),z:R*Math.sin(a),tx:-Math.sin(a),tz:Math.cos(a)};
});
const sampled=i=>course[(i%N+N)%N];
function driver(){
  return {tracker:createLapTracker(course,26),position:sampled(N-9),
    elapsed:0,completed:0,crossed:0};
}
function step(d,x,z,dt=.18){
  const old=d.position;
  d.elapsed+=dt;
  const result=updateLapTracker(d.tracker,old.x,old.z,x,z,
    // Deliberately off-course projections: road adherence must never be required.
    {index:0,d:999},d.elapsed);
  d.position={x,z};
  if(result.crossedStart)d.crossed++;
  if(result.completed)d.completed++;
  return result;
}
function traverse(d,a,b,dt=.18){
  for(let i=a;i<=b;i++){const p=sampled(i);step(d,p.x,p.z,dt);}
}
function chord(d,destination,segments=90){
  const start={...d.position};
  for(let i=1;i<=segments;i++){
    const t=i/segments;
    step(d,start.x+(destination.x-start.x)*t,start.z+(destination.z-start.z)*t);
  }
}

test('normal complete loop counts exactly one lap',()=>{
  const d=driver();
  traverse(d,N-8,N*2+8);
  assert.equal(d.completed,1);
});
test('significant cut through middle of map counts as a valid lap',()=>{
  const d=driver();
  traverse(d,N-8,N+65);
  chord(d,sampled(218));
  traverse(d,219,N+8);
  assert.equal(d.completed,1);
});
test('81 crossings near the start cannot farm laps',()=>{
  const d=driver();
  for(let i=0;i<20;i++){
    for(const z of [0,-50,0,50,0,-20,0,20,-20,20,-20,20,0])
      step(d,189,z,.32);
  }
  assert.equal(d.completed,0);
  assert.ok(d.crossed>20);
});
test('a full reverse-direction loop does not count',()=>{
  const d=driver();d.position=sampled(9);
  for(let i=8;i>=-N-9;i--){
    const p=sampled(i);
    step(d,p.x,p.z);
  }
  assert.equal(d.completed,0);
});
test('an implausibly fast loop cannot count',()=>{
  const d=driver();
  traverse(d,N-8,N*2+8,.015);
  assert.equal(d.completed,0);
});
test('a counted lap resets excursion and travel guards',()=>{
  const d=driver();
  let resetObserved=false;
  for(let i=N-8;i<=N*2+8;i++){
    const p=sampled(i);
    const result=step(d,p.x,p.z);
    if(result.completed){
      // Inspect the state at the finish crossing, before subsequent motion.
      assert.equal(d.tracker.ready,false);
      assert.equal(d.tracker.traveled,0);
      assert.equal(d.tracker.farExcursion,false);
      resetObserved=true;
    }
  }
  assert.equal(d.completed,1);
  assert.ok(resetObserved);
  for(let i=0;i<30;i++)step(d,190,i%2?12:-12,.25);
  assert.equal(d.completed,1);
});
