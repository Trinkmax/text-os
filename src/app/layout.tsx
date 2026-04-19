import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "TextOS — CRM conversacional con IA",
  description:
    "Unificá WhatsApp, Instagram, email y webchat en una sola bandeja. La IA aprende de vos.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-0 text-fg">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                background: "var(--bg-2)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
