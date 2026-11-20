import * as THREE from 'three';

// Procedural art only. Ground textures, sky, local ambience and contact shadow
// never feed into hit-testing or the car's driving equations.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PALETTES={
  pine:{low:0xb5c4a9,horizon:0x9fc8cc,high:0x4884b5,sun:0xffd6a1},
  snow:{low:0xcbd8d9,horizon:0xa8c5db,high:0x648ab5,sun:0xfff2d8},
  desert:{low:0xeab98c,horizon:0xf3c094,high:0xa47489,sun:0xffdf9e}
};

function randomGenerator(seed){
  let n=seed>>>0;
  return ()=>{
    n=(Math.imul(1664525,n)+1013904223)>>>0;
    return n/4294967296;
  };
}

export function createSurfaceTexture(stage,kind){
  const size=512,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  const seed=({pine:1713,snow:2911,desert:3809}[stage]||1713)+(kind==='road'?331:0);
  const rng=randomGenerator(seed),isRoad=kind==='road';
  const snowy=stage==='snow',desert=stage==='desert';
  const base=isRoad
    ? (snowy?'#e3e8ea':desert?'#e1d3bc':'#dfdcd2')
    : (snowy?'#f6f8f8':desert?'#f1ebdb':'#eceee2');
  ctx.fillStyle=base;ctx.fillRect(0,0,size,size);
  // Soft mottling creates natural-looking large patches under vertex colors.
  for(let i=0;i<1250;i++){
    const x=rng()*size,y=rng()*size,rx=4+rng()*29,ry=3+rng()*18;
    const shade=rng()>.5;
    ctx.fillStyle=shade?'rgba(255,255,255,.055)':'rgba(20,27,22,.043)';
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,rng()*6.28,0,Math.PI*2);ctx.fill();
  }
  // Irregular micro-aggregate: stones on a road, sand grains, grass and snow.
  const flecks=isRoad?5900:4900;
  for(let i=0;i<flecks;i++){
    const x=rng()*size,y=rng()*size,s=.5+rng()*(isRoad?3.6:2.8);
    const alpha=.06+rng()*.17;
    ctx.fillStyle=rng()>.40?`rgba(31,42,36,${alpha})`:`rgba(255,255,255,${alpha*.83})`;
    ctx.fillRect(x,y,s,isRoad?s*.55:s);
  }
  if(isRoad){
    // Narrow streaks aligned with the travel direction, no tile-edge seams.
    for(let i=0;i<660;i++){
      const x=rng()*size,y=rng()*size,len=5+rng()*38;
      ctx.strokeStyle=rng()>.5?'rgba(30,35,31,.10)':'rgba(255,255,255,.12)';
      ctx.lineWidth=.4+rng()*2;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*2,y+len);ctx.stroke();
    }
  }else if(!snowy){
    for(let i=0;i<1600;i++){
      const x=rng()*size,y=rng()*size;
      const length=1.5+rng()*5;
      ctx.strokeStyle=desert?'rgba(115,88,51,.16)':'rgba(33,82,38,.18)';
      ctx.lineWidth=.6+rng();
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1,y-length);ctx.stroke();
    }
  }else{
    for(let i=0;i<1300;i++){
      ctx.fillStyle='rgba(255,255,255,.37)';
      ctx.fillRect(rng()*size,rng()*size,1+rng()*3,.8+rng()*3);
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function addSkyAtmosphere(world,stage,weather){
  const colors=PALETTES[stage]||PALETTES.pine;
  const geometry=new THREE.SphereGeometry(830,42,24);
  const position=geometry.getAttribute('position'),colorData=[];
  const low=new THREE.Color(colors.low),horizon=new THREE.Color(colors.horizon);
  const high=new THREE.Color(colors.high),muted=new THREE.Color(0x89979b);
  for(let i=0;i<position.count;i++){
    const height=position.getY(i)/830;
    const mix=clamp((height+.10)/.80,0,1);
    const col=(height>=.02?horizon.clone().lerp(high,mix):low.clone().lerp(horizon,clamp((height+.65)/.67,0,1)));
    if(weather==='rain')col.lerp(muted,.48);
    if(weather==='fog')col.lerp(new THREE.Color(colors.horizon),.68);
    colorData.push(col.r,col.g,col.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colorData,3));
  const sky=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false
  }));
  sky.name='procedural-sky';sky.renderOrder=-1000;world.add(sky);
  if(weather==='clear'){
    const sun=new THREE.Mesh(new THREE.CircleGeometry(26,32),
      new THREE.MeshBasicMaterial({
        color:colors.sun,transparent:true,opacity:.88,depthWrite:false,
        fog:false,side:THREE.DoubleSide
      }));
    sun.position.set(-510,340,-320);
    sun.lookAt(0,0,0);world.add(sun);
    const halo=new THREE.Mesh(new THREE.CircleGeometry(48,32),
      new THREE.MeshBasicMaterial({
        color:colors.sun,transparent:true,opacity:.10,depthWrite:false,
        fog:false,side:THREE.DoubleSide
      }));
    halo.position.copy(sun.position);halo.lookAt(0,0,0);world.add(halo);
  }
}

export function addCarContactShadow(world){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,8,64,64,61);
  gradient.addColorStop(0,'rgba(7,13,13,.70)');
  gradient.addColorStop(.48,'rgba(8,14,15,.43)');
  gradient.addColorStop(1,'rgba(8,14,15,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,opacity:.72,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1
  });
  const root=new THREE.Group();root.name='rally-car-contact-shadow';
  const patch=new THREE.Mesh(new THREE.PlaneGeometry(4.8,8.2),material);
  patch.rotation.x=-Math.PI/2;root.add(patch);world.add(root);
  return root;
}

export function createWeatherParticles(world,stage,weather){
  if(weather!=='rain')return {update(){}};
  const snow=stage==='snow',count=snow?230:280;
  const stride=snow?3:6,data=new Float32Array(count*stride);
  const rng=randomGenerator((snow?23:11)*719);
  const flakes=[];
  for(let i=0;i<count;i++){
    flakes.push({x:(rng()-.5)*100,y:rng()*38,z:(rng()-.5)*110,
      drift:rng()*2*Math.PI,speed:(snow?2.7:22)*(0.65+rng()*.7)});
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data,3));
  const material=snow
    ? new THREE.PointsMaterial({color:0xf6fbff,size:.46,transparent:true,opacity:.84,
      depthWrite:false,sizeAttenuation:true,fog:false})
    : new THREE.LineBasicMaterial({color:0xaed0e0,transparent:true,opacity:.42,
      depthWrite:false,fog:false});
  const particles=snow?new THREE.Points(geometry,material):new THREE.LineSegments(geometry,material);
  particles.frustumCulled=false;particles.renderOrder=3;world.add(particles);

  function draw(car,dt){
    if(!car)return;
    particles.position.set(car.x,car.y+9.0,car.z);
    for(let i=0;i<count;i++){
      const f=flakes[i];
      f.y-=f.speed*Math.min(dt,.07);
      if(f.y< -9){f.y+=42;f.x=(rng()-.5)*100;f.z=(rng()-.5)*110;}
      if(snow){
        const o=i*3;
        data[o]=f.x+Math.sin(f.drift+f.y*.17)*.85;
        data[o+1]=f.y;data[o+2]=f.z;
      }else{
        const o=i*6;
        data[o]=f.x;data[o+1]=f.y;data[o+2]=f.z;
        data[o+3]=f.x-.17;data[o+4]=f.y-.93;data[o+5]=f.z-.11;
      }
    }
    geometry.attributes.position.needsUpdate=true;
  }
  return {update:draw};
}
