"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { encodeQr } from "./family-qr/layout";
import { mountFamilyQr } from "./family-qr/renderer";

export function QrCode({
  value,
  size = 300,
  label,
  logo,
  outline,
  static: isStatic = false,
}: {
  value: string;
  size?: number;
  label: string;
  logo?: HTMLImageElement;
  outline?: string;
  static?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const code = useMemo(() => encodeQr(value), [value]);
  const reduceMotion = usePrefersReducedMotion();
  const interactive = !isStatic && !reduceMotion;
  const Surface = interactive ? "button" : "div";
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element || !code) return;
    return mountFamilyQr(element, code, interactive, outline, logo);
  }, [code, interactive, outline, logo]);

  if (!code) return <p role="status">This content is too long for a QR code.</p>;

  return (
    <Surface
      data-slot="qr-code"
      type={interactive ? "button" : undefined}
      aria-label={
        interactive ? label + ". Press the center or drag to paint" : undefined
      }
      style={{
        width: size,
        maxWidth: "100%",
        display: "block",
        aspectRatio: "1",
        padding: 0,
        border: 0,
        background: "none",
        touchAction: interactive ? "pinch-zoom" : "auto",
      }}
    >
      <canvas
        role="img"
        aria-label={label}
        ref={canvas}
        style={{ display: "block", width: "100%", aspectRatio: "1", color: outline }}
      />
    </Surface>
  );
}
