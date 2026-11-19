import type { QrCodeGenerateResult } from "uqr";
import { makeLayout, markCenter, paletteAt, palettes } from "./layout";
import {
  black,
  clamp,
  dotLight,
  dotScale,
  finderColor,
  finderScale,
  logoAngle,
  logoColor,
  mix,
  mixColor,
  smooth,
  type Wave,
} from "./motion";
import { logoOutline, squircleOutline } from "./shape";

type Point = { x: number; y: number };
type Stroke = Point & { born: number; palette: number };
const center = { x: markCenter, y: markCenter };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const cssColor = (ink: number[]) => `rgb(${ink.join(" ")})`;
const now = () => performance.now() / 1000;

export function mountFamilyQr(
  canvas: HTMLCanvasElement,
  code: QrCodeGenerateResult,
  interactive: boolean,
  outlineColor?: string,
  logo?: HTMLImageElement,
) {
  const ctx = canvas.getContext("2d");
  const target = canvas.parentElement;
  if (!ctx || !target) return;
  const { cell, logoWidth, dots, finders } = makeLayout(code);
  const logoAspect = logo ? logo.naturalWidth / logo.naturalHeight : 1;
  const card = squircleOutline(0, 0, 1, 0.173);
  let outline = "";
  const face = logoOutline(0);
  const faceColors = palettes.map((_, p) => paletteAt(p, markCenter));
  const rings = [
    [7, 3],
    [5.6, 2.04],
    [3.3, 1],
  ].map(([width, radius]) =>
    squircleOutline(-width / 2, -width / 2, width, radius),
  );
  let waves: Wave[] = [];
  let strokes: Stroke[] = [];
  let latest: Wave | undefined;
  let pointer: number | "keyboard" | null = null;
  let point = center,
    origin = center,
    brush = false;
  let palette = 0,
    frame = 0,
    previous = now(),
    cssSide = 1;
  let pitch = 0,
    yaw = 0;
  let zoomFrom = 1,
    zoomAt = 0;
  let press = { born: -Infinity, from: 0, to: 0 };
  let pressInk: { born: number; from: number[] } | undefined;

  function pressure(t: number) {
    const age = Math.max(0, t - press.born);
    // Critically damped compression follows both short taps and sustained holds.
    const remaining = press.to
      ? (1 + 22 * age) * Math.exp(-22 * age)
      : (1 - clamp(age / 0.24)) ** 3;
    return remaining < 0.0001 ? press.to : mix(press.to, press.from, remaining);
  }
  function cardZoom(t: number) {
    const held = pointer !== null;
    const target = held ? 0.96 : 1;
    const delta =
      (zoomFrom - target) *
      Math.exp(-(held ? 2.9 : 6.8) * Math.max(0, t - zoomAt));
    return Math.abs(delta) < 0.0001 ? target : target + delta;
  }
  function setPointer(id: typeof pointer, t: number) {
    zoomFrom = cardZoom(t);
    zoomAt = t;
    pointer = id;
  }
  function visibleLogoColor(t: number) {
    const base = logoColor(latest, t, faceColors);
    if (!pressInk) return base;
    const age = t - pressInk.born;
    return press.to
      ? mixColor(pressInk.from, faceColors[palette], clamp(age / 0.103) ** 1.12)
      : mixColor(pressInk.from, base, smooth(0, 0.12, age));
  }
  function setPressed(active: boolean, t: number) {
    if (press.to === Number(active)) return;
    const from = visibleLogoColor(t);
    press = { born: t, from: pressure(t), to: Number(active) };
    pressInk = { born: t, from };
  }
  function startWave(t: number) {
    const angle = logoAngle(latest, t);
    const wave = {
      born: t,
      palette,
      interrupted: !!latest && t - latest.born < 1.504,
      angleFrom: angle - Math.round(angle / Math.PI) * Math.PI,
      finderScaleFrom: finderScale(latest, t),
      finderColorsFrom: finders.map((f, i) =>
        finderColor(latest, t, i, f.colors),
      ),
      logoColorFrom: visibleLogoColor(t),
    };
    pressInk = undefined;
    waves.push(wave);
    latest = wave;
    palette = (palette + 1) % palettes.length;
    wake();
  }
  function addStroke(p: Point, t: number) {
    strokes.push({ ...p, born: t, palette });
  }
  function paint(t: number) {
    if (!ctx) return;
    const dt = Math.min(0.05, Math.max(0, t - previous));
    previous = t;
    const side = canvas.width;
    ctx.setTransform(side, 0, 0, side, 0, 0);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "white";
    ctx.fill(card);
    if (outline) {
      ctx.save();
      ctx.clip(card);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2 / cssSide;
      ctx.stroke(card);
      ctx.restore();
    }
    if (
      pointer !== null &&
      brush &&
      t - (strokes.at(-1)?.born ?? -Infinity) >= 0.25
    )
      addStroke(point, t);
    strokes = strokes.filter((s) => t - s.born < 1.6);
    waves = waves.filter((w) => t - w.born < 1.51);
    latest = waves.at(-1);
    const stamps = strokes.map((s) => {
      const age = t - s.born;
      return {
        ...s,
        radius: 0.2 * (1 - (1 - clamp(age / 0.3)) ** 3),
        opacity: clamp(age / 0.15) * (1 - clamp(age - 0.6) ** 2),
      };
    });
    if (!press.to && pressInk && t - pressInk.born >= 0.12)
      pressInk = undefined;
    const logoInk = visibleLogoColor(t);
    const contact = pointer !== null && brush;
    // At small module pitches the extra ink survives pixel sampling by camera readers.
    const dotRadius =
      cell * (0.4 + 0.08 * (1 - smooth(3.5, 6, cell * cssSide)));
    const blend = 1 - Math.exp(-18 * dt);
    // The layout visits one column at a time. Cull strokes once per column
    // before testing their circular footprint against individual modules.
    let columnX = -1,
      columnStamps = stamps;
    for (const dot of dots) {
      if (stamps.length && dot.x !== columnX) {
        columnX = dot.x;
        columnStamps = stamps.filter((s) => Math.abs(s.x - columnX) < s.radius);
      }
      const brushTarget = contact ? smooth(0.04, 0.2, distance(dot, point)) : 1;
      dot.brush = mix(dot.brush, brushTarget, blend);
      if (Math.abs(dot.brush - brushTarget) < 0.001) dot.brush = brushTarget;
      let size = dot.brush;
      let ink = black;
      for (const s of columnStamps) {
        const dy = dot.y - s.y;
        if (Math.abs(dy) >= s.radius) continue;
        const dx = dot.x - s.x;
        const u = Math.sqrt(dx * dx + dy * dy) / s.radius;
        if (u < 1)
          ink = mixColor(
            ink,
            dot.colors[s.palette],
            s.opacity * (1 - smooth(0.4, 1, u)),
          );
      }
      if (pressInk || (latest && t - latest.born < 0.14)) {
        ink = mixColor(
          ink,
          logoInk,
          0.26 * (1 - smooth(0.11, 0.205, dot.distance)),
        );
      }
      // Each front still travels to the edge after a subsequent tap. A dot
      // regrows from its most recent arriving front; only the active wave carries ink.
      const arrival = t - dot.distance * 0.9;
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        const age = arrival - wave.born;
        if (age < 0) continue;
        size *= dotScale(age);
        if (wave === latest)
          ink = mixColor(ink, dot.colors[wave.palette], dotLight(age));
        break;
      }
      if (size < 0.01) continue;
      ctx.fillStyle = ink === black ? "black" : cssColor(ink);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotRadius * size, 0, Math.PI * 2);
      ctx.fill();
    }
    const ringSize = cell * finderScale(latest, t);
    for (const [i, f] of finders.entries()) {
      let ink = finderColor(latest, t, i, f.colors);
      for (const s of stamps) {
        const d = Math.hypot(
          Math.max(0, Math.abs(s.x - f.x) - cell * 3.5),
          Math.max(0, Math.abs(s.y - f.y) - cell * 3.5),
        );
        if (d <= s.radius * 0.6)
          ink = mixColor(ink, f.colors[s.palette], s.opacity);
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(ringSize, ringSize);
      const color = cssColor(ink);
      for (const [index, path] of rings.entries()) {
        ctx.fillStyle = index === 1 ? "white" : color;
        ctx.fill(path);
      }
      ctx.restore();
    }
    const angle = logoAngle(latest, t);
    const size = (logoWidth / 100) * (1 - 0.23 * pressure(t));
    ctx.save();
    ctx.translate(markCenter, markCenter);
    if (logo && logoAspect > 0 && Number.isFinite(logoAspect)) {
      const width = size * 100 * Math.min(1, logoAspect);
      const height = size * 100 * Math.min(1, 1 / logoAspect);
      ctx.scale(Math.abs(Math.cos(angle)), 1);
      ctx.drawImage(logo, -width / 2, -height / 2, width, height);
    } else {
      ctx.scale(Math.sin(2 * angle) > 0 ? -size : size, size);
      ctx.fillStyle = cssColor(logoInk);
      ctx.fill(angle ? logoOutline(angle) : face, "evenodd");
    }
    ctx.restore();

    const held = pointer !== null;
    const tiltX = held ? 8 * (clamp(point.y) * 2 - 1) : 0;
    const tiltY = held ? -8 * (clamp(point.x) * 2 - 1) : 0;
    pitch = mix(pitch, tiltX, blend);
    yaw = mix(yaw, tiltY, blend);
    const zoom = cardZoom(t);
    if (Math.abs(pitch - tiltX) < 0.0001) pitch = tiltX;
    if (Math.abs(yaw - tiltY) < 0.0001) yaw = tiltY;
    canvas.style.transform =
      zoom === 1 && !pitch && !yaw
        ? "none"
        : `perspective(${cssSide / 0.3}px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${zoom})`;
    if (
      contact ||
      latest ||
      stamps.length ||
      (pressInk && t - pressInk.born < (press.to ? 0.14 : 0.12)) ||
      pressure(t) !== press.to ||
      pitch !== tiltX ||
      yaw !== tiltY ||
      zoom !== (held ? 0.96 : 1) ||
      dots.some((dot) => dot.brush !== 1)
    )
      wake();
  }
  function wake() {
    if (!frame)
      frame = requestAnimationFrame((ms) => {
        frame = 0;
        paint(ms / 1000);
      });
  }
  function resize() {
    cssSide = canvas.clientWidth;
    if (outlineColor) outline = getComputedStyle(canvas).color;
    const side = Math.max(
      1,
      Math.round(
        cssSide * Math.max(devicePixelRatio, cell * cssSide < 6 ? 2 : 1),
      ),
    );
    canvas.width = canvas.height = side;
    paint(now());
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  if (!interactive) return () => observer.disconnect();
  function local(e: PointerEvent) {
    const rect = target!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }
  const hitsLogo = (p: Point) =>
    distance(p, center) <= Math.max(logoWidth * 0.72, 0.08);
  function down(e: PointerEvent) {
    if (pointer !== null || e.button !== 0) return;
    const t = now();
    setPointer(e.pointerId, t);
    target!.setPointerCapture(e.pointerId);
    origin = point = local(e);
    brush = !hitsLogo(point);
    if (!frame) previous = t;
    if (brush) addStroke(point, t);
    setPressed(!brush, t);
    wake();
  }
  function move(e: PointerEvent) {
    if (e.pointerId !== pointer) return;
    point = local(e);
    if (!brush && distance(origin, point) < 0.025) return;
    const from = brush ? (strokes.at(-1) ?? origin) : origin;
    brush = true;
    const t = now();
    setPressed(hitsLogo(point), t);
    const length = distance(from, point);
    for (let step = 0.035; step <= length; step += 0.035)
      addStroke(
        {
          x: mix(from.x, point.x, step / length),
          y: mix(from.y, point.y, step / length),
        },
        t,
      );
    wake();
  }
  function release(t: number) {
    setPressed(false, t);
    setPointer(null, t);
    brush = false;
    wake();
  }
  function end(e: PointerEvent) {
    if (e.pointerId !== pointer) return;
    const activate = e.type === "pointerup" && !brush && hitsLogo(local(e));
    const t = now();
    release(t);
    if (activate) startWave(t);
  }
  function keyDown(e: KeyboardEvent) {
    if (e.key !== " " && e.key !== "Enter") return;
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    if (e.key === " " && pointer === null) {
      const t = now();
      if (!frame) previous = t;
      point = { x: 0.5, y: 0.5 };
      setPointer("keyboard", t);
      setPressed(true, t);
      wake();
    }
  }
  function releaseSpace() {
    if (pointer === "keyboard") release(now());
  }
  function keyUp(e: KeyboardEvent) {
    if (e.key === " ") releaseSpace();
    // The button's native click activates the wave for both Space and Enter.
  }
  function click(e: MouseEvent) {
    if (e.detail === 0) startWave(now());
  }
  target.addEventListener("pointerdown", down);
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
  target.addEventListener("lostpointercapture", end);
  target.addEventListener("keydown", keyDown);
  target.addEventListener("keyup", keyUp);
  target.addEventListener("blur", releaseSpace);
  target.addEventListener("click", click);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    target.removeEventListener("pointerdown", down);
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    target.removeEventListener("lostpointercapture", end);
    target.removeEventListener("keydown", keyDown);
    target.removeEventListener("keyup", keyUp);
    target.removeEventListener("blur", releaseSpace);
    target.removeEventListener("click", click);
  };
}
