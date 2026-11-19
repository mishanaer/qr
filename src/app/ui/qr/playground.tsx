"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/showcase-controls/components/ui/button";
import { Input } from "@/components/showcase-controls/components/ui/input";
import { ShowcasePlayground } from "@/components/showcase-controls/playground";

const referenceValue = "0x0000000000000000000000000000000000000000";
const maxLength = 256;
const logoFormats = ".svg,.png,.webp,.jpg,.jpeg";
const subscribe = () => () => undefined;

export function QrPlayground() {
  const [value, setValue] = useState(referenceValue);
  const [logo, setLogo] = useState<HTMLImageElement>();
  const [logoError, setLogoError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const logoRequest = useRef(0);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const tooLong = Array.from(value).length > maxLength;

  async function changeLogo(file: File) {
    const request = ++logoRequest.current;
    setLogoError("");
    if (!/\.(svg|png|webp|jpe?g)$/i.test(file.name)) {
      setLogoError("Choose an SVG, PNG, WebP, or JPEG image.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty image");
      if (request === logoRequest.current) setLogo(image);
    } catch {
      if (request === logoRequest.current) setLogoError("Could not open this image.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <ShowcasePlayground
      name="QR Code"
      sourceUrl="https://github.com/mishanaer/qr"
      preview={
        tooLong ? (
          <p id="qr-content-error" role="status">
            Enter up to {maxLength} characters to preview your code.
          </p>
        ) : value.trim() ? (
          <QrCode
            value={value}
            label="Scannable QR code"
            logo={logo}
            outline={mounted && resolvedTheme === "light" ? "var(--primary-alpha-20)" : undefined}
          />
        ) : (
          <p role="status">Enter text or a URL to preview your code.</p>
        )
      }
    >
      <label className="grid gap-2">
        <span>Content</span>
        <Input
          value={value}
          aria-invalid={tooLong || undefined}
          aria-describedby={tooLong ? "qr-content-error" : undefined}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Text or URL"
        />
      </label>
      <div className="grid gap-2">
        <label className="grid gap-2">
          <span>Logo</span>
          <Input
            ref={logoInput}
            type="file"
            accept={logoFormats}
            aria-describedby="qr-logo-formats"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void changeLogo(file);
            }}
          />
        </label>
        <p id="qr-logo-formats" className="text-xs">SVG, PNG, WebP, or JPEG</p>
        {logoError && <p className="text-xs" role="status">{logoError}</p>}
        {logo && (
          <Button variant="tertiary" onClick={() => {
            logoRequest.current++;
            if (logoInput.current) logoInput.current.value = "";
            setLogo(undefined);
            setLogoError("");
          }}>
            Reset logo
          </Button>
        )}
      </div>
    </ShowcasePlayground>
  );
}
