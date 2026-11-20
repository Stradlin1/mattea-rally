import * as THREE from 'three';

// Dense but batched, entirely decorative stages. No collider is registered:
// the original road width, driving boundaries and physics are unchanged.
const TAU=Math.PI*2;
const THEMES={
  pine:{
    fir:0x245343,lightFir:0x38735a,trunk:0x644837,
    leaf:0x8aa55d,grass:0x718e56,flower:0xe8c56c,
    rock:0x788477,cliff:0x667e75,cap:0x91a59b,
    post:0xe4eadb,trim:0xf4b75b,cloud:0xeee8d9
  },
  snow:{
    fir:0x4d7278,lightFir:0x79979a,trunk:0x6e6963,
    leaf:0x9fb5b0,grass:0xc2dadb,flower:0xdfedf2,
    rock:0x9baebb,cliff:0x91a8b8,cap:0xecf4f6,
    post:0xf1f5f4,trim:0x78cbd8,cloud:0xf3f8f8
  },
  desert:{
    fir:0x5a7953,lightFir:0x88a16b,trunk:0x6b4a3a,
    leaf:0xb6a469,grass:0xbaa06f,flower:0xf3d08c,
    rock:0xa66c50,cliff:0x95634f,cap:0xc7926d,
    post:0xf3deaa,trim:0xf0ab58,cloud:0xf5ddc1
  }
};

function mat(color,alpha=1){
  return new THREE.MeshLambertMaterial({
    color,flatShading:true,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1
  });
}
function box(parent, material, size, at, rotY=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  mesh.position.set(...at);mesh.rotation.y=rotY;parent.add(mesh);
  return mesh;
}
function mesh(parent, geometry, material, at, scale=1, rotY=0){
  const object=new THREE.Mesh(geometry,material);
  object.position.set(...at);object.scale.setScalar(scale);
  object.rotation.y=rotY;parent.add(object);
  return object;
}

function stageBanner(text,secondary,color){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#1b2931';ctx.fillRect(0,0,512,160);
  ctx.fillStyle='#'+new THREE.Color(color).getHexString();
  ctx.fillRect(8,8,496,8);ctx.fillRect(8,144,496,8);
  ctx.fillStyle='#f7f1e4';ctx.textAlign='center';
  ctx.font='900 53px Arial';ctx.fillText(text,256,74);
  ctx.fillStyle='#c7d2d0';ctx.font='bold 26px Arial';
  ctx.fillText(secondary,256,120);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  return new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
}

export function populateScenery(world,{track,roadSamples,terrainY,nearestRoad,hash}){
  const theme=THEMES[track.id]||THEMES.pine;
  const snowy=track.id==='snow',desert=track.id==='desert';
  const scene=new THREE.Group();scene.name='scenery-stage-'+track.id;world.add(scene);
  const rnd=(i,s)=>hash(i*1.178+s*.13,s*17.3,track.seed);
  const dummy=new THREE.Object3D();
  const tint=new THREE.Color();
  const instance=(geometry,base,positions,colors)=>{
    if(!positions.length)return null;
    const inst=new THREE.InstancedMesh(geometry,mat(0xffffff),positions.length);
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for(let i=0;i<positions.length;i++){
      const p=positions[i];
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(0,p.rot||0,0);
      dummy.scale.set(p.s,p.h||p.s,p.s);dummy.updateMatrix();
      inst.setMatrixAt(i,dummy.matrix);
      tint.setHex(p.color||base);
      tint.multiplyScalar(.86+(i%11)*.024);
      inst.setColorAt(i,tint);
    }
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    inst.computeBoundingSphere();
    scene.add(inst);
    return inst;
  };
  const fir=[],firMid=[],firTop=[],firTrunks=[],snowCaps=[];
  const broadleaf=[],leafTrunks=[],rocks=[],boulders=[],shrubs=[],tufts=[],flowers=[];
  const cacti=[],cactiBranches=[],cactusArms=[];

  // Seeded scatter produces layers (low grass, stones, mid trees, tall firs).
  // Keep the shoulder clear for visibility and leave collision logic unchanged.
  for(let i=0;i<1780;i++){
    const x=(rnd(i,11)-.5)*866,z=(rnd(i,41)-.5)*866;
    const y=terrainY(x,z),distance=nearestRoad(x,z).d;
    if(distance<track.width*.5+9)continue;
    const size=.58+rnd(i,9)*1.2;
    const choice=rnd(i,101),rotation=rnd(i,19)*TAU;
    if(desert){
      if(choice<.14){
        const s=size*.92;
        cacti.push({x,y:y+2.15*s,z,s,rot:rotation});
        cactiBranches.push({x,y:y+1.5*s,z,s,rot:rotation});
        cactusArms.push({x,y:y+2.05*s,z,s,rot:rotation});
      }else if(choice<.46){
        rocks.push({x,y:y+.90*size,z,s:size*1.8,rot:rotation});
      }else if(choice<.72){
        shrubs.push({x,y:y+.5*size,z,s:size*.84,rot:rotation});
      }else{
        tufts.push({x,y:y+.5*size,z,s:size*.60,rot:rotation});
      }
    }else if(choice<(snowy?.66:.52)){
      fir.push({x,y:y+5.1*size,z,s:size,rot:rotation,color:rnd(i,87)<.5?theme.fir:theme.lightFir});
      firMid.push({x,y:y+7.0*size,z,s:size*.76,rot:rotation});
      firTop.push({x,y:y+8.4*size,z,s:size*.54,rot:rotation});
      firTrunks.push({x,y:y+2.3*size,z,s:size});
      if(snowy){
        snowCaps.push({x,y:y+8.9*size,z,s:size*.53});
      }
    }else if(!snowy&&choice<.68){
      broadleaf.push({x,y:y+5.0*size,z,s:size*2.30,rot:rotation,color:rnd(i,91)<.4?theme.leaf:theme.grass});
      leafTrunks.push({x,y:y+2.1*size,z,s:size*.8});
    }else if(choice<.80){
      rocks.push({x,y:y+.6*size,z,s:size*1.6,rot:rotation});
    }else if(choice<.91){
      shrubs.push({x,y:y+.43*size,z,s:size*.88,rot:rotation});
    }else{
      tufts.push({x,y:y+.54*size,z,s:size*.7,rot:rotation});
    }
    if(choice>.44&&rnd(i,63)>.65&&distance<track.width*.5+85){
      flowers.push({x:x+2,y:y+.53,z:z+1,s:.22+rnd(i,7)*.17});
    }
  }
  // Grouped layers render in only a handful of GPU draw calls.
  instance(new THREE.CylinderGeometry(.27,.42,4.7,5),theme.trunk,firTrunks);
  instance(new THREE.ConeGeometry(3.3,8.0,5),theme.fir,fir);
  instance(new THREE.ConeGeometry(2.8,6.2,5),theme.lightFir,firMid);
  instance(new THREE.ConeGeometry(2.3,4.0,5),theme.fir,firTop);
  if(snowy)instance(new THREE.ConeGeometry(2.3,3.4,5),theme.cap,snowCaps);
  instance(new THREE.CylinderGeometry(.37,.50,5.2,5),theme.trunk,leafTrunks);
  instance(new THREE.IcosahedronGeometry(1,0),theme.leaf,broadleaf);
  instance(new THREE.DodecahedronGeometry(1,0),theme.rock,rocks);
  instance(new THREE.IcosahedronGeometry(.85,0),theme.rock,boulders);
  instance(new THREE.IcosahedronGeometry(.72,0),theme.grass,shrubs);
  instance(new THREE.ConeGeometry(.75,1.35,4),theme.grass,tufts);
  instance(new THREE.OctahedronGeometry(.95,0),theme.flower,flowers);
  if(desert){
    instance(new THREE.CylinderGeometry(.40,.53,4.3,6),theme.fir,cacti);
    instance(new THREE.BoxGeometry(2.6,.43,.65),theme.fir,cactiBranches);
    instance(new THREE.CylinderGeometry(.28,.36,1.80,5),theme.lightFir,cactusArms);
  }

  // Low grass and wildflower edging make corners legible without guardrail walls.
  const verge=[],edgePosts=[],postBands=[],cornerSigns=[],stonePiles=[];
  for(let i=0;i<roadSamples.length;i+=24){
    const p=roadSamples[i],nx=-p.tz,nz=p.tx;
    for(const side of [-1,1]){
      const dist=track.width*.5+3.4;
      const x=p.x+nx*side*dist,z=p.z+nz*side*dist;
      const y=terrainY(x,z);
      edgePosts.push({x,y:y+.76,z,s:.55,h:.82});
      postBands.push({x,y:y+1.67,z,s:.61,h:.48});
      // Sparse grass groups create a soft roadside transition.
      for(let k=0;k<3;k++){
        const dx=nx*side*(4.5+k*2.2);
        const gx=p.x+dx, gz=p.z+nz*side*(4.5+k*2.2);
        verge.push({x:gx,y:terrainY(gx,gz)+.36,z:gz,s:.43+rnd(i+k,2)*.6});
      }
    }
    if(i%144===0){
      const side=(i%288===0?1:-1);
      const x=p.x+nx*side*(track.width*.5+8.3);
      const z=p.z+nz*side*(track.width*.5+8.3);
      cornerSigns.push({x,y:terrainY(x,z)+2.6,z,s:1.0,rot:Math.atan2(p.tx,p.tz)});
    }
  }
  instance(new THREE.BoxGeometry(.42,1.90,.42),theme.post,edgePosts);
  instance(new THREE.BoxGeometry(.55,.30,.55),theme.trim,postBands);
  instance(new THREE.ConeGeometry(.9,1.2,4),theme.grass,verge);
  instance(new THREE.BoxGeometry(1.65,1.65,.17),theme.trim,cornerSigns);

  // Landmarks anchored relative to the road so the scene remains reproducible.
  function siteAt(frac,side,offset=44){
    const p=roadSamples[Math.floor(frac*roadSamples.length)%roadSamples.length];
    const d=track.width*.5+offset;
    const x=p.x-p.tz*side*d,z=p.z+p.tx*side*d;
    return {x,y:terrainY(x,z),z,rot:Math.atan2(p.tx,p.tz)};
  }
  const wood=mat(theme.trunk),stone=mat(theme.rock),trim=mat(theme.trim);
  const wall=mat(snowy?0xb8c4ca:desert?0xc49a6e:0xab8c69);
  const roof=mat(snowy?0x5e7a85:desert?0x895841:0x3a554a);
  const windowMat=new THREE.MeshBasicMaterial({color:0x314954});

  function cabin(at,width=11,depth=8){
    const cabinGroup=new THREE.Group();cabinGroup.position.set(at.x,at.y,at.z);
    cabinGroup.rotation.y=at.rot;scene.add(cabinGroup);
    box(cabinGroup,wall,[width,6.6,depth],[0,3.5,0]);
    const roofMesh=mesh(cabinGroup,new THREE.ConeGeometry(width*.80,4.6,4),
      roof,[0,9.0,0]);roofMesh.rotation.y=Math.PI/4;
    box(cabinGroup,wood,[width+.7,.33,depth+.6],[0,6.7,0]);
    box(cabinGroup,windowMat,[2.3,2.7,.14],[-width*.25,4.2,-depth*.5-.10]);
    box(cabinGroup,windowMat,[2.3,2.7,.14],[width*.25,4.2,-depth*.5-.10]);
    box(cabinGroup,wood,[2.1,3.7,.15],[0,1.98,depth*.5+.10]);
    box(cabinGroup,wall,[1.2,2.0,1.2],[-width*.25,10,0]);
    if(snowy)box(cabinGroup,mat(0xe9f3f6),[width+.9,.34,depth+.9],[0,7.3,0]);
  }

  function watchtower(at){
    const g=new THREE.Group();g.position.set(at.x,at.y,at.z);g.rotation.y=at.rot;scene.add(g);
    for(const x of [-3.2,3.2])for(const z of [-2.5,2.5])
      box(g,wood,[.66,16,.66],[x,8,z]);
    box(g,wood,[8.2,1,7.0],[0,15.4,0]);
    box(g,wall,[7.6,3.5,6.6],[0,17.4,0]);
    box(g,roof,[9.2,.7,8.3],[0,19.4,0]);
    for(const x of [-1.8,1.8])box(g,windowMat,[2.1,1.6,.2],[x,18,-3.41]);
  }

  function checkpointBanner(frac,label){
    const p=roadSamples[Math.floor(frac*roadSamples.length)%roadSamples.length];
    const normalX=-p.tz,normalZ=p.tx,side=1;
    const x=p.x+normalX*side*(track.width*.5+10);
    const z=p.z+normalZ*side*(track.width*.5+10);
    const y=terrainY(x,z);
    const sign=box(scene,mat(0x243640),[10.3,4.0,.32],[x,y+5.9,z],Math.atan2(p.tx,p.tz));
    const face=mesh(scene,new THREE.PlaneGeometry(10,3.8),
      stageBanner('MATTEA',label,theme.trim),[x,y+5.9,z]);
    face.rotation.y=sign.rotation.y;
    box(scene,wood,[.66,7,.66],[x-3.9,y+3.5,z]);
    box(scene,wood,[.66,7,.66],[x+3.9,y+3.5,z]);
  }

  // A deliberately open start arch, purely visual (no mid-course checkpoints).
  const start=roadSamples[0],normalX=-start.tz,normalZ=start.tx;
  const gantry=new THREE.Group();gantry.position.set(start.x,start.y,start.z);
  gantry.rotation.y=Math.atan2(start.tx,start.tz);scene.add(gantry);
  for(const side of [-1,1]){
    const localX=side*(track.width*.5+2.6);
    box(gantry,mat(0x293b43),[1.30,11,1.30],[localX,5.5,0]);
    box(gantry,trim,[1.54,.40,1.45],[localX,9.1,0]);
  }
  box(gantry,mat(0x293b43),[track.width+8,2.7,.82],[0,11.2,0]);
  const header=mesh(gantry,new THREE.PlaneGeometry(10.8,2.35),
    stageBanner('MATTEA RALLY',track.name,theme.trim),[0,11.2,-.46]);
  header.material.side=THREE.DoubleSide;

  if(track.id==='pine'){
    cabin(siteAt(.12,1,44),13,9);
    cabin(siteAt(.38,-1,69),10,8);
    watchtower(siteAt(.71,-1,54));
    for(let k=0;k<15;k++){
      const at=siteAt(.30+k*.0026,-1,19);
      const trunk=mesh(scene,new THREE.CylinderGeometry(.74,.74,7.8,7),
        wood,[at.x,at.y+.87,at.z]);trunk.rotation.z=Math.PI/2;
    }
    checkpointBanner(.54,'PINE VALLEY');
  }else if(snowy){
    cabin(siteAt(.22,1,50),13,11);
    cabin(siteAt(.57,-1,72),9,8);
    watchtower(siteAt(.82,-1,60));
    const lake=siteAt(.65,-1,92);
    const ice=mesh(scene,new THREE.CylinderGeometry(28,30,.2,28),
      mat(0x9fd6df,.86),[lake.x,lake.y-.08,lake.z]);
    ice.scale.z=.80;
    // Little snow banks beyond the driving line.
    for(let k=0;k<28;k++){
      const at=siteAt(.38+k*.008,k%2?1:-1,15+rnd(k,14)*15);
      stonePiles.push({x:at.x,y:at.y+.65,z:at.z,s:1.8+rnd(k,18)*1.8});
    }
    instance(new THREE.IcosahedronGeometry(1,0),theme.cap,stonePiles);
    checkpointBanner(.45,'FROST RIDGE');
  }else{
    const camp=siteAt(.16,1,59);
    for(let k=0;k<6;k++){
      const x=camp.x+(k%3)*10-10,z=camp.z+Math.floor(k/3)*11-6,y=terrainY(x,z);
      box(scene,wall,[6.2,4.2,7.3],[x,y+2.1,z]);
      box(scene,roof,[6.7,.38,7.7],[x,y+4.5,z]);
      box(scene,windowMat,[2.0,1.6,.12],[x,y+2.5,z-3.77]);
    }
    for(let k=0;k<12;k++){
      const at=siteAt(.58+k*.008,-1,38+rnd(k,6)*34);
      const rock=new THREE.Mesh(new THREE.CylinderGeometry(4.4,6.5,9,6),stone);
      rock.position.set(at.x,at.y+4.4,at.z);rock.rotation.y=rnd(k,9)*TAU;scene.add(rock);
      const top=mesh(scene,new THREE.CylinderGeometry(3.9,4.1,2.1,6),
        mat(theme.cap),[at.x,at.y+10,at.z]);top.rotation.y=.2;
    }
    watchtower(siteAt(.80,1,64));
    checkpointBanner(.39,'RED CANYON');
  }

  // Pale, faceted distant peaks; three color variants with snowy caps.
  const peaksGeo=new THREE.ConeGeometry(29,1,5);
  const ridgeMat=mat(theme.cliff),capMat=mat(theme.cap);
  for(let k=0;k<36;k++){
    const a=k/36*TAU,dist=466+rnd(k,93)*73;
    const x=Math.cos(a)*dist,z=Math.sin(a)*dist;
    const height=74+rnd(k,42)*130,base=terrainY(x,z)-26;
    const peak=mesh(scene,peaksGeo,ridgeMat,[x,base+height*.40,z]);
    peak.scale.set(1.10+rnd(k,35)*.74,height,1.10+rnd(k,45)*.74);
    if(snowy||k%4===0){
      const cap=mesh(scene,new THREE.ConeGeometry(18,22,5),capMat,
        [x,base+height*.82,z]);cap.rotation.y=rnd(k,6)*TAU;
    }
  }
  const clouds=[];
  for(let i=0;i<84;i++){
    const a=rnd(i,57)*TAU,d=180+rnd(i,48)*275;
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    clouds.push({x,y:98+rnd(i,19)*55,z,s:5+rnd(i,8)*5});
  }
  // Mist banks only: no particles over the steering view.
  instance(new THREE.IcosahedronGeometry(1,0),theme.cloud,clouds);

  return scene;
}
