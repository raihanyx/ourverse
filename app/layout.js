import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";
import PullToRefresh from "./components/PullToRefresh";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ourverse",
  description: "Your world, together.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ourverse",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F2EB" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1210" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {[
          { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },
          { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },
          { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },
          { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },
          { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },
          { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },
          { w: 828, h: 1792, dw: 414, dh: 896, dpr: 2 },
          { w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3 },
          { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2 },
        ].flatMap(({ w, h, dw, dh, dpr }) => {
          const base = `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`;
          return [
            <link key={`${w}x${h}-light`} rel="apple-touch-startup-image" media={`${base} and (prefers-color-scheme: light)`} href={`/icons/splash-${w}x${h}-light.png`} />,
            <link key={`${w}x${h}-dark`} rel="apple-touch-startup-image" media={`${base} and (prefers-color-scheme: dark)`} href={`/icons/splash-${w}x${h}-dark.png`} />,
          ];
        })}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ourverse-theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();` }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <PullToRefresh />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
