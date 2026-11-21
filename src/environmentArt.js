import * as THREE from 'three';

// Decorative backdrop only: never included in terrain height, road queries or colliders.
const TAU=Math.PI*2;
const STAGES={
  pine:{
    near:[0x304f4a,0x4b7169,0x648780],far:[0x64868b,0x86a4a7,0xa8bcc0],
    cloud:0xfff7e7,base:82,range:76
  },
  snow:{
    near:[0x58778a,0x849faf,0xe2edf2],far:[0x91adbf,0xb6cad7,0xf2f8fb],
    cloud:0xf5fbff,base:122,range:122
  },
  desert:{
    near:[0x845443,0xb77b5c,0xd49a73],far:[0xa77872,0xd09b80,0xeabf9a],
    cloud:0xffe3c4,base:74,range:61
  }
};

function seededRandom(seed){
  let n=seed>>>0;
  return ()=>{
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;
  };
}
function peakHeight(a,stage,back,theme){
  const undulation=.50+.23*Math.sin(a*7.0+stage.seed*1.7)+.16*Math.sin(a*15.0-stage.seed*.84);
  const teeth=Math.pow(Math.abs(Math.sin(a*(stage.id==='snow'?21:13)+stage.seed*.83)),7);
  const mesa=stage.id==='desert'?(Math.floor((undulation+.18)*3.5)/3.5):undulation;
  const shape=stage.id==='desert'?mesa:undulation+(stage.id==='snow'?.38:.16)*teeth;
  return (theme.base+theme.range*shape)*(back?1.30:1);
}
function addMountainBelt(group,stage,theme,back){
  const steps=back?136:160;
  const radius=back?635:465;
  const positions=[],colors=[];
  const shade=back?theme.far:theme.near;
  const color=new THREE.Color();
  function triangle(a,b,c,hex,variation){
    color.setHex(hex).multiplyScalar(variation);
    for(const v of [a,b,c]){
      positions.push(v[0],v[1],v[2]);
      colors.push(color.r,color.g,color.b);
    }
  }
  function point(a,y){
    // A subtle non-circular rim stops the mountains reading as a flat sky dome.
    const r=radius+13*Math.sin(a*9+stage.seed)+(back?18:7)*Math.sin(a*4.5+2.3);
    return [r*Math.cos(a),y,r*Math.sin(a)];
  }
  for(let i=0;i<steps;i++){
    const a=i/steps*TAU,b=(i+1)/steps*TAU;
    const ha=peakHeight(a,stage,back,theme);
    const hb=peakHeight(b,stage,back,theme);
    const fractions=[0,.44,.77,1];
    for(let band=0;band<3;band++){
      const lowA=band===0?-26:ha*fractions[band];
      const lowB=band===0?-26:hb*fractions[band];
      const highA=ha*fractions[band+1],highB=hb*fractions[band+1];
      const a0=point(a,lowA),b0=point(b,lowB),a1=point(a,highA),b1=point(b,highB);
      const baseColor=shade[band];
      const jitter=.90+.10*Math.sin(i*2.19+band*4.7+stage.seed);
      triangle(a0,b0,a1,baseColor,jitter);
      triangle(b0,b1,a1,baseColor,jitter*.91);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const mountain=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({
    vertexColors:true,flatShading:true,side:THREE.DoubleSide
  }));
  mountain.name=back?'hazy-far-ridge':'near-faceted-ridge';
  group.add(mountain);
}
function cloudTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');
  for(const [x,y,sx,sy,alpha] of [
    [68,74,53,34,.61],[111,61,69,42,.79],[155,76,62,33,.76],
    [190,83,46,26,.53],[124,89,95,30,.44],[92,48,45,22,.36]
  ]){
    ctx.save();
    ctx.translate(x,y);ctx.scale(sx,sy);
    const gradient=ctx.createRadialGradient(0,0,.07,0,0,1);
    gradient.addColorStop(0,'rgba(255,255,255,'+alpha+')');
    gradient.addColorStop(.57,'rgba(255,255,255,'+(alpha*.65)+')');
    gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);
    ctx.restore();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function addCloudBank(group,stage,weather,theme){
  const rng=seededRandom(89147+stage.seed*971);
  const material=new THREE.SpriteMaterial({
    map:cloudTexture(),color:theme.cloud,transparent:true,
    opacity:weather==='fog'?.24:weather==='rain'?.48:.73,
    depthWrite:false,fog:true
  });
  for(let i=0;i<34;i++){
    const a=TAU*(i/34+(rng()-.5)*.055);
    const distance=315+rng()*330;
    const cloud=new THREE.Sprite(material);
    cloud.position.set(Math.cos(a)*distance,95+rng()*110,Math.sin(a)*distance);
    cloud.scale.set(66+rng()*95,20+rng()*33,1);
    group.add(cloud);
  }
}

export function addLandscapeBackdrop(world,{track,weather}){
  const theme=STAGES[track.id]||STAGES.pine;
  const group=new THREE.Group();
  group.name='distant-landscape-atmosphere';
  world.add(group);
  addMountainBelt(group,track,theme,true);
  addMountainBelt(group,track,theme,false);
  addCloudBank(group,track,weather,theme);
  return group;
}
