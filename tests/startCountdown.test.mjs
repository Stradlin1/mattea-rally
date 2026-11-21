import test from 'node:test';
import assert from 'node:assert/strict';
import { START_COUNTDOWN_SECONDS,createStartCountdown,advanceStartCountdown } from '../src/startCountdown.js';

test('a new race starts at three seconds, not at GO',()=>{
  const countdown=createStartCountdown();
  assert.equal(countdown.remaining,START_COUNTDOWN_SECONDS);
  assert.equal(countdown.ready,false);
  assert.deepEqual(advanceStartCountdown(countdown,.4),{cue:null,driveDt:0});
  assert.deepEqual(advanceStartCountdown(countdown,.6),{cue:'2',driveDt:0});
  assert.deepEqual(advanceStartCountdown(countdown,1),{cue:'1',driveDt:0});
  assert.equal(countdown.ready,false);
});

test('movement and race time are locked until GO, including the final fraction',()=>{
  const countdown=createStartCountdown();
  assert.equal(advanceStartCountdown(countdown,2.9).driveDt,0);
  const last=advanceStartCountdown(countdown,.15);
  assert.equal(last.cue,'GO!');
  assert.equal(countdown.ready,true);
  assert.ok(Math.abs(last.driveDt-.05)<1e-9);
  assert.deepEqual(advanceStartCountdown(countdown,.2),{cue:null,driveDt:.2});
});

test('a restart creates a fresh locked grid independent of the previous run',()=>{
  const first=createStartCountdown();
  advanceStartCountdown(first,3);
  assert.equal(first.ready,true);
  const again=createStartCountdown();
  assert.equal(again.ready,false);
  assert.equal(advanceStartCountdown(again,0).driveDt,0);
});

test('a paused countdown does not progress and invalid deltas are ignored',()=>{
  const countdown=createStartCountdown();
  advanceStartCountdown(countdown,1.1);
  assert.equal(advanceStartCountdown(countdown,-20).driveDt,0);
  assert.equal(advanceStartCountdown(countdown,Number.NaN).driveDt,0);
  assert.ok(Math.abs(countdown.remaining-1.9)<1e-9);
});
