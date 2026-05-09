import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ReleaseBanner } from "@/components/ReleaseBanner";

export const metadata: Metadata = {
  title: {
    default: "UFO Files Archive",
    template: "%s | UFO Files Archive"
  },
  description:
    "A non-commercial fan archive for browsing official UFO/UAP releases through search, timeline, map, and case cards.",
  metadataBase: new URL("https://ufo-files-archive.vercel.app"),
  openGraph: {
    title: "UFO Files Archive",
    description:
      "Explore official UFO/UAP releases through timeline, map, search, and visual case cards.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ReleaseBanner />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
