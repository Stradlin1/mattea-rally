import * as THREE from 'three';

// Cosmetic tyre wear, packed gravel and wet road sheen.
// These meshes are absent from both collision detection and lap tracking.
const PALETTE={
  pine:{wear:0x50493e,grit:0xbcb39d,wet:0xa5bbc3},
  snow:{wear:0xa2b2bd,grit:0xe4e9eb,wet:0xb3d1da},
  desert:{wear:0x7d513c,grit:0xe1bc91,wet:0xcba895}
};
function randomFactory(seed){
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
function featheredDecal(){
  const canvas=document.createElement('canvas');
  canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,128,10,64,128,126);
  gradient.addColorStop(0,'rgba(255,255,255,.92)');
  gradient.addColorStop(.34,'rgba(255,255,255,.65)');
  gradient.addColorStop(.72,'rgba(255,255,255,.23)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,256);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

export function addRoadSurfaceArt(world,{track,roadSamples,terrainY,weather}){
  const palette=PALETTE[track.id]||PALETTE.pine;
  const rng=randomFactory(track.seed*17801+42);
  const root=new THREE.Group();
  root.name='track-surface-art';
  world.add(root);
  const dummy=new THREE.Object3D();
  const tint=new THREE.Color();
  const decalGeometry=new THREE.PlaneGeometry(1,1);
  decalGeometry.rotateX(-Math.PI/2);
  const feather=featheredDecal();
  const roadWear=[],wetShine=[],grit=[];
  const half=track.width*.5;
  const n=roadSamples.length;
  for(let i=31;i<n-31;i+=5){
    const p=roadSamples[i];
    const nx=-p.tz,nz=p.tx;
    for(let j=0;j<2;j++){
      const offset=(j===0?-1:1)*(1.3+rng()*Math.min(half-3,4.6));
      const x=p.x+nx*offset,z=p.z+nz*offset;
      roadWear.push({
        x,z,y:terrainY(x,z)+.222,
        width:.65+rng()*1.45,length:2.6+rng()*5.6,
        angle:Math.atan2(p.tx,p.tz),
        color:palette.wear
      });
    }
    if(weather==='rain'&&rng()>.38){
      const offset=(rng()-.5)*Math.max(3,track.width-6);
      const x=p.x+nx*offset,z=p.z+nz*offset;
      wetShine.push({x,z,y:terrainY(x,z)+.229,width:.8+rng()*2.4,
        length:2.5+rng()*5,angle:Math.atan2(p.tx,p.tz),
        color:palette.wet});
    }
    // Stones collect near the transition to the shoulder, not on the racing line.
    if(rng()>.23){
      const side=rng()>.5?1:-1;
      const offset=side*(half-1.8+rng()*2.1);
      const x=p.x+nx*offset,z=p.z+nz*offset;
      grit.push({x,z,y:terrainY(x,z)+.27,
        s:.22+rng()*.30,angle:rng()*Math.PI*2,color:palette.grit});
    }
  }
  function decals(items,opacity){
    if(!items.length)return;
    const material=new THREE.MeshBasicMaterial({
      color:0xffffff,map:feather,transparent:true,
      opacity,depthWrite:false,side:THREE.DoubleSide
    });
    const mesh=new THREE.InstancedMesh(decalGeometry,material,items.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for(let i=0;i<items.length;i++){
      const a=items[i];
      dummy.position.set(a.x,a.y,a.z);
      dummy.rotation.set(0,a.angle,0);
      dummy.scale.set(a.width,1,a.length);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      tint.setHex(a.color).multiplyScalar(.88+(i%7)*.034);
      mesh.setColorAt(i,tint);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();root.add(mesh);
  }
  decals(roadWear,track.id==='snow'?.28:.21);
  if(wetShine.length)decals(wetShine,.17);
  if(grit.length){
    const geo=new THREE.IcosahedronGeometry(1,0);
    const material=new THREE.MeshLambertMaterial({color:palette.grit,flatShading:true});
    const mesh=new THREE.InstancedMesh(geo,material,grit.length);
    for(let i=0;i<grit.length;i++){
      const p=grit[i];
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);
      dummy.scale.set(p.s,p.s*.42,p.s*.8);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();root.add(mesh);
  }
  return root;
}
