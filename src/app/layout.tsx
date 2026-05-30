import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sinap — La sinapsis de tu negocio de salud",
  description: "Plataforma SaaS multi-agente para clínicas de salud en México. IA orquestada para recepción, clínica, facturación y crecimiento.",
  keywords: ["Sinap", "clínica", "salud", "México", "IA", "facturación", "CFDI", "dermatología"],
  authors: [{ name: "Sinap" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='5' fill='%23534AB7'/></svg>",
  },
  openGraph: {
    title: "Sinap",
    description: "La sinapsis de tu negocio de salud",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
