import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { ensureTakeFresh } from "@/lib/regenerate";
import { isPersistent, listPlaces } from "@/lib/store";
import { BoardProvider } from "@/state/BoardProvider";
import { Overlays } from "@/components/Overlays";
import "./globals.css";

/** The only display face: app title, place names, tier letters, button labels. */
const caprasimo = Caprasimo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

/** Body / UI. The system ships up to 700 — never use 800. */
const figtree = Figtree({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Tasteboard",
  description: "A two-person restaurant journal.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tasteboard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5ead8",
};

// The board is per-request state shared between two people, never cached.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the board on the server so the first paint already has the places —
  // the client then only revalidates when this phone comes back to the front.
  const stored = await listPlaces();
  const places = await Promise.all(stored.map(ensureTakeFresh));

  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>
        <BoardProvider initialPlaces={places} persistent={isPersistent()}>
          {children}
          <Overlays />
        </BoardProvider>
      </body>
    </html>
  );
}
