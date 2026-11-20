import * as THREE from 'three';
import { TRACKS } from './tracks.js';
import { createCockpit } from './cockpit.js';
import { freshNitro, stepNitro, NITRO } from './nitro.js';
import { CARS } from './cars.js';
import { createLapTracker, updateLapTracker } from './lap.js';
import { populateScenery } from './sceneryV2.js';
import { createRallyVehicle } from './vehicleVisuals.js';
import { createSurfaceTexture, addSkyAtmosphere, addCarContactShadow, createWeatherParticles } from './sceneArt.js';
import { addTracksideDetails } from './trackDetails.js';
import { RallyAudio } from './audio.js';
import { PaceGuide } from './paceGuide.js';

const $ = (id) => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const TAU = Math.PI*2;
const MAX_SPEED_KMH = 200;
const MAX_SPEED_MS = MAX_SPEED_KMH / 3.6;
const RECORD_VERSION = 'mattea-rally-v11-shortcut';
const BUILD_LABEL = 'V1.4 PACENOTES';
const WEATHER = [
  {id:'clear',name:'晴天',grip:1,fog:1},
  {id:'rain',name:'雨天',grip:.77,fog:.82},
  {id:'fog',name:'大雾',grip:.96,fog:.45}
];
const settings={car:'classic',track:'pine',weather:'clear',laps:3};
const KEY=new Set();
const state={mode:'menu',paused:false,elapsed:0,lapStart:0,lap:1,lapTimes:[],courseProgress:0,lapTracker:null,anyNewLapPB:false,car:null,model:null,camMode:0,drift:false,speed:0,slip:0,recordLap:null,recordRace:null,ghostSamples:[],ghostBest:[],lastSample:0,surface:'GRAVEL',weatherTime:0,calloutTime:0,toastTime:0,lastInvalidCrossTime:-99};
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91a8ac);
const camera=new THREE.PerspectiveCamera(68,16/9,.1,900);
scene.add(camera);
const cockpitView=createCockpit(camera);
const hemi=new THREE.HemisphereLight(0xd9ecff,0x536049,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe4bc,2.0);sun.position.set(-100,180,90);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const wheelMeshes=[];
let exhaustFlames=[];
const dust=[];
const decor=[];
let raceTrack=null,roadSamples=[],terrainMesh=null,roadMesh=null,carGroup=null,camTarget=new THREE.Vector3();
let carShadow=null,weatherVisual=null;
const hud=$('hud'),menu=$('menu'),pauseEl=$('pause'),results=$('results');
const tmpVec=new THREE.Vector3();
const mctx=$('minimap').getContext('2d');
const audio=new RallyAudio();
const guide=new PaceGuide();

function syncAudioControls(){
  const music=$('music-toggle'),engine=$('engine-toggle');
  music.textContent=audio.musicOn?'BGM ON [M]':'BGM OFF [M]';
  engine.textContent=audio.engineOn?'ENGINE ON [N]':'ENGINE OFF [N]';
  music.setAttribute('aria-pressed',String(audio.musicOn));
  engine.setAttribute('aria-pressed',String(audio.engineOn));
  $('audio-volume').value=String(Math.round(audio.volume*100));
  $('audio-volume-value').textContent=Math.round(audio.volume*100)+'%';
  $('audio-status').textContent=audio.unavailable?'UNAVAILABLE':audio.ctx?.state==='running'?'AUDIO READY':'START TO ENABLE';
  const voice=$('pace-voice-toggle');
  voice.textContent=!guide.voiceSupported?'CO-DRIVER N/A':guide.voiceEnabled?'VOICE ON [V]':'VOICE OFF [V]';
  voice.setAttribute('aria-pressed',String(guide.voiceEnabled&&guide.voiceSupported));
  voice.disabled=!guide.voiceSupported;
}
$('music-toggle').addEventListener('click',()=>{
  audio.unlock();audio.setMusicEnabled(!audio.musicOn);syncAudioControls();
});
$('engine-toggle').addEventListener('click',()=>{
  audio.unlock();audio.setEngineEnabled(!audio.engineOn);syncAudioControls();
});
$('audio-volume').addEventListener('input',event=>{
  audio.unlock();audio.setVolume(Number(event.target.value)/100);syncAudioControls();
});
$('pace-voice-toggle').addEventListener('click',()=>{
  guide.setVoiceEnabled(!guide.voiceEnabled);
  syncAudioControls();
});
syncAudioControls();
// F3 diagnostic overlay. It lets players distinguish old cached builds,
// off-road restrictions, braking and lateral-speed loss while testing.
const telemetryBox=document.createElement('div');
telemetryBox.id='driving-telemetry';
telemetryBox.hidden=true;
telemetryBox.style.cssText='position:fixed;z-index:9;top:9px;left:50%;transform:translateX(-50%);padding:10px 14px;min-width:230px;white-space:pre;pointer-events:none;border:1px solid #80d9c2;background:#0a1824df;color:#e6f6ed;font:12px/1.65 Consolas,monospace;text-shadow:1px 1px #000;';
document.body.appendChild(telemetryBox);
const menuFooter=document.querySelector('.menu-footer');
if(menuFooter)menuFooter.textContent+='  ·  BUILD '+BUILD_LABEL;
const controlsFooter=document.querySelector('.hud-controls');
if(controlsFooter)controlsFooter.textContent+='  ·  F3 TELEMETRY  ·  '+BUILD_LABEL;
let driveTelemetry={surface:'GRAVEL',throttleTarget:200,requested:false,engine:0,steerLoss:0,kmh:0};
function updateTelemetry(){
  if(telemetryBox.hidden)return;
  const d=driveTelemetry;
  telemetryBox.textContent='MATTEA RALLY '+BUILD_LABEL+'\n'+
    'SPEED    '+d.kmh.toFixed(0)+' km/h\n'+
    'SURFACE  '+d.surface+'\n'+
    'W / GAS  '+(d.requested?'ON':'OFF')+'\n'+
    'ENGINE   '+d.engine.toFixed(1)+' m/s²\n'+
    'TARGET   '+d.throttleTarget.toFixed(0)+' km/h\n'+
    'TURN LOSS '+d.steerLoss.toFixed(2)+' m/s\n'+
    'SPACE + A/D: HANDBRAKE';
}


function recordKey(type,withLaps=false){
  const parts=[RECORD_VERSION,type,settings.track,settings.car,settings.weather];
  if(withLaps) parts.push(settings.laps);
  return parts.join(':');
}
function getRecord(type,withLaps){
  try {const val=JSON.parse(localStorage.getItem(recordKey(type,withLaps)));return val&&Number.isFinite(val.time)?val:null;}catch{return null;}
}
function setRecord(type,withLaps,val){try{localStorage.setItem(recordKey(type,withLaps),JSON.stringify(val));}catch{}}
function formatTime(t){
  if(!Number.isFinite(t))return '--:--.---';
  const ms=Math.floor(Math.max(0,t)*1000);
  return String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
}
function currentCar(){return CARS.find(c=>c.id===settings.car)||CARS[0];}
function currentTrack(){return TRACKS.find(t=>t.id===settings.track)||TRACKS[0];}
function currentWeather(){return WEATHER.find(w=>w.id===settings.weather)||WEATHER[0];}
function makeButton(item,active,callback){
  const b=document.createElement('button');b.type='button';b.className='option'+(active?' active':'');
  b.innerHTML='<strong></strong><small></small>';
  b.querySelector('strong').textContent=item.name;
  b.querySelector('small').textContent=item.detail||'';
  b.addEventListener('click',callback);return b;
}
function renderMenu(){
  const mount=(id,items,key)=>{const el=$(id);el.replaceChildren(...items.map(item=>makeButton(item,settings[key]===item.id,()=>{settings[key]=item.id;renderMenu();createWorld();})));};
  mount('car-options',CARS,'car');mount('track-options',TRACKS,'track');
  const wx=$('weather-options');wx.replaceChildren(...WEATHER.map(item=>makeButton(item,settings.weather===item.id,()=>{settings.weather=item.id;renderMenu();createWorld();})));
  $('laps-input').value=settings.laps;
  document.querySelectorAll('.lap-preset').forEach(b=>b.classList.toggle('active',Number(b.dataset.laps)===settings.laps));
  const bestLap=getRecord('best-lap',false),bestRace=getRecord('best-race',true);
  $('menu-records').innerHTML='<div class="record-row"><span>BEST LAP</span><strong>'+formatTime(bestLap?.time)+'</strong></div><div class="record-row"><span>BEST '+settings.laps+' LAPS</span><strong>'+formatTime(bestRace?.time)+'</strong></div>';
}
document.querySelectorAll('.lap-preset').forEach(b=>b.addEventListener('click',()=>{settings.laps=Number(b.dataset.laps);renderMenu();}));
$('laps-input').addEventListener('input',(event)=>{const n=Number(event.target.value);if(Number.isInteger(n)&&n>=1&&n<=99){settings.laps=n;renderMenu();}});
function clearWorld(){
  while(world.children.length){const item=world.children[0];world.remove(item);item.traverse(obj=>{obj.geometry?.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>{m.map?.dispose();m.dispose();});}});}
  dust.length=0;decor.length=0;wheelMeshes.length=0;exhaustFlames=[];carGroup=null;carShadow=null;weatherVisual=null;
}
function hash(x,z,s){const f=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return f-Math.floor(f);}
function hills(x,z,seed){return Math.sin(x*.011+seed)*Math.cos(z*.013-seed)*4.8+Math.sin(x*.032+z*.016+seed)*1.65+Math.cos(z*.041-x*.027)*.8;}
function terrainY(x,z){return hills(x,z,currentTrack().seed);}
function buildCurve(){
  const tr=currentTrack();const curve=new THREE.CatmullRomCurve3(tr.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal',.5);
  const count=1400;roadSamples=[];
  for(let i=0;i<count;i++){
    const t=i/count,p=curve.getPointAt(t),v=curve.getTangentAt(t).normalize();
    roadSamples.push({x:p.x,z:p.z,y:terrainY(p.x,p.z),tx:v.x,tz:v.z,s:i/count});
  }
  state.lapTracker=createLapTracker(roadSamples,tr.width);
  guide.setCourse(roadSamples,tr.width);
}
function nearestRoad(x,z){
  let nearest=0,best=Infinity;
  for(let i=0;i<roadSamples.length;i+=3){const p=roadSamples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;nearest=i;}}
  for(let j=-5;j<=5;j++){const i=(nearest+j+roadSamples.length)%roadSamples.length,p=roadSamples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;nearest=i;}}
  return {index:nearest,d:Math.sqrt(best),p:roadSamples[nearest]};
}
function createRoad(){
  const verts=[],cols=[],uvs=[],index=[],half=currentTrack().width*.5,n=roadSamples.length;
  const base=new THREE.Color(currentTrack().road);
  for(let i=0;i<=n;i++){
    const p=roadSamples[i%n],nx=-p.tz,nz=p.tx;
    for(const side of [-1,1]){
      const x=p.x+nx*side*half,z=p.z+nz*side*half;
      verts.push(x,terrainY(x,z)+.12,z);
      const k=.95+.06*Math.sin(i*.8+side);
      cols.push(base.r*k,base.g*k,base.b*k);
      uvs.push((side+1)*.5,i/14);
    }
    if(i<n){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(index);geo.computeVertexNormals();
  const roadMaterial=new THREE.MeshLambertMaterial({
    vertexColors:true,map:createSurfaceTexture(currentTrack().id,'road'),
    side:THREE.DoubleSide
  });
  roadMesh=new THREE.Mesh(geo,roadMaterial);world.add(roadMesh);
  // Surface dressing is purely visual. Actual road width / grip are unchanged.
  if(currentTrack().id==='snow'){
    const strips=new THREE.Group();
    const stripeMat=new THREE.MeshBasicMaterial({color:0xe6e9e6});
    for(let i=0;i<n;i+=22){
      const a=roadSamples[i],b=roadSamples[(i+9)%n];
      const mid=new THREE.Vector3((a.x+b.x)*.5,Math.max(a.y,b.y)+.20,(a.z+b.z)*.5);
      const segment=new THREE.Mesh(
        new THREE.BoxGeometry(.28,.045,Math.hypot(b.x-a.x,b.z-a.z)),stripeMat);
      segment.position.copy(mid);
      segment.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);strips.add(segment);
    }
    world.add(strips);
  }else{
    // Two understated gravel tire paths replace implausible painted lane dashes.
    const rutVerts=[],rutIdx=[];
    for(const side of [-1,1]){
      const begin=rutVerts.length/3;
      for(let i=0;i<=n;i++){
        const p=roadSamples[i%n],nx=-p.tz,nz=p.tx;
        for(const offset of [-.40,.40]){
          const d=side*1.63+offset;
          const x=p.x+nx*d,z=p.z+nz*d;
          rutVerts.push(x,terrainY(x,z)+.195,z);
        }
        if(i<n){
          const a=begin+i*2;
          rutIdx.push(a,a+1,a+2,a+1,a+3,a+2);
        }
      }
    }
    const rutGeo=new THREE.BufferGeometry();
    rutGeo.setAttribute('position',new THREE.Float32BufferAttribute(rutVerts,3));
    rutGeo.setIndex(rutIdx);
    const rutMat=new THREE.MeshBasicMaterial({
      color:currentTrack().id==='desert'?0x72523f:0x5b5045,
      transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide
    });
    world.add(new THREE.Mesh(rutGeo,rutMat));
  }
  // Thin gravel shoulders and colored edge strips add readable road boundaries
  // without physical walls. Dirt, snow and red-rock stages use different hues.
  const shoulderTone=currentTrack().id==='snow'?0xdbe8ed:currentTrack().id==='desert'?0x80523e:0x6e5746;
  const trimTone=currentTrack().id==='snow'?0xeaf3f7:currentTrack().id==='desert'?0xe3b078:0xc5b99b;
  const shoulderGeo=new THREE.BufferGeometry(),shoulderVerts=[],shoulderIndices=[];
  const edgeGeo=new THREE.BufferGeometry(),edgeVerts=[],edgeIndices=[];
  for(let i=0;i<=n;i++){
    const p=roadSamples[i%n],nx=-p.tz,nz=p.tx;
    for(const side of [-1,1]){
      for(const width of [half-.35,half+2.3]){
        const x=p.x+nx*width*side,z=p.z+nz*width*side;
        shoulderVerts.push(x,terrainY(x,z)+.075,z);
      }
      for(const width of [half-.60,half-.32]){
        const x=p.x+nx*width*side,z=p.z+nz*width*side;
        edgeVerts.push(x,terrainY(x,z)+.18,z);
      }
    }
    if(i<n)for(let j=0;j<2;j++){
      const o=i*4+j*2;
      shoulderIndices.push(o,o+1,o+4,o+1,o+5,o+4);
      edgeIndices.push(o,o+1,o+4,o+1,o+5,o+4);
    }
  }
  shoulderGeo.setAttribute('position',new THREE.Float32BufferAttribute(shoulderVerts,3));
  shoulderGeo.setIndex(shoulderIndices);shoulderGeo.computeVertexNormals();
  const shoulders=new THREE.Mesh(shoulderGeo,new THREE.MeshLambertMaterial({color:shoulderTone,side:THREE.DoubleSide}));
  world.add(shoulders);
  edgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(edgeVerts,3));
  edgeGeo.setIndex(edgeIndices);edgeGeo.computeVertexNormals();
  world.add(new THREE.Mesh(edgeGeo,new THREE.MeshBasicMaterial({color:trimTone,side:THREE.DoubleSide})));
  // A single, visible checkered start/finish line; no intermediate markers.
  const start=roadSamples[0],fn=new THREE.Vector3(-start.tz,0,start.tx);
  for(let j=-5;j<=5;j++){
    const x=start.x+fn.x*j*currentTrack().width/11;
    const z=start.z+fn.z*j*currentTrack().width/11;
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(currentTrack().width/11,.06,2),
      new THREE.MeshBasicMaterial({color:j%2===0?0x16191e:0xf0e8d9}));
    stripe.position.set(x,terrainY(x,z)+.34,z);
    stripe.rotation.y=Math.atan2(start.tx,start.tz);
    world.add(stripe);
  }
}
function addTree(x,z,scale,seed){
  const y=terrainY(x,z),snow=settings.track==='snow';
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.45*scale,.65*scale,4*scale,5),new THREE.MeshLambertMaterial({color:0x493729}));
  trunk.position.set(x,y+2*scale,z);world.add(trunk);
  const leaf=new THREE.Mesh(new THREE.ConeGeometry(3.15*scale,11*scale,6),new THREE.MeshLambertMaterial({color:snow?0x829f9c:(seed>.5?0x244b40:0x336247),flatShading:true}));
  leaf.position.set(x,y+8.1*scale,z);world.add(leaf);
  if(snow){const cap=new THREE.Mesh(new THREE.ConeGeometry(2.8*scale,4*scale,6),new THREE.MeshLambertMaterial({color:0xd9e3e8}));cap.position.set(x,y+11.4*scale,z);world.add(cap);}
  decor.push({x,z,r:1.25*scale});
}
function addRock(x,z,scale,seed){
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(scale,0),new THREE.MeshLambertMaterial({color:settings.track==='desert'?(seed>.5?0x8b5541:0x925b45):0x6f7974,flatShading:true}));
  rock.position.set(x,terrainY(x,z)+scale*.54,z);rock.rotation.set(seed,.2,seed*4);world.add(rock);decor.push({x,z,r:scale*.8});
}
function buildTerrain(){
  const tr=currentTrack(),size=1050,seg=120;
  const positions=[],colors=[],uvs=[],ids=[],base=new THREE.Color(tr.field);
  for(let zi=0;zi<=seg;zi++){for(let xi=0;xi<=seg;xi++){
    const x=(xi/seg-.5)*size,z=(zi/seg-.5)*size,y=terrainY(x,z);
    positions.push(x,y-.16,z);uvs.push(x/34,z/34);const n=hash(x*.17,z*.17,tr.seed);
    const c=base.clone().multiplyScalar(.82+n*.32);
    colors.push(c.r,c.g,c.b);
    if(xi<seg&&zi<seg){const a=zi*(seg+1)+xi,b=a+seg+1;ids.push(a,b,a+1,a+1,b,b+1);}
  }}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(ids);geo.computeVertexNormals();
  terrainMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({
    vertexColors:true,map:createSurfaceTexture(tr.id,'ground'),side:THREE.DoubleSide
  }));world.add(terrainMesh);
  // Thematically distinct scenery is instanced in scenery.js.
  populateScenery(world,{track:tr,roadSamples,terrainY,nearestRoad,hash});
}
function buildCar(){
  // Graphics-only refactor. The same carGroup, wheelMeshes, exhaustFlames
  // interfaces feed the unchanged vehicle dynamics and nitro effects.
  const config=currentCar();
  carGroup=new THREE.Group();world.add(carGroup);
  const visual=createRallyVehicle(carGroup,config);
  wheelMeshes.push(...visual.wheels);
  exhaustFlames=visual.exhaustFlames;
}
function createWorld(){
  const tr=currentTrack(),weather=currentWeather();
  clearWorld();buildCurve();
  addSkyAtmosphere(world,tr.id,weather.id);
  buildTerrain();createRoad();
  addTracksideDetails(world,{track:tr,roadSamples,terrainY,weather:weather.id});
  buildCar();
  carShadow=addCarContactShadow(world);
  weatherVisual=createWeatherParticles(world,tr.id,weather.id);
  scene.background=new THREE.Color(tr.sky);
  audio.setStage(tr.id);
  scene.fog=new THREE.FogExp2(tr.sky,weather.id==='fog'?.017:weather.id==='rain'?.0075:.0040);
  // Stage-colored lighting. Only rendering parameters change, not surface grip.
  const desert=tr.id==='desert',snow=tr.id==='snow',rain=weather.id==='rain';
  hemi.color.setHex(desert?0xffe3c0:snow?0xe3efff:0xd3edf4);
  hemi.groundColor.setHex(desert?0x94735b:snow?0xa7bbc2:0x4d6651);
  hemi.intensity=rain?1.48:1.78;
  sun.color.setHex(desert?0xffcb96:snow?0xfff2de:0xffe4be);
  sun.position.set(desert?-165:-115,desert?155:195,desert?120:105);
  sun.intensity=rain?.78:2.06;
  state.car={x:0,z:0,yaw:0,vx:0,vz:0,y:0,roll:0,pitch:0,turn:0};
  state.nitro=freshNitro();
  cockpitView.update(0,0,currentCar().color);
  resetCar(true);updateCamera(1);weatherVisual.update(state.car,0);renderMinimap();renderer.render(scene,camera);
}
function resetCar(full=false){
  const p=roadSamples[roadSamples.length-9],c=state.car;
  c.x=p.x;c.z=p.z;c.y=terrainY(c.x,c.z);c.yaw=Math.atan2(-p.tx,-p.tz);c.vx=0;c.vz=0;c.roll=0;c.pitch=0;c.turn=0;c.handbrakeGrip=0;
  // In this coordinate convention the car forward is local -Z.
  c.yaw=Math.atan2(-p.tx,-p.tz);
  state.drift=false;state.slip=0;state.speed=0;state.surface='GRAVEL';
  state.nitro=freshNitro();exhaustFlames.forEach(flame=>flame.group.visible=false);
  if(full){state.elapsed=0;state.lapStart=0;state.lap=1;state.courseProgress=0;state.lapTracker=createLapTracker(roadSamples,currentTrack().width);state.lapTimes=[];state.ghostSamples=[];state.lastSample=0;state.anyNewLapPB=false;state.lastInvalidCrossTime=-99;guide.resetLap();}
  syncCarModel();
}
function syncCarModel(){
  const c=state.car;if(!c||!carGroup)return;
  carGroup.position.set(c.x,terrainY(c.x,c.z)+.32,c.z);
  carGroup.rotation.set(c.pitch,c.yaw,c.roll,'YXZ');
  wheelMeshes.forEach(({mesh,front})=>{if(front)mesh.rotation.y=c.turn*.36;});
  if(carShadow){
    const roadSurface=state.surface==='GRAVEL'||state.surface==='DESERT GRAVEL'||state.surface.endsWith('ROAD');
    carShadow.position.set(c.x,terrainY(c.x,c.z)+(roadSurface?.185:-.055),c.z);
    carShadow.rotation.y=c.yaw;
  }
}
function startRace(){
  if(!Number.isInteger(settings.laps)||settings.laps<1||settings.laps>99)return;
  audio.unlock();
  createWorld();resetCar(true);
  state.recordLap=getRecord('best-lap',false);
  state.recordRace=getRecord('best-race',true);
  state.ghostBest=state.recordLap?.ghost||[];
  state.mode='race';state.paused=false;menu.classList.add('hidden');results.classList.add('hidden');pauseEl.classList.add('hidden');hud.classList.remove('hidden');
  showCallout('GO!',1.4);KEY.clear();lastFrame=performance.now();updateHud();syncAudioControls();
}
function showCallout(value,seconds=1){const el=$('center-callout');el.textContent=value;el.classList.remove('hidden');state.calloutTime=seconds;}
function toast(value,seconds=2){$('toast').textContent=value;$('toast').classList.remove('hidden');state.toastTime=seconds;}
function showMenu(){
  state.mode='menu';state.paused=false;KEY.clear();guide.stop();syncAudioControls();hud.classList.add('hidden');pauseEl.classList.add('hidden');results.classList.add('hidden');menu.classList.remove('hidden');renderMenu();createWorld();
}
function setPaused(value){
  if(state.mode!=='race')return;
  state.paused=value;if(value)guide.stop();pauseEl.classList.toggle('hidden',!value);KEY.clear();lastFrame=performance.now();
}
function completeLap(){
  const lapTime=state.elapsed-state.lapStart;
  if(lapTime<7)return;
  state.lapTimes.push(lapTime);
  const lapRecord=getRecord('best-lap',false);
  let newLapPB=false;
  if(!lapRecord||lapTime<lapRecord.time){
    newLapPB=true;state.anyNewLapPB=true;setRecord('best-lap',false,{time:lapTime,ghost:state.ghostSamples.slice(),date:new Date().toISOString()});
    state.recordLap=getRecord('best-lap',false);state.ghostBest=state.recordLap.ghost;
  }
  if(state.lap>=settings.laps){finishRace(state.anyNewLapPB);return;}
  state.lap++;state.lapStart=state.elapsed;state.courseProgress=0;
  guide.resetLap();
  state.ghostSamples=[];state.lastSample=0;
  showCallout(newLapPB?'NEW LAP PB!':'LAP '+(state.lap-1)+' COMPLETE',1.5);
}
function finishRace(newLapPB){
  state.mode='finished';KEY.clear();guide.stop();
  const finishTime=state.elapsed,prior=getRecord('best-race',true);
  const racePB=!prior||finishTime<prior.time;
  if(racePB){setRecord('best-race',true,{time:finishTime,laps:state.lapTimes.slice(),date:new Date().toISOString()});state.recordRace=getRecord('best-race',true);}
  hud.classList.add('hidden');results.classList.remove('hidden');
  $('result-total').textContent=formatTime(finishTime);
  $('result-best-lap').textContent=formatTime(Math.min(...state.lapTimes));
  const banner=$('pb-banner');banner.classList.toggle('hidden',!racePB&&!newLapPB);
  banner.textContent=(racePB?'NEW RACE PB':'')+(racePB&&newLapPB?' + ':'')+(newLapPB?'NEW LAP PB':'');
  $('result-laps').replaceChildren(...state.lapTimes.map((t,i)=>{const row=document.createElement('div');if(t===Math.min(...state.lapTimes))row.className='best';row.innerHTML='<span>LAP '+String(i+1).padStart(2,'0')+'</span><strong>'+formatTime(t)+'</strong>';return row;}));
  $('result-note').textContent='COMPLETE '+settings.laps+' LAPS · '+currentTrack().name+' · '+currentCar().name+' · '+currentWeather().name+' · '+(racePB?'整场纪录已更新':'整场历史最快：'+formatTime(prior?.time));
  renderMenu();
}
function collides(nx,nz){
  if(Math.abs(nx)>490||Math.abs(nz)>490)return true;
  for(const obstacle of decor){const dx=nx-obstacle.x,dz=nz-obstacle.z;if(dx*dx+dz*dz<(obstacle.r+1.25)**2)return true;}
  return false;
}
function updatePhysics(dt){
  const c=state.car,config=currentCar(),weather=currentWeather();
  const gas=KEY.has('KeyW'),reverse=KEY.has('KeyS'),brake=KEY.has('Space');
  const shift=KEY.has('ShiftLeft')||KEY.has('ShiftRight');
  const steering=(KEY.has('KeyA')?1:0)-(KEY.has('KeyD')?1:0);
  const near=nearestRoad(c.x,c.z),offroad=near.d>currentTrack().width*.5;
  const terrainGrip=offroad?config.offroadGrip:1;
  const grip=terrainGrip*weather.grip;
  state.surface=offroad?(settings.track==='snow'?'SNOW FIELD':settings.track==='desert'?'SAND':'GRASS'):(settings.track==='snow'?'SNOW ROAD':settings.track==='desert'?'DESERT GRAVEL':'GRAVEL');
  const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),rightX=-fz,rightZ=fx;
  let forward=c.vx*fx+c.vz*fz,lateral=c.vx*rightX+c.vz*rightZ;
  const speed=Math.hypot(c.vx,c.vz);
  const turning=steering!==0&&speed>8;
  // Handbrake only: A/D + Space. Shift never initiates a slide.
  const slide=brake&&turning&&Math.abs(forward)>7;
  // Keep the old weighty lateral-grip dynamics, with a short grip-release/recovery.
  c.handbrakeGrip=lerp(c.handbrakeGrip||0,slide?1:0,clamp(dt*(slide?9:5),0,1));
  // The absolute limit stays at 200 km/h. Off-road has a lower sustainable
  // throttle target, but crossing the road edge cannot instantly erase speed.
  const max=Math.min(MAX_SPEED_MS,config.maxKmh/3.6);
  const throttleTarget=offroad?max*config.offroadTarget:max;
  const usingNitro=stepNitro(state.nitro,dt,{
    wantBoost:shift&&gas&&!reverse&&!brake&&forward>-.5&&forward<throttleTarget-1,
    drift:slide,
    speedKmh:speed*3.6,
    slipDegrees:Math.abs(Math.atan2(lateral,Math.max(2,Math.abs(forward)))*180/Math.PI),
    drainMultiplier:config.nitroDrain,chargeMultiplier:config.nitroCharge
  }).active;
  let engineForce=0;
  if(gas&&forward<throttleTarget){
    // Slower, nonlinear torque: acceleration falls away progressively near 200 km/h.
    const progress=clamp(Math.max(0,forward)/max,0,1);
    const torque=0.08+0.92*Math.pow(Math.max(0,1-progress*progress),1.42);
    const force=config.accel*(usingNitro?config.nitroPower:1)*(offroad?config.offroadPower:1)*torque;
    engineForce=force;
    c.vx+=fx*force*dt;c.vz+=fz*force*dt;
  }
  if(reverse){
    if(forward>1){c.vx-=fx*22*grip*dt;c.vz-=fz*22*grip*dt;}
    else if(forward>-13){c.vx-=fx*9*dt;c.vz-=fz*9*dt;}
  }
  if(brake){
    // Space by itself stops the car. With steering, rear grip breaks away,
    // while lighter longitudinal braking preserves momentum through the turn.
    const deceleration=slide?config.handbrake:config.braking;
    const b=Math.min(Math.abs(forward),deceleration*grip*dt)*Math.sign(forward);
    c.vx-=fx*b;c.vz-=fz*b;
  }
  const speedFactor=clamp(Math.abs(forward)/13,0,1);
  let steerAngle=steering*config.steer*(1.45/(1+speed*.027));
  const currentYawRate=steerAngle*speedFactor*(forward<0?-1:1);
  c.turn=lerp(c.turn,steering,clamp(dt*8,0,1));
  c.yaw+=currentYawRate*dt*(1+.50*c.handbrakeGrip);
  // Lateral damping gives genuine velocity/heading divergence under power-slide.
  const newFx=-Math.sin(c.yaw),newFz=-Math.cos(c.yaw),rx=-newFz,rz=newFx;
  const lat=c.vx*rx+c.vz*rz;
  const effectiveGrip=config.grip*grip*lerp(.98,config.drift,c.handbrakeGrip);
  const damp=1-Math.exp(-effectiveGrip*dt);
  const speedBeforeTireForce=Math.hypot(c.vx,c.vz);
  c.vx-=rx*lat*damp;c.vz-=rz*lat*damp;
  const speedAfterTireForce=Math.hypot(c.vx,c.vz);
  if(speedAfterTireForce>.01&&forward>1){
    // A grippy tire steers velocity as well as cancelling lateral slip.
    // Retain some of that directional energy, instead of treating every
    // normal corner as heavy braking. Handbrake slides still shed speed.
    const energyRetention=lerp(config.turnRetention,.08,c.handbrakeGrip);
    const retainedSpeed=speedAfterTireForce+
      Math.max(0,speedBeforeTireForce-speedAfterTireForce)*energyRetention;
    const factor=retainedSpeed/speedAfterTireForce;
    c.vx*=factor;c.vz*=factor;
  }
  driveTelemetry={surface:state.surface,throttleTarget:throttleTarget*3.6,
    requested:gas,engine:engineForce,steerLoss:Math.max(0,speedBeforeTireForce-
    Math.hypot(c.vx,c.vz)),kmh:state.speed};
  // Reduce passive off-road resistance to exactly 50% of its former value.
  // Brake-specific drag is unchanged, as are road grip and the nitro system.
  const roadDrag=.008+speed*.00008;
  const formerOffroadDrag=roadDrag+.035+speed*.0007;
  const surfaceDrag=offroad?formerOffroadDrag*.5:roadDrag;
  const drag=Math.min(.12,dt*(surfaceDrag+(brake?.012:0)));
  c.vx*=1-drag;c.vz*=1-drag;
  const actualSpeed=Math.hypot(c.vx,c.vz);
  if(actualSpeed>max){const ratio=max/actualSpeed;c.vx*=ratio;c.vz*=ratio;}
  if(Math.hypot(c.vx,c.vz)<.08&&!gas&&!reverse){c.vx=0;c.vz=0;}
  const oldx=c.x,oldz=c.z;
  const nx=c.x+c.vx*dt,nz=c.z+c.vz*dt;
  if(collides(nx,nz)){c.vx*=-.18;c.vz*=-.18;toast('IMPACT!',.5);}
  else {c.x=nx;c.z=nz;}
  state.speed=Math.hypot(c.vx,c.vz)*3.6;
  driveTelemetry.kmh=state.speed;
  state.slip=Math.atan2(Math.abs(lat),Math.max(2,Math.abs(forward)))*180/Math.PI;
  state.drift=(slide||state.slip>13)&&state.speed>26;
  c.roll=lerp(c.roll,-steering*clamp(speed/35,0,1)*.12-state.slip*.001,clamp(dt*5,0,1));
  const yFront=terrainY(c.x+newFx*2,c.z+newFz*2),yBack=terrainY(c.x-newFx*2,c.z-newFz*2);
  c.pitch=lerp(c.pitch,Math.atan2(yFront-yBack,4),clamp(dt*5,0,1));
  c.y=terrainY(c.x,c.z);
  syncCarModel();
  // The wheel is driven by the same smoothed steering demand used by the car.
  cockpitView.update(c.turn*config.steer*(.39/(1+state.speed*.0016)),state.speed,config.color);
  // Only the handbrake slide earns rapid recharge; ordinary driving regenerates slowly.
  // updateNitroVisuals uses the same state so flames cannot continue after depletion.
  if(state.drift&&Math.random()<dt*45)spawnDust(c.x-newFx*2,c.z-newFz*2,c.y,offroad);
  state.elapsed+=dt;
  if(state.elapsed-state.lastSample>.075){state.ghostSamples.push({t:state.elapsed-state.lapStart,x:c.x,z:c.z,yaw:c.yaw});state.lastSample=state.elapsed;}
  const lapUpdate=updateLapTracker(state.lapTracker,oldx,oldz,c.x,c.z,
    nearestRoad(c.x,c.z),state.elapsed-state.lapStart);
  state.courseProgress=lapUpdate.progress;
  if(lapUpdate.completed)completeLap();
  else if(lapUpdate.crossedStart&&state.elapsed>3&&state.elapsed-state.lastInvalidCrossTime>3){
    state.lastInvalidCrossTime=state.elapsed;
    toast('LAP NOT READY · DRIVE FARTHER FROM START',1.3);
  }
}
const dustGeo=new THREE.BoxGeometry(.62,.62,.62);
const dustMat=new THREE.MeshBasicMaterial({color:0xd1bc91,transparent:true,opacity:.65,depthWrite:false});
function spawnDust(x,z,y,offroad){
  if(dust.length>110)return;
  const puff=new THREE.Mesh(dustGeo,dustMat.clone());puff.position.set(x+(Math.random()-.5)*2,y+.4,z+(Math.random()-.5)*2);puff.scale.setScalar(offroad?1.6:1);world.add(puff);
  dust.push({mesh:puff,t:0,max:.5+Math.random()*.6});
}
function updateDust(dt){
  for(let i=dust.length-1;i>=0;i--){
    const p=dust[i];p.t+=dt;p.mesh.position.y+=dt*.9;p.mesh.scale.multiplyScalar(1+dt*.5);p.mesh.material.opacity=clamp(.5*(1-p.t/p.max),0,.5);
    if(p.t>p.max){world.remove(p.mesh);p.mesh.material.dispose();dust.splice(i,1);}
  }
}
function updateCamera(dt){
  const c=state.car;if(!c)return;
  const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),y=terrainY(c.x,c.z);
  const rightX=-fz,rightZ=fx;
  const driver=state.camMode===1 && state.mode!=='menu';
  // Driver's eye is behind the windscreen, offset to the left seat.
  const desired=driver
    ? new THREE.Vector3(c.x+fx*.32-rightX*.63,y+2.18,c.z+fz*.32-rightZ*.63)
    : new THREE.Vector3(c.x-fx*13,y+7.3,c.z-fz*13);
  if(state.mode==='menu')desired.set(c.x+15,y+10,c.z+19);
  const k=clamp(dt*(driver?17:5),0,1);
  camera.position.lerp(desired,k);
  const look=new THREE.Vector3(
    c.x+fx*(driver?40:13)-(driver?rightX*.63:0),
    y+(driver?2.08:2.05),
    c.z+fz*(driver?40:13)-(driver?rightZ*.63:0)
  );
  if(state.mode==='menu')look.set(c.x,y+1.2,c.z);
  camTarget.lerp(look,k);
  camera.lookAt(camTarget);
  // Wide chase camera, slightly tighter FOV while in the driver's seat.
  const targetFov=driver?68:68+clamp(state.speed/23,0,10);
  camera.fov=lerp(camera.fov,targetFov,clamp(dt*2,0,1));camera.updateProjectionMatrix();
  if(carGroup)carGroup.visible=!driver;
  cockpitView.root.visible=driver;
}
function updateNitroVisuals(){
  const active=state.mode==='race'&&!state.paused&&!!state.nitro?.active;
  const flicker=.88+.12*Math.sin(state.elapsed*67)+.07*Math.sin(state.elapsed*119);
  for(const flame of exhaustFlames){
    flame.group.visible=active;
    if(active){
      flame.group.scale.set(1,flicker,.90+flicker*.22);
      flame.outer.material.opacity=.70+.16*Math.sin(state.elapsed*39+flame.side);
      flame.core.material.opacity=.85;
    }
  }
}
function updateHud(){
  $('lap-counter').textContent=String(state.lap).padStart(2,'0')+' / '+String(settings.laps).padStart(2,'0');
  $('lap-time').textContent=formatTime(state.elapsed-state.lapStart);
  $('race-time').textContent=formatTime(state.elapsed);
  $('best-lap').textContent=formatTime(state.recordLap?.time);
  $('best-race').textContent=formatTime(state.recordRace?.time);
  $('speed').textContent=String(Math.round(state.speed)).padStart(3,'0');
  $('speed-bar').style.width=clamp(state.speed/MAX_SPEED_KMH*100,0,100)+'%';
  const nitro=state.nitro||freshNitro();
  $('nitro-percent').textContent=Math.round(nitro.amount)+'%';
  $('nitro-bar').style.width=nitro.amount+'%';
  $('nitro-shell').classList.toggle('firing',nitro.active);
  $('nitro-shell').classList.toggle('charging',nitro.charging);
  const nitroMode=nitro.active?'BOOSTING':nitro.charging?'DRIFT +CHARGE':nitro.locked?'RECHARGING':nitro.amount>=NITRO.capacity?'FULL':'READY';
  $('nitro-mode').textContent=nitroMode;
  $('drift-indicator').textContent=state.drift?'DRIFT  // '+Math.round(state.slip)+'°':'GRIP';
  $('surface-indicator').textContent=state.surface;
  $('camera-indicator').textContent=state.camMode===0?'CHASE CAM [C]':'DRIVER CAM [C]';
  const old=state.recordLap?.time;
  const delta=$('split-delta');
  if(old&&state.elapsed-state.lapStart>0){
    const diff=state.elapsed-state.lapStart-old;
    delta.textContent='LAP PB '+(diff>=0?'+':'-')+formatTime(Math.abs(diff));
    delta.className=diff<=0?'split-good':'split-bad';
  }else {delta.textContent='FREE ROUTE · '+Math.round(state.courseProgress*100)+'% VALID';delta.className='split-neutral';}
  const validity=$('lap-validity');
  const ready=!!state.lapTracker?.ready;
  validity.textContent=ready?'LAP READY · CROSS THE FINISH':'SHORTCUTS ALLOWED · EXPLORE THE STAGE';
  validity.classList.toggle('ready',ready);
  if(state.mode==='race'&&state.car&&!state.paused){
    guide.update({nearest:nearestRoad(state.car.x,state.car.z),speedKmh:state.speed,active:true});
  }
}
function renderMinimap(){
  if(!mctx||!roadSamples.length)return;
  const w=220,h=220,scale=.355;
  mctx.clearRect(0,0,w,h);mctx.fillStyle='#091720';mctx.fillRect(0,0,w,h);
  mctx.strokeStyle='#bc9d75';mctx.lineWidth=7;mctx.beginPath();
  roadSamples.forEach((p,i)=>{const x=w/2+p.x*scale,y=h/2+p.z*scale;if(i===0)mctx.moveTo(x,y);else mctx.lineTo(x,y);});mctx.closePath();mctx.stroke();
  mctx.strokeStyle='#f3e4c5';mctx.lineWidth=1.2;mctx.stroke();
  const start=roadSamples[0];mctx.fillStyle='#f5c75c';mctx.fillRect(w/2+start.x*scale-3,h/2+start.z*scale-3,6,6);
  const c=state.car;
  if(c){mctx.save();mctx.translate(w/2+c.x*scale,h/2+c.z*scale);mctx.rotate(-c.yaw);mctx.fillStyle='#fa7358';mctx.beginPath();mctx.moveTo(0,-7);mctx.lineTo(-5,5);mctx.lineTo(5,5);mctx.closePath();mctx.fill();mctx.restore();}
}
function resize(){
  // Rendering internally at a low resolution is the pixel-art postprocess.
  const aspect=innerWidth/innerHeight;
  const height=innerWidth<700?Math.max(260,Math.min(520,Math.round(innerHeight*.76))):Math.max(420,Math.min(780,Math.round(innerHeight*.82)));
  renderer.setSize(Math.round(height*aspect),height,false);
  camera.aspect=aspect;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyC','KeyR','Escape','F3','KeyM','KeyN','KeyV'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='KeyM'){
    audio.unlock();audio.setMusicEnabled(!audio.musicOn);syncAudioControls();return;
  }
  if(e.code==='KeyN'){
    audio.unlock();audio.setEngineEnabled(!audio.engineOn);syncAudioControls();return;
  }
  if(e.code==='KeyV'){
    if(guide.voiceSupported){
      guide.setVoiceEnabled(!guide.voiceEnabled);syncAudioControls();
      if(state.mode==='race'&&!state.paused)toast(guide.voiceEnabled?'CO-DRIVER VOICE ON':'CO-DRIVER VOICE OFF',1);
    }
    return;
  }
  if(e.code==='F3'){telemetryBox.hidden=!telemetryBox.hidden;updateTelemetry();return;}
  if(e.code==='Escape'&&state.mode==='race'){setPaused(!state.paused);return;}
  if(e.code==='KeyC'&&state.mode==='race'&&!state.paused){state.camMode=(state.camMode+1)%2;toast(state.camMode?'DRIVER CAMERA':'CHASE CAMERA',.7);}
  if(e.code==='KeyR'&&state.mode==='race'&&!state.paused){startRace();toast('RACE RESTARTED',1);}
  KEY.add(e.code);
});
document.addEventListener('keyup',e=>KEY.delete(e.code));
window.addEventListener('blur',()=>{KEY.clear();if(state.mode==='race'&&!state.paused)setPaused(true);});
$('start-btn').addEventListener('click',startRace);
$('resume-btn').addEventListener('click',()=>setPaused(false));
$('pause-restart-btn').addEventListener('click',startRace);
$('pause-menu-btn').addEventListener('click',showMenu);
$('again-btn').addEventListener('click',startRace);
$('results-menu-btn').addEventListener('click',showMenu);
let lastFrame=performance.now(),hudAccumulator=0,accumulator=0;
function loop(now){
  requestAnimationFrame(loop);
  const realDt=clamp((now-lastFrame)/1000,0,.06);lastFrame=now;
  const dt=realDt;const active=state.mode==='race'&&!state.paused;
  if(active){
    accumulator=Math.min(accumulator+dt,.1);
    while(accumulator>=1/90){if(state.mode==='race')updatePhysics(1/90);accumulator-=1/90;}
    updateDust(dt);
    updateNitroVisuals();
    if(state.calloutTime>0){state.calloutTime-=dt;if(state.calloutTime<=0)$('center-callout').classList.add('hidden');}
    if(state.toastTime>0){state.toastTime-=dt;if(state.toastTime<=0)$('toast').classList.add('hidden');}
    hudAccumulator+=dt;if(hudAccumulator>.05){updateHud();renderMinimap();updateTelemetry();hudAccumulator=0;}
  }else if(state.mode==='menu'&&state.car){state.car.yaw+=dt*.13;syncCarModel();}
  else if(exhaustFlames.length){exhaustFlames.forEach(flame=>flame.group.visible=false);}
  updateCamera(dt);
  weatherVisual?.update(state.car,dt);
  audio.update({
    mode:state.mode,
    paused:state.paused,
    speedKmh:state.speed,
    gas:KEY.has('KeyW'),
    brake:KEY.has('Space'),
    drift:state.drift,
    nitro:!!state.nitro?.active,
    carId:currentCar().id
  });
  renderer.render(scene,camera);
}
try{renderMenu();createWorld();requestAnimationFrame(loop);}
catch(err){$('error').classList.remove('hidden');$('error').textContent='GAME INITIALIZATION FAILED: '+(err?.message||err);console.error(err);}
window.addEventListener('error',e=>{const el=$('error');el.classList.remove('hidden');el.textContent='GAME ERROR: '+e.message;});
