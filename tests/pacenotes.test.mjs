import test from 'node:test';
import assert from 'node:assert/strict';
import { createPacenotes, nextPacenotes } from '../src/pacenotes.js';
import { TRACKS } from '../src/tracks.js';

function resample(track,count=1400){
  const control=track.points,n=control.length;
  const segment=(k,t)=>{
    const p0=control[(k-1+n)%n],p1=control[k],
      p2=control[(k+1)%n],p3=control[(k+2)%n];
    return [0,1].map(axis=>.5*(2*p1[axis]+(-p0[axis]+p2[axis])*t+
      (2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis])*t*t+
      (-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis])*t*t*t));
  };
  return Array.from({length:count},(_,i)=>{
    const f=i*n/count,k=Math.floor(f),t=f-k;
    const [x,z]=segment(k,t);
    const [prevX,prevZ]=segment(k,Math.max(0,t-.001));
    const [nextX,nextZ]=segment(k,Math.min(1,t+.001));
    const norm=Math.hypot(nextX-prevX,nextZ-prevZ)||1;
    return {x,z,tx:(nextX-prevX)/norm,tz:(nextZ-prevZ)/norm};
  });
}

for(const track of TRACKS){
  test(track.name+' generates usable sorted pace notes',()=>{
    const book=createPacenotes(resample(track));
    assert.ok(book.notes.length>=6 && book.notes.length<=80);
    assert.ok(book.length>1000);
    assert.ok(book.notes.every(n=>n.grade>=1&&n.grade<=6));
    assert.ok(book.notes.every(n=>n.direction==='left'||n.direction==='right'));
    assert.ok(book.notes.every((n,i)=>!i||book.notes[i-1].distance<n.distance));
    for(const index of [0,100,400,900,1399]){
      const ahead=nextPacenotes(book,index);
      assert.equal(ahead.length,book.notes.length);
      assert.ok(ahead.every((note,i)=>note.ahead>=0&&
        (!i||ahead[i-1].ahead<=note.ahead)));
    }
  });
}
