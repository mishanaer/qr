"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { QrCode } from "@/components/qr-code";
import { downloadQr } from "@/components/family-qr/download";
import { Button } from "@/components/showcase-controls/components/ui/button";
import { Input } from "@/components/showcase-controls/components/ui/input";
import { ShowcasePlayground } from "@/components/showcase-controls/playground";
import { copyToClipboard } from "@/lib/clipboard";

const referenceValue = "0x0000000000000000000000000000000000000000";
const maxLength = 256;
const logoFormats = ".svg,.png,.webp,.jpg,.jpeg";
const subscribe = () => () => undefined;
const sourceUrl = "https://github.com/mishanaer/qr";
const integrationPrompt = `Integrate the animated React QR Code component into this project.

Source: ${sourceUrl}
Demo: https://mishanaer.com/ui/qr

1. Inspect the project's React setup, package manager, and the screen where the QR code belongs.
2. Reuse the source from src/components/qr-code.tsx, src/components/family-qr/, and src/hooks/use-prefers-reduced-motion.ts. Keep their relative imports working and retain the MIT and upstream license notices. Add uqr@0.1.2 with the project's package manager.
3. Import the named QrCode export from the copied component. Render <QrCode value={qrValue} label="Scan to open the link" /> using the app's actual text or URL. The component needs a browser canvas and has no Tailwind or next-themes dependency. Use it in a client component where the framework distinguishes server and client code.
4. Use the existing app layout. Keep the rounded dots, press and drag interaction, and reduced-motion behavior. Use the optional size prop for width, static to disable interaction, or logo for a decoded HTMLImageElement when the screen needs a custom center image.
5. Run the project's checks, open the target screen, and verify that a scanner returns the exact value. Test with the intended custom logo if there is one and report any scanning checks you couldn't run.`;

export function QrPlayground() {
  const [value, setValue] = useState(referenceValue);
  const [logo, setLogo] = useState<HTMLImageElement>();
  const [logoError, setLogoError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const logoRequest = useRef(0);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const tooLong = Array.from(value).length > maxLength;
  const canDownload = !tooLong && Boolean(value.trim());

  async function copyPrompt() {
    const copied = await copyToClipboard(integrationPrompt);
    setCopyStatus(copied ? "Prompt copied" : "Could not copy the prompt.");
  }

  async function saveQr(format: "svg" | "png") {
    setDownloadError("");
    try {
      await downloadQr(value, format, logo);
    } catch {
      setDownloadError("Could not download the QR code.");
    }
  }

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
      sourceUrl={sourceUrl}
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
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="tertiary" disabled={!canDownload} onClick={() => void saveQr("svg")}>
            Download SVG
          </Button>
          <Button variant="tertiary" disabled={!canDownload} onClick={() => void saveQr("png")}>
            Download PNG
          </Button>
        </div>
        {downloadError && <p className="text-xs" role="status">{downloadError}</p>}
      </div>
      <div className="grid gap-2">
        <Button variant="tertiary" disabled={!mounted} onClick={() => void copyPrompt()}>
          Copy integration prompt
        </Button>
        <p className={copyStatus ? "text-xs" : "sr-only"} role="status">{copyStatus}</p>
      </div>
    </ShowcasePlayground>
  );
}
