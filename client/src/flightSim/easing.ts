// Basic cubic easing (original)
export function easeIn(t: number) { return t*t*t; }
export function easeOut(t: number) { return 1-Math.pow(1-t,3); }
export function easeInOut(t: number) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

// Natural flight dynamics - exponential with smoother acceleration
export function easeFlightAccel(t: number): number {
  // Exponential curve that mimics real aircraft thrust buildup
  return 1 - Math.exp(-4 * t);
}

export function easeFlightDecel(t: number): number {
  // Exponential decay for natural deceleration
  return Math.exp(-3 * t);
}

// Smooth flight curve - combines acceleration and cruise
export function easeFlightSmooth(t: number): number {
  // Quintic ease-in-out for extremely smooth motion
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// Damped spring for natural convergence (like suspension)
export function easeDampedSpring(t: number, damping = 0.7): number {
  const omega = 2 * Math.PI; // 1 oscillation
  const dampedOmega = omega * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * omega * t) * Math.cos(dampedOmega * t);
}

// Smooth sigmoid for natural approach/departure curves
export function easeSigmoid(t: number, sharpness = 5): number {
  return 1 / (1 + Math.exp(-sharpness * (t - 0.5)));
}