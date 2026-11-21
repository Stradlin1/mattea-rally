export const START_COUNTDOWN_SECONDS = 3;

export function createStartCountdown(){
  return {remaining:START_COUNTDOWN_SECONDS,ready:false};
}

// Countdown time never becomes race time. Only the fraction after GO is drivable.
export function advanceStartCountdown(countdown,dt){
  const step=Number.isFinite(dt)?Math.max(0,dt):0;
  if(countdown.ready)return {cue:null,driveDt:step};
  const before=countdown.remaining;
  countdown.remaining=Math.max(0,before-step);
  if(countdown.remaining===0){
    countdown.ready=true;
    return {cue:'GO!',driveDt:Math.max(0,step-before)};
  }
  const previousNumber=Math.ceil(before),currentNumber=Math.ceil(countdown.remaining);
  return {cue:currentNumber<previousNumber?String(currentNumber):null,driveDt:0};
}
