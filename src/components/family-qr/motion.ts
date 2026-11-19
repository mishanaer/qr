export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function smooth(start: number, end: number, x: number) {
  const t = clamp((x - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export function mixColor(a: number[], b: number[], t: number) {
  if (t === 0 || a === b) return a;
  if (t === 1) return b;
  return a.map((channel, i) => mix(channel, b[i], t));
}
export const black = [0, 0, 0];
const fade = (age: number, start: number, end: number) =>
  1 - clamp((age - start) / (end - start)) ** 3;
export type Wave = {
  born: number;
  palette: number;
  interrupted: boolean;
  angleFrom: number;
  finderScaleFrom: number;
  finderColorsFrom: number[][];
  logoColorFrom: number[];
};

export function dotScale(age: number) {
  return (1 - Math.cos(Math.PI * clamp(age / 0.29))) / 2;
}
export function dotLight(age: number) {
  return clamp((age - 0.075) / 0.058) * fade(age, 0.16, 0.377);
}

export function finderScale(wave: Wave | undefined, t: number) {
  if (!wave) return 1;
  const age = t - wave.born;
  const pinch =
    age <= 0.504
      ? clamp((age - 0.18) / 0.324) ** 2.6
      : (1 - clamp((age - 0.504) / 0.335)) ** 1.45;
  return mix(wave.finderScaleFrom, 1, smooth(0, 0.18, age)) - pinch * 0.1;
}
export function finderColor(
  wave: Wave | undefined,
  t: number,
  index: number,
  colors: number[][],
) {
  if (!wave) return black;
  const age = t - wave.born;
  const light = wave.interrupted
    ? clamp(age / 0.095)
    : clamp((age - 0.48) / 0.23) ** 1.12;
  const ink = mixColor(
    wave.finderColorsFrom[index],
    colors[wave.palette],
    light,
  );
  return ink.map((channel) => channel * fade(age, 0.833, 1.504));
}
export function logoColor(
  wave: Wave | undefined,
  t: number,
  colors: number[][],
) {
  if (!wave) return black;
  const age = t - wave.born;
  const ink = mixColor(
    wave.logoColorFrom,
    colors[wave.palette],
    clamp((age - 0.06) / 0.21),
  );
  return ink.map((channel) => channel * fade(age, 0.394, 1.074));
}

// Time in seconds, angle in degrees and angular velocity in degrees/second.
// A shared tangent at each measured pose keeps rapid turns and the final stop smooth.
const spin = [
  [0, 0, 0],
  [0.027, 8, 510],
  [0.045, 34, 1600],
  [0.076, 90, 1980],
  [0.116, 180, 2130],
  [0.146, 240, 1770],
  [0.165, 270, 1580],
  [0.221, 360, 1440],
  [0.278, 435, 980],
  [0.296, 450, 840],
  [0.399, 540, 860],
  [0.445, 579, 650],
  [0.547, 630, 400],
  [0.696, 678, 260],
  [0.808, 702, 110],
  [1.065, 720, 0],
];
export function logoAngle(wave: Wave | undefined, t: number) {
  if (!wave) return 0;
  const age = Math.max(0, t - wave.born);
  const next = spin.findIndex(([time]) => time > age);
  if (next < 1) return 0;
  const [start, from, initialSpeed] = spin[next - 1];
  const [end, to, finalSpeed] = spin[next];
  const duration = end - start;
  const u = (age - start) / duration;
  const degrees =
    mix(from, to, u * u * (3 - 2 * u)) +
    u * (1 - u) * duration * ((1 - u) * initialSpeed - u * finalSpeed);
  return (
    wave.angleFrom * (1 - smooth(0, 0.065, age)) + (degrees * Math.PI) / 180
  );
}
