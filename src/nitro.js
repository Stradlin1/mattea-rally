// Fixed-step nitrous-oxide reservoir. Capacity is a percentage (0..100).
// Shift + W expends the reservoir; handbrake drifting restores it quickly.
// Passive regeneration works even if Shift stays down after depletion.
// After running dry, release Shift and regain at least 12% to fire again.
export const NITRO = Object.freeze({
  capacity: 100,
  drainPerSecond: 24,
  passiveRegenPerSecond: 3,
  driftRegenPerSecond: 28,
  restartThreshold: 12,
  minDriftSpeedKmh: 32,
  minDriftSlipDegrees: 5
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function freshNitro() {
  return {amount: NITRO.capacity, active: false, charging: false, locked: false};
}

// Deterministic: runs at 90 Hz. wantBoost must mean throttle can accelerate.
// Drift charging overrides passive charging, but never drains while boosting.
export function stepNitro(tank, dt, {wantBoost = false, drift = false, speedKmh = 0, slipDegrees = 0, drainMultiplier = 1, chargeMultiplier = 1} = {}) {
  const delta = clamp(Number(dt) || 0, 0, 0.1);
  const amount = Number.isFinite(tank.amount) ? tank.amount : NITRO.capacity;
  tank.amount = clamp(amount, 0, NITRO.capacity);

  if (tank.locked && !wantBoost && tank.amount >= NITRO.restartThreshold) {
    tank.locked = false;
  }

  tank.active = false;
  tank.charging = false;
  if (wantBoost && !tank.locked && tank.amount > 0 && delta > 0) {
    tank.amount = Math.max(0, tank.amount - NITRO.drainPerSecond * clamp(drainMultiplier,.2,3) * delta);
    tank.active = true;
    if (tank.amount <= 0) {
      tank.amount = 0;
      tank.locked = true;
    }
  } else if (delta > 0) {
    const isDrifting = drift &&
      speedKmh >= NITRO.minDriftSpeedKmh &&
      slipDegrees >= NITRO.minDriftSlipDegrees;
    const rate = isDrifting ? NITRO.driftRegenPerSecond * clamp(chargeMultiplier,.2,3) : NITRO.passiveRegenPerSecond;
    const before = tank.amount;
    tank.amount = Math.min(NITRO.capacity, tank.amount + rate * delta);
    tank.charging = isDrifting && tank.amount > before;
  }
  return tank;
}
