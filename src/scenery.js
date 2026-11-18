import * as THREE from 'three';

// Instancing keeps the much denser scenery practical at pixel-art resolution.
// Visual scenery is non-blocking: the track has no invisible walls.
const TAU=Math.PI*2;
const COLORS={
  pine:{pine:0x234b3f,alternate:0x3d7857,grass:0x709467,rock:0x66756a},
  snow:{pine:0x59818a,alternate:0x829c9f,grass:0xe2e9e8,rock:0xa2b2bd},
  desert:{pine:0x7f8a42,alternate:0xa99b51,grass:0xd4ac6b,rock:0x975e48}
};

export function populateScenery(world, {track,roadSamples,terrainY,nearestRoad,hash}){
  const theme=COLORS[track.id]||COLORS.pine;
  const set=new THREE.Group();world.add(set);
  const dummy=new THREE.Object3D();
  const tint=new THREE.Color();
  const instanced=(geo,material,count,placements)=>{
    const mesh=new THREE.InstancedMesh(geo,material,count);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for(let i=0;i<count;i++){
      const p=placements[i];
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot||0,0);dummy.scale.set(p.s,p.h||p.s,p.s);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      tint.setHex(i%4===0?theme.alternate:material.color.getHex());
      tint.multiplyScalar(.83+(i%9)*.033);
      mesh.setColorAt(i,tint);
    }
    mesh.computeBoundingSphere();set.add(mesh);return mesh;
  };
  const treeSites=[],trunkSites=[],rockSites=[],shrubSites=[],snowSites=[];
  const rng=(i,salt)=>hash(i,salt,track.seed);
  // Scatter safely outside both road shoulders, with no per-tree draw calls.
  for(let i=0;i<1000;i++){
    const x=(rng(i,13)-.5)*820,z=(rng(i,27)-.5)*820;
    const d=nearestRoad(x,z).d;
    if(d<track.width*.5+13)continue;
    const n=rng(i,61),size=.45+rng(i,49)*1.2,y=terrainY(x,z);
    if(track.id==='desert'){
      if(n<.38)rockSites.push({x,y:y+size*.57,z,s:size*2.4,rot:rng(i,1)*TAU});
      else if(n<.84)shrubSites.push({x,y:y+.27*size,z,s:size*.78,rot:n*TAU});
    }else if(n<.67){
      const h=size*(track.id==='snow'?1.1:1);
      treeSites.push({x,y:y+6.5*h,z,s:h,rot:rng(i,7)*TAU});
      trunkSites.push({x,y:y+2.1*h,z,s:h,rot:0});
      if(track.id==='snow'&&n<.35)snowSites.push({x,y:y+9.0*h,z,s:h,rot:0});
    }else if(n<.82)rockSites.push({x,y:y+.5*size,z,s:size*1.9,rot:n*TAU});
    else shrubSites.push({x,y:y+.35*size,z,s:size,rot:n*TAU});
  }
  const flat=(color)=>new THREE.MeshLambertMaterial({color,flatShading:true});
  if(trunkSites.length)instanced(new THREE.CylinderGeometry(.36,.58,4.3,5),flat(0x5c4433),trunkSites.length,trunkSites);
  if(treeSites.length)instanced(new THREE.ConeGeometry(3.15,10.2,6),flat(theme.pine),treeSites.length,treeSites);
  if(snowSites.length)instanced(new THREE.ConeGeometry(2.85,3.3,6),flat(0xe5edf0),snowSites.length,snowSites);
  if(rockSites.length)instanced(new THREE.DodecahedronGeometry(1,0),flat(theme.rock),rockSites.length,rockSites);
  if(shrubSites.length)instanced(new THREE.DodecahedronGeometry(.8,0),flat(theme.grass),shrubSites.length,shrubSites);

  // Painted roadside verge with alternating pale edge stones / reflector poles.
  const edgeSites=[];
  for(let i=0;i<roadSamples.length;i+=27){
    const p=roadSamples[i],nx=-p.tz,nz=p.tx;
    for(const side of [-1,1]){
      const x=p.x+nx*side*(track.width*.5+2.8),z=p.z+nz*side*(track.width*.5+2.8);
      edgeSites.push({x,y:terrainY(x,z)+.41,z,s:.54,h:1.45,rot:Math.atan2(p.tx,p.tz)});
    }
  }
  instanced(new THREE.BoxGeometry(.40,.92,.40),new THREE.MeshLambertMaterial({color:track.id==='desert'?0xe8bb84:0xd6e4dc}),edgeSites.length,edgeSites);
  
  function cube(parent,xyz,size,color){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),flat(color));
    mesh.position.set(...xyz);parent.add(mesh);return mesh;
  }
  function structurePosition(frac,side,offset=39){
    const p=roadSamples[Math.floor(frac*roadSamples.length)%roadSamples.length];
    const x=p.x-p.tz*side*(track.width*.5+offset),z=p.z+p.tx*side*(track.width*.5+offset);
    return {x,y:terrainY(x,z),z,rot:Math.atan2(p.tx,p.tz)};
  }
  // Elevated branded start gantry is decorative only, not a checkpoint.
  const start=roadSamples[0],crossX=-start.tz,crossZ=start.tx;
  for(const side of [-1,1]){
    const x=start.x+crossX*side*(track.width*.5+2),z=start.z+crossZ*side*(track.width*.5+2);
    cube(set,[x,terrainY(x,z)+5.2,z],[.9,10.4,.9],0x303941);
  }
  const banner=cube(set,[start.x,start.y+10.3,start.z],[track.width+5,1.5,.7],0x293b41);
  banner.rotation.y=Math.atan2(start.tx,start.tz);
  const accent=cube(set,[start.x,start.y+10.3,start.z+.08],[track.width*.58,.42,.12],0xffb957);
  accent.rotation.y=banner.rotation.y;

  // Repeatable landmark silhouettes give the three stages distinct identities.
  if(track.id==='pine'){
    const site=structurePosition(.16,1,50);
    cube(set,[site.x,site.y+4,site.z],[12,8,11],0x735c44);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(10,5,4),flat(0x3f5145));
    roof.rotation.y=Math.PI/4;roof.position.set(site.x,site.y+10,site.z);set.add(roof);
    const tower=structurePosition(.70,-1,62);
    for(const side of [-1,1])cube(set,[tower.x+side*2.8,tower.y+7,tower.z],[.7,14,.7],0x806644);
    cube(set,[tower.x,tower.y+14,tower.z],[8,1.4,7],0xb7a17a);
    cube(set,[tower.x,tower.y+16,tower.z],[9,.7,8],0x415f49);
    // Forest roadside stacked logs.
    for(let i=0;i<9;i++){
      const pos=structurePosition(.32+i*.009,-1,18);
      const log=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,7,7),flat(0x715541));
      log.position.set(pos.x,pos.y+.7,pos.z);log.rotation.z=Math.PI/2;set.add(log);
    }
  }else if(track.id==='snow'){
    const hut=structurePosition(.21,1,45);
    cube(set,[hut.x,hut.y+3,hut.z],[13,6,10],0x6d7074);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(10,5,4),flat(0xe6f0f6));
    roof.rotation.y=Math.PI/4;roof.position.set(hut.x,hut.y+8,hut.z);set.add(roof);
    const lake=structurePosition(.63,-1,75);
    const ice=new THREE.Mesh(new THREE.CylinderGeometry(32,33,.28,32),new THREE.MeshLambertMaterial({color:0xb1dce4,flatShading:true}));
    ice.scale.z=.68;ice.position.set(lake.x,lake.y-.15,lake.z);set.add(ice);
    for(let i=0;i<5;i++){
      const post=structurePosition(.42+i*.013,1,23);
      cube(set,[post.x,post.y+7,post.z],[.55,14,.55],0xa2aeb0);
      cube(set,[post.x,post.y+14,post.z],[6,.48,.5],0x697d87);
    }
  }else{
    const camp=structurePosition(.18,1,52);
    for(let i=0;i<5;i++){
      const x=camp.x+(i%3)*8-8,z=camp.z+Math.floor(i/3)*9-5;
      cube(set,[x,terrainY(x,z)+2,z],[5.5,4,6.5],i%2?0x986849:0x78604e);
      cube(set,[x,terrainY(x,z)+4.3,z],[6.2,.3,7.1],0xc4a577);
    }
    const arch=structurePosition(.59,-1,61);
    for(const side of [-1,1])cube(set,[arch.x+side*8,arch.y+8,arch.z],[5,16,8],0x93583e);
    cube(set,[arch.x,arch.y+17,arch.z],[21,5,9],0xa36545);
    for(let i=0;i<11;i++){
      const site=structurePosition(.79+i*.006,1,22);
      const cactus=new THREE.Group();cactus.position.set(site.x,site.y,site.z);set.add(cactus);
      cube(cactus,[0,2.3,0],[.6,4.6,.6],0x457f5c);
      cube(cactus,[-.64,2.1,0],[1.6,.45,.6],0x457f5c);
      cube(cactus,[-1.2,2.9,0],[.5,1.9,.55],0x457f5c);
    }
  }
  return set;
}
