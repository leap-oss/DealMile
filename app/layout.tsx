import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "DealMile — Every milestone starts with a clear deal",
    template: "%s · DealMile",
  },
  description:
    "Clear project agreements, meaningful milestones, and smarter payments. AI recommends. Humans approve. PayPal handles payments.",
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
