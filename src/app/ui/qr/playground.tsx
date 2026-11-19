"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { QrCode } from "@/components/qr-code";
import { downloadQr } from "@/components/family-qr/download";
import { Button } from "@/components/showcase-controls/components/ui/button";
import { Input } from "@/components/showcase-controls/components/ui/input";
import { DownloadIcon } from "@/components/showcase-controls/download-icon";
import { ShowcasePlayground } from "@/components/showcase-controls/playground";
import { copyToClipboard } from "@/lib/clipboard";

const defaultLink = "https://youtu.be/B1QJpdJJYvM?si=0cerviK9scjo_Zo0";
const maxLength = 256;
const logoFormats = ".svg,.png,.webp,.jpg,.jpeg";
const subscribe = () => () => undefined;
const sourceUrl = "https://github.com/mishanaer/qr";
const integrationPrompt = `Add the React QR component from ${sourceUrl}. Reuse its source and license notices, install uqr@0.1.2, and render <QrCode value={qrValue} label="Scan QR code" /> on the client. Use the app's actual QR value and verify that it scans correctly.`;

export function QrPlayground() {
  const [value, setValue] = useState(defaultLink);
  const [logo, setLogo] = useState<HTMLImageElement>();
  const [logoError, setLogoError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const logoRequest = useRef(0);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const tooLong = Array.from(value).length > maxLength;
  const canDownload = mounted && !tooLong && Boolean(value.trim());

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
      previewActions={
        <div className="grid justify-items-center gap-2">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Download QR code">
            <Button variant="tertiary" leadingIcon={DownloadIcon} aria-label="Download SVG" disabled={!canDownload} onClick={() => void saveQr("svg")}>
              SVG
            </Button>
            <Button variant="tertiary" leadingIcon={DownloadIcon} aria-label="Download PNG" disabled={!canDownload} onClick={() => void saveQr("png")}>
              PNG
            </Button>
          </div>
          {downloadError && <p className="text-xs" role="status">{downloadError}</p>}
        </div>
      }
    >
      <label className="grid gap-2">
        <span>Link</span>
        <Input
          value={value}
          aria-invalid={tooLong || undefined}
          aria-describedby={tooLong ? "qr-content-error" : undefined}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://example.com"
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
        <Button variant="tertiary" disabled={!mounted} onClick={() => void copyPrompt()}>
          Copy prompt
        </Button>
        <p className={copyStatus ? "text-xs" : "sr-only"} role="status">{copyStatus}</p>
      </div>
    </ShowcasePlayground>
  );
}
