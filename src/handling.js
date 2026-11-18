// Deterministic arcade handling. State uses metres and seconds; speed caps are km/h.
// Critically, heading and velocity are not the same vector. Tire slip keeps the car
// travelling sideways while the nose rotates during a power drift.
export const SPEED_LIMIT = 200 / 3.6;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smoothing = (rate, dt) => 1 - Math.exp(-rate * dt);

export function stepVehicle(car, input, vehicle, ground, dt) {
  const steer = clamp(input.steer || 0, -1, 1);
  const oldYaw = car.yaw;
  const oldSpeed = Math.hypot(car.vx, car.vz);
  const forwardX = -Math.sin(oldYaw), forwardZ = -Math.cos(oldYaw);
  const oldLongitudinal = car.vx * forwardX + car.vz * forwardZ;
  const moving = Math.abs(oldLongitudinal) > 7.2; // 26 km/h

  // Shift with steering initiates a power-slide. Its intensity fades over
  // about a second, preserving inertia after Shift is released.
  const requestSlide = !!input.boost && Math.abs(steer) > .1 && moving;
  const wasDrifting = !!car.driftRequested;
  car.driftRequested = requestSlide;
  car.driftBlend ??= 0;
  car.yawRate ??= 0;
  car.turn ??= 0;
  const rise = requestSlide ? 3.8 : 1.30;
  car.driftBlend += ((requestSlide ? 1 : 0) - car.driftBlend) * smoothing(rise, dt);
  car.turn += (steer - car.turn) * smoothing(7.5, dt);

  const speedRatio = clamp(oldSpeed / SPEED_LIMIT, 0, 1);
  const reverseSign = oldLongitudinal < -1 ? -1 : 1;
  // More turn authority at low / medium speed, but progressively less
  // high-speed steering to avoid instant 180-degree spins.
  const yawBase = (.15 + .68 * clamp(oldSpeed / 22, 0, 1)) / (1 + Math.max(0, oldSpeed - 24) * .018);
  const driftExtra = car.driftBlend * (.23 + .17 * speedRatio);
  const targetYawRate = car.turn * vehicle.steer * (yawBase + driftExtra) * reverseSign;
  car.yawRate += (targetYawRate - car.yawRate) * smoothing(4.8 - car.driftBlend * 2.4, dt);

  if (requestSlide && !wasDrifting) {
    // Rear axle breakaway / weight transfer: a short yaw impulse PLUS an
    // outward lateral kick. Steering alone would merely rotate the model.
    const kick = steer * clamp(oldSpeed / 65, .20, .46);
    car.yawRate += kick;
    const outwardX = Math.cos(car.yaw), outwardZ = -Math.sin(car.y);
    const outward = steer * clamp(oldSpeed * .12, 1.1, 3.8) * vehicle.slideKick;
    car.vx += outwardX * outward;
    car.vz += outwardZ * outward;
  }
  car.yaw += car.yawRate * dt;

  const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  const rightX = -fz, rightZ = fx;
  let forward = car.vx * fx + car.vz * fz;
  let lateral = car.vx * rightX + car.vz * rightZ;

  // Rear-tire traction breaks loose under boost+steer. The desired drift slip
  // is maintained as actual lateral velocity, not a visual-only yaw rotation.
  // Countersteering helps recover, and grip rebuilds gradually on release.
  const countersteering = Math.abs(steer) > .2 && steer * lateral < 0;
  const targetLateral = requestSlide
    ? Math.sign(steer) * clamp(Math.abs(forward) * .245, 2.3, 9.4) * vehicle.slideKick
    : 0;
  const lateralGrip = ground.grip * vehicle.grip *
    (1 - car.driftBlend * .89) * (countersteering ? 1.7 : 1);
  const lateralChange = (targetLateral - lateral) * smoothing(
    requestSlide ? Math.max(1.8, lateralGrip) : Math.max(.65, lateralGrip), dt
  );
  car.vx += rightX * lateralChange;
  car.vz += rightZ * lateralChange;
  lateral += lateralChange;

  const softCap = ground.offroad ? SPEED_LIMIT * (vehicle.offroadCap || .70) : SPEED_LIMIT;
  const progress = clamp(Math.abs(forward) / softCap, 0, 1);
  // Torque/power fall away sharply as speed approaches 200 km/h.
  // At 180-195 km/h further gains take much longer than 0-100.
  const torqueCurve = Math.pow(Math.max(0, 1 - progress * progress), 1.42);
  if (input.gas && forward < softCap) {
    const boostMultiplier = input.boost && !requestSlide ? 1.23 : 1.04;
    const a = vehicle.accel * boostMultiplier * torqueCurve *
      (ground.offroad ? (vehicle.offroadPower || .76) : 1);
    car.vx += fx * a * dt;
    car.vz += fz * a * dt;
  }

  // S decelerates on the move and reverses only once nearly stopped.
  if (input.reverse) {
    if (forward > 0.8) {
      const decel = Math.min(forward, 12.6 * ground.grip * dt);
      car.vx -= fx * decel; car.vz -= fz * decel;
    } else if (forward > -10) {
      car.vx -= fx * 3.6 * dt; car.vz -= fz * 3.6 * dt;
    }
  }
  if (input.brake) {
    const decel = Math.min(Math.abs(forward), 18 * ground.grip * dt);
    car.vx -= fx * decel * Math.sign(forward);
    car.vz -= fz * decel * Math.sign(forward);
  }

  // Rolling + aerodynamic resistance, stronger on grass/snow/sand. No hard
  // speed teleport when leaving the road: the car decelerates naturally.
  const speed = Math.hypot(car.vx, car.vz);
  if (speed > .0001) {
    const coastLoss = .11 + speed * .0015 + (ground.offroad ? .64 + speed * .022 : 0);
    const n = Math.min(1, coastLoss * dt / speed);
    car.vx *= 1 - n;
    car.vz *= 1 - n;
  }

  const resultantSpeed = Math.hypot(car.vx, car.vz);
  if (resultantSpeed > SPEED_LIMIT) {
    const fraction = SPEED_LIMIT / resultantSpeed;
    car.vx *= fraction; car.vz *= fraction;
  }
  if (Math.hypot(car.vx,car.vz) < .07 && !input.gas && !input.reverse) {
    car.vx = 0;car.vz = 0;
  }

  forward = car.vx * fx + car.vz * fz;
  lateral = car.vx * rightX + car.vz * rightZ;
  const signedSlip = Math.atan2(lateral, Math.max(1.2, Math.abs(forward))) * 180 / Math.PI;
  car.slipAngle = signedSlip;
  car.drifting = (car.driftBlend > .2 || Math.abs(signedSlip) > 13)
    && Math.abs(signedSlip) > 8 && Math.hypot(car.vx,car.vz) > 8;
  return {
    speedKmh: Math.hypot(car.vx,car.vz) * 3.6,
    longitudinal: forward,
    lateral,
    slipSigned: signedSlip,
    drifting: car.drifting,
    yawRate: car.yawRate,
    driftBlend: car.driftBlend,
    slipRatio: clamp(Math.abs(signedSlip)/38,0,1)
  };
}
