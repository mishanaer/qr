"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { TextMorph } from "torph/react";
import { QrCode } from "@/components/qr-code";
import { downloadQr } from "@/components/family-qr/download";
import { Button } from "@/components/showcase-controls/components/ui/button";
import { Input } from "@/components/showcase-controls/components/ui/input";
import { DownloadIcon } from "@/components/showcase-controls/download-icon";
import { ShowcasePlayground } from "@/components/showcase-controls/playground";
import { copyToClipboard } from "@/lib/clipboard";

const defaultLink = "https://youtu.be/B1QJpdJJYvM?si=0cerviK9scjo_Zo0";
const templateLogoUrl = "/ui/qr/shef.svg";
const maxLength = 256;
const logoFormats = ".svg,.png,.webp,.jpg,.jpeg";
const logoPlaceholder = "SVG, PNG, WebP, or JPEG.";
const subscribe = () => () => undefined;
const sourceUrl = "https://github.com/mishanaer/qr";
const integrationPrompt = `Add the React QR component from ${sourceUrl}. Reuse its source and license notices, install uqr@0.1.2, and render <QrCode value={qrValue} label="Scan QR code" /> on the client. Use the app's actual QR value and verify that it scans correctly.`;

export function QrPlayground() {
  const [value, setValue] = useState(defaultLink);
  const [customLogo, setCustomLogo] = useState<{ image: HTMLImageElement; name: string; thumbnail?: string }>();
  const [templateLogo, setTemplateLogo] = useState<HTMLImageElement | null>();
  const logo = customLogo?.image ?? templateLogo ?? undefined;
  const loadingLogo = !customLogo && templateLogo === undefined;
  const [logoError, setLogoError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const copyTimer = useRef<number | undefined>(undefined);
  const logoRequest = useRef(0);
  const logoShake = useRef<Animation | null>(null);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const tooLong = Array.from(value).length > maxLength;
  const canDownload = mounted && !loadingLogo && !tooLong && Boolean(value.trim());

  useEffect(() => {
    const image = new Image();
    image.onload = () => setTemplateLogo(image);
    image.onerror = () => setTemplateLogo(null);
    image.src = templateLogoUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  async function copyPrompt() {
    const copied = await copyToClipboard(integrationPrompt);
    window.clearTimeout(copyTimer.current);
    setCopyStatus(copied ? "copied" : "error");
    if (copied) {
      copyTimer.current = window.setTimeout(() => setCopyStatus("idle"), 1500);
    }
  }

  async function saveQr(format: "svg" | "png") {
    setDownloadError("");
    try {
      await downloadQr(value, format, logo);
    } catch {
      setDownloadError("Could not download the QR code.");
    }
  }

  async function changeLogo(file: File, field: HTMLElement | null) {
    logoShake.current?.cancel();
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
      if (request !== logoRequest.current) return;
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty image");
      if (image.naturalWidth !== image.naturalHeight) {
        setLogoError("Choose a square image");
        if (field && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          logoShake.current = field.animate(
            [0, -4, 4, -2, 2, 0].map(x => ({ transform: `translateX(${x}px)`, easing: "ease-in-out" })),
            { duration: 280 },
          );
        }
        return;
      }
      const preview = document.createElement("canvas");
      preview.width = preview.height = 48;
      const context = preview.getContext("2d");
      context?.drawImage(image, 0, 0, preview.width, preview.height);
      setCustomLogo({ image, name: file.name, thumbnail: context ? preview.toDataURL() : undefined });
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
        ) : value.trim() && loadingLogo ? (
          <div aria-busy="true" className="aspect-square w-[300px] max-w-full" />
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
            type="file"
            accept={logoFormats}
            aria-description={logoPlaceholder}
            aria-invalid={Boolean(logoError) || undefined}
            aria-describedby={logoError ? "qr-logo-error" : undefined}
            fileDisplay={{
              placeholder: logoPlaceholder,
              name: customLogo?.name ?? (templateLogo ? "shef.svg" : undefined),
              thumbnail: customLogo ? customLogo.thumbnail : (templateLogo ? templateLogoUrl : undefined),
            }}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              // Some browsers paint a native thumbnail even when the file text is transparent.
              // Only the validated logo in React state should appear in this picker.
              event.currentTarget.value = "";
              if (file) void changeLogo(file, event.currentTarget.closest<HTMLElement>('[data-slot="input-file"]'));
            }}
          />
        </label>
        {logoError && <p id="qr-logo-error" className="text-xs" role="status">{logoError}</p>}
      </div>
      <div className="grid gap-2">
        <Button variant="tertiary" disabled={!mounted} aria-label="Copy prompt" onClick={() => void copyPrompt()}>
          <span aria-hidden>
            Cop<TextMorph className="antialiased">{copyStatus === "copied" ? "ied" : "y prompt"}</TextMorph>
          </span>
        </Button>
        <p className={copyStatus === "error" ? "text-xs" : "sr-only"} role="status">
          {copyStatus === "error" ? "Could not copy the prompt." : copyStatus === "copied" ? "Copied" : ""}
        </p>
      </div>
    </ShowcasePlayground>
  );
}
