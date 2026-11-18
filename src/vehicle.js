import * as THREE from 'three';

// A larger stylized rally silhouette built entirely out of low-poly primitives.
// The same model works in chase-camera and garage preview; no external assets.
export function createRallyCar(parent, config) {
  const root = new THREE.Group();
  parent.add(root);
  const wheels = [];
  const paint = new THREE.MeshStandardMaterial({color:config.color,roughness:.61,metalness:.19,flatShading:true});
  const dark = new THREE.MeshStandardMaterial({color:0x17222a,roughness:.9,flatShading:true});
  const glass = new THREE.MeshStandardMaterial({color:0x314b60,metalness:.15,roughness:.3,flatShading:true});
  const blackGlass = new THREE.MeshStandardMaterial({color:0x182936,roughness:.33});
  const pale = new THREE.MeshStandardMaterial({color:0xe8e9df,roughness:.72});
  const chrome = new THREE.MeshStandardMaterial({color:0x8faaa9,metalness:.75,roughness:.35});
  const tyreMat = new THREE.MeshStandardMaterial({color:0x10161a,roughness:1});
  const rimMat = new THREE.MeshStandardMaterial({color:config.id==='awd'?0xdfc477:0xb4c7c4,metalness:.7,roughness:.36});
  const brakeMat = new THREE.MeshStandardMaterial({color:0x494f50,metalness:.35,roughness:.7});
  const lamp = new THREE.MeshBasicMaterial({color:0xf5e7b8});
  const stopLamp = new THREE.MeshBasicMaterial({color:0xea3f36});
  const fogLamp = new THREE.MeshBasicMaterial({color:0xffba56});
  const decal = new THREE.MeshBasicMaterial({color:0xf6e7cb});

  function cube(parent, size, xyz, material, rx=0, rz=0) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
    mesh.position.set(...xyz);
    mesh.rotation.set(rx,0,rz);
    parent.add(mesh);return mesh;
  }
  function prism(parent, bottom, top, h, zFront,zRear, material) {
    // A 6-sided slanted cockpit volume: windscreen and hatch roof taper.
    const v=[
      [-bottom,-h/2,zFront],[bottom,-h/2,zFront],
      [-bottom,-h/2,zRear],[bottom,-h/2,zRear],
      [-top,h/2,zFront+.45],[top,h/2,zFront+.45],
      [-top,h/2,zRear-.38],[top,h/2,zRear-.38]
    ];
    const faces=[0,2,1,1,2,3,4,5,6,5,7,6,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5];
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));
    geom.setIndex(faces);geom.computeVertexNormals();
    const mesh=new THREE.Mesh(geom,material);parent.add(mesh);return mesh;
  }

  // The car is 3.1 m wide and 6.35 m long; visibly larger than V0.2.
  // Its forward direction is negative Z, just like the physics controller.
  cube(root,[3.05,.70,6.28],[0,1.02,0],paint);
  cube(root,[2.70,.20,2.18],[0,1.43,-2.02],paint,-.045);
  cube(root,[3.1,.35,.42],[0,.75,-3.12],dark);
  cube(root,[3.12,.32,.43],[0,.83,3.12],dark);
  cube(root,[1.76,.35,.06],[0,.85,-3.34],dark);
  cube(root,[.94,.12,.07],[-.83,1.17,-3.19],lamp);
  cube(root,[.94,.12,.07],[.83,1.17,-3.19],lamp);
  cube(root,[.62,.16,.075],[-1.06,1.11,3.17],stopLamp);
  cube(root,[.62,.16,.075],[1.06,1.11,3.17],stopLamp);
  cube(root,[.36,.15,.09],[-.92,.69,-3.33],fogLamp);
  cube(root,[.36,.15,.09],[.92,.69,-3.33],fogLamp);

  // Main greenhouse; windows extend through the sloping windscreen.
  prism(root,1.31,1.08,1.17,-1.31,1.42,glass).position.y=2.02;
  cube(root,[2.48,.065,.17],[0,2.65,-.05],paint);
  cube(root,[.11,.85,.07],[-1.29,2.03,.28],paint);
  cube(root,[.11,.85,.07],[1.29,2.03,.28],paint);
  cube(root,[2.3,.055,.10],[0,2.53,1.03],dark);
  cube(root,[2.4,.07,.08],[0,1.68,-1.33],dark);
  cube(root,[2.38,.13,.11],[0,1.72,1.46],paint);
  // Rally hood scoop, aerodynamic diffuser and rear wing.
  cube(root,[.83,.22,.83],[0,1.51,-1.83],dark);
  cube(root,[.64,.065,.35],[0,1.66,-1.85],blackGlass);
  cube(root,[2.66,.13,.56],[0,2.12,3.01],dark);
  cube(root,[.12,.53,.13],[-1.0,1.88,2.83],dark);
  cube(root,[.12,.53,.13],[1.0,1.88,2.83],dark);
  cube(root,[2.52,.10,.55],[0,1.07,3.38],dark);

  // Number plate + simple contrasting livery.
  cube(root,[1.00,.026,2.40],[0,1.405,-1.02],decal);
  cube(root,[.38,.026,1.90],[0,1.433,-1.00],dark);
  for(const side of [-1,1]) {
    cube(root,[.09,.22,3.28],[side*1.535,1.08,0],decal);
    cube(root,[.55,.22,.71],[side*1.53,1.61,-1.15],dark);
    cube(root,[.38,.20,.60],[side*1.7,1.76,-1.34],paint);
    // Wide fender flares ahead of each wheel.
    for(const zz of [-2.06,2.05]) {
      cube(root,[.25,.39,1.41],[side*1.52,1.05,zz],dark);
      cube(root,[.28,.13,1.50],[side*1.55,1.40,zz],paint);
    }
    // Wheels are separate rotating, steering assemblies.
    for(const front of [true,false]){
      const pivot=new THREE.Group();pivot.position.set(side*1.65,.76,front?-2.06:2.05);root.add(pivot);
      const wheel=new THREE.Group();pivot.add(wheel);
      const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.80,.80,.56,14),tyreMat);
      tyre.rotation.z=Math.PI/2;wheel.add(tyre);
      const disk=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,.585,12),rimMat);
      disk.rotation.z=Math.PI/2;wheel.add(disk);
      const brake=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.60,12),brakeMat);
      brake.rotation.z=Math.PI/2;wheel.add(brake);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.63,10),chrome);
      hub.rotation.z=Math.PI/2;wheel.add(hub);
      for(let k=0;k<6;k++){
        const angle=k*Math.PI/3;
        const spoke=cube(wheel,[.67,.09,.09],[side*.34,Math.cos(angle)*.37,Math.sin(angle)*.37],rimMat);
        spoke.rotation.x=angle;
      }
      wheels.push({pivot,wheel,front});
    }
  }
  const bodyPivot=root;
  root.userData={wheels,paint,bodyPivot};

  return {
    group:root,
    paint,
    wheels,
    update(steerAngle, speedMs, dt) {
      wheels.forEach(({pivot,wheel,front})=>{
        pivot.rotation.y=front?-steerAngle:0;
        wheel.rotation.x-=speedMs*dt/.80;
      });
    }
  };
}
