// Distinct arcade classes. Car bodies keep the player's preferred compact
// V0.2 low-poly silhouette, while livery and attachments communicate class.
export const CARS = [
  {
    id:'classic',name:'CLASSIC GT',detail:'均衡 · 机械抓地 / 稳定',color:0xe45b45,
    accel:9.2,grip:7.8,steer:.95,drift:.53,maxKmh:188,
    offroadPower:.74,offroadTarget:.78,offroadGrip:.69,
    nitroPower:1.70,nitroDrain:1,nitroCharge:1,
    braking:26,handbrake:5.6,turnRetention:.85,
    body:'classic'
  },
  {
    id:'awd',name:'AWD TURBO',detail:'四驱 · 最强出弯 / 不易甩尾',color:0x4d95d4,
    accel:12.5,grip:10.8,steer:.81,drift:.64,maxKmh:198,
    offroadPower:.81,offroadTarget:.82,offroadGrip:.77,
    nitroPower:1.52,nitroDrain:.90,nitroCharge:.78,
    braking:29,handbrake:6.0,turnRetention:.91,
    body:'awd'
  },
  {
    id:'rwd',name:'DRIFT COUPE',detail:'后驱 · 强甩尾 / 氮气收集最快',color:0xe9be5a,
    accel:11.2,grip:5.0,steer:1.27,drift:.17,maxKmh:200,
    offroadPower:.67,offroadTarget:.73,offroadGrip:.58,
    nitroPower:1.95,nitroDrain:1.16,nitroCharge:1.65,
    braking:24,handbrake:4.2,turnRetention:.78,
    body:'drift'
  },
  {
    id:'buggy',name:'DIRT BUGGY',detail:'越野 · 野路高效 / 高速稍弱',color:0x7bd19a,
    accel:9.9,grip:7.0,steer:1.05,drift:.42,maxKmh:176,
    offroadPower:.98,offroadTarget:.96,offroadGrip:.91,
    nitroPower:1.80,nitroDrain:.80,nitroCharge:1.13,
    braking:25,handbrake:5.1,turnRetention:.84,
    body:'buggy'
  }
];
