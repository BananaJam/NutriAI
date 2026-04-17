import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/features/app-shell";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NutriAI - AI Nutrition Assistant",
  description:
    "Track your nutrition, plan meals, and get AI-powered recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
