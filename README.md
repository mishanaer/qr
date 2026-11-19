# QR Code

Animated QR code for React with rounded dots, a color wave, and a customizable center logo.

[Demo](https://mishanaer.com/ui/qr) · [Component](src/components/qr-code.tsx)

Requires Node.js 20.9+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The demo accepts SVG, PNG, WebP, and JPEG. Images are processed in the browser. Download a static SVG or a 1200 × 1200 PNG from the demo. The QR and built-in logo are vector in SVG downloads, and custom logos are embedded as PNG. Use **Copy prompt** to hand the component and setup instructions to a coding agent.

```tsx
<QrCode value="https://example.com" label="Scan to open the site" />
```

Pass a decoded HTML image to `logo` to replace the built-in mark. The component fits the image inside the existing center space and gives it a rotating side profile based on the image silhouette. Omit `logo` to use the built-in animated mark. Use `size` for the width in CSS pixels and `static` to disable interaction.

The decorative treatment can affect scanning support. Test your content and logo with the devices you plan to support.

Adapted from [Family QR Code](https://github.com/ksokolovskyi/family_qr_code). [Component notices](src/components/family-qr/LICENSE) · [Flutter notice](src/components/family-qr/LICENSE.flutter) · [UI sources](src/components/showcase-controls/SOURCES.md) · [MIT](LICENSE).
