import * as THREE from 'three';

// Mid-distance rally set dressing: no walls, colliders or checkpoint logic.
const TAU=Math.PI*2;
const STAGE={
  pine:{sign:0xffb957,rock:0x829486,grass:0x718d52,tent:0xe1bc7b},
  snow:{sign:0x77d8eb,rock:0xb4c8d2,grass:0xcbdde0,tent:0xe6f1f2},
  desert:{sign:0xf0be77,rock:0xad7857,grass:0xb7a06c,tent:0xf2c78c}
};
const mat=(color,opts={})=>new THREE.MeshLambertMaterial({color,flatShading:true,...opts});
function randFactory(seed){
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
function arrowTexture(color){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
  const c=canvas.getContext('2d');
  c.fillStyle='#17292d';c.fillRect(0,0,256,96);
  c.fillStyle='#'+new THREE.Color(color).getHexString();
  c.fillRect(3,3,250,7);c.fillRect(3,86,250,7);
  for(let i=0;i<3;i++){
    const x=i*78+21;
    c.strokeStyle='#f6f3de';c.lineWidth=15;c.lineJoin='round';
    c.beginPath();c.moveTo(x,19);c.lineTo(x+30,48);c.lineTo(x,77);c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}
function basicMesh(parent,geo,material,position,rotation=0){
  const object=new THREE.Mesh(geo,material);
  object.position.set(...position);object.rotation.y=rotation;
  parent.add(object);return object;
}

export function addTracksideDetails(world,{track,roadSamples,terrainY,weather}){
  const stage=STAGE[track.id]||STAGE.pine;
  const snowy=track.id==='snow',desert=track.id==='desert',rain=weather==='rain';
  const root=new THREE.Group();root.name='rally-roadside-details';world.add(root);
  const rng=randFactory(track.seed*9937+501);
  const dummy=new THREE.Object3D(),tint=new THREE.Color();
  function batch(geo,color,items,flat=false,transparent=false){
    if(!items.length)return;
    const material=mat(color,{transparent,opacity:transparent?.42:1,depthWrite:!transparent,side:flat?THREE.DoubleSide:THREE.FrontSide});
    const mesh=new THREE.InstancedMesh(geo,material,items.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for(let i=0;i<items.length;i++){
      const p=items[i];
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(flat?-Math.PI/2:0,p.rot||0,0);
      dummy.scale.set(p.s,p.h||p.s,p.depth||p.s);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      tint.setHex(p.color||color);tint.multiplyScalar(.84+(i%9)*.03);
      mesh.setColorAt(i,tint);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();root.add(mesh);
  }
  function location(index,side,extra=7){
    const p=roadSamples[(index+roadSamples.length)%roadSamples.length];
    const nx=-p.tz,nz=p.tx,dist=track.width*.5+extra;
    const x=p.x+nx*side*dist,z=p.z+nz*side*dist;
    return {x,z,y:terrainY(x,z),p,angle:Math.atan2(p.tx,p.tz)};
  }
  const gravel=[],plants=[],roadsideFlowers=[],patches=[];
  // Every 10th curve sample: tiny stones and grass at safe visual shoulders.
  for(let i=0;i<roadSamples.length;i+=10){
    for(const side of [-1,1]){
      for(let j=0;j<2;j++){
        const at=location(i+j*3,side,3.3+rng()*11.5);
        const size=.27+rng()*.55;
        gravel.push({x:at.x,y:at.y+.20*size,z:at.z,s:size*(desert?1.30:1)});
        if(rng()>.46){
          const g=location(i+j*4,side,9+rng()*15);
          plants.push({x:g.x,y:g.y+.43,z:g.z,s:.45+rng()*.60});
        }
        if(!snowy&&rng()>.62){
          const f=location(i+j*3,side,7+rng()*12);
          roadsideFlowers.push({x:f.x,y:f.y+.16,z:f.z,s:.14+rng()*.22});
        }
        if(rng()>.73){
          const a=location(i+j*2,side,13+rng()*16);
          patches.push({x:a.x,y:a.y+.03,z:a.z,s:1.8+rng()*2.1});
        }
      }
    }
  }
  batch(new THREE.IcosahedronGeometry(1,0),stage.rock,gravel);
  batch(new THREE.ConeGeometry(.75,1.2,4),stage.grass,plants);
  batch(new THREE.OctahedronGeometry(.55,0),desert?0xf6d3a0:0xf8db89,roadsideFlowers);
  batch(new THREE.CircleGeometry(1,7),snowy?0xecf2f5:desert?0x976f50:0x3b684a,patches,true,true);

  // Clear chevrons near real bends; all signs sit outside the shoulders.
  const signMat=arrowTexture(stage.sign);
  const signBack=mat(0x27363a),postMat=mat(snowy?0xaabcc4:0xc4b38b);
  const signGeo=new THREE.PlaneGeometry(4.5,1.68);
  const boardGeo=new THREE.BoxGeometry(4.7,1.86,.17);
  const postGeo=new THREE.CylinderGeometry(.12,.14,2.6,5);
  let signCount=0;
  for(let i=24;i<roadSamples.length-18;i+=22){
    const before=roadSamples[(i-14+roadSamples.length)%roadSamples.length];
    const after=roadSamples[(i+14)%roadSamples.length];
    const cross=before.tx*after.tz-before.tz*after.tx;
    if(Math.abs(cross)<.14)continue;
    const side=cross>0?1:-1;
    const at=location(i,side,7.3);
    const base=at.y+3.1;
    basicMesh(root,boardGeo,signBack,[at.x,base,at.z],at.angle);
    const sign=basicMesh(root,signGeo,signMat,[at.x,base,at.z],at.angle);
    sign.translateZ(.12);
    basicMesh(root,postGeo,postMat,[at.x,at.y+1.33,at.z]);
    signCount++;
    if(signCount>26)break;
  }

  // Flags and stage identification at predictable, player-visible corners.
  const pole=mat(0x4c6367),banner=mat(stage.sign,{side:THREE.DoubleSide});
  const dark=mat(0x253941);
  for(const frac of [.07,.24,.44,.69,.86]){
    const i=Math.floor(frac*roadSamples.length);
    const side=frac>.5?-1:1;
    const at=location(i,side,12);
    const poleGeo=new THREE.CylinderGeometry(.10,.15,8.8,7);
    basicMesh(root,poleGeo,pole,[at.x,at.y+4.4,at.z]);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.65),banner);
    flag.position.set(at.x+1.85,at.y+7.45,at.z);
    flag.rotation.y=at.angle;root.add(flag);
    const bar=basicMesh(root,new THREE.BoxGeometry(3.7,.15,.14),
      dark,[at.x+1.85,at.y+8.88,at.z],at.angle);
  }

  // Rally paddock near the start with tents, marshal vehicles and spectators.
  const bg=roadSamples[Math.floor(roadSamples.length*.03)];
  function stagingSite(offset,side){
    const nx=-bg.tz,nz=bg.tx,dist=track.width*.5+offset;
    const x=bg.x+nx*side*dist,z=bg.z+nz*side*dist;
    return {x,z,y:terrainY(x,z)};
  }
  const tentMat=mat(stage.tent),tentDark=mat(0x364b54);
  for(const [offset,side] of [[29,1],[43,1]]){
    const at=stagingSite(offset,side);
    basicMesh(root,new THREE.CylinderGeometry(5.6,6.0,3.4,4),
      tentDark,[at.x,at.y+1.7,at.z],Math.PI/4);
    basicMesh(root,new THREE.ConeGeometry(8,4.6,4),
      tentMat,[at.x,at.y+5.65,at.z],Math.PI/4);
    for(const dx of [-4.1,4.1])for(const dz of [-4.1,4.1])
      basicMesh(root,new THREE.BoxGeometry(.19,3.4,.19),
        tentDark,[at.x+dx,at.y+1.7,at.z+dz]);
  }
  const coats=[0xf19a5e,0x6f99bc,0xdadad5,0xa9c878,0xdeb7a0];
  const people=[];
  for(let i=0;i<28;i++){
    const at=stagingSite(33+rng()*16,-1);
    people.push({x:at.x+(rng()-.5)*25,z:at.z+(rng()-.5)*17,
      y:at.y,coat:coats[i%coats.length],height:1.0+rng()*.24});
  }
  const torso=mat(0xffe1b5),headMat=mat(0xe4c2a4);
  const coatMeshes=people.map(p=>{
    const person=new THREE.Group();person.position.set(p.x,p.y,p.z);root.add(person);
    basicMesh(person,new THREE.BoxGeometry(.66,1.15,.43),mat(p.coat),[0,1.25,0]);
    basicMesh(person,new THREE.IcosahedronGeometry(.35,1),headMat,[0,2.1,0]);
    basicMesh(person,new THREE.BoxGeometry(.24,.85,.24),dark,[-.19,.41,0]);
    basicMesh(person,new THREE.BoxGeometry(.24,.85,.24),dark,[.19,.41,0]);
    return person;
  });

  // Wet weather gains reflective-looking shallow puddles next to the racing line.
  if(rain&&!snowy){
    const pools=[];
    for(let i=0;i<roadSamples.length;i+=36){
      if(rng()<.25)continue;
      const side=rng()>.5?1:-1;
      const at=location(i,side,2.6+rng()*5.2);
      pools.push({x:at.x,y:at.y+.12,z:at.z,s:1.5+rng()*3.3,depth:.5+rng()});
    }
    batch(new THREE.CircleGeometry(1,12),0x90acb3,pools,true,true);
  }
  return root;
}
