import type { Metadata } from "next";
import { publicSiteOrigin } from "@/lib/site";
import "./globals.css";
import "./product.css";
export const metadata: Metadata = {
  metadataBase: publicSiteOrigin(),
  robots: { index: false, follow: false },
  title: {
    default: "DealMile — Project agreements and milestone payments",
    template: "%s · DealMile",
  },
  description:
    "Turn requirements into an editable project plan, agree on milestones, fund work in PayPal Sandbox, and review deliveries together.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
