import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PdpaConsentGate } from "@/components/pdpa/PdpaConsentGate";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentPdpa, PDPA_POLICY_SECTIONS } from "@/lib/pdpa";

export const metadata: Metadata = {
  title: "ระบบ กข.คจ.",
  description: "ระบบบันทึกข้อมูลโครงการแก้ไขปัญหาความยากจน (กข.คจ.)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const needsPdpaConsent = user ? !(await hasAcceptedCurrentPdpa(user.id)) : false;

  return (
    <html lang="th" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider forcedTheme={user ? undefined : "light"}>
          {needsPdpaConsent ? (
            <PdpaConsentGate sections={PDPA_POLICY_SECTIONS} />
          ) : (
            <AppShell user={user}>{children}</AppShell>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
