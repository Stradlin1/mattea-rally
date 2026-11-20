import { createPacenotes, nextPacenotes } from './pacenotes.js';

const STORAGE_KEY='mattea-rally-codriver-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function storedVoice(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}').voice!==false;}
  catch{return true;}
}

export class PaceGuide {
  constructor(){
    this.book={length:0,notes:[]};
    this.roadWidth=26;
    this.announced=new Set();
    this.voiceEnabled=storedVoice();
    this.lastMode='';
    this.lastNoteId=null;
    this.lastDistance=-1;
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

  get voiceSupported(){
    return typeof window!=='undefined'&&
      'speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance==='function';
  }

  setVoiceEnabled(value){
    this.voiceEnabled=!!value;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({voice:this.voiceEnabled}));}catch{}
    if(!this.voiceEnabled)this.cancelSpeech();
    return this.voiceEnabled;
  }

  stop(){
    this.cancelSpeech();
    this.panel.classList.add('hidden');
    this.lastMode='';
    this.lastNoteId=null;
    this.lastDistance=-1;
  }

  cancelSpeech(){
    if(this.voiceSupported){
      try{window.speechSynthesis.cancel();}catch{}
    }
  }

  setCourse(samples,roadWidth){
    this.book=createPacenotes(samples);
    this.roadWidth=roadWidth;
    this.resetLap();
  }

  resetLap(){
    this.announced.clear();
    this.cancelSpeech();
    this.lastNoteId=null;
    this.lastMode='';
    this.lastDistance=-1;
    this.accessible.textContent='';
    this.panel.classList.add('hidden');
  }

  announce(note,meters){
    const rounded=Math.max(20,Math.round(meters/10)*10);
    const alert=note.hairpin?'，发卡弯，减速':'';
    const message=`前方${rounded}米，${note.direction==='left'?'左':'右'}${note.grade}${alert}`;
    this.accessible.textContent=message;
    if(!this.voiceEnabled||!this.voiceSupported)return;
    try{
      const synth=window.speechSynthesis;
      // Replace older calls when consecutive corners come close together.
      synth.cancel();
      const speech=new window.SpeechSynthesisUtterance(message);
      speech.lang='zh-CN';speech.rate=1.2;speech.pitch=1.02;speech.volume=.82;
      const zhVoices=synth.getVoices().filter(v=>/^zh/i.test(v.lang));
      const nativeVoice=zhVoices.find(v=>/CN/i.test(v.lang))||zhVoices[0];
      if(nativeVoice)speech.voice=nativeVoice;
      synth.speak(speech);
    }catch(err){
      console.warn('Co-driver speech not available; keeping animated notes.',err);
    }
  }

  showFreeRoute(){
    if(this.lastMode!=='shortcut'){
      this.panel.classList.remove('hidden');
      this.panel.classList.remove('is-ready','is-tight','is-left','is-right','pace-pop');
      void this.panel.offsetWidth;
      this.panel.classList.add('is-shortcut','pace-pop');
      this.arrow.classList.remove('is-right');
      this.direction.textContent='FREE ROUTE';
      this.grade.textContent='↗';
      this.caption.textContent='正在抄近路 · 返回赛道后恢复路书';
      this.status.textContent='SHORTCUT';
      this.next.textContent='任意路线均可计圈';
      this.distance.textContent='NO PACE NOTES';
      this.timing.style.width='100%';
      this.accessible.textContent='正在抄近路，路书暂停';
      this.cancelSpeech();
      this.lastMode='shortcut';this.lastNoteId=null;
    }
  }

  showNoBend(){
    if(this.lastMode==='ready')return;
    this.panel.classList.remove('hidden','is-shortcut','is-tight');
    this.panel.classList.add('is-ready');
    this.arrow.classList.remove('is-right');
    this.direction.textContent='COURSE';
    this.grade.textContent='—';
    this.caption.textContent='路书已就绪，等待下一处弯道';
    this.status.textContent='STANDBY';
    this.next.textContent='驶入赛道后提供转弯提示';
    this.distance.textContent='ON ROUTE';
    this.timing.style.width='0%';
    this.lastMode='ready';this.lastNoteId=null;
  }

  update({nearest,speedKmh=0,active=true}={}){
    if(!active||!nearest||!this.book.notes.length){this.stop();return;}
    if(nearest.d>this.roadWidth*.5+26){
      this.showFreeRoute();return;
    }
    const upcoming=nextPacenotes(this.book,nearest.index);
    const visible=upcoming.find(n=>n.ahead<225);
    if(!visible){this.showNoBend();return;}
    const id=visible.id;
    if(this.lastNoteId!==id||this.lastMode!=='note'){
      this.panel.classList.remove('hidden','is-ready','is-shortcut','is-left','is-right','is-tight','pace-pop');
      this.panel.classList.add(visible.direction==='left'?'is-left':'is-right');
      if(visible.grade<=2)this.panel.classList.add('is-tight');
      this.arrow.classList.toggle('is-right',visible.direction==='right');
      this.direction.textContent=visible.direction==='left'?'LEFT':'RIGHT';
      this.grade.textContent=String(visible.grade);
      this.caption.textContent=(visible.direction==='left'?'左':'右')+
        String(visible.grade)+(visible.hairpin?' · 发卡弯':' · 即将入弯');
      this.status.textContent=visible.hairpin?'HAIRPIN':visible.grade<=3?'SLOW':'PACE NOTE';
      const following=upcoming.find(n=>n.id!==visible.id&&n.ahead>visible.ahead+18&&n.ahead<370);
      this.next.textContent=following?
        'THEN '+(following.direction==='left'?'LEFT ':'RIGHT ')+following.grade:'READ THE ROAD';
      // A fresh animation only on note transitions; do not animate per frame.
      void this.panel.offsetWidth;
      this.panel.classList.add('pace-pop');
      this.lastNoteId=id;this.lastMode='note';this.lastDistance=-1;
    }
    const rounded=Math.max(0,Math.round(visible.ahead/5)*5);
    if(this.lastDistance!==rounded){
      this.distance.textContent=rounded<=8?'NOW':rounded+' M';
      this.timing.style.width=clamp((225-visible.ahead)/225*100,0,100)+'%';
      this.lastDistance=rounded;
    }
    const speedMs=speedKmh/3.6;
    const speakDistance=clamp(33+speedMs*2.0,48,125);
    if(speedKmh>14&&visible.ahead<=speakDistance&&!this.announced.has(id)){
      this.announced.add(id);
      this.announce(visible,visible.ahead);
    }
  }
}
