import type { Metadata, Viewport } from "next";
import { Fraunces, Great_Vibes, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/cart-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script" });

export const viewport: Viewport = { themeColor: "#fff7f1" };

export const metadata: Metadata = {
  title: "Petal Steps by Thandiwe Mwaba — Women's Heels in Lusaka",
  description: "Women's heels K450–K650 in Lusaka. 29 styles, EU 35–45. Order on WhatsApp +260 760 732 751. Munali Rd 4774, Thompson Park.",
  icons: { icon: "/brand/logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${script.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-rose-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Skip to content</a>
        <CartProvider>
          {children}
          <Toaster position="bottom-center" richColors />
        </CartProvider>
      </body>
    </html>
  );
}
