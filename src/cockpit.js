import * as THREE from 'three';

// Low-poly interior rendered in camera space: the driver sees a dashboard,
// windshield frame and steering wheel, never a pair of animated hands.
// The frame follows the driver's head, while the wheel follows steering input.
export function createCockpit(camera) {
  const root = new THREE.Group();
  camera.add(root);
  root.visible = false;

  const interior = new THREE.MeshLambertMaterial({color: 0x263239, flatShading: true});
  const consoleMat = new THREE.MeshLambertMaterial({color: 0x141c23, flatShading: true});
  const metallic = new THREE.MeshLambertMaterial({color: 0x7a8c93, flatShading: true});
  const rubber = new THREE.MeshLambertMaterial({color: 0x11191d, flatShading: true});
  const dialDark = new THREE.MeshBasicMaterial({color: 0x0a151d});
  const needleMat = new THREE.MeshBasicMaterial({color: 0xffb957});
  const trim = new THREE.MeshLambertMaterial({color: 0x3d4b54, flatShading: true});

  function box(parent, size, at, material, rotationZ=0) {
    const obj = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    obj.position.set(...at);
    obj.rotation.z = rotationZ;
    parent.add(obj);
    return obj;
  }
  function beam(parent, start, end, radius, material) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a), length = delta.length();
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
    obj.position.copy(a.add(b).multiplyScalar(0.5));
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), delta.normalize());
    parent.add(obj);
    return obj;
  }

  // The hood and the interior are foreground layers; do not let the exterior
  // car's opaque windshield obstruct the view when using this camera.
  const hoodMat = new THREE.MeshLambertMaterial({color: 0xc65045, flatShading: true});
  const bonnet = box(root, [2.72, .16, 1.85], [.52,-.92,-3.35], hoodMat);
  box(root, [.22,.02,1.58], [.52,-.829,-3.35], metallic);
  box(root, [3.8,.43,.85], [.43,-1.02,-1.30], interior);
  box(root, [3.8,.12,.60], [.43,-.75,-1.42], trim);
  box(root, [1.0,.43,.24], [.02,-.70,-1.48], consoleMat);

  // Framed but open windshield: A-pillars, header and a low side-door line.
  beam(root, [-1.37,-.60,-1.22], [-1.16,1.12,-2.12], .070, interior);
  beam(root, [2.02,-.60,-1.22], [1.67,1.12,-2.12], .070, interior);
  beam(root, [-1.16,1.12,-2.12], [1.67,1.12,-2.12], .085, interior);
  beam(root, [-1.88,-.70,-1.08], [-1.42,-.32,-1.72], .060, interior);
  box(root, [.15,.48,.18], [-1.27,-.79,-1.19], metallic);
  box(root, [.7,.22,.12], [1.26,-.60,-1.26], consoleMat);

  // Simple twin-dial instrument cluster behind the wheel.
  const gauges = [];
  for (const x of [-.23,.23]) {
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(.215,.215,.07,18), metallic);
    outer.rotation.x = Math.PI/2; outer.position.set(x,-.68,-1.29);root.add(outer);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(.169,.169,.075,18), dialDark);
    inner.rotation.x = Math.PI/2; inner.position.set(x,-.68,-1.245);root.add(inner);
    for(let tick=0;tick<9;tick++){
      const theta=(-.75+tick/8*1.50)*Math.PI;
      box(root,[.023,.060,.02],[x+Math.sin(theta)*.125,-.68+Math.cos(theta)*.125,-1.198],metallic,-theta);
    }
    const needlePivot = new THREE.Group();
    needlePivot.position.set(x,-.68,-1.185);
    box(needlePivot,[.021,.135,.016],[0,.06,0],needleMat);
    root.add(needlePivot);
    gauges.push(needlePivot);
  }

  // A real visible steering wheel, modelled without arms or hands.
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-.02,-.48,-.90);
  root.add(steeringWheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.315,.047,6,24),rubber);
  steeringWheel.add(rim);
  for (let i=0;i<3;i++) {
    const angle=(i/3)*Math.PI*2+Math.PI/2;
    beam(steeringWheel,[Math.cos(angle)*.08,Math.sin(angle)*.08,.009],
      [Math.cos(angle)*.275,Math.sin(angle)*.275,.009],.030,metallic);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.09,12),trim);
  hub.rotation.x=Math.PI/2;hub.position.z=.05;steeringWheel.add(hub);
  box(steeringWheel,[.115,.030,.018],[0,0,.104],needleMat);

  // Rear-view mirror and a visible (but transparent/open) top windshield.
  box(root,[.54,.23,.075],[.45,.96,-1.45],consoleMat);
  box(root,[.44,.12,.028],[.45,.96,-1.40],metallic);

  return {
    root,
    steeringWheel,
    bonnet,
    gauges,
    update(frontWheelAngle, speedKmh, color) {
      // Steering gear ratio of ~6:1; visually consistent with the front tires.
      const target = THREE.MathUtils.clamp(frontWheelAngle * 6.0, -2.3, 2.3);
      steeringWheel.rotation.z = THREE.MathUtils.lerp(steeringWheel.rotation.z,target,.32);
      gauges[0].rotation.z = -1.15 + THREE.MathUtils.clamp(speedKmh/200,0,1)*2.35;
      gauges[1].rotation.z = -1.2 + THREE.MathUtils.clamp(speedKmh/200,0,1)*2.35;
      if (color !== undefined && hoodMat.color.getHex() !== color) hoodMat.color.setHex(color);
    }
  };
}
