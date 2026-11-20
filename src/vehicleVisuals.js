import * as THREE from 'three';

// A self-contained visual layer. All vehicle dimensions, acceleration, steering,
// tire grip, collision response and nitro rules remain owned by main.js/cars.js.
const matte = color => new THREE.MeshLambertMaterial({color,flatShading:true});
const flat = color => new THREE.MeshBasicMaterial({color});
const steel = matte(0x39434b);
const rubber = matte(0x171b20);
const rubberTread = matte(0x24282d);
const alloy = matte(0xaab3b4);
const glass = matte(0x273e4c);
const darkGlass = matte(0x182e3b);
const lamps = flat(0xffe6ac);
const brakeLamps = flat(0xee4850);
const black = matte(0x111923);

function part(root, geometry, material, at=[0,0,0], rot=[0,0,0]) {
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(...at);
  mesh.rotation.set(...rot);
  root.add(mesh);
  return mesh;
}
function box(root, size, at, material, rot=[0,0,0]) {
  return part(root,new THREE.BoxGeometry(...size),material,at,rot);
}
function cylinder(root, radius, depth, at, material, segments=12, rot=[0,0,0]) {
  return part(root,new THREE.CylinderGeometry(radius,radius,depth,segments),material,at,rot);
}

// A sloped glasshouse: eight independent flat faces, not a rectangular cube.
function cabinGeometry(width, roofWidth, bottom, top, frontLow, rearLow, frontHigh, rearHigh) {
  const a=width*.5,b=roofWidth*.5;
  const v=[
    [-a,bottom,frontLow],[a,bottom,frontLow],[a,bottom,rearLow],[-a,bottom,rearLow],
    [-b,top,frontHigh],[b,top,frontHigh],[b,top,rearHigh],[-b,top,rearHigh]
  ];
  const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7],[3,2,1,0]];
  const vertices=[];
  for(const [p,q,r,s] of faces) for(const i of [p,q,r,p,r,s]) vertices.push(...v[i]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}

function numberTexture(number) {
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f2ecdf';ctx.fillRect(8,8,240,112);
  ctx.fillStyle='#202a31';ctx.fillRect(14,14,228,100);
  ctx.fillStyle='#e9d7a6';ctx.fillRect(19,19,218,9);
  ctx.fillStyle='#f3eee6';ctx.font='900 66px Arial';ctx.textAlign='center';
  ctx.fillText(number,128,87);
  ctx.fillStyle='#e9d7a6';ctx.font='bold 14px Arial';
  ctx.fillText('MATTEA RALLY',128,108);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

export function createRallyVehicle(group, config) {
  const kind=config.body;
  const isBuggy=kind==='buggy',isCoupe=kind==='drift',isAwd=kind==='awd';
  const w=isCoupe?2.94:isBuggy?2.82:2.75;
  const length=isAwd?5.10:isCoupe?5.12:4.92;
  const roofHeight=isCoupe?2.10:isAwd?2.36:isBuggy?2.25:2.25;
  const paint=matte(config.color);
  const highlight=matte(new THREE.Color(config.color).lerp(new THREE.Color(0xffffff),.23));
  const pale=matte(0xf0e8d3);
  const accent=matte(isCoupe?0xf0ce68:isAwd?0xd3f3fb:isBuggy?0xdef0c5:0xffdfac);
  const shade=matte(new THREE.Color(config.color).multiplyScalar(.65));
  const wheels=[],exhaustFlames=[];

  // Chassis, body shell, bonnet, rear deck and pronounced polygonal bumpers.
  box(group,[w-.24,.32,length-.10],[0,.59,0],black);
  box(group,[w,.86,length],[0,1.03,0],paint);
  box(group,[w+.18,.16,length-.34],[0,.66,.01],shade);
  box(group,[w-.20,.105,1.40],[0,1.50,-1.63],highlight);
  box(group,[w-.18,.09,.86],[0,1.49,1.94],paint);
  box(group,[w-.15,.12,.20],[0,.65,-length*.5-.09],steel);
  box(group,[w-.08,.13,.22],[0,.64,length*.5+.10],steel);
  box(group,[w*.75,.20,.07],[0,1.03,-length*.5-.09],steel);
  box(group,[w*.65,.12,.07],[0,1.17,length*.5+.09],steel);

  // The greenhouse has a raked windshield, side windows, visible pillars,
  // a roof in body color, and a separate rear screen.
  const lowFront=isCoupe?-1.22:-1.18,highFront=isCoupe?-.37:-.53;
  const lowRear=isCoupe?1.28:1.14,highRear=isCoupe?.72:.73;
  const windshield=part(group,cabinGeometry(w-.34,w-.77,1.43,roofHeight,lowFront,lowRear,highFront,highRear),
    glass);
  windshield.material.side=THREE.DoubleSide;
  box(group,[w-.72,.13,highRear-highFront+.20],[0,roofHeight+.018,(highRear+highFront)*.5],paint);
  box(group,[w-.61,.055,.22],[0,roofHeight+.10,highFront+.27],highlight);
  for(const side of [-1,1]){
    const sx=side*(w*.5-.20);
    box(group,[.095,roofHeight-1.40,.09],[sx,(roofHeight+1.43)*.5,lowFront+.15],paint,[.0,0,side*.06]);
    box(group,[.095,roofHeight-1.43,.09],[sx,(roofHeight+1.43)*.5,lowRear-.17],paint);
    box(group,[.09,.13,1.9],[sx,1.44,-.05],shade);
    // A central pillar makes the dark cabin read as separate windows.
    box(group,[.075,.70,.09],[sx,1.81,.24],paint);
    // Side skirts and angular wheel-arch overfenders.
    box(group,[.20,.21,2.0],[side*(w*.5+.08),.73,.0],steel);
    for(const z of [-1.57,1.57]){
      box(group,[.23,.17,1.28],[side*(w*.5+.06),1.13,z],shade);
      box(group,[.15,.19,.45],[side*(w*.5+.08),.91,z-.66],steel);
      box(group,[.15,.19,.45],[side*(w*.5+.08),.91,z+.66],steel);
    }
    // Functional-looking side mirrors, door handles and panel seams.
    box(group,[.31,.22,.42],[side*(w*.5+.16),1.57,-.91],steel);
    box(group,[.06,.12,.23],[side*(w*.5+.30),1.56,-.92],glass);
    box(group,[.07,.085,.34],[side*(w*.5+.03),1.27,.45],steel);
    box(group,[.055,.55,.055],[side*(w*.5+.028),1.03,.79],shade);
    box(group,[.075,.28,2.36],[side*(w*.5+.026),1.16,.05],accent);
  }

  // A broad rally stripe connects the bonnet and boot; no external car assets.
  box(group,[.54,.035,1.30],[0,1.563,-1.72],pale);
  box(group,[.14,.040,1.25],[0,1.586,-1.72],shade);
  box(group,[.49,.025,.65],[0,1.565,1.95],pale);

  // Front face / rear face with actual lamp clusters and grille detailing.
  for(const side of [-1,1]){
    const x=side*(w*.5-.47);
    box(group,[.59,.27,.095],[x,1.15,-length*.5-.063],lamps);
    box(group,[.67,.09,.107],[x,.96,-length*.5-.067],accent);
    box(group,[.58,.27,.10],[x,1.10,length*.5+.07],brakeLamps);
    box(group,[.56,.055,.11],[x,.90,length*.5+.073],darkGlass);
    box(group,[.08,.18,.09],[side*(w*.5-.90),1.15,-length*.5-.12],steel);
  }
  for(let i=0;i<5;i++)
    box(group,[w*.44,.022,.08],[0,.96+i*.075,-length*.5-.13],black);
  box(group,[.64,.14,.045],[0,.67,length*.5+.23],alloy);

  // Radial low-poly tires with rims, bolt hubs and distinct wheel arches.
  for(const side of [-1,1]){
    for(const z of [-1.57,1.57]){
      const pivot=new THREE.Group();pivot.position.set(side*(w*.5+.20),.72,z);group.add(pivot);
      cylinder(pivot,.72,.50,[0,0,0],rubber,12,[0,0,Math.PI/2]);
      cylinder(pivot,.605,.515,[0,0,0],rubberTread,12,[0,0,Math.PI/2]);
      cylinder(pivot,.43,.045,[side*.285,0,0],alloy,12,[0,0,Math.PI/2]);
      cylinder(pivot,.285,.051,[side*.315,0,0],steel,10,[0,0,Math.PI/2]);
      cylinder(pivot,.088,.058,[side*.354,0,0],accent,10,[0,0,Math.PI/2]);
      for(let k=0;k<5;k++){
        const a=k*Math.PI*2/5;
        box(pivot,[.065,.22,.075],[side*.362,Math.cos(a)*.24,Math.sin(a)*.24],
          alloy,[a,0,0]);
      }
      wheels.push({mesh:pivot,front:z<0,side});
    }
  }

  // Lightweight procedural door number decals, readable from both sides.
  const decalMaterial=new THREE.MeshBasicMaterial({
    map:numberTexture(isCoupe?'93':isAwd?'21':isBuggy?'44':'07'),
    transparent:true,side:THREE.DoubleSide,depthWrite:false
  });
  for(const side of [-1,1]){
    const plate=part(group,new THREE.PlaneGeometry(1.12,.55),decalMaterial,
      [side*(w*.5+.087),1.19,.03],[0,side*Math.PI*.5,0]);
    plate.renderOrder=2;
  }

  // Different body kits, keeping four original handling classes untouched.
  if(isAwd){
    box(group,[1.01,.24,.83],[0,1.60,-1.40],steel);
    box(group,[.70,.05,.55],[0,1.735,-1.36],darkGlass);
    box(group,[2.27,.12,.63],[0,roofHeight+.20,.18],steel);
    for(const x of [-.75,.75])cylinder(group,.23,.12,[x,1.48,-length*.5-.15],lamps,10,[Math.PI/2,0,0]);
    box(group,[2.35,.09,.53],[0,1.78,2.24],shade);
  }else if(isCoupe){
    box(group,[2.98,.11,.48],[0,2.22,2.25],steel);
    for(const side of [-1,1]){
      box(group,[.12,.66,.11],[side*1.09,1.88,2.19],steel,[.12,0,0]);
      box(group,[.19,.11,1.62],[side*(w*.5-.30),1.51,-1.43],darkGlass);
    }
    box(group,[1.05,.035,1.42],[0,1.586,-1.64],black);
    box(group,[2.72,.095,.36],[0,.74,-length*.5-.26],shade);
  }else if(isBuggy){
    for(const side of [-1,1]){
      box(group,[.20,.18,3.85],[side*(w*.5+.13),1.18,.09],steel);
      box(group,[.13,.18,1.25],[side*1.02,roofHeight+.16,-.02],steel);
      box(group,[.30,.17,.28],[side*1.16,2.05,-.88],accent);
    }
    box(group,[2.48,.14,.30],[0,roofHeight+.28,-.55],steel);
    for(let k=0;k<4;k++)
      cylinder(group,.17,.11,[(k-1.5)*.60,roofHeight+.30,-.77],lamps,10,[Math.PI/2,0,0]);
    box(group,[2.62,.12,.20],[0,.79,-length*.5-.37],alloy);
  }else{
    box(group,[2.58,.11,.45],[0,1.82,2.25],shade);
    box(group,[.95,.10,.35],[0,roofHeight+.16,-.10],shade);
    for(const side of [-1,1]){
      box(group,[.17,.12,.75],[side*.83,1.58,-1.18],steel);
      cylinder(group,.25,.13,[side*.63,1.21,-length*.5-.18],lamps,10,[Math.PI/2,0,0]);
    }
  }

  // Keep the original two-tube nitro VFX interface for updateNitroVisuals().
  const exhaustMetal=matte(0x657079);
  const outerFlame=new THREE.MeshBasicMaterial({
    color:0x168fff,transparent:true,opacity:.80,blending:THREE.AdditiveBlending,depthWrite:false
  });
  const innerFlame=new THREE.MeshBasicMaterial({
    color:0xd5ffff,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false
  });
  for(const side of [-1,1]){
    const exhaust=new THREE.Group();
    exhaust.position.set(side*.89,.62,length*.5+.08);group.add(exhaust);
    cylinder(exhaust,.21,.55,[0,0,.22],exhaustMetal,8,[Math.PI/2,0,0]);
    const jet=new THREE.Group();jet.position.z=.67;jet.visible=false;exhaust.add(jet);
    const outer=part(jet,new THREE.ConeGeometry(.29,1.65,7),outerFlame,[0,0,.79],[Math.PI/2,0,0]);
    const core=part(jet,new THREE.ConeGeometry(.13,1.13,7),innerFlame,[0,0,.47],[Math.PI/2,0,0]);
    exhaustFlames.push({group:jet,outer,core,side});
  }
  return {wheels,exhaustFlames};
}
