import { createPacenotes, nextPacenotes } from './pacenotes.js?v=1.5.0';

// Visual-only rally roadbook. All notes are derived from the existing racing
// line and are advisory: a shortcut does not suppress the display or laps.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const prettyDistance=metres=>{
  if(metres<=12)return 'NOW';
  if(metres>=1000)return (metres/1000).toFixed(1)+' KM';
  return Math.max(5,Math.round(metres/5)*5)+' M';
};

export class PaceGuide {
  constructor(){
    this.book={length:0,notes:[]};
    this.roadWidth=26;
    this.lastNoteId=null;
    this.lastOffCourse=null;
    this.lastDistance='';
    this.panel=document.getElementById('pace-panel');
    this.arrow=document.getElementById('pace-arrow');
    this.direction=document.getElementById('pace-direction');
    this.grade=document.getElementById('pace-grade');
    this.distance=document.getElementById('pace-distance');
    this.caption=document.getElementById('pace-caption');
    this.status=document.getElementById('pace-status');
    this.next=document.getElementById('pace-next');
    this.timing=document.getElementById('pace-timing');
    this.accessible=document.getElementById('pace-announcement');
  }

  setCourse(samples,roadWidth){
    this.book=createPacenotes(samples);
    this.roadWidth=roadWidth;
    this.resetLap();
  }

  resetLap(){
    this.lastNoteId=null;
    this.lastOffCourse=null;
    this.lastDistance='';
    this.panel.classList.remove('is-tight','is-shortcut','is-ready','is-left','is-right','pace-pop');
    this.panel.classList.add('hidden');
    this.status.textContent='COURSE LOADED';
    this.direction.textContent='NEXT';
    this.grade.textContent='—';
    this.distance.textContent='READY';
    this.caption.textContent='赛道路书已生成';
    this.next.textContent='等待开始比赛';
    this.timing.style.width='0%';
    this.accessible.textContent='';
  }

  start(){
    // Explicitly show from the first race frame, even before the next HUD tick.
    this.panel.classList.remove('hidden');
    this.panel.classList.add('is-ready');
    this.status.textContent='LIVE ROUTEBOOK';
    this.next.textContent='全程显示 · 不需要语音';
  }

  stop(){
    this.panel.classList.add('hidden');
    this.lastOffCourse=null;
    this.lastNoteId=null;
  }

  update({nearest,speedKmh=0,active=true}={}){
    if(!active){this.stop();return;}
    this.panel.classList.remove('hidden'); // Always on while driving.
    if(!nearest||!this.book.notes.length){
      this.panel.classList.add('is-ready');
      this.direction.textContent='COURSE';
      this.grade.textContent='—';
      this.distance.textContent='NO DATA';
      this.caption.textContent='暂时没有可用的弯道路书';
      this.status.textContent='STANDBY';
      return;
    }
    const candidates=nextPacenotes(this.book,nearest.index);
    const current=candidates[0]; // Never hide on long straights.
    if(!current)return;
    const offCourse=nearest.d>this.roadWidth*.5+26;
    const newNote=this.lastNoteId!==current.id;
    const modeChanged=this.lastOffCourse!==offCourse;
    if(newNote||modeChanged){
      this.panel.classList.remove('is-ready','is-shortcut','is-left','is-right','is-tight','pace-pop');
      this.panel.classList.add(offCourse?'is-shortcut':current.direction==='left'?'is-left':'is-right');
      if(current.grade<=2&&!offCourse)this.panel.classList.add('is-tight');
      this.arrow.classList.toggle('is-right',current.direction==='right');
      this.direction.textContent=current.direction==='left'?'LEFT / 左':'RIGHT / 右';
      this.grade.textContent=String(current.grade);
      this.status.textContent=offCourse?'OFF COURSE':current.hairpin?'HAIRPIN':current.grade<=3?'SLOW CORNER':'NEXT TURN';
      this.caption.textContent=offCourse?
        '自由抄近路中 · 显示原赛道参考路书':
        current.hairpin?'前方发卡弯 · 建议减速':'前方'+(current.direction==='left'?'左':'右')+current.grade+'级弯';
      const next=candidates.find(n=>n.id!==current.id&&n.ahead>current.ahead+8);
      this.next.textContent=next?
        '随后 '+(next.direction==='left'?'左':'右')+next.grade+' · '+prettyDistance(next.ahead):
        '继续沿赛道行驶';
      if(newNote){
        // Motion only on transitions, never every frame (reduces flashing).
        void this.panel.offsetWidth;
        this.panel.classList.add('pace-pop');
        this.accessible.textContent='前方'+(current.direction==='left'?'左':'右')+current.grade+'级弯';
      }
      this.lastNoteId=current.id;
      this.lastOffCourse=offCourse;
      this.lastDistance='';
    }
    const displayed=prettyDistance(current.ahead);
    if(displayed!==this.lastDistance){
      this.distance.textContent=displayed;
      this.timing.style.width=clamp((280-current.ahead)/280*100,0,100)+'%';
      this.lastDistance=displayed;
    }
    // Optional speed-aware urgency is visual only and does not alter handling.
    const warningDistance=clamp(25+(speedKmh/3.6)*1.5,45,115);
    this.panel.classList.toggle('is-imminent',!offCourse&&current.ahead<warningDistance&&current.grade<=3);
  }
}
