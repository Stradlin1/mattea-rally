import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const TAU = Math.PI*2;
const CARS = [
  {id:'classic',name:'CLASSIC GT',detail:'平衡 · 经典拉力',color:0xe45b45,accel:19,max:43,grip:6.8,steer:1.00,drift:.48},
  {id:'awd',name:'AWD TURBO',detail:'四驱 · 强抓地力',color:0x4d95d4,accel:23,max:46,grip:8.7,steer:.92,drift:.30},
  {id:'rwd',name:'DRIFT COUPE',detail:'后驱 · 灵活甩尾',color:0xe9be5a,accel:25,max:48,grip:6.0,steer:1.15,drift:.66},
  {id:'buggy',name:'DIRT BUGGY',detail:'越野 · 复杂地形',color:0x7bd19a,accel:21,max:41,grip:7.0,steer:.97,drift:.54}
];
const TRACKS = [
  {id:'pine',name:'PINE VALLEY',detail:'森林 · 起伏砂石路',seed:1,road:0x9f8062,field:0x516f4c,sky:0x9ab8c7,width:19,points:[[-144,-26],[-139,-119],[-60,-168],[40,-159],[121,-111],[159,-36],[117,35],[127,119],[50,160],[-40,138],[-78,84],[-147,72]]},
  {id:'snow',name:'FROST RIDGE',detail:'雪山 · 密集发卡弯',seed:2,road:0x86959c,field:0xc0cad0,sky:0x96abc3,width:17,points:[[-150,-83],[-95,-150],[7,-150],[83,-134],[150,-82],[100,-40],[47,-80],[-7,-27],[69,23],[155,57],[117,142],[17,158],[-50,120],[-135,123],[-160,24],[-75,4]]},
  {id:'desert',name:'RED CANYON',detail:'峡谷 · 高速长弯',seed:3,road:0xc28d5a,field:0xad7750,sky:0xe2b28b,width:20,points:[[-170,-70],[-91,-133],[0,-152],[130,-126],[168,-53],[108,0],[158,90],[67,164],[-46,155],[-156,94],[-120,15],[-72,-40]]}
];
const WEATHER = [
  {id:'clear',name:'晴天',grip:1,fog:1},
  {id:'rain',name:'雨天',grip:.77,fog:.82},
  {id:'fog',name:'大雾',grip:.96,fog:.45}
];
const settings={car:'classic',track:'pine',weather:'clear',laps:3};
const KEY=new Set();
const state={mode:'menu',paused:false,elapsed:0,lapStart:0,lap:1,lapTimes:[],passed:0,nextGate:1,lastGateDistance:0,car:null,model:null,camMode:0,drift:false,speed:0,slip:0,recordLap:null,recordRace:null,ghostSamples:[],ghostBest:[],lastSample:0,surface:'GRAVEL',weatherTime:0,calloutTime:0,toastTime:0};
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91a8ac);
const camera=new THREE.PerspectiveCamera(68,16/9,.1,900);
const hemi=new THREE.HemisphereLight(0xd9ecff,0x536049,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe4bc,2.0);sun.position.set(-100,180,90);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const wheelMeshes=[];
const dust=[];
const decor=[];
let raceTrack=null,roadSamples=[],gates=[],terrainMesh=null,roadMesh=null,carGroup=null,camTarget=new THREE.Vector3();
const hud=$('hud'),menu=$('menu'),pauseEl=$('pause'),results=$('results');
const tmpVec=new THREE.Vector3();
const mctx=$('minimap').getContext('2d');

function recordKey(type,withLaps=false){
  const parts=['mattea-rally-v1',type,settings.track,settings.car,settings.weather];
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
  while(world.children.length){const item=world.children[0];world.remove(item);item.traverse(obj=>{obj.geometry?.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose());}});}
  dust.length=0;decor.length=0;wheelMeshes.length=0;carGroup=null;
}
function hash(x,z,s){const f=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return f-Math.floor(f);}
function hills(x,z,seed){return Math.sin(x*.011+seed)*Math.cos(z*.013-seed)*4.8+Math.sin(x*.032+z*.016+seed)*1.65+Math.cos(z*.041-x*.027)*.8;}
function terrainY(x,z){return hills(x,z,currentTrack().seed);}
function buildCurve(){
  const tr=currentTrack();const curve=new THREE.CatmullRomCurve3(tr.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal',.5);
  const count=950;roadSamples=[];
  for(let i=0;i<count;i++){
    const t=i/count,p=curve.getPoint(t),v=curve.getTangent(t).normalize();
    roadSamples.push({x:p.x,z:p.z,y:terrainY(p.x,p.z),tx:v.x,tz:v.z,s:i/count});
  }
  gates=[0,.25,.5,.75].map(frac=>roadSamples[Math.floor(frac*count)]);
}
function nearestRoad(x,z){
  let nearest=0,best=Infinity;
  for(let i=0;i<roadSamples.length;i+=3){const p=roadSamples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;nearest=i;}}
  for(let j=-5;j<=5;j++){const i=(nearest+j+roadSamples.length)%roadSamples.length,p=roadSamples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;nearest=i;}}
  return {index:nearest,d:Math.sqrt(best),p:roadSamples[nearest]};
}
function createRoad(){
  const verts=[],cols=[],index=[],half=currentTrack().width*.5,n=roadSamples.length;
  const base=new THREE.Color(currentTrack().road);
  for(let i=0;i<=n;i++){
    const p=roadSamples[i%n],nx=-p.tz,nz=p.tx;
    for(const side of [-1,1]){
      const x=p.x+nx*side*half,z=p.z+nz*side*half;
      verts.push(x,terrainY(x,z)+.12,z);
      const k=.95+.06*Math.sin(i*.8+side);
      cols.push(base.r*k,base.g*k,base.b*k);
    }
    if(i<n){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  geo.setIndex(index);geo.computeVertexNormals();
  roadMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));world.add(roadMesh);
  const strips=new THREE.Group();const stripeMat=new THREE.MeshBasicMaterial({color:0xe6d3ac});
  for(let i=0;i<n;i+=22){
    const a=roadSamples[i],b=roadSamples[(i+9)%n],mid=new THREE.Vector3((a.x+b.x)*.5,Math.max(a.y,b.y)+.2,(a.z+b.z)*.5);
    const segment=new THREE.Mesh(new THREE.BoxGeometry(.32,.045,Math.hypot(b.x-a.x,b.z-a.z)),stripeMat);
    segment.position.copy(mid);segment.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);strips.add(segment);
  }
  world.add(strips);
  const markerMats=[new THREE.MeshBasicMaterial({color:0xf5c66c}),new THREE.MeshBasicMaterial({color:0x7ce4c4})];
  for(let i=0;i<gates.length;i++){
    const g=gates[i],normal=new THREE.Vector3(-g.tz,0,g.tx);
    for(const side of [-1,1]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.8,5,.8),markerMats[i?1:0]);
      post.position.set(g.x+normal.x*(half+2)*side,terrainY(g.x+normal.x*(half+2)*side,g.z+normal.z*(half+2)*side)+2.5,g.z+normal.z*(half+2)*side);
      world.add(post);
    }
  }
  const start=gates[0],fn=new THREE.Vector3(-start.tz,0,start.tx);
  for(let j=-5;j<=5;j++){const stripe=new THREE.Mesh(new THREE.BoxGeometry(currentTrack().width/11,.05,2),new THREE.MeshBasicMaterial({color:j%2===0?0x16191e:0xf0e8d9}));
    stripe.position.set(start.x+fn.x*j*currentTrack().width/11,terrainY(start.x,start.z)+.32,start.z+fn.z*j*currentTrack().width/11);stripe.rotation.y=Math.atan2(start.tx,start.tz);world.add(stripe);}
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
  const positions=[],colors=[],ids=[],base=new THREE.Color(tr.field);
  for(let zi=0;zi<=seg;zi++){for(let xi=0;xi<=seg;xi++){
    const x=(xi/seg-.5)*size,z=(zi/seg-.5)*size,y=terrainY(x,z);
    positions.push(x,y-.16,z);const n=hash(x*.17,z*.17,tr.seed);
    const c=base.clone().multiplyScalar(.82+n*.32);
    colors.push(c.r,c.g,c.b);
    if(xi<seg&&zi<seg){const a=zi*(seg+1)+xi,b=a+seg+1;ids.push(a,b,a+1,a+1,b,b+1);}
  }}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(ids);geo.computeVertexNormals();
  terrainMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));world.add(terrainMesh);
  const seed=tr.seed;
  for(let i=0;i<320;i++){
    const x=(hash(i,13,seed)-.5)*790,z=(hash(i,29,seed)-.5)*790;
    const near=nearestRoad(x,z);
    if(near.d<tr.width*.5+11)continue;
    const n=hash(i,71,seed);
    if(tr.id==='desert'){if(n<.76)addRock(x,z,1.6+hash(i,32,seed)*6,n);}
    else if(n<.72)addTree(x,z,.65+hash(i,44,seed)*1.0,n);
    else addRock(x,z,1.2+hash(i,34,seed)*2.6,n);
  }
  for(let i=0;i<36;i++){
    const ang=i/36*TAU,r=470+hash(i,48,seed)*65,x=Math.cos(ang)*r,z=Math.sin(ang)*r;
    const h=45+hash(i,53,seed)*120;
    const peak=new THREE.Mesh(new THREE.ConeGeometry(38+hash(i,7,seed)*35,h,5),new THREE.MeshLambertMaterial({color:tr.id==='snow'?0x9cabb6:tr.id==='desert'?0x9b694e:0x64776e,flatShading:true}));
    peak.position.set(x,h*.4-17,z);world.add(peak);
  }
}
function buildCar(){
  const config=currentCar();
  carGroup=new THREE.Group();world.add(carGroup);
  const mat=new THREE.MeshLambertMaterial({color:config.color,flatShading:true});
  const trim=new THREE.MeshLambertMaterial({color:0x26323e}),glass=new THREE.MeshLambertMaterial({color:0x243d52}),lights=new THREE.MeshBasicMaterial({color:0xffe0ac}),tail=new THREE.MeshBasicMaterial({color:0xe84835});
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.7,.85,5.0),mat);body.position.y=.95;carGroup.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.25,.92,2.4),glass);cabin.position.set(0,1.73,-.3);carGroup.add(cabin);
  for(const side of [-1,1]){
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(.06,.2,4.2),new THREE.MeshBasicMaterial({color:0xf2e2b8}));stripe.position.set(side*1.37,1,0);carGroup.add(stripe);
    for(const front of [-1,1]){
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(.74,.74,.44,10),trim);
      tire.rotation.z=Math.PI/2;tire.position.set(side*1.47,.72,front*1.55);carGroup.add(tire);wheelMeshes.push({mesh:tire,front:front===-1,side});
    }
  }
  for(const side of [-1,1]){
    const headlight=new THREE.Mesh(new THREE.BoxGeometry(.53,.2,.08),lights);headlight.position.set(side*.83,1.05,-2.53);carGroup.add(headlight);
    const taillight=new THREE.Mesh(new THREE.BoxGeometry(.66,.22,.08),tail);taillight.position.set(side*.82,.96,2.54);carGroup.add(taillight);
  }
  const spoiler=new THREE.Mesh(new THREE.BoxGeometry(2.7,.16,.45),trim);spoiler.position.set(0,1.8,2.22);carGroup.add(spoiler);
  const bumper=new THREE.Mesh(new THREE.BoxGeometry(2.55,.3,.2),trim);bumper.position.set(0,.67,-2.58);carGroup.add(bumper);
}
function createWorld(){
  clearWorld();buildCurve();buildTerrain();createRoad();buildCar();
  const tr=currentTrack(),weather=currentWeather();scene.background=new THREE.Color(tr.sky);
  scene.fog=new THREE.FogExp2(tr.sky,weather.id==='fog'?.017:weather.id==='rain'?.0075:.0040);
  hemi.intensity=weather.id==='rain'?1.65:2.3;sun.intensity=weather.id==='rain'?.8:2;
  state.car={x:0,z:0,yaw:0,vx:0,vz:0,y:0,roll:0,pitch:0,turn:0};
  resetCar(true);updateCamera(1);renderMinimap();renderer.render(scene,camera);
}
function resetCar(full=false){
  const p=roadSamples[roadSamples.length-9],c=state.car;
  c.x=p.x;c.z=p.z;c.y=terrainY(c.x,c.z);c.yaw=Math.atan2(-p.tx,-p.tz);c.vx=0;c.vz=0;c.roll=0;c.pitch=0;c.turn=0;
  // In this coordinate convention the car forward is local -Z.
  c.yaw=Math.atan2(-p.tx,-p.tz);
  state.drift=false;state.slip=0;state.speed=0;state.surface='GRAVEL';
  if(full){state.elapsed=0;state.lapStart=0;state.lap=1;state.passed=0;state.lapTimes=[];state.ghostSamples=[];state.lastSample=0;state.lastGateDistance=0;}
  syncCarModel();
}
function syncCarModel(){
  const c=state.car;if(!c||!carGroup)return;
  carGroup.position.set(c.x,terrainY(c.x,c.z)+.32,c.z);
  carGroup.rotation.set(c.pitch,c.yaw,c.roll,'YXZ');
  wheelMeshes.forEach(({mesh,front})=>{if(front)mesh.rotation.y=c.turn*.36;});
}
function startRace(){
  if(!Number.isInteger(settings.laps)||settings.laps<1||settings.laps>99)return;
  createWorld();resetCar(true);
  state.recordLap=getRecord('best-lap',false);
  state.recordRace=getRecord('best-race',true);
  state.ghostBest=state.recordLap?.ghost||[];
  state.mode='race';state.paused=false;menu.classList.add('hidden');results.classList.add('hidden');pauseEl.classList.add('hidden');hud.classList.remove('hidden');
  showCallout('GO!',1.4);KEY.clear();lastFrame=performance.now();updateHud();
}
function showCallout(value,seconds=1){const el=$('center-callout');el.textContent=value;el.classList.remove('hidden');state.calloutTime=seconds;}
function toast(value,seconds=2){$('toast').textContent=value;$('toast').classList.remove('hidden');state.toastTime=seconds;}
function showMenu(){
  state.mode='menu';state.paused=false;KEY.clear();hud.classList.add('hidden');pauseEl.classList.add('hidden');results.classList.add('hidden');menu.classList.remove('hidden');renderMenu();createWorld();
}
function setPaused(value){
  if(state.mode!=='race')return;
  state.paused=value;pauseEl.classList.toggle('hidden',!value);KEY.clear();lastFrame=performance.now();
}
function gateCrossed(g,oldx,oldz,newx,newz){
  const oldAlong=(oldx-g.x)*g.tx+(oldz-g.z)*g.tz;
  const newAlong=(newx-g.x)*g.tx+(newz-g.z)*g.tz;
  if(!(oldAlong<0&&newAlong>=0))return false;
  const lateral=Math.abs((newx-g.x)*(-g.tz)+(newz-g.z)*g.tx);
  return lateral<currentTrack().width*.5+8;
}
function checkGates(oldx,oldz){
  const c=state.car;
  const expected=gates[state.nextGate];
  if(!expected||!gateCrossed(expected,oldx,oldz,c.x,c.z))return;
  if(state.nextGate<gates.length-1){state.passed++;state.nextGate++;toast('CHECKPOINT '+state.passed+' / 3',1.1);}
  else {state.passed=3;state.nextGate=0;toast('FINAL SECTOR',1.1);}
}
function completeLap(){
  const lapTime=state.elapsed-state.lapStart;
  if(lapTime<7)return;
  state.lapTimes.push(lapTime);
  const lapRecord=getRecord('best-lap',false);
  let newLapPB=false;
  if(!lapRecord||lapTime<lapRecord.time){
    newLapPB=true;setRecord('best-lap',false,{time:lapTime,ghost:state.ghostSamples.slice(),date:new Date().toISOString()});
    state.recordLap=getRecord('best-lap',false);state.ghostBest=state.recordLap.ghost;
  }
  if(state.lap>=settings.laps){finishRace(newLapPB);return;}
  state.lap++;state.lapStart=state.elapsed;state.passed=0;state.nextGate=1;
  state.ghostSamples=[];state.lastSample=0;
  showCallout(newLapPB?'NEW LAP PB!':'LAP '+(state.lap-1)+' COMPLETE',1.5);
}
function finishRace(newLapPB){
  state.mode='finished';KEY.clear();
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
  const gas=KEY.has('KeyW'),reverse=KEY.has('KeyS'),brake=KEY.has('Space'),boost=KEY.has('ShiftLeft')||KEY.has('ShiftRight');
  const steering=(KEY.has('KeyA')?1:0)-(KEY.has('KeyD')?1:0);
  const near=nearestRoad(c.x,c.z),offroad=near.d>currentTrack().width*.5;
  const terrainGrip=offroad?(settings.track==='snow'?.59:settings.track==='desert'?.68:.70):1;
  const grip=terrainGrip*weather.grip;
  state.surface=offroad?(settings.track==='snow'?'SNOW FIELD':settings.track==='desert'?'SAND':'GRASS'):(settings.track==='snow'?'SNOW ROAD':settings.track==='desert'?'DESERT GRAVEL':'GRAVEL');
  const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),rightX=-fz,rightZ=fx;
  let forward=c.vx*fx+c.vz*fz,lateral=c.vx*rightX+c.vz*rightZ;
  const speed=Math.hypot(c.vx,c.vz);
  const turning=steering!==0&&speed>8;
  const slide=boost&&turning&&Math.abs(forward)>7;
  const max= config.max*(boost?1.35:1)*(offroad?(config.id==='buggy'?.86:.67):1);
  if(gas&&forward<max){
    const force=config.accel*(boost?1.44:1)*(offroad?(config.id==='buggy'?.88:.64):1)*(1-.55*clamp(Math.max(forward,0)/max,0,1));
    c.vx+=fx*force*dt;c.vz+=fz*force*dt;
  }
  if(reverse){
    if(forward>1){c.vx-=fx*22*grip*dt;c.vz-=fz*22*grip*dt;}
    else if(forward>-13){c.vx-=fx*9*dt;c.vz-=fz*9*dt;}
  }
  if(brake){const b=Math.min(Math.abs(forward),32*grip*dt)*Math.sign(forward);c.vx-=fx*b;c.vz-=fz*b;}
  const speedFactor=clamp(Math.abs(forward)/13,0,1);
  let steerAngle=steering*config.steer*(1.45/(1+speed*.027));
  const currentYawRate=steerAngle*speedFactor*(forward<0?-1:1);
  c.turn=lerp(c.turn,steering,clamp(dt*8,0,1));
  c.yaw+=currentYawRate*dt*(slide?1.50:1);
  // Lateral damping gives genuine velocity/heading divergence under power-slide.
  const newFx=-Math.sin(c.yaw),newFz=-Math.cos(c.yaw),rx=-newFz,rz=newFx;
  const lat=c.vx*rx+c.vz*rz;
  const effectiveGrip=config.grip*grip*(slide?config.drift:.98);
  const damp=1-Math.exp(-effectiveGrip*dt);
  c.vx-=rx*lat*damp;c.vz-=rz*lat*damp;
  const drag=Math.min(.12,dt*(.31+speed*.022+(offroad?.46:0)+(brake?.65:0)));
  c.vx*=1-drag;c.vz*=1-drag;
  if(Math.hypot(c.vx,c.vz)<.08&&!gas&&!reverse){c.vx=0;c.vz=0;}
  const oldx=c.x,oldz=c.z;
  const nx=c.x+c.vx*dt,nz=c.z+c.vz*dt;
  if(collides(nx,nz)){c.vx*=-.18;c.vz*=-.18;toast('IMPACT!',.5);}
  else {c.x=nx;c.z=nz;}
  state.speed=Math.hypot(c.vx,c.vz)*3.6;
  state.slip=Math.atan2(Math.abs(lat),Math.max(2,Math.abs(forward)))*180/Math.PI;
  state.drift=(slide||state.slip>13)&&state.speed>26;
  c.roll=lerp(c.roll,-steering*clamp(speed/35,0,1)*.12-state.slip*.001,clamp(dt*5,0,1));
  const yFront=terrainY(c.x+newFx*2,c.z+newFz*2),yBack=terrainY(c.x-newFx*2,c.z-newFz*2);
  c.pitch=lerp(c.pitch,Math.atan2(yFront-yBack,4),clamp(dt*5,0,1));
  c.y=terrainY(c.x,c.z);
  syncCarModel();
  if(state.drift&&Math.random()<dt*45)spawnDust(c.x-newFx*2,c.z-newFz*2,c.y,offroad);
  state.elapsed+=dt;
  if(state.elapsed-state.lastSample>.075){state.ghostSamples.push({t:state.elapsed-state.lapStart,x:c.x,z:c.z,yaw:c.yaw});state.lastSample=state.elapsed;}
  if(state.nextGate===0){
    if(gateCrossed(gates[0],oldx,oldz,c.x,c.z)){state.nextGate=1;state.passed=0;completeLap();}
  }else checkGates(oldx,oldz);
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
  const cockpit=state.camMode===1;
  const desired=new THREE.Vector3(c.x-fx*(cockpit?1.1:12),y+(cockpit?2.15:6.6),c.z-fz*(cockpit?1.1:12));
  if(cockpit)desired.set(c.x+fx*.75,y+2.15,c.z+fz*.75);
  if(state.mode==='menu'){desired.set(c.x+15,y+10,c.z+19);}
  const k=clamp(dt*(cockpit?12:5),0,1);camera.position.lerp(desired,k);
  const look=new THREE.Vector3(c.x+fx*(cockpit?30:11),y+(cockpit?2.1:1.9),c.z+fz*(cockpit?30:11));
  if(state.mode==='menu')look.set(c.x,y+1.2,c.z);
  camTarget.lerp(look,k);camera.lookAt(camTarget);
  camera.fov=lerp(camera.fov,68+clamp(state.speed/20,0,12),clamp(dt*2,0,1));camera.updateProjectionMatrix();
  if(carGroup)carGroup.visible=!cockpit||state.mode==='menu';
}
function updateHud(){
  $('lap-counter').textContent=String(state.lap).padStart(2,'0')+' / '+String(settings.laps).padStart(2,'0');
  $('lap-time').textContent=formatTime(state.elapsed-state.lapStart);
  $('race-time').textContent=formatTime(state.elapsed);
  $('best-lap').textContent=formatTime(state.recordLap?.time);
  $('best-race').textContent=formatTime(state.recordRace?.time);
  $('speed').textContent=String(Math.round(state.speed)).padStart(3,'0');
  $('speed-bar').style.width=clamp(state.speed/220*100,0,100)+'%';
  $('drift-indicator').textContent=state.drift?'DRIFT  // '+Math.round(state.slip)+'°':'GRIP';
  $('surface-indicator').textContent=state.surface;
  $('camera-indicator').textContent=state.camMode===0?'CHASE CAM [C]':'DRIVER CAM [C]';
  const old=state.recordLap?.time;
  const delta=$('split-delta');
  if(old&&state.elapsed-state.lapStart>0){
    const diff=state.elapsed-state.lapStart-old;
    delta.textContent='LAP PB '+(diff>=0?'+':'-')+formatTime(Math.abs(diff));
    delta.className=diff<=0?'split-good':'split-bad';
  }else {delta.textContent='PASS ALL 3 CHECKPOINTS';delta.className='split-neutral';}
}
function renderMinimap(){
  if(!mctx||!roadSamples.length)return;
  const w=220,h=220,scale=.39;
  mctx.clearRect(0,0,w,h);mctx.fillStyle='#091720';mctx.fillRect(0,0,w,h);
  mctx.strokeStyle='#bc9d75';mctx.lineWidth=7;mctx.beginPath();
  roadSamples.forEach((p,i)=>{const x=w/2+p.x*scale,y=h/2+p.z*scale;if(i===0)mctx.moveTo(x,y);else mctx.lineTo(x,y);});mctx.closePath();mctx.stroke();
  mctx.strokeStyle='#f3e4c5';mctx.lineWidth=1.2;mctx.stroke();
  gates.forEach((g,i)=>{mctx.fillStyle=i===0?'#f5c75c':'#79d3c4';mctx.fillRect(w/2+g.x*scale-2,h/2+g.z*scale-2,4,4);});
  const c=state.car;
  if(c){mctx.save();mctx.translate(w/2+c.x*scale,h/2+c.z*scale);mctx.rotate(-c.yaw);mctx.fillStyle='#fa7358';mctx.beginPath();mctx.moveTo(0,-7);mctx.lineTo(-5,5);mctx.lineTo(5,5);mctx.closePath();mctx.fill();mctx.restore();}
}
function resize(){
  // Rendering internally at a low resolution is the pixel-art postprocess.
  const aspect=innerWidth/innerHeight;
  const height=innerWidth<700?Math.max(180,Math.min(300,Math.round(innerHeight*.58))):Math.max(240,Math.min(420,Math.round(innerHeight*.55)));
  renderer.setSize(Math.round(height*aspect),height,false);
  camera.aspect=aspect;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyC','KeyR','Escape'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
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
    if(state.calloutTime>0){state.calloutTime-=dt;if(state.calloutTime<=0)$('center-callout').classList.add('hidden');}
    if(state.toastTime>0){state.toastTime-=dt;if(state.toastTime<=0)$('toast').classList.add('hidden');}
    hudAccumulator+=dt;if(hudAccumulator>.05){updateHud();renderMinimap();hudAccumulator=0;}
  }else if(state.mode==='menu'&&state.car){state.car.yaw+=dt*.13;syncCarModel();}
  updateCamera(dt);
  renderer.render(scene,camera);
}
try{renderMenu();createWorld();requestAnimationFrame(loop);}
catch(err){$('error').classList.remove('hidden');$('error').textContent='GAME INITIALIZATION FAILED: '+(err?.message||err);console.error(err);}
window.addEventListener('error',e=>{const el=$('error');el.classList.remove('hidden');el.textContent='GAME ERROR: '+e.message;});
