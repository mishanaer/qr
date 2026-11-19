import { logoPoses } from "./logo-poses";

type Outline = Pick<Path2D, "moveTo" | "lineTo" | "quadraticCurveTo" | "closePath">;

// The card and all three layers of each finder use the same continuous corner.
export function squircleOutline<T extends Outline>(
  left: number,
  top: number,
  side: number,
  radius: number,
  path: T,
) {
  const power = 2 / 3.264;
  const right = left + side;
  const bottom = top + side;
  path.moveTo(right - radius, top);
  for (const [quadrant, [cx, cy]] of [
    [right - radius, top + radius],
    [right - radius, bottom - radius],
    [left + radius, bottom - radius],
    [left + radius, top + radius],
  ].entries()) {
    for (let step = 0; step <= 32; step++) {
      const angle = ((quadrant - 1 + step / 32) * Math.PI) / 2;
      const x = Math.cos(angle),
        y = Math.sin(angle);
      path.lineTo(
        cx + radius * Math.sign(x) * Math.abs(x) ** power,
        cy + radius * Math.sign(y) * Math.abs(y) ** power,
      );
    }
  }
  path.closePath();
  return path;
}

const directions = logoPoses[0].radii.map((_, i, samples) => {
  const angle = (i * Math.PI) / (samples.length - 1);
  return [Math.cos(angle), Math.sin(angle)];
});

export function getLogoPose(rotation: number) {
  const turn = ((rotation % Math.PI) + Math.PI) % Math.PI;
  const degrees = (Math.min(turn, Math.PI - turn) * 180) / Math.PI;
  const next = logoPoses.findIndex((pose) => pose.angle >= degrees);
  const b = logoPoses[next < 0 ? logoPoses.length - 1 : next];
  const a = logoPoses[Math.max(0, next - 1)];
  const fraction = a === b ? 0 : (degrees - a.angle) / (b.angle - a.angle);
  return { a, b, fraction };
}

// Interpolate the silhouette as well as the opening. Seen edge-on, the mark
// has a solid rounded side about half the width of its face.
export function logoOutline<T extends Outline>(rotation: number, path: T) {
  const { a, b, fraction } = getLogoPose(rotation);
  const mix = (start: number, end: number) => start + (end - start) * fraction;
  const offset = mix(a.offset, b.offset);
  const width = mix(a.width, b.width) / 200;
  const height = mix(a.height, b.height) / 200;
  for (const half of [-1, 1]) {
    for (let k = 0; k < directions.length; k++) {
      const i = half < 0 ? k : directions.length - k - 1;
      const radius = mix(a.radii[i], b.radii[i]);
      const x = offset + width * directions[i][0] * radius;
      const y = half * height * directions[i][1] * radius;
      if (k === 0 && half < 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  }
  path.closePath();
  const [left, right, leftHeight, rightHeight] = a.hole.map((v, i) =>
    mix(v, b.hole[i]),
  );
  if (right > left) {
    const r = Math.min(3, (right - left) / 2, leftHeight, rightHeight);
    path.moveTo(left, -leftHeight + r);
    path.quadraticCurveTo(left, -leftHeight, left + r, -leftHeight);
    path.lineTo(right - r, -rightHeight);
    path.quadraticCurveTo(right, -rightHeight, right, -rightHeight + r);
    path.lineTo(right, rightHeight - r);
    path.quadraticCurveTo(right, rightHeight, right - r, rightHeight);
    path.lineTo(left + r, leftHeight);
    path.quadraticCurveTo(left, leftHeight, left, leftHeight - r);
    path.closePath();
  }
  return path;
}
