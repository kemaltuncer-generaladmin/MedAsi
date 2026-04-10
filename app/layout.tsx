import "./globals.css";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";
import Script from "next/script";
import { themeBootScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Medasi — Tıp Eğitiminde Yapay Zeka",
  description:
    "MEDASI, tıp öğrencileri ve klinisyenler için AI destekli vaka simülasyonu, sınav hazırlık, günlük brifing ve klinik karar destek platformu.",
  metadataBase: new URL("https://medasi.com.tr"),
  openGraph: {
    title: "Medasi — Tıp Eğitiminde Yapay Zeka",
    description: "1. Sınıftan TUS'a kadar AI destekli tıp eğitim platformu.",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-26NW7Q08WF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-26NW7Q08WF');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] antialiased">
        <Script id="medasi-theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {/* Klavye kullanıcıları için içeriğe atla bağlantısı (WCAG 2.4.1) */}
        <a href="#main-content" className="skip-to-content">
          İçeriğe geç
        </a>
        <div id="main-content">{children}</div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              fontSize: "0.875rem",
            },
            error: {
              iconTheme: { primary: "#FF3B5C", secondary: "#0A0A0C" },
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#0A0A0C" },
            },
          }}
        />
      </body>
    </html>
  );
}
