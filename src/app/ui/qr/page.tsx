import type { Metadata } from "next";
import { QrPlayground } from "./playground";

export const metadata: Metadata = {
  title: "QR Code — MishaNaer",
  description: "An interactive React QR code with rounded dots and a color wave.",
  alternates: { canonical: "https://mishanaer.com/ui/qr" },
};

export default function Page() {
  return <QrPlayground />;
}
