// MATTEA RALLY original procedural soundtrack and responsive engine audio.
// Web Audio only; no external copyrighted audio assets, downloads or network calls.
// An AudioContext is created/resumed only after a genuine click/key gesture.
const STORAGE_KEY = 'mattea-rally-audio-v1';
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const midiHz = n => 440 * Math.pow(2,(n-69)/12);

const MELODY = [
  0,null,3,7, 12,7,3,null, 5,7,10,7, 3,null,0,null,
  12,null,10,7, 5,3,5,7, 10,12,15,12, 7,null,5,null,
  7,null,10,12, 15,12,10,7, 5,7,10,5, 3,null,0,null,
  0,3,7,10, 12,null,10,7, 5,3,0,-2, 0,null,7,null
];
const BASS_ROOTS = [45,41,43,40]; // A2, F2, G2, E2; original four-bar loop.

function storedPreferences() {
  try {
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      music:data.music !== false,
      engine:data.engine !== false,
      volume:clamp(Number.isFinite(data.volume) ? data.volume : .62,0,1)
    };
  } catch {
    return {music:true,engine:true,volume:.62};
  }
}

export class RallyAudio {
  constructor(){
    this.prefs=storedPreferences();
    this.ctx=null;
    this.master=null;
    this.musicBus=null;
    this.engineBus=null;
    this.synthEngine=null;
    this.noiseSource=null;
    this.stepIndex=0;
    this.nextStepTime=0;
    this.playMusic=false;
    this.stage='pine';
    this.unavailable=false;
    this._lastGear=0;
  }

  save(){
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(this.prefs));}catch{}
  }
  get musicOn(){return this.prefs.music;}
  get engineOn(){return this.prefs.engine;}
  get volume(){return this.prefs.volume;}

  // Must be called from a click or keydown handler to satisfy autoplay policy.
  unlock(){
    if(this.unavailable)return false;
    try {
      if(!this.ctx){
        const AudioCtor=window.AudioContext||window.webkitAudioContext;
        if(!AudioCtor){this.unavailable=true;return false;}
        this.ctx=new AudioCtor();
        this._buildGraph();
      }
      if(this.ctx.state==='suspended'){
        const p=this.ctx.resume();
        if(p && typeof p.catch==='function')p.catch(()=>{});
      }
      return true;
    }catch(err){
      console.warn('Rally audio unavailable:',err);
      this.unavailable=true;
      return false;
    }
  }

  _buildGraph(){
    const ctx=this.ctx;
    this.master=ctx.createGain();
    this.master.gain.value=this.prefs.volume*.50;
    this.master.connect(ctx.destination);

    this.musicBus=ctx.createGain();
    this.musicBus.gain.value=0;
    this.musicBus.connect(this.master);
    this.engineBus=ctx.createGain();
    this.engineBus.gain.value=0;
    this.engineBus.connect(this.master);

    // One layered engine voice, never recreated on each animation frame.
    const low=ctx.createOscillator();
    low.type='sawtooth';low.frequency.value=55;
    const mid=ctx.createOscillator();
    mid.type='triangle';mid.frequency.value=110;
    const lowLevel=ctx.createGain();lowLevel.gain.value=.48;
    const midLevel=ctx.createGain();midLevel.gain.value=.26;
    const engineFilter=ctx.createBiquadFilter();
    engineFilter.type='lowpass';engineFilter.frequency.value=420;
    engineFilter.Q.value=.35;
    low.connect(lowLevel).connect(engineFilter);
    mid.connect(midLevel).connect(engineFilter);
    const engineBody=ctx.createGain();
    engineBody.gain.value=.38;
    engineFilter.connect(engineBody).connect(this.engineBus);
    low.start();mid.start();
    this.synthEngine={low,mid,engineFilter,engineBody};

    // Short, filtered broadband noise adds exhaust texture, tire slip and nitro hiss.
    const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.72;
    this.noiseBuffer=buffer;
    this.noiseSource=ctx.createBufferSource();
    this.noiseSource.buffer=buffer;this.noiseSource.loop=true;
    const rumbleFilter=ctx.createBiquadFilter();
    rumbleFilter.type='bandpass';rumbleFilter.frequency.value=215;rumbleFilter.Q.value=.55;
    const rumbleGain=ctx.createGain();rumbleGain.gain.value=.06;
    this.noiseSource.connect(rumbleFilter).connect(rumbleGain).connect(this.engineBus);

    const skidFilter=ctx.createBiquadFilter();
    skidFilter.type='highpass';skidFilter.frequency.value=1200;
    this.skidGain=ctx.createGain();this.skidGain.gain.value=0;
    this.noiseSource.connect(skidFilter).connect(this.skidGain).connect(this.engineBus);

    const nitroFilter=ctx.createBiquadFilter();
    nitroFilter.type='bandpass';nitroFilter.frequency.value=1850;nitroFilter.Q.value=.4;
    this.nitroGain=ctx.createGain();this.nitroGain.gain.value=0;
    this.noiseSource.connect(nitroFilter).connect(this.nitroGain).connect(this.engineBus);
    this.noiseSource.start();

    this.nextStepTime=ctx.currentTime+.05;
  }

  setStage(id){
    this.stage=id;
  }
  setMusicEnabled(enabled){
    this.prefs.music=!!enabled;this.save();
    if(this.prefs.music)this.nextStepTime=0;
  }
  setEngineEnabled(enabled){
    this.prefs.engine=!!enabled;this.save();
  }
  setVolume(value){
    this.prefs.volume=clamp(Number(value)||0,0,1);
    this.save();
    if(this.ctx)this.master.gain.setTargetAtTime(this.prefs.volume*.50,this.ctx.currentTime,.035);
  }

  _voice(freq,kind,start,duration,level){
    const ctx=this.ctx;
    const osc=ctx.createOscillator();osc.type=kind;osc.frequency.setValueAtTime(freq,start);
    const env=ctx.createGain();
    env.gain.setValueAtTime(.0001,start);
    env.gain.linearRampToValueAtTime(level,start+.008);
    env.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(env).connect(this.musicBus);
    osc.start(start);osc.stop(start+duration+.015);
  }

  _percussion(start,type){
    const ctx=this.ctx;
    if(type==='kick'){
      const osc=ctx.createOscillator();osc.type='sine';
      osc.frequency.setValueAtTime(132,start);
      osc.frequency.exponentialRampToValueAtTime(43,start+.105);
      const envelope=ctx.createGain();
      envelope.gain.setValueAtTime(.24,start);
      envelope.gain.exponentialRampToValueAtTime(.0001,start+.13);
      osc.connect(envelope).connect(this.musicBus);
      osc.start(start);osc.stop(start+.135);
      return;
    }
    const src=ctx.createBufferSource();src.buffer=this.noiseBuffer;
    const high=ctx.createBiquadFilter();high.type='highpass';
    high.frequency.value=type==='snare'?1900:5400;
    const amp=ctx.createGain();
    const length=type==='snare'?.085:.032;
    amp.gain.setValueAtTime(type==='snare'?.095:.037,start);
    amp.gain.exponentialRampToValueAtTime(.0001,start+length);
    src.connect(high).connect(amp).connect(this.musicBus);
    src.start(start);src.stop(start+length+.01);
  }

  _scheduleStep(start){
    const index=this.stepIndex;
    const bar=Math.floor(index/16);
    const beat=index%16;
    const transposition=this.stage==='snow'?2:this.stage==='desert'?5:0;
    const note=MELODY[index];
    if(note!==null){
      this._voice(midiHz(69+note+transposition),'square',start,.105,.105);
      if(beat===0||beat===8)this._voice(midiHz(57+note+transposition),'triangle',start,.14,.026);
    }
    if(beat%4===0){
      const bass=BASS_ROOTS[bar]+(beat===12?7:0)+transposition;
      this._voice(midiHz(bass),'triangle',start,.28,.17);
      this._percussion(start,'kick');
    }
    if(beat===4||beat===12)this._percussion(start,'snare');
    if(beat%2===0)this._percussion(start+.003,'hat');
    this.stepIndex=(index+1)%MELODY.length;
  }

  _musicTick(shouldPlay){
    const ctx=this.ctx;
    const now=ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(shouldPlay?.72:0,now,.055);
    if(!shouldPlay){this.playMusic=false;return;}
    if(!this.playMusic||this.nextStepTime<now-.25){
      this.playMusic=true;
      this.stepIndex=0;
      this.nextStepTime=now+.045;
    }
    const stepDuration=60/124/4;
    let count=0;
    while(this.nextStepTime<now+.16&&count<5){
      this._scheduleStep(this.nextStepTime);
      this.nextStepTime+=stepDuration;
      count++;
    }
  }

  update({mode='menu',paused=false,speedKmh=0,gas=false,brake=false,drift=false,nitro=false,carId='classic'}={}){
    const ctx=this.ctx;
    if(!ctx||ctx.state!=='running')return;
    const now=ctx.currentTime;
    const racing=mode==='race'&&!paused;
    const musicPlay=this.musicOn&&!paused&&(mode==='menu'||mode==='race'||mode==='finished');
    this._musicTick(musicPlay);
    this.engineBus.gain.setTargetAtTime(racing&&this.engineOn?.44:0,now,.07);
    if(!this.synthEngine)return;

    // Approximate a four-speed gearbox: RPM climbs within each gear and
    // audibly drops on the next shift. Throttle also revs at a standstill.
    const speed=clamp(speedKmh,0,200);
    const thresholds=[0,42,85,135,200];
    let gear=0;
    for(let i=1;i<thresholds.length-1;i++)if(speed>=thresholds[i])gear=i;
    const fraction=clamp((speed-thresholds[gear])/(thresholds[gear+1]-thresholds[gear]),0,1);
    const vehicleTone=carId==='rwd'?1.14:carId==='awd'?.95:carId==='buggy'?.84:1;
    const idleRev=gas?17:0;
    const frequency=(53+fraction*52+gear*5+idleRev+(nitro?14:0))*vehicleTone;
    const cutoff=380+speed*5+(gas?340:0)+(nitro?480:0);
    this.synthEngine.low.frequency.setTargetAtTime(frequency,now,.065);
    this.synthEngine.mid.frequency.setTargetAtTime(frequency*2.02,now,.065);
    this.synthEngine.engineFilter.frequency.setTargetAtTime(cutoff,now,.065);
    this.synthEngine.engineBody.gain.setTargetAtTime((.29+(gas?.16:0)+(nitro?.13:0))*(brake?.85:1),now,.055);
    this.skidGain.gain.setTargetAtTime(racing&&drift?.055:0,now,.045);
    this.nitroGain.gain.setTargetAtTime(racing&&nitro?.073:0,now,.035);
  }
}
